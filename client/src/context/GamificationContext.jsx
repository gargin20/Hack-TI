import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GamificationContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export function GamificationProvider({ children }) {
  const [gameState, setGameState] = useState({
    totalXP: 0,
    level: 1,
    history: [],
    unlockedBadges: [],
    availableBadges: []
  });

  const [currentToast, setCurrentToast] = useState(null);

  // Reference trackers for deduplication locks
  const toastedLogsRef = useRef(new Set());

  // Persistent tracking for seen toasts
  const getSeenToastIds = useCallback(() => {
    try {
      const stored = localStorage.getItem('seenToastIds');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const markToastAsSeen = useCallback((id) => {
    try {
      const seen = getSeenToastIds();
      if (!seen.includes(id)) {
        seen.push(id);
        localStorage.setItem('seenToastIds', JSON.stringify(seen));
      }
    } catch (e) {
      console.error(e);
    }
  }, [getSeenToastIds]);

  const fetchState = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get(`${API_BASE_URL}/api/gamification/status`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setGameState({
          totalXP: res.data.data.totalXP,
          level: res.data.data.level,
          history: [...res.data.data.history].reverse(), // Newest first
          unlockedBadges: res.data.data.unlockedBadges,
          availableBadges: res.data.availableBadges
        });
      }
    } catch (error) {
      console.error("Failed to fetch gamification status", error);
    }
  }, []);

  // 1. Fetch real status from backend on load and listen to gamification-updated events
  useEffect(() => {
    console.log("[GamificationContext] Mounted and registering 'gamification-updated' listener.");
    fetchState();

    const handleUpdate = () => {
      console.log("[GamificationContext] Received 'gamification-updated' event. Re-fetching user gamification status!");
      fetchState();
    };
    window.addEventListener('gamification-updated', handleUpdate);
    return () => {
      console.log("[GamificationContext] Unmounting and cleaning up listener.");
      window.removeEventListener('gamification-updated', handleUpdate);
    };
  }, [fetchState]);

  // 2. Trigger reward manually (purely client-side UI feedback, no backend saving to prevent loops)
  const triggerReward = (points, activity, emoji) => {
    const key = `${activity}-${points}`;
    if (toastedLogsRef.current.has(key) || getSeenToastIds().includes(key)) return;
    toastedLogsRef.current.add(key);
    markToastAsSeen(key);

    // Update local state XP
    setGameState(prev => ({
      ...prev,
      totalXP: prev.totalXP + points,
      history: [{ points, activity, emoji, date: new Date().toISOString() }, ...prev.history]
    }));

    // Trigger toast overlay
    setCurrentToast({ type: 'xp', amount: points, activity, emoji });
    setTimeout(() => {
      setCurrentToast(null);
    }, 4000);

    // Trigger hot toast for visibility
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#11131a] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden backdrop-blur-xl p-4`}>
        <div className="flex-1 w-0 p-1 flex items-start">
          <div className="flex-shrink-0 pt-0.5 text-3xl">{emoji}</div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Hey Champ, outstanding work! 🚀</p>
            <p className="mt-1 text-xs text-white/70 font-medium">You locked in <span className="text-white font-bold">+{points} XP</span> for: <span className="text-amber-400">{activity}</span>.</p>
          </div>
        </div>
      </div>
    ), { duration: 4000 });
  };

  return (
    <GamificationContext.Provider value={{ ...gameState, triggerReward, toast: currentToast }}>
      {children}
    </GamificationContext.Provider>
  );
}

export default GamificationContext;
export const useGamification = () => useContext(GamificationContext);