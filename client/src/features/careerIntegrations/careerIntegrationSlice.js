import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const CAREER_DOMAIN_KEYS = ['software', 'business', 'creative'];
export const DEFAULT_CAREER_DOMAIN = 'software';

export const CAREER_DOMAIN_LABELS = {
  software: 'Software & Coding',
  coding: 'Software & Coding',
  business: 'Business & MBA',
  creative: 'Creative & Design',
};

const emptyDomainLinks = {
  software: {
    github: '',
    leetcode: '',
    linkedin: '',
  },
  business: {
    linkedin: '',
    portfolio: '',
    businessProfile: '',
  },
  creative: {
    portfolio: '',
    linkedin: '',
    behance: '',
  },
};

const emptyState = {
  domains: emptyDomainLinks,
  github: buildGithubState(''),
  leetcode: buildLeetcodeState(''),
  linkedin: buildLinkedinState(''),
  portfolio: buildGenericState(''),
  businessProfile: buildGenericState(''),
  behance: buildGenericState(''),
};

const initialState = {
  ...emptyState,
  loading: false,
  saving: false,
  error: '',
  hydrated: false,
};

export const fetchCareerIntegrations = createAsyncThunk(
  'careerIntegrations/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/career-integrations`, {
        headers: authHeaders(),
      });
      return response.data.data || {};
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not load career integrations.');
    }
  }
);

export const saveCareerIntegrations = createAsyncThunk(
  'careerIntegrations/save',
  async (updates, { getState, rejectWithValue }) => {
    try {
      const { domain, links } = parseIntegrationUpdates(updates);
      const current = selectAllCareerIntegrationLinks(getState());
      const domainKey = normalizeCareerDomain(domain);
      const next = normalizeAllCareerLinks({
        ...current,
        [domainKey]: {
          ...(current[domainKey] || {}),
          ...(links || {}),
        },
      });
      const response = await axios.put(
        `${API_BASE_URL}/api/career-integrations`,
        { careerIntegrations: next },
        { headers: authHeaders() }
      );
      return response.data.data || next;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Could not save career integrations.');
    }
  }
);

export const disconnectCareerIntegration = createAsyncThunk(
  'careerIntegrations/disconnect',
  async (payload, { dispatch, rejectWithValue }) => {
    const provider = typeof payload === 'string' ? payload : payload?.provider;
    const domain = typeof payload === 'string' ? DEFAULT_CAREER_DOMAIN : payload?.domain;
    const domainKey = normalizeCareerDomain(domain);

    if (!Object.prototype.hasOwnProperty.call(emptyDomainLinks[domainKey] || {}, provider)) {
      return rejectWithValue('Unknown career integration.');
    }

    return dispatch(saveCareerIntegrations({ domain: domainKey, links: { [provider]: '' } })).unwrap();
  }
);

const careerIntegrationSlice = createSlice({
  name: 'careerIntegrations',
  initialState,
  reducers: {
    setCareerIntegrationLinks(state, action) {
      applyCareerLinks(state, action.payload || {});
      state.error = '';
    },
    clearCareerIntegrationError(state) {
      state.error = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCareerIntegrations.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchCareerIntegrations.fulfilled, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        applyCareerLinks(state, action.payload);
      })
      .addCase(fetchCareerIntegrations.rejected, (state, action) => {
        state.loading = false;
        state.hydrated = true;
        state.error = action.payload || 'Could not load career integrations.';
      })
      .addCase(saveCareerIntegrations.pending, (state) => {
        state.saving = true;
        state.error = '';
      })
      .addCase(saveCareerIntegrations.fulfilled, (state, action) => {
        state.saving = false;
        state.hydrated = true;
        applyCareerLinks(state, action.payload);
      })
      .addCase(saveCareerIntegrations.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload || 'Could not save career integrations.';
      });
  },
});

export const { setCareerIntegrationLinks, clearCareerIntegrationError } = careerIntegrationSlice.actions;
export default careerIntegrationSlice.reducer;

export function normalizeCareerDomain(domain = DEFAULT_CAREER_DOMAIN) {
  const raw = String(domain || DEFAULT_CAREER_DOMAIN).toLowerCase().trim();
  if (raw === 'coding' || raw === 'software' || raw === 'software & coding') return 'software';
  if (raw === 'business' || raw === 'business & mba') return 'business';
  if (raw === 'creative' || raw === 'creative & design') return 'creative';
  return DEFAULT_CAREER_DOMAIN;
}

export function selectCareerIntegrationLinks(state, domain = DEFAULT_CAREER_DOMAIN) {
  const career = state.careerIntegrations || emptyState;
  const domainKey = normalizeCareerDomain(domain);
  const domains = normalizeAllCareerLinks(career.domains || career);
  return domains[domainKey] || { ...emptyDomainLinks[domainKey] };
}

export function selectAllCareerIntegrationLinks(state) {
  const career = state.careerIntegrations || emptyState;
  return normalizeAllCareerLinks(career.domains || career);
}

export function selectCareerDomainIntegrations(state, domain = DEFAULT_CAREER_DOMAIN) {
  const links = selectCareerIntegrationLinks(state, domain);
  return buildDomainState(normalizeCareerDomain(domain), links);
}

function applyCareerLinks(state, links) {
  const normalized = normalizeAllCareerLinks(links);
  state.domains = normalized;

  state.github = buildGithubState(normalized.software.github);
  state.leetcode = buildLeetcodeState(normalized.software.leetcode);
  state.linkedin = buildLinkedinState(normalized.software.linkedin);
  state.portfolio = buildGenericState(normalized.creative.portfolio || normalized.business.portfolio);
  state.businessProfile = buildGenericState(normalized.business.businessProfile);
  state.behance = buildGenericState(normalized.creative.behance);
}

function normalizeAllCareerLinks(links = {}) {
  const source = links.domains || links;
  return {
    software: normalizeDomainLinks('software', {
      ...source.software,
      ...source.coding,
      github: source.software?.github ?? source.coding?.github ?? source.github,
      leetcode: source.software?.leetcode ?? source.coding?.leetcode ?? source.leetcode,
      linkedin: source.software?.linkedin ?? source.coding?.linkedin ?? source.linkedin,
    }),
    business: normalizeDomainLinks('business', {
      ...source.business,
      linkedin: source.business?.linkedin ?? '',
      portfolio: source.business?.portfolio ?? source.portfolio ?? '',
      businessProfile: source.business?.businessProfile ?? '',
    }),
    creative: normalizeDomainLinks('creative', {
      ...source.creative,
      portfolio: source.creative?.portfolio ?? '',
      linkedin: source.creative?.linkedin ?? '',
      behance: source.creative?.behance ?? '',
    }),
  };
}

function normalizeDomainLinks(domain, links = {}) {
  const keys = Object.keys(emptyDomainLinks[domain] || {});
  return keys.reduce((acc, key) => {
    acc[key] = normalizeCareerLink(key, links[key]);
    return acc;
  }, {});
}

function buildDomainState(domain, links = {}) {
  return Object.entries(normalizeDomainLinks(domain, links)).reduce((acc, [key, profileUrl]) => {
    acc[key] = buildProviderState(key, profileUrl);
    return acc;
  }, {});
}

function parseIntegrationUpdates(updates = {}) {
  if (updates?.links || updates?.domain) {
    return {
      domain: updates.domain || DEFAULT_CAREER_DOMAIN,
      links: updates.links || {},
    };
  }

  return {
    domain: DEFAULT_CAREER_DOMAIN,
    links: updates || {},
  };
}

function buildProviderState(provider, profileUrl = '') {
  if (provider === 'github') return buildGithubState(profileUrl);
  if (provider === 'leetcode') return buildLeetcodeState(profileUrl);
  if (provider === 'linkedin') return buildLinkedinState(profileUrl);
  return buildGenericState(profileUrl);
}

function buildGithubState(profileUrl = '') {
  return {
    connected: Boolean(profileUrl),
    username: extractGithubUsername(profileUrl),
    profileUrl,
  };
}

function buildLeetcodeState(profileUrl = '') {
  return {
    connected: Boolean(profileUrl),
    username: extractLeetcodeUsername(profileUrl),
    profileUrl,
  };
}

function buildLinkedinState(profileUrl = '') {
  return {
    connected: Boolean(profileUrl),
    profileUrl,
  };
}

function buildGenericState(profileUrl = '') {
  return {
    connected: Boolean(profileUrl),
    profileUrl,
  };
}

function normalizeCareerLink(provider, value = '') {
  if (provider === 'github') return normalizeGithubUrl(value);
  if (provider === 'leetcode') return normalizeLeetcodeUrl(value);
  if (provider === 'linkedin') return normalizeLinkedinUrl(value);
  return normalizeGenericUrl(value);
}

function normalizeGithubUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const username = extractGithubUsername(trimmed);
  return username ? `https://github.com/${username}` : trimmed;
}

function normalizeLeetcodeUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const username = extractLeetcodeUsername(trimmed);
  return username ? `https://leetcode.com/u/${username}` : trimmed;
}

function normalizeLinkedinUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://linkedin.com/in/${trimmed.replace(/^@/, '')}`;
}

function normalizeGenericUrl(value = '') {
  return String(value || '').trim();
}

function extractGithubUsername(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://github.com/${trimmed}`);
    return url.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function extractLeetcodeUsername(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://leetcode.com/u/${trimmed}`);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[0] === 'u' ? parts[1] || '' : parts[0] || '';
  } catch {
    return trimmed.replace(/^@/, '');
  }
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` };
}
