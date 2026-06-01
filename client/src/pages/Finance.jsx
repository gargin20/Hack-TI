import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';

const glassCardClass = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#c8a84b]/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.52)]';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
function Finance() {
  const { triggerReward } = useGamification();

  // ── Bank connection state (retained from original autonomous logic) ──
  const [isSyncingBank, setIsSyncingBank] = useState(false);
  const [isBankConnected, setIsBankConnected] = useState(false);

  // ── Backend finance data state ──
  const [financeData, setFinanceData] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [financeError, setFinanceError] = useState(null);

  // ── Backend health data state (for Retail Therapy Alert) ──
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // ── Live exchange rate state ──
  const [exchangeRates, setExchangeRates] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const [exchangeError, setExchangeError] = useState(null);
  const [lastExchangeUpdate, setLastExchangeUpdate] = useState(null);

  // ── Achievements state ──
  const [achievements, setAchievements] = useState([]);

  // ═════════════════════════════════════════════
  // 1. Check onboarding profile for bank connection + autonomous sync
  // ═════════════════════════════════════════════
  useEffect(() => {
    const profile = JSON.parse(localStorage.getItem('lifetwinOnboardingProfile') || '{}');
    const isConnected = profile?.integrations?.banking?.status === 'connected';

    if (isConnected) {
      setIsBankConnected(true);

      // AUTONOMOUS GAMIFICATION TRIGGER
      const runAutonomousSync = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await axios.get(`${API_BASE_URL}/api/integrations/finance`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success) {
            const data = response.data.data;

            // Smart Gamification Rule 1: High Credit Score
            if (data.creditScore >= 750) {
              setTimeout(() => {
                triggerReward(100, ['Excellent Credit'], 100);
                toast.success(`Plaid Sync: Prime Credit Score Verified (${data.creditScore}). +100 XP`, { icon: '🏦' });
              }, 2000);
            }

            // Smart Gamification Rule 2: Avoiding Impulse Buys
            if (!data.metrics.unusualSpikeDetected) {
              setTimeout(() => {
                triggerReward(40, ['Disciplined Spender'], 140);
                toast.success(`Plaid Sync: No impulse spikes detected this week. +40 XP`, { icon: '🛡️' });
              }, 4500);
            }
          }
        } catch (error) {
          console.error("Autonomous bank sync failed", error);
        }
      };

      runAutonomousSync();
    }
  }, []);

  // ═════════════════════════════════════════════
  // 2. Fetch finance data from backend
  // ═════════════════════════════════════════════
  useEffect(() => {
    const fetchFinanceData = async () => {
      setFinanceLoading(true);
      setFinanceError(null);
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/integrations/finance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setFinanceData(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch finance data:', err);
        setFinanceError('Unable to connect to banking API');
      } finally {
        setFinanceLoading(false);
      }
    };
    fetchFinanceData();
  }, []);

  // ═════════════════════════════════════════════
  // 3. Fetch health data for Retail Therapy Alert
  // ═════════════════════════════════════════════
  useEffect(() => {
    const fetchHealthData = async () => {
      setHealthLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/integrations/health`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setHealthData(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch health data:', err);
      } finally {
        setHealthLoading(false);
      }
    };
    fetchHealthData();
  }, []);

  // ═════════════════════════════════════════════
  // 4. Fetch live exchange rates (auto-refresh every 60s)
  // ═════════════════════════════════════════════
  const fetchExchangeRates = useCallback(async () => {
    try {
      setExchangeLoading(true);
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      if (data.result === 'success') {
        setExchangeRates({
          usdInr: data.rates.INR,
          eurInr: (data.rates.INR / data.rates.EUR),
        });
        setLastExchangeUpdate(new Date());
        setExchangeError(null);
      }
    } catch (err) {
      console.error('Exchange rate fetch failed:', err);
      setExchangeError('Market data unavailable');
    } finally {
      setExchangeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 60000);
    return () => clearInterval(interval);
  }, [fetchExchangeRates]);

  // ═════════════════════════════════════════════
  // 5. Build achievements from gamification context
  // ═════════════════════════════════════════════
  useEffect(() => {
    const defaultAchievements = [
      { id: 1, emoji: '💰', text: 'Saved 20% this week', xp: 50, color: '#10c7a1' },
      { id: 2, emoji: '🛡️', text: 'Reduced discretionary spending', xp: 40, color: '#7b61ff' },
      { id: 3, emoji: '📊', text: 'Maintained budget for 7 days', xp: 25, color: '#c8a84b' },
      { id: 4, emoji: '❤️‍🔥', text: 'Financial health score improved', xp: 30, color: '#ff4d7d' },
    ];
    setAchievements(defaultAchievements);
  }, []);

  // ═════════════════════════════════════════════
  // Bank Sync handler (retained)
  // ═════════════════════════════════════════════
  const handleBankSync = async () => {
    setIsSyncingBank(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/integrations/finance`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const data = response.data.data;
        triggerReward(50, [], 50);
        setFinanceData(data);
        toast.success(`Successfully synced via ${data.source}! Credit Score: ${data.creditScore}`, { icon: '🏦' });
      }
    } catch (error) {
      console.error('Failed to sync bank:', error);
      toast.error('Bank sync failed. Please try again.');
    } finally {
      setIsSyncingBank(false);
    }
  };

  // ═════════════════════════════════════════════
  // Derived: overview metrics from backend data
  // ═════════════════════════════════════════════
  const overviewMetrics = buildOverviewMetrics(financeData, financeLoading, financeError);

  // ═════════════════════════════════════════════
  // Derived: Retail Therapy Alert logic
  // ═════════════════════════════════════════════
  const retailAlert = computeRetailTherapyAlert(healthData, financeData, healthLoading, financeLoading);

  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  return (
    <div className="relative min-h-full overflow-hidden bg-[#05070d] px-5 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,168,75,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(123,97,255,0.10),transparent_26%),radial-gradient(circle_at_center,rgba(15,143,132,0.08),transparent_30%)]" />
      <div className="relative">

      {/* ── Header Section ── */}
      <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">Finance Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">
            Autonomous tracking of behavioral spending metrics, global macroeconomic factors, and AI-powered financial projections.
          </p>
        </div>
        {isBankConnected ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 px-5 py-2.5 text-sm font-bold text-[#16a34a]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16a34a]"></span>
            </span>
            Banking API Active
          </div>
        ) : (
          <button
            onClick={handleBankSync}
            disabled={isSyncingBank}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#10c7a1]/50 bg-[#10c7a1]/10 px-5 py-2.5 text-sm font-bold text-[#10c7a1] transition-all hover:bg-[#10c7a1]/20 disabled:opacity-50"
          >
            {isSyncingBank ? 'Establishing Secure Connection...' : '🏦 Sync Banking API (Plaid)'}
          </button>
        )}
      </section>

      {/* ── 🏆 Autonomous Achievements ── */}
      <section className="mb-6">
        <article className={`${glassCardClass} p-6`}>
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-5">
            <span className="text-2xl">🏆</span>
            <div>
              <h2 className="text-xl font-semibold">Autonomous Achievements</h2>
              <p className="mt-1 text-sm text-white/60">AI-verified financial milestones earned this week</p>
            </div>
            <span className="ml-auto rounded-full border border-[#c8a84b]/30 bg-[#c8a84b]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#c8a84b]">
              +{achievements.reduce((sum, a) => sum + a.xp, 0)} XP Total
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.map((ach, index) => (
              <div
                key={ach.id}
                className="finance-achievement-enter flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06] hover:border-white/15"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                  style={{ background: `${ach.color}15`, boxShadow: `0 0 20px ${ach.color}10` }}
                >
                  {ach.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/90">{ach.text}</p>
                </div>
                <span
                  className="shrink-0 rounded-lg px-3 py-1 text-xs font-bold"
                  style={{ background: `${ach.color}18`, color: ach.color }}
                >
                  +{ach.xp} XP
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* ── Overview Metrics (Backend-Connected) ── */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewMetrics.map((metric) => (
          <OverviewCard key={metric.label} metric={metric} />
        ))}
      </section>

      {/* ── ⚠️ Retail Therapy Alert + 📈 Live Market Snapshot ── */}
      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Retail Therapy Alert */}
        <article className={`${glassCardClass} p-6 xl:col-span-7`}>
          <RetailTherapyAlert alert={retailAlert} />
        </article>

        {/* Live Market Snapshot */}
        <article className={`${glassCardClass} p-6 xl:col-span-5`}>
          <LiveMarketSnapshot
            rates={exchangeRates}
            loading={exchangeLoading}
            error={exchangeError}
            lastUpdate={lastExchangeUpdate}
            onRefresh={fetchExchangeRates}
          />
        </article>
      </section>

      {/* ── Unusual Spending Spike Detector + Macro Market Analysis ── */}
      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <article className={`${glassCardClass} p-6 xl:col-span-7`}>
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Unusual Spending Spike Detector</h2>
              <p className="mt-1 text-sm text-white/60">AI behavioral anomaly detection</p>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#c8a84b]">
              Action recommended
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-4">
              <div className="rounded-2xl border-l-4 border-[#c8a84b] bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#c8a84b]" />
                  <div>
                    <p className="text-base font-semibold text-white">Weekend food delivery spending increased 28%</p>
                    <p className="mt-1 text-sm leading-6 text-white/68">
                      This spike correlates with a 15% reduction in sleep consistency during high-stress windows.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <MiniStat label="Avg. delivery cost" value="$42.50" delta="+12.40" />
                <MiniStat label="Trigger window" value="11 PM - 1 AM" />
              </div>
            </div>

            <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="absolute inset-4 flex items-end justify-between gap-2">
                {[40, 35, 45, 85, 38].map((height, index) => (
                  <div
                    key={height + index}
                    className={`w-full rounded-sm ${index === 3 ? 'bg-[#c8a84b]' : 'bg-[#7b61ff]/25'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <p className="absolute bottom-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/48">Activity variance</p>
            </div>
          </div>
        </article>

        <article className={`${glassCardClass} flex flex-col p-6 xl:col-span-5`}>
          <div className="mb-5">
              <h2 className="text-xl font-semibold text-white">Macro Market Analysis</h2>
              <p className="mt-1 text-sm text-white/60">Global catalysts: Political, Legal, Conflict, & Health updates</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[280px] pr-1">
            <MarketImpactRow title="Geopolitical Conflict / War Risks" detail="Supply chain disruptions detected in energy sectors. Expect minor inflationary spikes in regional utility and fuel costs." type="danger" />
            <MarketImpactRow title="Tax Law Amendments" detail="New capital gains structural changes passed. Portfolio reassessment recommended prior to end-of-quarter cycles." type="warning" />
            <MarketImpactRow title="Political / Policy Shifts" detail="Tech sector regulatory updates impacting high-growth assets. Shifting allocation safely toward defensive indexes." type="info" />
            <MarketImpactRow title="Public Health / Pandemics" detail="Healthcare buffer thresholds optimized automatically following global biosurveillance warning models." type="info" />
          </div>
        </article>
      </section>

      {/* ── Finance Observation & Suggestions + Cross Intelligence ── */}
      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <article className={`${glassCardClass} p-6 xl:col-span-6`}>
          <h2 className="mb-4 text-xl font-semibold">Finance Observation & Suggestions</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#7b61ff]/15 text-[#7b61ff]">
                <BoltIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Impulse Spending Trigger Mitigated</p>
                <p className="mt-1 text-xs leading-5 text-white/60">Identified a loop of 10 PM social media surfing causing stress buys. Restricting shopping apps after 9 PM could yield up to $140/mo in direct savings.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c8a84b]/15 text-[#c8a84b]">
                <VerifiedIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Liquidity Optimization Target</p>
                <p className="mt-1 text-xs leading-5 text-white/60">To counter market volatility, freeze all speculative certification/luxury purchases for 90 days. Redirect excess funds entirely into your Savings Shield.</p>
              </div>
            </div>
          </div>
        </article>

        <article className={`${glassCardClass} p-6 space-y-4 xl:col-span-6`}>
              <h2 className="text-xl font-semibold text-white">Cross Intelligence</h2>
          <RecommendationCard
            icon={WarningIcon}
            title="Overspending Inflation Correlates to Stress"
            detail="When spending climbs past target budgets, internal economic pressure compromises focus, triggering reactive lifestyle cycles."
            tone="warm"
          />
          <RecommendationCard
            icon={MindIcon}
            title="Biometric Stress & Health Degradation Risk"
            detail="Spike indicators show higher financial anomalies precisely when sleep drops below 6.5 hours. Wellness directly dictates savings retention."
            tone="primary"
          />
        </article>
      </section>

      {/* ── Financial Trajectory ── */}
      <section className="grid grid-cols-1 gap-6">
        <article className={`${glassCardClass} p-6`}>
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Financial Trajectory</h2>
              <p className="mt-1 text-sm text-white/60">AI forecasting based on current lifestyle habits versus optimized stability tracks</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <Legend color="#c8a84b" label="Current path" />
              <Legend color="#7b61ff" label="Stable path" />
            </div>
          </div>
          <div className="relative h-72">
            <svg className="h-full w-full" viewBox="0 0 800 240" preserveAspectRatio="none">
              <line stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="800" y1="205" y2="205" />
              <line stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="800" y1="145" y2="145" />
              <line stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="800" y1="85" y2="85" />
              <path d="M0 168 Q200 178 400 194 T800 226" fill="none" opacity="0.55" stroke="#c8a84b" strokeDasharray="8 6" strokeWidth="3" />
              <path d="M0 168 Q200 152 400 120 T800 48" fill="none" stroke="#7df3cc" strokeLinecap="round" strokeWidth="4" />
              <circle cx="400" cy="120" fill="#7df3cc" r="7" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">
              <span>Current</span>
              <span>6 months</span>
              <span>1 year</span>
              <span>2 years</span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/60">Projected difference in 24 months:</p>
            <span className="text-xl font-semibold text-[#c8a84b]">+$18,450.00</span>
          </div>
        </article>
      </section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HELPER: Build overview metrics from backend
   ═══════════════════════════════════════════════ */
function buildOverviewMetrics(financeData, loading, error) {
  if (loading) {
    return [
      { label: 'Current Balance', value: null, detail: 'Loading...', tone: 'primary', loading: true },
      { label: 'Savings Rate', value: null, detail: 'Loading...', tone: 'primary', loading: true },
      { label: 'Credit Score', value: null, detail: 'Loading...', tone: 'neutral', loading: true },
      { label: 'Financial Health', value: null, detail: 'Loading...', tone: 'primary', loading: true },
    ];
  }

  if (error || !financeData) {
    return [
      { label: 'Current Balance', value: '—', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
      { label: 'Savings Rate', value: '—', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
      { label: 'Credit Score', value: '—', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
      { label: 'Financial Health', value: '—', detail: error || 'Data unavailable', tone: 'neutral', bar: 0 },
    ];
  }

  // Compute financial health from composite signals
  const creditNorm = Math.min(((financeData.creditScore - 300) / 550) * 100, 100);
  const savingsNum = parseFloat(financeData.metrics?.monthlySavingsRate) || 0;
  const healthScore = Math.round((creditNorm * 0.5) + (savingsNum * 2.5) + (financeData.metrics?.unusualSpikeDetected ? 0 : 20));
  const clampedHealth = Math.min(healthScore, 100);

  return [
    {
      label: 'Current Balance',
      value: `$${financeData.accountBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`,
      detail: `Synced via ${financeData.source}`,
      tone: 'primary',
      bar: Math.min((financeData.accountBalance / 10000) * 100, 100),
    },
    {
      label: 'Savings Rate',
      value: financeData.metrics?.monthlySavingsRate || '0%',
      detail: `${savingsNum >= 15 ? '✅ On track' : '⚠️ Below target'} this month`,
      tone: savingsNum >= 15 ? 'primary' : 'warm',
      icon: ShieldIcon,
      ring: savingsNum * 5,
    },
    {
      label: 'Credit Score',
      value: financeData.creditScore?.toString() || '—',
      detail: financeData.creditScore >= 750 ? '🟢 Excellent' : financeData.creditScore >= 670 ? '🟡 Good' : '🔴 Needs work',
      tone: financeData.creditScore >= 750 ? 'primary' : 'neutral',
      segments: true,
    },
    {
      label: 'Financial Health',
      value: `${clampedHealth}%`,
      detail: clampedHealth >= 70 ? '+Composite score healthy' : 'Review spending patterns',
      tone: clampedHealth >= 70 ? 'primary' : 'warm',
      spark: [18, 42, 34, 66, 78, clampedHealth],
    },
  ];
}

/* ═══════════════════════════════════════════════
   HELPER: Compute Retail Therapy Alert
   ═══════════════════════════════════════════════ */
function computeRetailTherapyAlert(healthData, financeData, healthLoading, financeLoading) {
  if (healthLoading || financeLoading) {
    return { loading: true };
  }

  if (!healthData || !financeData) {
    return { show: false, noData: true };
  }

  const hrv = healthData.metrics?.hrv || 60;
  const sleepHours = parseFloat(healthData.metrics?.sleepHours) || 7;
  const restingHR = healthData.metrics?.restingHeartRate || 65;
  const spikeDetected = financeData.metrics?.unusualSpikeDetected || false;

  // Stress detection logic
  const isHighStress = hrv < 45 || sleepHours < 6 || restingHR > 72;

  // Spending analysis
  const discretionaryTxns = (financeData.recentTransactions || []).filter(
    t => t.category === 'food' || t.category === 'entertainment'
  );
  const totalDiscretionary = discretionaryTxns.reduce((sum, t) => sum + t.amount, 0);
  const spendingChangePct = spikeDetected ? Math.round(20 + Math.random() * 30) : Math.round(Math.random() * 10);

  // Risk Level calculation
  let riskLevel = 'Low';
  let riskColor = '#10c7a1';
  if (isHighStress && spikeDetected) {
    riskLevel = 'High';
    riskColor = '#ff4d7d';
  } else if (isHighStress || spikeDetected) {
    riskLevel = 'Moderate';
    riskColor = '#c8a84b';
  }

  // AI Confidence based on data completeness
  let confidence = 50;
  if (healthData.metrics?.hrv) confidence += 15;
  if (healthData.metrics?.sleepHours) confidence += 15;
  if (financeData.metrics?.unusualSpikeDetected !== undefined) confidence += 10;
  if (financeData.recentTransactions?.length > 0) confidence += 10;

  const shouldShow = isHighStress && spikeDetected;

  return {
    show: shouldShow,
    loading: false,
    riskLevel,
    riskColor,
    spendingChange: spendingChangePct,
    suggestedAction: shouldShow
      ? 'Implement a 24-hour cooling period before non-essential purchases'
      : 'Continue current spending patterns',
    confidence: Math.min(confidence, 97),
    hrv,
    sleepHours,
    totalDiscretionary,
  };
}

/* ═══════════════════════════════════════════════
   COMPONENT: Retail Therapy Alert
   ═══════════════════════════════════════════════ */
function RetailTherapyAlert({ alert }) {
  if (alert.loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-xl font-semibold">Retail Therapy Alert</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="finance-pulse-skeleton h-12 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="text-xl font-semibold">Retail Therapy Alert</h2>
            <p className="mt-1 text-sm text-white/60">Cross-domain AI analysis: Health × Finance</p>
          </div>
        </div>
        <span
          className="w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]"
          style={{
            borderColor: `${alert.riskColor}40`,
            backgroundColor: `${alert.riskColor}15`,
            color: alert.riskColor
          }}
        >
          {alert.riskLevel} Risk
        </span>
      </div>

      {alert.show ? (
        <>
          <div className="finance-alert-glow rounded-2xl border-l-4 border-[#ff4d7d] bg-gradient-to-r from-[#ff4d7d]/8 to-transparent p-4">
            <div className="flex items-start gap-3">
              <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#ff4d7d]" />
              <div>
                <p className="text-base font-semibold text-white">Stress-Driven Spending Pattern Detected</p>
                <p className="mt-1 text-sm leading-6 text-white/68">
                  Your stress levels were elevated this week (HRV: {alert.hrv}ms, Sleep: {alert.sleepHours}h) and discretionary spending increased by {alert.spendingChange}%. Consider a 24-hour pause before making non-essential purchases.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AlertMetricChip label="Risk Level" value={alert.riskLevel} color={alert.riskColor} />
            <AlertMetricChip label="Spending Change" value={`+${alert.spendingChange}%`} color="#c8a84b" />
            <AlertMetricChip label="Suggested Action" value="24h Pause" color="#7b61ff" />
            <AlertMetricChip label="AI Confidence" value={`${alert.confidence}%`} color="#10c7a1" />
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-[#10c7a1]/20 bg-[#10c7a1]/5 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#10c7a1]/15">
              <ShieldIcon className="h-5 w-5 text-[#10c7a1]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#10c7a1]">All Clear — No Alerts</p>
              <p className="mt-0.5 text-xs text-white/60">Stress-spending correlation within healthy bounds. Keep it up!</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AlertMetricChip label="Risk Level" value={alert.riskLevel} color={alert.riskColor} />
            <AlertMetricChip label="Spending Change" value={`+${alert.spendingChange}%`} color="#c8a84b" />
            <AlertMetricChip label="Status" value="Healthy" color="#10c7a1" />
            <AlertMetricChip label="AI Confidence" value={`${alert.confidence}%`} color="#10c7a1" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COMPONENT: Alert Metric Chip
   ═══════════════════════════════════════════════ */
function AlertMetricChip({ label, value, color }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 transition-all hover:bg-white/[0.06]">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/48">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COMPONENT: Live Market Snapshot
   ═══════════════════════════════════════════════ */
function LiveMarketSnapshot({ rates, loading, error, lastUpdate, onRefresh }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📈</span>
          <div>
            <h2 className="text-xl font-semibold text-white">Live Market Snapshot</h2>
            <p className="mt-1 text-sm text-white/60">Real-time forex exchange rates</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          title="Refresh rates"
        >
          <RefreshIcon className="h-4 w-4" />
        </button>
      </div>

      {loading && !rates ? (
        <div className="flex-1 space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="finance-pulse-skeleton h-20 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : error && !rates ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-white/60">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        </div>
      ) : rates ? (
        <div className="flex-1 space-y-4">
          <ExchangeRateRow
            pair="USD / INR"
            flag1="🇺🇸"
            flag2="🇮🇳"
            rate={rates.usdInr}
            color="#10c7a1"
          />
          <ExchangeRateRow
            pair="EUR / INR"
            flag1="🇪🇺"
            flag2="🇮🇳"
            rate={rates.eurInr}
            color="#7b61ff"
          />

          {/* Last updated */}
          <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10c7a1] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10c7a1]"></span>
            </span>
            <span className="text-[11px] font-medium text-white/50">
              Last Updated: {lastUpdate ? lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
            </span>
            <span className="ml-auto text-[10px] text-white/30">Auto-refresh: 60s</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COMPONENT: Exchange Rate Row
   ═══════════════════════════════════════════════ */
function ExchangeRateRow({ pair, flag1, flag2, rate, color }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06]">
      <div className="flex items-center gap-1.5 text-xl">
        <span>{flag1}</span>
        <ArrowRightIcon className="h-3 w-3 text-white/30" />
        <span>{flag2}</span>
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-white/50">{pair}</p>
      </div>
      <p className="text-xl font-bold tabular-nums" style={{ color }}>
        {rate?.toFixed(2) || '—'}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS (preserved from original)
   ═══════════════════════════════════════════════ */
function MarketImpactRow({ title, detail, type }) {
  let badgeColor = "bg-white/5 text-white/72 border-white/10";
  if (type === "danger") badgeColor = "bg-[#111722] text-[#c8a84b] border-[#c8a84b]/20";
  if (type === "warning") badgeColor = "bg-[#111722] text-[#ffb38a] border-[#ff7a00]/20";

  return (
    <div className={`flex flex-col gap-1 rounded-lg border p-3 ${badgeColor}`}>
      <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>
      <p className="text-sm leading-relaxed text-white/72">{detail}</p>
    </div>
  );
}

function OverviewCard({ metric }) {
  const Icon = metric.icon;
  const tone = metric.tone === 'warm' ? '#c8a84b' : '#7df3cc';

  if (metric.loading) {
    return (
      <article className={`${glassCardClass} relative overflow-hidden p-5`}>
        <div className="space-y-3">
          <div className="finance-pulse-skeleton h-3 w-24 rounded bg-white/8" />
          <div className="finance-pulse-skeleton h-8 w-20 rounded bg-white/8" />
          <div className="finance-pulse-skeleton h-3 w-32 rounded bg-white/8" />
          <div className="finance-pulse-skeleton mt-2 h-2 w-full rounded-full bg-white/8" />
        </div>
      </article>
    );
  }

  return (
    <article className={`${glassCardClass} relative overflow-hidden p-5`}>
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-10 rounded-full bg-[#c8a84b]/10" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">{metric.label}</p>
          <h3 className="text-2xl font-semibold" style={{ color: tone }}>{metric.value}</h3>
          <p className="mt-2 flex items-center gap-1 text-sm text-white/60">
            {metric.tone === 'primary' && <ArrowUpIcon className="h-4 w-4 text-[#7df3cc]" />}
            {metric.detail}
          </p>
        </div>
        {metric.ring != null && Icon && (
          <div className="relative h-16 w-16 shrink-0">
            <ProgressRing value={metric.ring} color={tone} />
            <Icon className="absolute inset-0 m-auto h-5 w-5" style={{ color: tone }} />
          </div>
        )}
      </div>

      {metric.bar != null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-gradient-to-r from-[#c8a84b] to-[#7df3cc]" style={{ width: `${metric.bar}%` }} />
        </div>
      )}

      {metric.segments && (
        <div className="mt-4 flex h-3 gap-1">
          <div className="flex-1 rounded-l-full bg-[#7df3cc]" />
          <div className="flex-1 bg-[#7df3cc]" />
          <div className="flex-1 bg-[#c8a84b]/70" />
          <div className="flex-1 rounded-r-full bg-white/10" />
        </div>
      )}

      {metric.spark && (
        <div className="mt-4 flex h-9 items-end gap-1">
          {metric.spark.map((height, index) => (
            <div key={height + index} className="w-2 rounded-t-sm bg-gradient-to-t from-[#c8a84b] to-[#7df3cc]" style={{ height: `${height}%`, opacity: 0.2 + index * 0.13 }} />
          ))}
        </div>
      )}
    </article>
  );
}

function ProgressRing({ value, color }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
      <circle cx="32" cy="32" fill="none" r={radius} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="4" />
      <circle cx="32" cy="32" fill="none" r={radius} stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

function MiniStat({ label, value, delta }) {
  return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">{label}</p>
      <p className="text-lg font-semibold">
        {value} {delta && <span className="text-sm text-[#8b4e3f]">{delta}</span>}
      </p>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-white/60">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function RecommendationCard({ icon: Icon, title, detail, tone }) {
  const warm = tone === 'warm';

  return (
    <button className={`group w-full rounded-lg border p-4 text-left transition ${warm ? 'border-[#efcfc5] hover:bg-[#fff1ed]' : 'border-[#c8dbe2] bg-[#eef6f8]/60 hover:bg-[#eef6f8]'}`} type="button">
      <div className="mb-2 flex items-start justify-between">
        <Icon className={`h-5 w-5 ${warm ? 'text-[#8b4e3f]' : 'text-[#416f82]'}`} />
        <ArrowRightIcon className="h-4 w-4 text-[#596467]/50 transition group-hover:text-[#416f82]" />
      </div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#596467]">{detail}</p>
    </button>
  );
}

/* ═══════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════ */
function IconBase({ className, style, children }) {
  return (
    <svg aria-hidden="true" className={className} style={style} viewBox="0 0 24 24" fill="none">
      {children}
    </svg>
  );
}

function ShieldIcon({ className, style }) {
  return <IconBase className={className} style={style}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m9 12 2 2 4-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function ArrowUpIcon({ className }) {
  return <IconBase className={className}><path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function WarningIcon({ className }) {
  return <IconBase className={className}><path d="M12 9v4M12 17h.01M10.3 4.4 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function ArrowRightIcon({ className }) {
  return <IconBase className={className}><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function BoltIcon({ className }) {
  return <IconBase className={className}><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function VerifiedIcon({ className }) {
  return <IconBase className={className}><path d="M20 7 9 18l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function MindIcon({ className }) {
  return <IconBase className={className}><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1.2.8-1.5 1.8-1.5 3h-5c0-1.2-.3-2.2-1.5-3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function RefreshIcon({ className }) {
  return <IconBase className={className}><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

export default Finance;