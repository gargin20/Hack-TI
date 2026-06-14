import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getSettings() {
  const response = await axios.get(`${API_BASE_URL}/api/settings`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function updateSettings(settings) {
  const response = await axios.put(`${API_BASE_URL}/api/settings`, settings, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function processAssistantCommand(command) {
  const response = await axios.post(
    `${API_BASE_URL}/api/assistant/command`,
    { command },
    { headers: authHeaders() },
  );
  return response.data;
}

export async function createGoalFromAssistant(action) {
  const deadline = action.deadline || getFutureDate(90);
  const response = await axios.post(
    `${API_BASE_URL}/api/goals`,
    {
      domain: action.domain || 'career',
      title: action.title || 'New Goal',
      description: action.description || '',
      targetMetric: Number(action.targetMetric || 1),
      unit: action.unit || 'milestone',
      priority: action.priority || 'medium',
      deadline,
    },
    { headers: authHeaders() },
  );
  return response.data;
}

export async function getGoalsForAssistant() {
  const response = await axios.get(`${API_BASE_URL}/api/goals`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function deleteGoalFromAssistant(goalId) {
  const response = await axios.delete(`${API_BASE_URL}/api/goals/${goalId}`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getDashboardForAssistant() {
  const response = await axios.get(`${API_BASE_URL}/api/dashboard`, {
    headers: authHeaders(),
    params: { _t: Date.now() },
  });
  return response.data;
}

export async function getFinanceForAssistant() {
  const response = await axios.get(`${API_BASE_URL}/api/finance`, {
    headers: authHeaders(),
  });
  return response.data;
}

export async function getFinanceIntegrationForAssistant() {
  const response = await axios.get(`${API_BASE_URL}/api/integrations/finance`, {
    headers: authHeaders(),
    params: { _t: Date.now() },
  });
  return response.data;
}

export async function getIntegrationStatusForAssistant() {
  const response = await axios.get(`${API_BASE_URL}/api/integrations/status`, {
    headers: authHeaders(),
    params: { _t: Date.now() },
  });
  return response.data;
}

export async function runSimulationForAssistant(payload = {}) {
  const currentResponse = await axios.get(`${API_BASE_URL}/api/simulation/current`, {
    headers: authHeaders(),
  });
  const current = {
    ...(currentResponse.data?.data?.current || {}),
    ...(payload.current || {}),
  };
  const simulated = {
    ...(currentResponse.data?.data?.simulated || current),
    ...(payload.simulated || {}),
  };

  const response = await axios.post(
    `${API_BASE_URL}/api/simulation/run`,
    { current, simulated },
    { headers: authHeaders() },
  );
  return response.data;
}

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
