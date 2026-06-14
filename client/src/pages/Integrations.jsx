import React, { useState } from 'react';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';
import { Activity, CreditCard, GitBranch, CheckCircle, Loader2, Link2, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const glassCardClass = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl p-6 transition-all hover:border-white/20';

export default function Integrations() {
  const { triggerReward } = useGamification();
  const [syncStatus, setSyncStatus] = useState({ health: false, finance: false, career: false });
  const [loading, setLoading] = useState({ health: false, finance: false, career: false });
  const [lastSyncData, setLastSyncData] = useState({ health: null, finance: null, career: null });

  const handleSync = async (domain, endpoint) => {
    // Set loading state for specific card
    setLoading(prev => ({ ...prev, [domain]: true }));
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/integrations/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSyncStatus(prev => ({ ...prev, [domain]: true }));
        setLastSyncData(prev => ({ ...prev, [domain]: response.data.data }));
        
        // Trigger Gamification for connecting an API
        triggerReward(50, [], 50);
      }
    } catch (error) {
      console.error(`Failed to sync ${domain}:`, error);
      alert(`API Connection Failed for ${domain}`);
    } finally {
      setLoading(prev => ({ ...prev, [domain]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] px-5 py-8 text-white sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,97,255,0.1),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,199,161,0.1),transparent_30%)]" />

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-10 flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight">API Data Sources</h1>
          <p className="text-white/60">Connect external services to automate your LifeTwin Copilot.</p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Health Integration Card */}
          <IntegrationCard 
            title="Apple Health / Fitbit" 
            icon={Activity} 
            color="#ff4d7d"
            domain="health"
            isLoading={loading.health}
            isConnected={syncStatus.health}
            syncData={lastSyncData.health}
            onSync={() => handleSync('health', 'health')}
          />

          {/* Finance Integration Card */}
          <IntegrationCard 
            title="Banking & Credit Score" 
            icon={CreditCard} 
            color="#10c7a1"
            domain="finance"
            isLoading={loading.finance}
            isConnected={syncStatus.finance}
            syncData={lastSyncData.finance}
            onSync={() => handleSync('finance', 'finance')}
          />

          {/* Career Integration Card */}
          <IntegrationCard 
            title="GitHub & LinkedIn" 
            icon={GitBranch} 
            color="#c8a84b"
            domain="career"
            isLoading={loading.career}
            isConnected={syncStatus.career}
            syncData={lastSyncData.career}
            onSync={() => handleSync('career', 'career')}
          />

        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ title, icon: Icon, color, isLoading, isConnected, syncData, onSync }) {
  return (
    <article className={`${glassCardClass} flex flex-col h-full`}>
      <div className="flex items-start justify-between mb-6">
        <div className="rounded-xl p-3 bg-white/5" style={{ color: color }}>
          <Icon className="h-6 w-6" />
        </div>
        {isConnected ? (
          <span className="flex items-center gap-1 rounded-full bg-[#10c7a1]/10 px-3 py-1 text-xs font-bold text-[#10c7a1] border border-[#10c7a1]/20">
            <CheckCircle className="h-3 w-3" /> Connected
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/40 border border-white/10">
            <Link2 className="h-3 w-3" /> Disconnected
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-white/50 mb-6 flex-grow">
        Automatically sync metrics, transactions, and career milestones.
      </p>

      {/* Render mock data if connected */}
      {isConnected && syncData && (
        <div className="mb-6 rounded-lg bg-white/5 p-4 text-xs font-mono text-white/70 overflow-hidden">
          <p className="text-[#10c7a1] mb-1">// Latest Sync Payload</p>
          {syncData.metrics?.steps && <p>Steps: <span className="text-white">{syncData.metrics.steps}</span></p>}
          {syncData.creditScore && <p>Credit Score: <span className="text-white">{syncData.creditScore}</span></p>}
          {syncData.githubCommitsThisWeek && <p>Commits: <span className="text-white">{syncData.githubCommitsThisWeek}</span></p>}
        </div>
      )}

      <button 
        onClick={onSync}
        disabled={isLoading}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all disabled:opacity-50"
        style={{ 
          backgroundColor: isConnected ? 'rgba(255,255,255,0.05)' : color,
          color: isConnected ? 'white' : 'black',
          border: isConnected ? '1px solid rgba(255,255,255,0.1)' : 'none'
        }}
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Authenticating...</>
        ) : isConnected ? (
          <><RefreshCw className="h-4 w-4" /> Force Resync</>
        ) : (
          <><Link2 className="h-4 w-4" /> Connect API</>
        )}
      </button>
    </article>
  );
}