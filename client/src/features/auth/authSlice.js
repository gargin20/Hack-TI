import { createSlice } from '@reduxjs/toolkit';
import { loginUser, loginWithGoogle, restoreSession } from './authThunks';

const storedToken = localStorage.getItem('authToken');
const storedUser = readStoredUser();

const initialState = {
  user: storedUser,
  token: storedToken,
  isAuthenticated: Boolean(storedToken),
  loading: Boolean(storedToken),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
    },
    loginSuccess(state, action) {
      const { user, token } = action.payload;
      state.user = normalizeUser(user);
      state.token = token;
      state.isAuthenticated = Boolean(token);
      state.loading = false;
    },
    loginFailure(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = normalizeUser(action.payload.user);
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loginUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(loginWithGoogle.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginWithGoogle.fulfilled, (state, action) => {
        state.user = normalizeUser(action.payload.user);
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(loginWithGoogle.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = normalizeUser(action.payload.user);
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.loading = false;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loading = false;
      });
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    return stored ? normalizeUser(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

function normalizeUser(user) {
  if (!user) return null;
  const profile = user.smokingProfile || {};
  const smoker = profile.smoker === true;
  return {
    ...user,
    smokingProfile: {
      smoker,
      smokingFrequency: smoker ? profile.smokingFrequency || 'sometimes' : null,
      smokingStartedAt: smoker ? profile.smokingStartedAt || null : null,
      smokingStreak: Number(profile.smokingStreak || 0),
      cigarettesToday: Number(profile.cigarettesToday || 0),
      totalCigarettesSmoked: Number(profile.totalCigarettesSmoked || 0),
      cravingsResisted: Number(profile.cravingsResisted || 0),
      lastCigarette: profile.lastCigarette || null,
      lastEvent: profile.lastEvent || '',
      lastEventTime: profile.lastEventTime || null,
    },
  };
}
