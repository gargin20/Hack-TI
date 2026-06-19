import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { loginSuccess } from '../auth/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function localDateKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export const fetchTodayDailyUpdate = createAsyncThunk(
  'dailyUpdate/fetchToday',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/daily-update/today`, {
        headers: authHeaders(),
        params: { date: localDateKey() },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Unable to load daily update status.');
    }
  },
);

export const submitDailyUpdate = createAsyncThunk(
  'dailyUpdate/submit',
  async (payload, { rejectWithValue, dispatch }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/daily-update`,
        { ...payload, date: localDateKey() },
        { headers: authHeaders() },
      );
      const dailyUpdateLastSubmittedAt = Date.now();

      // If server returned updated user profile, update auth store immediately
      if (response.data && response.data.user) {
        const token = localStorage.getItem('authToken');
        console.log('submitDailyUpdate: server returned user:', response.data.user);
        dispatch(loginSuccess({ user: response.data.user, token }));
        console.log('submitDailyUpdate: dispatched loginSuccess with updated user smokingProfile:', response.data.user?.smokingProfile);
      }

      window.dispatchEvent(new CustomEvent('daily-update-completed', {
        detail: {
          dailyUpdate: response.data.data,
          streak: response.data.streak,
        },
      }));

      window.dispatchEvent(new Event('dashboard-data-updated'));
      return { ...response.data, dailyUpdateLastSubmittedAt };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Unable to submit daily update.');
    }
  },
);
