import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../config/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials, { dispatch, rejectWithValue }) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
    const { token, user } = response.data.data;

    persistSession({ token, user });
    dispatch({ type: 'auth/loginSuccess', payload: { token, user } });

    return { token, user };
  } catch (error) {
    clearPersistedSession();
    dispatch({ type: 'auth/loginFailure' });
    return rejectWithValue({
      code: error.response?.data?.code,
      email: error.response?.data?.email,
      message: error.response?.data?.message || 'Login failed.',
    });
  }
});

export const loginWithGoogle = createAsyncThunk('auth/loginWithGoogle', async (_, { dispatch, rejectWithValue }) => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const firebaseToken = await user.getIdToken();

    const response = await axios.post(`${API_BASE_URL}/api/auth/google`, {
      firebaseToken,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      uid: user.uid,
    });
    const { token, user: appUser } = response.data.data;

    persistSession({ token, user: appUser });
    dispatch({ type: 'auth/loginSuccess', payload: { token, user: appUser } });

    return { token, user: appUser };
  } catch (error) {
    console.error(error);
    console.error(error.code);
    console.error(error.message);
    clearPersistedSession();
    dispatch({ type: 'auth/loginFailure' });
    return rejectWithValue(error.response?.data?.message || error.message || 'Unable to continue with Google.');
  }
});

export const setPasswordForGoogleAccount = createAsyncThunk(
  'auth/setPasswordForGoogleAccount',
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/create-password`, { email, otp, newPassword, confirmPassword: newPassword });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Unable to create password.');
    }
  }
);

export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { dispatch, rejectWithValue }) => {
  console.log('[RESTORE START]');
  console.log('URL:', window.location.href);
  console.log('TOKEN:', localStorage.getItem('authToken'));
  
  const token = localStorage.getItem('authToken');

  if (!token) {
    console.log('[RESTORE] No token path');
    clearPersistedSession();
    dispatch({ type: 'auth/logout' });
    return rejectWithValue('No token found');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = response.data.data;

    persistSession({ token, user });
    dispatch({ type: 'auth/loginSuccess', payload: { token, user } });

    console.log('[RESTORE] Success path');
    return { token, user };
  } catch (error) {
    console.log('[RESTORE] Error path:', error.message || error);
    clearPersistedSession();
    dispatch({ type: 'auth/logout' });
    return rejectWithValue(error.response?.data?.message || 'Session expired.');
  }
});

export const logoutUser = createAsyncThunk('auth/logoutUser', async (_, { dispatch }) => {
  const token = localStorage.getItem('authToken');

  try {
    if (token) {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Local logout still wins if the server is unavailable.
  } finally {
    clearPersistedSession();
    dispatch({ type: 'auth/logout' });
  }
});

function persistSession({ token, user }) {
  console.log('[AUTH WRITE]', token);
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearPersistedSession() {
  console.log('[AUTH REMOVE]');
  console.log('Token before removal:', localStorage.getItem('authToken'));
  console.trace();
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('lifetwinOnboardingProfile');
  localStorage.removeItem('digitalTwinDashboardData');
}
