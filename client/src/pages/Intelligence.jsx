import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Zap, BrainCircuit, Activity, DollarSign, Briefcase } from 'lucide-react';
import { Toaster } from 'react-hot-toast'; // ✅ Added Toaster for pop-ups

// ✅ IMPORT THE GAMIFICATION ENGINE & UI PANEL
import { useGamification } from '../context/GamificationContext';
import GamificationPanel from '../components/GamificationPanel';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const Intelligence = () => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [insights, setInsights] = useState([]);
  const [rawData, setRawData] = useState(null);
  
  // ✅ INITIALIZE THE AUTONOMOUS EVALUATION HOOK
  const { evaluateBackgroundData } = useGamification();

  useEffect(() => {
    const fetchAndSynthesize = async () => {
      try {
        const token = localStorage.getItem('authToken');
        
        // 1. Fetch the raw background data
        const [healthRes, financeRes, careerRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/integrations/health`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/integrations/finance`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_BASE_URL}/api/integrations/career`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const dataPayload = {
          healthData: healthRes.data.data,
          financeData: financeRes.data.data,
          careerData: careerRes.data.data
        };
        
        setRawData(dataPayload);

        // ✅ 2. TRIGGER AUTONOMOUS GAMIFICATION EVALUATION
        // We pass the raw data payload directly into the gamification context 
        // to be processed by the backend rule engine quietly in the background.
        if (healthRes.data.success && financeRes.data.success && careerRes.data.success) {
           evaluateBackgroundData(dataPayload.healthData, dataPayload.financeData, dataPayload.careerData);
        }

        // 3. Feed it directly to the Synthesis Engine
        const aiResponse = await axios.post(`${API_BASE_URL}/api/ai/synthesis`, dataPayload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (aiResponse.data.success) {
          setInsights(aiResponse.data.insights);
        }
      } catch (error) {
        console.error('Synthesis flow failed:', error);
        // Fallback data just in case the API fails during demo
        setInsights([
          {
            title: "Data Offline",
            domainTags: ["System"],
            observation: "Could not reach the AI synthesis engine. Ensure backend is running.",
            action: "Check console for errors.",
            isPositive: false
          }
        ]);
      } finally {
        setIsGenerating(false);
      }
    };

    fetchAndSynthesize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to assign your beautiful colors based on the domain
  const getCardStyle = (tags) => {
    const tagString = tags.join(' ').toLowerCase();
    if (tagString.includes('health')) return { color: "from-pink-500 to-orange-400", icon: "💪" };
    if (tagString.includes('finance')) return { color: "from-cyan-500 to-blue-500", icon: "💰" };
    if (tagString.includes('career')) return { color: "from-violet-500 to-fuchsia-500", icon: "🚀" };
    return { color: "from-emerald-400 to-teal-500", icon: "🧠" };
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white px-8 pt-8 pb-8 relative overflow-hidden"> 
      
      {/* ✅ Added Toaster so your Gamification notifications appear on this page */}
      <Toaster position="top-right" />

      {/* Background Blurs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-pink-500/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-cyan-500/20 blur-3xl rounded-full pointer-events-none" />
      
      {/* Header */}
      <div className="mb-8 relative z-10">        
        <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
          AI Intelligence Center
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl">
          Your Digital Twin continuously analyzes health, finance, and career signals from your connected APIs to generate live, intelligent life insights.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div 
            key="loader"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-32"
          >
            <Loader2 className="h-16 w-16 text-cyan-400 animate-spin mb-6" />
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-pink-500 animate-pulse">
              Synthesizing API Data Streams...
            </h2>
            <p className="text-gray-500 mt-2">Correlating Apple Health, Plaid, and Career metrics.</p>
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="relative z-10"
          >
            
            {/* ✅ ADDED GAMIFICATION PANEL HERE */}
            <div className="mb-12">
               <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                 <Zap className="text-amber-400 h-8 w-8" /> Operator Status
               </h2>
               <GamificationPanel />
            </div>

            {/* Top Cards: The Synthesis Observations */}
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {insights.map((item, index) => {
                const style = getCardStyle(item.domainTags);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    whileHover={{ scale: 1.05, y: -10 }}
                    className={`bg-gradient-to-br ${style.color} rounded-3xl p-6 shadow-2xl transition duration-300 relative overflow-hidden`}
                  >
                    <div className="text-5xl mb-4 relative z-10">
                      {style.icon}
                    </div>

                    <h2 className="text-2xl font-bold mb-3 relative z-10 leading-tight">
                      {item.title}
                    </h2>

                    <p className="text-white/90 relative z-10 text-sm mb-4 line-clamp-3">
                      {item.observation}
                    </p>
                    
                    <div className="mt-auto relative z-10">
                      <div className="text-sm font-semibold text-white/80 mb-2 flex items-center justify-between">
                        <span>AI Confidence: High</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{item.domainTags.join(', ')}</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div className="bg-white h-2 rounded-full w-[94%] shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid md:grid-cols-12 gap-6">
              {/* Bottom Left: The Actionable Recommendations */}
              <div className="md:col-span-8 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl"> 
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <Zap className="text-yellow-400 h-8 w-8" /> Today's AI Recommendations
                </h2>
                <div className="space-y-4">
                  {insights.map((item, index) => (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + (index * 0.1) }}
                      key={index}
                      className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/20 transition flex items-start gap-4"
                    >
                      <div className={`mt-1 p-2 rounded-lg ${item.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-pink-500/20 text-pink-400'}`}>
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-white/90">{item.action}</p>
                        <p className="text-sm text-gray-400 mt-1">Based on recent {item.domainTags[0]} data anomalies.</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom Right: Raw Data Transparency (Mentors will love this) */}
              <div className="md:col-span-4 bg-[#0a0f1c] border border-white/10 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-32 h-32" />
                </div>
                <h3 className="text-xl font-bold text-gray-300 mb-4 border-b border-white/10 pb-3">
                  Live API Feed
                </h3>
                <div className="space-y-4 font-mono text-xs text-gray-400 relative z-10">
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                    <span className="text-pink-400">Health_API:</span><br/>
                    {rawData?.healthData?.metrics?.steps} Steps | {rawData?.healthData?.metrics?.sleepHours}h Sleep
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                    <span className="text-cyan-400">Finance_API:</span><br/>
                    Score: {rawData?.financeData?.creditScore} | Active Txns: {rawData?.financeData?.recentTransactions?.length}
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                    <span className="text-violet-400">Career_API:</span><br/>
                    {rawData?.careerData?.githubCommitsThisWeek} Commits | Latest: {rawData?.careerData?.recentCertificates?.[0]}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Intelligence;