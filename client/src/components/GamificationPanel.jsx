import React from 'react';
import { useGamification } from '../context/GamificationContext';
import { Award, Zap, History, Star, CheckCircle2 } from 'lucide-react';

const panelClass = 'rounded-3xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl p-6';

export default function GamificationPanel() {
  // ✅ FIXED: Using camelCase availableBadges and adding default empty arrays so .map() never crashes
  const { totalXP = 0, history = [], unlockedBadges = [], availableBadges = [] } = useGamification();

  // Compute standard user level progression values based on fixed 500 XP steps
  const currentLevel = Math.floor(totalXP / 500) + 1;
  const currentLevelXP = totalXP % 500;
  const progressPercentage = Math.min((currentLevelXP / 500) * 100, 100);

  // Safely calculate today's XP directly from the backend history logs
  const todayXP = history.reduce((sum, log) => sum + (log.points || 0), 0);

  return (
    <div className="grid gap-6 md:grid-cols-12 text-white">
      
      {/* 1. PROGRESS CARD (Main Level Profile Tracker) */}
      <div className={`${panelClass} md:col-span-12 flex flex-col justify-between relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Zap className="w-48 h-48 text-amber-400" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4 mb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Digital Twin Growth Status</span>
            <h3 className="text-3xl font-extrabold tracking-tight mt-0.5">Level {currentLevel} Operator</h3>
          </div>
          <div className="flex gap-4 items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Today's Pool</p>
              <p className="text-lg font-black text-[#10c7a1]">+{todayXP} XP</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Total Accumulated</p>
              <p className="text-lg font-black text-amber-400">{totalXP} XP</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-white/60 mb-2">
            <span>Progress to Next Level</span>
            <span>{currentLevelXP} / 500 XP ({Math.round(progressPercentage)}%)</span>
          </div>
          <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. CHRONOLOGICAL LEDGER (Activity History Log) */}
      <div className={`${panelClass} md:col-span-5 flex flex-col h-[400px]`}>
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
          <h4 className="text-md font-bold flex items-center gap-2 tracking-tight">
            <History className="h-4 w-4 text-cyan-400" /> Validation Log
          </h4>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/30 px-4">
              <CheckCircle2 className="h-8 w-8 stroke-[1.5] mb-2" />
              <p className="text-xs font-medium">No signals logged yet.</p>
              <p className="text-[10px] mt-0.5">APIs evaluate background data automatically.</p>
            </div>
          ) : (
            history.map((log, index) => (
              <div 
                key={log._id || index}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl bg-white/5 h-9 w-9 flex items-center justify-center rounded-lg">{log.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white/90 truncate">{log.activity}</p>
                    <p className="text-[10px] text-white/40 font-medium mt-0.5">Automated Validation</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#10c7a1] bg-[#10c7a1]/10 px-2 py-1 rounded border border-[#10c7a1]/10 shrink-0">
                  +{log.points} XP
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. ACHIEVEMENTS LOCKER (Permanent Badges Vault) */}
      <div className={`${panelClass} md:col-span-7 flex flex-col h-[400px]`}>
        <div className="mb-4 border-b border-white/5 pb-2">
          <h4 className="text-md font-bold flex items-center gap-2 tracking-tight">
            <Award className="h-4 w-4 text-amber-400" /> Milestone Showcase
          </h4>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
          {/* ✅ FIXED: Mapping over availableBadges from the backend */}
          {availableBadges.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <div 
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3 relative overflow-hidden ${
                  isUnlocked 
                    ? 'bg-gradient-to-br from-[#1a1c29] to-[#0e1017] border-amber-500/20 shadow-[0_4px_20px_rgba(245,158,11,0.05)]' 
                    : 'bg-black/20 border-white/5 opacity-40'
                }`}
              >
                <div className={`text-3xl p-2 rounded-xl bg-white/5 shrink-0 ${isUnlocked ? 'animate-pulse' : ''}`}>
                  {badge.icon}
                </div>
                <div className="min-w-0">
                  <h5 className={`text-sm font-bold truncate ${isUnlocked ? 'text-amber-400' : 'text-white/60'}`}>
                    {badge.title}
                  </h5>
                  <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                    {badge.requirement}
                  </p>
                  <p className="text-[10px] font-mono mt-2 text-white/30">
                    {isUnlocked ? '✅ Milestone Unlocked' : `🔒 Requires ${badge.xpNeeded} Total XP`}
                  </p>
                </div>
                {isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}