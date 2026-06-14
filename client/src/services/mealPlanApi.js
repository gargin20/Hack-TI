import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      Authorization: `Bearer ${token || ''}`,
      Accept: 'application/json',
    },
  };
};

export const createMealPlan = async (data) => {
  const response = await axios.post(`${API_BASE_URL}/api/meal-plans/create`, data, getHeaders());
  return response.data;
};

export const getMealPlans = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/meal-plans`, getHeaders());
  return response.data;
};

export const getMealPlanById = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/api/meal-plans/${id}`, getHeaders());
  return response.data;
};

export const regenerateMealPlan = async (id) => {
  const response = await axios.put(`${API_BASE_URL}/api/meal-plans/${id}/regenerate`, {}, getHeaders());
  return response.data;
};

export const updateMealPlanProgress = async (id, data) => {
  const response = await axios.post(`${API_BASE_URL}/api/meal-plans/${id}/update-progress`, data, getHeaders());
  return response.data;
};

export const deleteMealPlan = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/api/meal-plans/${id}`, getHeaders());
  return response.data;
};

export const getCoachAdvice = async (weather) => {
  const response = await axios.post(`${API_BASE_URL}/api/meal-plans/coach-advice`, { weather }, getHeaders());
  return response.data;
};

export default {
  createMealPlan,
  getMealPlans,
  getMealPlanById,
  regenerateMealPlan,
  updateMealPlanProgress,
  deleteMealPlan,
  getCoachAdvice
};
