import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const GamificationContext = createContext();

export function GamificationProvider({ children }) {
  const [gamData, setGamData] = useState({
    totalXP: 0,
    level: 1,
    streaks: { finance: { current: 0 }, health: { current: 0 }, career: { current: 0 } },
    badges: []
  });
  
  const [toast, setToast] = useState(null);

  // Fetch initial data when the app loads
  useEffect(() => {
    const fetchGamificationData = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/api/gamification/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setGamData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load gamification data', error);
      }
    };

    fetchGamificationData();
  }, []);

  // Triggered when you hit "Save & Earn XP"
  const triggerReward = (xpAwarded, newBadges = [], newTotalXP) => {
    // 1. Update the score
    setGamData(prev => ({
      ...prev,
      totalXP: newTotalXP || prev.totalXP + xpAwarded,
      badges: [...prev.badges, ...newBadges]
    }));

    // 2. Trigger the popup
    if (newBadges.length > 0) {
      setToast({ type: 'badge', badge: newBadges[0] });
    } else if (xpAwarded > 0) {
      setToast({ type: 'xp', amount: xpAwarded });
    }

    // 3. Auto-hide popup after 4 seconds
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <GamificationContext.Provider value={{ gamData, triggerReward, toast }}>
      {children}
    </GamificationContext.Provider>
  );
}

export const useGamification = () => useContext(GamificationContext);