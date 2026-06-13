import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const LS_KEY = 'ltIntegrations'; 

// ─── Default shape ────────────────────────────────────────────────────────────
const DEFAULT_INTEGRATIONS = {
  github:    { status: 'disconnected', username: '',  data: null, connectedAt: null },
  leetcode:  { status: 'disconnected', username: '',  data: null, connectedAt: null },
  fitbit:    { status: 'disconnected', username: '',  data: null, connectedAt: null },
  linkedin:  { status: 'disconnected', username: '',  data: null, connectedAt: null },
  banking:   { status: 'disconnected', profileLink: '', data: null, connectedAt: null },
  portfolio: { status: 'disconnected', url: '',        data: null, connectedAt: null },
};

const IntegrationContext = createContext(null);

// ─── Helper: read/write localStorage cache ────────────────────────────────────
function readCache() {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? { ...DEFAULT_INTEGRATIONS, ...JSON.parse(s) } : { ...DEFAULT_INTEGRATIONS };
  } catch {
    return { ...DEFAULT_INTEGRATIONS };
  }
}
function writeCache(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ─── Helper: build axios auth header ─────────────────────────────────────────
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
});

// ─────────────────────────────────────────────────────────────────────────────
export function IntegrationProvider({ children }) {
  const [integrations, setIntegrations] = useState(readCache);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Fetch current integration statuses from backend ──────────────────────
  const refreshIntegrations = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return; // not logged in — keep cache

    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${API}/api/integrations/status`, {
        headers: authHeader(),
      });
      if (!isMounted.current) return;

      if (data?.success && data?.data) {
        const merged = { ...DEFAULT_INTEGRATIONS, ...data.data };
        setIntegrations(merged);
        writeCache(merged);
      }
    } catch (err) {
      if (!isMounted.current) return;
      // Silently fall back to cache — don't break the UI
      console.warn('[IntegrationContext] refresh failed, using cache:', err.message);
      setError(err.message);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Refresh once on mount
  useEffect(() => { refreshIntegrations(); }, [refreshIntegrations]);

  // ── Save / connect a single integration ──────────────────────────────────
  /**
   * saveIntegration(key, payload)
   *   key     — 'github' | 'leetcode' | 'fitbit' | 'linkedin' | 'banking' | 'portfolio'
   *   payload — { username?, profileLink?, url? }
   *
   * Optimistically updates local state, persists to backend, then syncs the
   * response (which may include fetched stats) back into state.
   */
  const saveIntegration = useCallback(async (key, payload) => {
    // Optimistic update
    const optimistic = {
      ...integrations,
      [key]: {
        ...integrations[key],
        ...payload,
        status: 'connected',
        connectedAt: new Date().toISOString(),
      },
    };
    setIntegrations(optimistic);
    writeCache(optimistic);

    try {
      const { data } = await axios.post(
        `${API}/api/integrations/connect`,
        { integration: key, ...payload },
        { headers: authHeader() },
      );
      if (!isMounted.current) return;

      if (data?.success && data?.data) {
        const updated = { ...optimistic, [key]: { ...optimistic[key], ...data.data } };
        setIntegrations(updated);
        writeCache(updated);
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.warn(`[IntegrationContext] save ${key} failed:`, err.message);
      // Keep the optimistic state so the UI doesn't flicker back — backend is optional
    }
  }, [integrations]);

  // ── Disconnect a single integration ──────────────────────────────────────
  const disconnectIntegration = useCallback(async (key) => {
    const updated = {
      ...integrations,
      [key]: { ...DEFAULT_INTEGRATIONS[key] },
    };
    setIntegrations(updated);
    writeCache(updated);

    try {
      await axios.post(
        `${API}/api/integrations/disconnect`,
        { integration: key },
        { headers: authHeader() },
      );
    } catch (err) {
      console.warn(`[IntegrationContext] disconnect ${key} failed:`, err.message);
    }
  }, [integrations]);

  // ── Convenience helper ────────────────────────────────────────────────────
  const isConnected = useCallback(
    (key) => integrations[key]?.status === 'connected',
    [integrations],
  );

  const value = {
    integrations,
    loading,
    error,
    isConnected,
    saveIntegration,
    disconnectIntegration,
    refreshIntegrations,
  };

  return (
    <IntegrationContext.Provider value={value}>
      {children}
    </IntegrationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useIntegrations() {
  const ctx = useContext(IntegrationContext);
  if (!ctx) throw new Error('useIntegrations must be used inside <IntegrationProvider>');
  return ctx;
}

export default IntegrationContext;
