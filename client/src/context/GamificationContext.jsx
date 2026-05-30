import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GamificationContext = createContext();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function GamificationProvider({ children }) {
  const [gameState, setGameState] = useState({
    totalXP: 0,
    level: 1,
    history: [],
    unlockedBadges: [],
    availableBadges: []
  });

  // 1. Fetch real status from backend on load
  useEffect(() => {
    const fetchState = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const res = await axios.get(`${API_BASE_URL}/api/gamification/status`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) {
          setGameState({
            totalXP: res.data.data.totalXP,
            level: res.data.data.level,
            history: res.data.data.history.reverse(), // Newest first
            unlockedBadges: res.data.data.unlockedBadges,
            availableBadges: res.data.availableBadges
          });
        }
      } catch (error) {
        console.error("Failed to fetch gamification status", error);
      }
    };
    fetchState();
  }, []);

  // 2. The function that triggers the Backend Evaluation
  const evaluateBackgroundData = async (healthData, financeData, careerData) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_BASE_URL}/api/gamification/evaluate-sync`, 
        { healthData, financeData, careerData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.syncResults.xpEarned > 0) {
        // Update local state with the backend's absolute truth
        setGameState(prev => ({
          ...prev,
          totalXP: res.data.data.totalXP,
          level: res.data.data.level,
          history: res.data.data.history.reverse(),
          unlockedBadges: res.data.data.unlockedBadges
        }));

        // Trigger engaging, emotional toasts for the specific activities validated by the backend
        res.data.syncResults.logs.forEach((log, index) => {
          setTimeout(() => {
            toast.custom((t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#11131a] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.5)] rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden backdrop-blur-xl p-4`}>
                <div className="flex-1 w-0 p-1 flex items-start">
                  <div className="flex-shrink-0 pt-0.5 text-3xl">{log.emoji}</div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Hey Champ, outstanding work! 🚀</p>
                    <p className="mt-1 text-xs text-white/70 font-medium">You locked in <span className="text-white font-bold">+{log.points} XP</span> for: <span className="text-amber-400">{log.activity}</span>.</p>
                  </div>
                </div>
              </div>
            ), { duration: 4000 });
          }, index * 1500); // Stagger the toasts so they don't overlap
        });

        // Trigger Milestone Badges if the backend unlocked any
        res.data.syncResults.newBadges.forEach((badge, index) => {
          setTimeout(() => {
            toast.custom((t) => (
              <div className="max-w-sm w-full bg-gradient-to-br from-[#1c1537] to-[#0d071f] border-2 border-amber-500/30 p-5 rounded-2xl text-center relative overflow-hidden backdrop-blur-xl">
                <div className="text-5xl mb-2 animate-bounce">{badge.icon}</div>
                <h4 className="text-lg font-black text-amber-400">🏆 ACHIEVEMENT UNLOCKED!</h4>
                <p className="text-white font-bold text-sm mt-1">{badge.title}</p>
              </div>
            ), { duration: 5000 });
          }, (res.data.syncResults.logs.length * 1500) + (index * 2000));
        });
      }
    } catch (error) {
      console.error("Evaluation failed", error);
    }
  };

  return (
    <GamificationContext.Provider value={{ ...gameState, evaluateBackgroundData }}>
      {children}
    </GamificationContext.Provider>
  );
}

export const useGamification = () => useContext(GamificationContext);