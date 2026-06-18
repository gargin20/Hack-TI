import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import careerIntegrationReducer from '../features/careerIntegrations/careerIntegrationSlice';
import dailyUpdateReducer from '../features/dailyUpdate/dailyUpdateSlice';
import healthIntegrationReducer from '../features/healthIntegration/healthIntegrationSlice';

const PERSISTED_STATE_KEY = 'digitalTwinReduxState';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    careerIntegrations: careerIntegrationReducer,
    dailyUpdate: dailyUpdateReducer,
    healthIntegration: healthIntegrationReducer,
  },
  preloadedState: loadPersistedState(),
});

store.subscribe(() => {
  persistState(store.getState());
});

export default store;

function loadPersistedState() {
  try {
    const serializedState = localStorage.getItem(PERSISTED_STATE_KEY);
    return serializedState ? JSON.parse(serializedState) : undefined;
  } catch {
    return undefined;
  }
}

function persistState(state) {
  try {
    const { auth, careerIntegrations, dailyUpdate, healthIntegration } = state;
    const persistedAuth = auth
      ? {
          ...auth,
          loading: false,
        }
      : auth;

    localStorage.setItem(
      PERSISTED_STATE_KEY,
      JSON.stringify({ auth: persistedAuth, careerIntegrations, dailyUpdate, healthIntegration })
    );
  } catch {
    // Storage may be unavailable or full; the in-memory store should keep running.
  }
}
