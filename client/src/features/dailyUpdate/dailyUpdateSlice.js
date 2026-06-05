import { createSlice } from '@reduxjs/toolkit';
import { fetchTodayDailyUpdate, submitDailyUpdate } from './dailyUpdateThunks';

const dailyUpdateLastSubmittedAt = Number(localStorage.getItem('dailyUpdateLastSubmittedAt')) || null;

const initialState = {
  todayUpdate: null,
  activeGoals: [],
  completed: false,
  dailyUpdateLastSubmittedAt,
  loading: false,
  error: '',
  success: false,
};

const dailyUpdateSlice = createSlice({
  name: 'dailyUpdate',
  initialState,
  reducers: {
    clearDailyUpdateStatus(state) {
      state.error = '';
      state.success = false;
    },
    clearDailyUpdateCooldown(state) {
      state.completed = false;
      state.success = false;
      state.dailyUpdateLastSubmittedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayDailyUpdate.pending, (state) => {
        state.loading = true;
        state.error = '';
      })
      .addCase(fetchTodayDailyUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.todayUpdate = action.payload.data || null;
        state.activeGoals = action.payload.activeGoals || [];
        state.completed = Boolean(action.payload.completed);
        if (state.completed && !state.dailyUpdateLastSubmittedAt && action.payload.data?.createdAt) {
          const submittedAt = new Date(action.payload.data.createdAt).getTime();
          state.dailyUpdateLastSubmittedAt = Number.isNaN(submittedAt) ? null : submittedAt;
        }
      })
      .addCase(fetchTodayDailyUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Unable to load daily update status.';
      })
      .addCase(submitDailyUpdate.pending, (state) => {
        state.loading = true;
        state.error = '';
        state.success = false;
      })
      .addCase(submitDailyUpdate.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.completed = true;
        state.todayUpdate = action.payload.data;
        state.dailyUpdateLastSubmittedAt = action.payload.dailyUpdateLastSubmittedAt;
      })
      .addCase(submitDailyUpdate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Unable to submit daily update.';
      });
  },
});

export const { clearDailyUpdateCooldown, clearDailyUpdateStatus } = dailyUpdateSlice.actions;
export default dailyUpdateSlice.reducer;
