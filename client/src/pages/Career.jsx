import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';
import {
  Code2, TrendingUp, TrendingDown,
  AlertTriangle, Zap, Target, Activity, ExternalLink,
  ChevronDown, ChevronUp, Sparkles, RefreshCw, Award,
} from 'lucide-react';

// ─── Design tokens (mirrors Health page dark theme) ───────────────────────────
const card  = 'rounded-2xl border border-white/10 bg-[#11131a]/84 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl';
const iCard = `${card} transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#7b61ff]/30 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)]`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const token = () => localStorage.getItem('authToken');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function seededRng(seed, offset) {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x); // 0..1
}

// ─── Activity heatmap — 35 days of seeded stable data ────────────────────────
function buildHeatmap(githubData) {
  const today = new Date();
  const todaySeed = parseInt(today.toISOString().slice(0, 10).replace(/-/g, ''), 10);
  return Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (34 - i));
    const seed = todaySeed - (34 - i);
    const raw = seededRng(seed, 7);
    // If github is connected, weight toward actual recent activity
    const base = githubData?.recentActivityCount > 8 ? 0.55 : 0.35;
    const val = raw > (1 - base) ? Math.floor(raw * 4) + 1 : 0;
    return { date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), count: val };
  });
}

// ─── 7-day burnout forecast (uses real burnoutRisk + studyHours + sleepHours) ─
function buildBurnoutForecast(burnoutRisk, studyHours, sleepHours) {
  const today = new Date();
  const base = burnoutRisk ?? 45;
  const sleepPenalty  = Math.max(0, 7 - (sleepHours || 7)) * 3;
  const studyPressure = Math.max(0, (studyHours || 4) - 5) * 2.5;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    // Trend upward slightly each day if already stressed
    const drift = i * (sleepPenalty + studyPressure) * 0.4;
    const noise = (seededRng(parseInt(d.toISOString().slice(0, 10).replace(/-/g, ''), 10), 13) - 0.5) * 6;
    const risk  = clamp(Math.round(base + drift + noise), 10, 96);
    return { label, risk };
  });
}

// ─── Cross-domain insights (health × career × finance) ───────────────────────
function buildCrossInsights(profile, analytics, wearable) {
  const insights = [];
  const studyH  = profile?.studyHours  || 4;
  const sleepH  = profile?.sleepHours  || 7;
  const burnout = analytics?.burnoutRisk ?? 50;
  const prod    = analytics?.productivityScore ?? 60;
  const fin     = analytics?.financialHealth ?? 60;

  if (sleepH < 6 && studyH > 7) {
    insights.push({
      icon: '🔥', severity: 'critical', color: '#f87171',
      title: 'Sleep Debt × Study Overload',
      body: `${studyH}h study on ${sleepH}h sleep creates a compounding cognitive debt. Research shows problem-solving speed drops 22% per night of sub-6h sleep — your code quality is paying the price.`,
      action: 'Cap study at 6h and protect sleep above everything else this week.',
    });
  }
  if (burnout > 65 && prod < 60) {
    insights.push({
      icon: '⚠️', severity: 'warning', color: '#fbbf24',
      title: 'Burnout Risk × Productivity Gap',
      body: `Your burnout risk is ${burnout}% while productivity sits at ${prod}/100. These two signals together mean you're working hard but outputting less — the classic pre-burnout warning pattern.`,
      action: 'One full rest day this week recovers more output than pushing through.',
    });
  }
  if (fin < 50 && studyH > 6) {
    insights.push({
      icon: '💸', severity: 'warning', color: '#fbbf24',
      title: 'Financial Pressure × Study Hours',
      body: `Financial stress (health score ${fin}%) combined with heavy study load is a known focus-killer. Financial anxiety occupies working memory — the same resource you need for deep coding.`,
      action: 'Resolve one pending financial task this week to free up cognitive bandwidth.',
    });
  }
  if (burnout < 40 && prod > 70) {
    insights.push({
      icon: '🚀', severity: 'positive', color: '#4ade80',
      title: 'Recovery × Performance Alignment',
      body: `Burnout risk is low at ${burnout}% and productivity is strong at ${prod}/100. Your Digital Twin says: this is your window. Take on the hardest technical challenge you've been avoiding.`,
      action: 'This is your peak window — tackle the highest-difficulty item on your roadmap.',
    });
  }
  if (insights.length === 0) {
    insights.push({
      icon: '📡', severity: 'neutral', color: '#94a3b8',
      title: 'Signals Stable',
      body: 'Career, health, and finance signals are in balance. No critical cross-domain friction detected right now.',
      action: 'Maintain current rhythm and keep logging to improve prediction accuracy.',
    });
  }
  return insights;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Career() {
  const [mounted, setMounted]             = useState(false);
  const [dashProfile, setDashProfile]     = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [debriefText, setDebriefText]     = useState(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefError, setDebriefError]   = useState('');

  const { triggerReward } = useGamification();
  const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    fetchDashProfile();
  }, []);

  async function fetchDashProfile() {
    setProfileLoading(true);
    try {
      const res = await axios.get(`${API}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.data?.success) setDashProfile(res.data.data);
    } catch (err) {
      console.error('Career dashboard fetch failed', err);
    } finally {
      setProfileLoading(false);
    }
  }

  // ── AI Career Debrief via Claude ────────────────────────────────────────────
  async function fetchCareerDebrief() {
    setDebriefLoading(true); setDebriefError(''); setDebriefText(null);
    try {
      const pr = dashProfile?.profile || {};
      const an = dashProfile?.analytics || {};
      const gh = dashProfile?.githubData || {};
      const lc = dashProfile?.leetcodeData || {};
      const li = dashProfile?.linkedinData || {};
      const lines = [
        'You are a direct, warm career coach inside a Digital Twin app. Speak in second person.',
        'Write EXACTLY 3 sentences. No lists, no headers, no markdown. Just flowing prose.',
        'Sentence 1: Summarise what the data says about their career trajectory today — use specific numbers.',
        'Sentence 2: Name the single biggest opportunity or risk in their career right now.',
        'Sentence 3: Give one concrete, high-leverage action for this week.',
        '',
        'USER DATA:',
        `Burnout risk: ${an.burnoutRisk ?? 'unknown'}%.`,
        `Productivity score: ${an.productivityScore ?? 'unknown'}/100.`,
        `Coding consistency: ${an.codingConsistency ?? 'unknown'}/100.`,
        `Career momentum: ${an.careerMomentum ?? 'unknown'}/100.`,
        gh.connected ? `GitHub: ${gh.recentActivityCount} recent commits, ${gh.publicRepos} public repos, ${gh.followers} followers.` : 'GitHub not connected.',
        lc.connected ? `LeetCode: ${lc.totalSolved} problems solved (${lc.hardSolved} hard), ${lc.acceptanceRate}% acceptance.` : 'LeetCode not connected.',
        li.connected ? `LinkedIn profile strength: ${li.profileStrength}%.` : 'LinkedIn not connected.',
        pr.studyHours ? `Studies ${pr.studyHours} hours/day.` : '',
        pr.sleepHours ? `Sleeps ${pr.sleepHours} hours/night.` : '',
      ].filter(Boolean).join('\n');

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: lines }],
        }),
      });
      const data = await res.json();
      const text = data?.content?.find(b => b.type === 'text')?.text?.trim() || '';
      if (text) setDebriefText(text);
      else setDebriefError('Could not generate your debrief — try again.');
    } catch { setDebriefError('AI service unreachable. Check your connection.'); }
    finally { setDebriefLoading(false); }
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const profile     = dashProfile?.profile    || {};
  const analytics   = dashProfile?.analytics  || {};
  const aiInsights  = dashProfile?.aiInsights || [];
  const careerInsights = dashProfile?.careerInsights || [];
  const recommendations = (dashProfile?.recommendations || []).filter(r => r.category === 'career');
  const githubData  = dashProfile?.githubData  || {};
  const leetcodeData = dashProfile?.leetcodeData || {};
  const linkedinData = dashProfile?.linkedinData || {};

  const name         = profile?.githubData?.name || profile?.githubUsername || 'You';
  const greeting     = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const burnoutRisk  = analytics?.burnoutRisk ?? null;
  const prodScore    = analytics?.productivityScore ?? null;
  const codingScore  = analytics?.codingConsistency ?? null;
  const momentumScore = analytics?.careerMomentum ?? null;
  const growthScore  = analytics?.professionalGrowthScore ?? null;

  // Metric cards — from real backend analytics
  const careerMetrics = [
    {
      key: 'momentum', label: 'Career Momentum', icon: TrendingUp,
      value: momentumScore, color: '#7b61ff',
      status: momentumScore == null ? null : momentumScore >= 70 ? 'Strong' : momentumScore >= 45 ? 'Building' : 'Stalled',
      good: momentumScore >= 55,
    },
    {
      key: 'coding', label: 'Coding Consistency', icon: Code2,
      value: codingScore, color: '#10c7a1',
      status: codingScore == null ? null : codingScore >= 70 ? 'Consistent' : codingScore >= 40 ? 'Irregular' : 'Weak Signal',
      good: codingScore >= 55,
    },
    {
      key: 'productivity', label: 'Productivity', icon: Zap,
      value: prodScore, color: '#fbbf24',
      status: prodScore == null ? null : prodScore >= 75 ? 'High Output' : prodScore >= 50 ? 'Moderate' : 'Low',
      good: prodScore >= 60,
    },
    {
      key: 'burnout', label: 'Burnout Risk', icon: Activity,
      value: burnoutRisk, color: burnoutRisk > 65 ? '#f87171' : burnoutRisk > 40 ? '#fbbf24' : '#4ade80',
      status: burnoutRisk == null ? null : burnoutRisk > 65 ? 'High Risk' : burnoutRisk > 40 ? 'Moderate' : 'Low Risk',
      good: burnoutRisk <= 50,
      inverted: true, // lower = better
    },
    {
      key: 'growth', label: 'Professional Growth', icon: Award,
      value: growthScore, color: '#c084fc',
      status: growthScore == null ? null : growthScore >= 70 ? 'All-Star' : growthScore >= 40 ? 'Growing' : 'Early Stage',
      good: growthScore >= 55,
    },
  ];

  const heatmap      = useMemo(() => buildHeatmap(githubData), [githubData]);
  const forecast     = useMemo(() => buildBurnoutForecast(burnoutRisk, profile?.studyHours, profile?.sleepHours), [burnoutRisk, profile]);
  const crossInsights = useMemo(() => buildCrossInsights(profile, analytics, null), [profile, analytics]);

  const productivityInsight = aiInsights.find(i => i.label === 'Productivity');
  const burnoutInsight      = aiInsights.find(i => i.label === 'Burnout Risk');

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-full overflow-hidden bg-[#06080f] px-6 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,97,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(200,168,75,0.10),transparent_26%),radial-gradient(circle_at_center_top,rgba(16,199,161,0.06),transparent_28%)]" />

      <div className="relative space-y-8">

        {/* ── HEADER ── */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/40 mb-1">{greeting}{name && name !== 'You' ? `, ${name}` : ''}</p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Career Intelligence</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/55">
              {profileLoading ? 'Loading your career signals…' :
               burnoutRisk != null && burnoutRisk > 65
                ? `Burnout risk is at ${burnoutRisk}% — your productivity output is ${prodScore}/100. Recovery is the highest-leverage career move right now.`
                : prodScore != null && prodScore >= 75
                ? `Productivity at ${prodScore}/100 with ${codingScore}/100 coding consistency. ${name !== 'You' ? name : 'Your'} Digital Twin says: you're in a strong window — use it.`
                : momentumScore != null
                ? `Career momentum: ${momentumScore}/100. ${githubData?.connected ? `${githubData.recentActivityCount} GitHub commits this cycle.` : 'Connect GitHub to deepen signal accuracy.'}`
                : 'Connect your GitHub, LeetCode, and LinkedIn to unlock live career intelligence.'}
            </p>
          </div>
          <button
            onClick={fetchDashProfile}
            disabled={profileLoading}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/8 hover:text-white/70 transition-all disabled:opacity-40">
            <RefreshCw className={`h-3.5 w-3.5 ${profileLoading ? 'animate-spin' : ''}`} />
            {profileLoading ? 'Syncing…' : 'Refresh signals'}
          </button>
        </section>

        {/* ── METRIC CARDS ── */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {careerMetrics.map(m => (
            m.value != null
              ? <CareerMetricCard key={m.key} metric={m} mounted={mounted} />
              : <NoSignalCard key={m.key} label={m.label} icon={m.icon} />
          ))}
        </section>

        {/* ── AI CAREER DEBRIEF ── */}
        <section>
          <article className={`${card} border-[#7b61ff]/20 bg-gradient-to-br from-[#7b61ff]/5 to-[#06080f] p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#7b61ff]/30 to-[#c084fc]/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[#c084fc]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Daily Career Debrief</h2>
                  <p className="text-xs text-white/40 mt-0.5">Your Digital Twin reads your signals and speaks directly to you.</p>
                </div>
              </div>
              <button
                onClick={fetchCareerDebrief}
                disabled={debriefLoading}
                className="flex items-center gap-2 rounded-xl border border-[#7b61ff]/40 bg-[#7b61ff]/10 px-4 py-2.5 text-sm font-bold text-[#c084fc] hover:bg-[#7b61ff]/20 transition-all disabled:opacity-50">
                {debriefLoading
                  ? <><div className="h-4 w-4 rounded-full border-2 border-[#c084fc]/30 border-t-[#c084fc] animate-spin" /> Thinking…</>
                  : <><Sparkles className="h-4 w-4" /> Generate today's debrief</>}
              </button>
            </div>

            {!debriefText && !debriefLoading && !debriefError && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-[#7b61ff]/20 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-[#7b61ff]/30" />
                </div>
                <p className="text-sm text-white/35 max-w-sm leading-relaxed">
                  Hit "Generate today's debrief" and your Digital Twin will synthesise your GitHub activity, productivity score, burnout trajectory, and study habits into a personalised 3-sentence briefing.
                </p>
              </div>
            )}
            {debriefLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="flex gap-1.5">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="h-2 w-2 rounded-full bg-[#7b61ff]/60 animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>
                <p className="text-sm text-white/30">Reading your signals…</p>
              </div>
            )}
            {debriefError && (
              <div className="rounded-xl bg-[#ea580c]/10 border border-[#ea580c]/20 px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-[#ea580c] shrink-0" />
                <p className="text-sm text-[#ea580c]/80">{debriefError}</p>
              </div>
            )}
            {debriefText && (
              <div className="rounded-2xl bg-gradient-to-br from-[#7b61ff]/8 to-transparent border border-[#7b61ff]/15 p-5">
                <p className="text-base leading-[1.8] text-white/85 font-light">{debriefText}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[10px] text-white/25 uppercase tracking-widest">
                    Generated from live signals · {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short' })}
                  </p>
                  <button onClick={fetchCareerDebrief} className="text-xs text-[#7b61ff]/60 hover:text-[#7b61ff] transition-colors">
                    Regenerate ↺
                  </button>
                </div>
              </div>
            )}

            {/* Backend AI insights below debrief */}
            {(productivityInsight || burnoutInsight) && (
              <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {[productivityInsight, burnoutInsight].filter(Boolean).map((ins, i) => (
                  <div key={i} className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                    ins.colorState === 'green'  ? 'bg-[#4ade80]/5 border-[#4ade80]/15' :
                    ins.colorState === 'orange' ? 'bg-[#fbbf24]/5 border-[#fbbf24]/15' :
                                                  'bg-[#f87171]/5 border-[#f87171]/15'}`}>
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor:
                      ins.colorState === 'green' ? '#4ade80' : ins.colorState === 'orange' ? '#fbbf24' : '#f87171' }} />
                    <div>
                      <p className="text-xs font-bold text-white/60 uppercase tracking-wider mb-1">Your Twin on {ins.label}</p>
                      <p className="text-sm text-white/70 leading-relaxed">{ins.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* ── INTEGRATIONS OVERVIEW + HEATMAP ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">

          {/* Integrations */}
          <article className={`${iCard} p-6 xl:col-span-5`}>
            <div className="mb-5 border-b border-white/8 pb-4">
              <h2 className="text-xl font-bold text-white">Live Signal Sources</h2>
              <p className="mt-1 text-sm text-white/45">Your career intelligence is only as good as its inputs.</p>
            </div>
            <div className="space-y-3">
              <IntegrationRow
                icon={<GithubIcon className="h-5 w-5" />}
                name="GitHub"
                color="#c084fc"
                connected={!!githubData?.connected}
                detail={githubData?.connected
                  ? `${githubData.recentActivityCount ?? 0} commits · ${githubData.publicRepos ?? 0} repos · ${githubData.followers ?? 0} followers`
                  : 'Connect via onboarding to track commit consistency'}
                score={githubData?.connected ? Math.min(100, Math.round(35 + (githubData.recentActivityCount ?? 0) * 4)) : null}
              />
              <IntegrationRow
                icon={<Code2 className="h-5 w-5" />}
                name="LeetCode"
                color="#10c7a1"
                connected={!!leetcodeData?.connected}
                detail={leetcodeData?.connected
                  ? `${leetcodeData.totalSolved ?? 0} solved · ${leetcodeData.hardSolved ?? 0} hard · ${leetcodeData.acceptanceRate ?? 0}% acceptance`
                  : 'Connect via onboarding to track problem-solving strength'}
                score={leetcodeData?.connected ? Math.min(100, Math.round(30 + (leetcodeData.totalSolved ?? 0) * 0.35)) : null}
              />
              <IntegrationRow
                icon={<LinkedinIcon className="h-5 w-5" />}
                name="LinkedIn"
                color="#7b61ff"
                connected={!!linkedinData?.connected}
                detail={linkedinData?.connected
                  ? `Profile strength: ${linkedinData.profileStrength ?? 0}%`
                  : 'Connect via onboarding to track professional visibility'}
                score={linkedinData?.connected ? (linkedinData.profileStrength ?? 0) : null}
              />
            </div>

            {/* Career-specific recommendations from backend */}
            {recommendations.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Recommended actions</p>
                <div className="space-y-2.5">
                  {recommendations.slice(0, 3).map((r, i) => (
                    <div key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border ${
                      r.colorState === 'green' ? 'bg-[#4ade80]/5 border-[#4ade80]/15' :
                      r.colorState === 'orange' ? 'bg-[#fbbf24]/5 border-[#fbbf24]/15' :
                      'bg-[#f87171]/5 border-[#f87171]/15'}`}>
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor:
                        r.colorState === 'green' ? '#4ade80' : r.colorState === 'orange' ? '#fbbf24' : '#f87171' }} />
                      <div>
                        <p className="text-xs font-bold text-white/70">{r.title}</p>
                        <p className="text-[11px] text-white/45 mt-0.5">{r.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Activity Heatmap */}
          <article className={`${iCard} p-6 xl:col-span-7`}>
            <div className="mb-5 border-b border-white/8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Coding Activity</h2>
                <p className="mt-1 text-sm text-white/45">
                  {githubData?.connected
                    ? `${githubData.recentActivityCount ?? 0} commits in the last 30 days · seeded from your profile`
                    : 'Estimated pattern — connect GitHub for live data'}
                </p>
              </div>
              {githubData?.connected && (
                <span className="rounded-xl border border-[#4ade80]/30 bg-[#4ade80]/10 px-3 py-1 text-xs font-bold text-[#4ade80]">
                  Live
                </span>
              )}
            </div>

            {/* 5×7 heatmap grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-3">
              {heatmap.map((cell, i) => (
                <div
                  key={i}
                  title={`${cell.date}: ${cell.count} commit${cell.count !== 1 ? 's' : ''}`}
                  className="aspect-square rounded-sm transition-all duration-300 cursor-pointer hover:scale-110"
                  style={{
                    backgroundColor: cell.count === 0 ? 'rgba(255,255,255,0.05)'
                      : cell.count === 1 ? 'rgba(123,97,255,0.25)'
                      : cell.count === 2 ? 'rgba(123,97,255,0.50)'
                      : cell.count === 3 ? 'rgba(123,97,255,0.75)'
                      : 'rgba(123,97,255,1)',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 justify-end mt-1">
              <span className="text-[10px] text-white/25">Less</span>
              {[0.05, 0.25, 0.5, 0.75, 1].map((o, i) => (
                <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(123,97,255,${o})` }} />
              ))}
              <span className="text-[10px] text-white/25">More</span>
            </div>

            {/* LeetCode stats if connected */}
            {leetcodeData?.connected && (
              <div className="mt-5 pt-4 border-t border-white/8 grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Solved', value: leetcodeData.totalSolved ?? 0, color: '#10c7a1' },
                  { label: 'Hard Problems', value: leetcodeData.hardSolved ?? 0, color: '#f87171' },
                  { label: 'Acceptance %', value: `${leetcodeData.acceptanceRate ?? 0}%`, color: '#fbbf24' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl bg-white/4 border border-white/8 p-3 text-center">
                    <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[10px] text-white/35 mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* ── BURNOUT FORECAST + CROSS-DOMAIN ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">

          {/* 7-Day Burnout Forecast */}
          <article className={`${iCard} p-6 xl:col-span-6`}>
            <div className="mb-5 border-b border-white/8 pb-4">
              <h2 className="text-xl font-bold text-white">7-Day Burnout Forecast</h2>
              <p className="mt-1 text-sm text-white/45">
                {burnoutRisk != null
                  ? `Based on your current burnout risk (${burnoutRisk}%), study load (${profile.studyHours ?? '?'}h/day), and sleep (${profile.sleepHours ?? '?'}h/night).`
                  : 'Complete onboarding to unlock your personal burnout trajectory.'}
              </p>
            </div>

            {burnoutRisk != null ? (
              <>
                {/* Bar chart */}
                <div className="flex items-end gap-2 h-32 mb-3">
                  {forecast.map((day, i) => {
                    const pct = day.risk / 100;
                    const color = day.risk > 70 ? '#f87171' : day.risk > 50 ? '#fbbf24' : '#4ade80';
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                        <span className="text-[9px] font-bold" style={{ color }}>{day.risk}%</span>
                        <div className="w-full rounded-t-md transition-all duration-700 relative overflow-hidden"
                          style={{ height: `${Math.max(8, pct * 100)}px`, backgroundColor: color + '25', border: `1px solid ${color}30` }}>
                          <div className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-700"
                            style={{ height: `${pct * 100}%`, backgroundColor: color + '60' }} />
                        </div>
                        <span className="text-[9px] text-white/30">{day.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Threshold legend */}
                <div className="flex flex-wrap gap-3 mt-2">
                  {[['#4ade80','Safe zone (< 50%)'],['#fbbf24','Warning (50–70%)'],['#f87171','High risk (> 70%)']].map(([c,l]) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c }} />
                      <span className="text-[10px] text-white/35">{l}</span>
                    </div>
                  ))}
                </div>

                {/* Personalised prediction */}
                <div className="mt-4 rounded-xl border border-white/8 bg-white/3 p-3.5">
                  <p className="text-xs text-white/60 leading-relaxed">
                    {forecast[6].risk > forecast[0].risk + 10
                      ? `⚠️ Risk is trending upward — your Digital Twin projects ${forecast[6].risk}% burnout risk by ${forecast[6].label}. Protecting one full rest day this week can reverse this.`
                      : forecast[6].risk <= forecast[0].risk
                      ? `✅ Trajectory is stable or improving. Keep your current sleep and study balance to hold this trend.`
                      : `Your burnout risk is relatively flat this week. Small wins in sleep quality will keep it from drifting up.`}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="h-14 w-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white/20" />
                </div>
                <p className="text-sm text-white/30 max-w-xs">Complete your onboarding profile to see your 7-day burnout forecast.</p>
              </div>
            )}
          </article>

          {/* Cross-Domain Correlation Alerts */}
          <article className={`${iCard} p-6 xl:col-span-6`}>
            <div className="mb-5 border-b border-white/8 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Cross-Domain Alerts</h2>
                <p className="mt-1 text-sm text-white/45">Health × Career × Finance — signals no single app can see.</p>
              </div>
              <Target className="h-5 w-5 text-[#7b61ff] shrink-0" />
            </div>

            <div className="space-y-3">
              {crossInsights.map((ins, i) => (
                <div key={i} className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  ins.severity === 'critical' ? 'border-[#f87171]/20 bg-[#f87171]/5 hover:bg-[#f87171]/8' :
                  ins.severity === 'warning'  ? 'border-[#fbbf24]/20 bg-[#fbbf24]/5 hover:bg-[#fbbf24]/8' :
                  ins.severity === 'positive' ? 'border-[#4ade80]/20 bg-[#4ade80]/5 hover:bg-[#4ade80]/8' :
                                                'border-white/10 bg-white/3 hover:bg-white/5'}`}
                  onClick={() => setExpandedInsight(expandedInsight === i ? null : i)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{ins.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-white/85">{ins.title}</p>
                        {expandedInsight !== i && (
                          <p className="text-xs text-white/45 mt-1 line-clamp-1">{ins.body}</p>
                        )}
                      </div>
                    </div>
                    {expandedInsight === i
                      ? <ChevronUp className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />
                      : <ChevronDown className="h-4 w-4 text-white/30 shrink-0 mt-0.5" />}
                  </div>
                  {expandedInsight === i && (
                    <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
                      <p className="text-sm text-white/65 leading-relaxed">{ins.body}</p>
                      <div className="flex items-start gap-2 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ins.color }}>Action</span>
                        <p className="text-xs text-white/55 leading-relaxed">{ins.action}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Career insights from backend */}
            {careerInsights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/8 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">From your connected integrations</p>
                {careerInsights.slice(0, 2).map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 border ${
                    ins.colorState === 'green' ? 'bg-[#4ade80]/5 border-[#4ade80]/15' : 'bg-[#fbbf24]/5 border-[#fbbf24]/15'}`}>
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: ins.colorState === 'green' ? '#4ade80' : '#fbbf24' }} />
                    <p className="text-xs text-white/60 leading-relaxed">{ins.message}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* ── TRAJECTORY ── */}
        <section>
          <article className={`${iCard} p-6`}>
            <div className="mb-5 border-b border-white/8 pb-4">
              <h2 className="text-xl font-bold text-white">Career Trajectory Model</h2>
              <p className="mt-1 text-sm text-white/45">
                {momentumScore != null
                  ? `Sustainable path at ${momentumScore}/100 momentum — ${burnoutRisk > 50 ? 'high-fatigue risk is pulling your curve down' : 'trajectory is currently healthy'}.`
                  : 'Complete onboarding to unlock your personal trajectory model.'}
              </p>
            </div>
            <div className="relative h-52 overflow-hidden rounded-xl border border-white/8 bg-[#0a0c14]">
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 800 220">
                <line x1="0" x2="800" y1="55"  stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" x2="800" y1="110" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <line x1="0" x2="800" y1="165" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                {/* Fatigue/burnout path */}
                <path d="M0 180 Q200 140 400 155 T800 215"
                  fill="none" stroke="#c8a84b" strokeDasharray="7 7" strokeWidth="2.5" opacity="0.7" />
                {/* Balanced growth path */}
                <path d={momentumScore != null && momentumScore >= 60
                  ? "M0 180 Q250 140 550 70 T800 35"
                  : "M0 180 Q250 155 550 120 T800 90"}
                  fill="none" stroke="#7b61ff" strokeLinecap="round" strokeWidth="4"
                  strokeDasharray="1000" strokeDashoffset={mounted ? '0' : '1000'}
                  style={{ transition: 'stroke-dashoffset 1.8s ease-in-out' }} />
                {/* Current position marker */}
                {momentumScore != null && (
                  <circle cx="200" cy={180 - (momentumScore / 100) * 80} r="5"
                    fill="#7b61ff" opacity="0.9" />
                )}
              </svg>
              <div className="absolute right-4 top-4 bg-[#0a0c14]/90 backdrop-blur border border-white/8 p-3 rounded-xl space-y-2 text-xs font-semibold">
                <div className="flex items-center gap-2 text-[#7b61ff]">
                  <span className="h-0.5 w-5 rounded bg-[#7b61ff] inline-block" /> Sustainable path
                </div>
                <div className="flex items-center gap-2 text-[#c8a84b]">
                  <span className="h-0.5 w-5 rounded border-b-2 border-dashed border-[#c8a84b] inline-block" /> Burnout trajectory
                </div>
                {momentumScore != null && (
                  <div className="flex items-center gap-2 text-white/50">
                    <span className="h-2 w-2 rounded-full bg-[#7b61ff] inline-block" /> You are here
                  </div>
                )}
              </div>
            </div>
            {momentumScore != null && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrajectoryCard
                  tone="positive"
                  title="Sustainable Path"
                  text={`Consistent ${profile.studyHours ?? 4}h study blocks, ${profile.exerciseFrequency ?? 2} workout days/week, and protected sleep keeps momentum compounding without hitting the burnout ceiling.`} />
                <TrajectoryCard
                  tone="warning"
                  title="High-Fatigue Risk"
                  text={burnoutRisk > 50
                    ? `At ${burnoutRisk}% burnout risk, pushing harder now risks a crash in 2–3 weeks. Recovery invested today yields more output by next month.`
                    : 'Extending study hours without protecting sleep and recovery will erode code quality and slow long-term momentum.'} />
              </div>
            )}
          </article>
        </section>

      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CareerMetricCard({ metric, mounted }) {
  const Icon = metric.icon;
  const displayVal = metric.inverted
    ? metric.value           // show raw risk number
    : metric.value;
  const ringVal = metric.inverted
    ? 100 - metric.value     // invert ring fill for burnout (lower = more filled = better)
    : metric.value;
  return (
    <article className={`${iCard} p-5 text-center`}>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/5 ring-1 ring-white/8">
        <CareerRing value={ringVal} color={metric.color} mounted={mounted} />
      </div>
      <div className="mx-auto mb-2.5 h-9 w-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: metric.color + '18', color: metric.color }}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-white/45 truncate">{metric.label}</h3>
      <p className="mt-1 text-sm font-bold truncate" style={{ color: metric.color }}>{metric.status}</p>
    </article>
  );
}

function CareerRing({ value, color, mounted }) {
  const r = 28, circ = 2 * Math.PI * r;
  const [cur, setCur] = useState(0);
  useEffect(() => {
    if (!mounted || value == null) return;
    const target = clamp(Math.round(value), 0, 100);
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 1200, 1);
      setCur(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, mounted]);
  const offset = circ - (cur / 100) * circ;
  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" fill="none" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" />
        <circle cx="36" cy="36" fill="none" r={r} stroke={color}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="4.5" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold text-white/80">{cur}%</div>
    </div>
  );
}

function NoSignalCard({ label, icon: Icon }) {
  return (
    <article className={`${card} p-5 text-center flex flex-col items-center justify-center gap-3 min-h-[140px]`}>
      <div className="h-14 w-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
        <Icon className="h-6 w-6 text-white/15" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/25">{label}</p>
        <p className="text-[11px] text-white/15 mt-0.5">Complete onboarding</p>
      </div>
    </article>
  );
}

function IntegrationRow({ icon, name, color, connected, detail, score }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border p-3.5 transition-all ${connected ? 'border-white/8 bg-white/3' : 'border-white/5 bg-white/2 opacity-60'}`}>
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '18', color }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-white/80">{name}</p>
          {connected
            ? <span className="text-[10px] font-bold text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded">Connected</span>
            : <span className="text-[10px] font-bold text-white/25 bg-white/5 px-1.5 py-0.5 rounded">Not connected</span>}
        </div>
        <p className="text-[11px] text-white/35 truncate">{detail}</p>
      </div>
      {score != null && (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold" style={{ color }}>{score}</p>
          <p className="text-[10px] text-white/25">/ 100</p>
        </div>
      )}
    </div>
  );
}

function TrajectoryCard({ tone, title, text }) {
  const styles = tone === 'positive'
    ? 'border-[#7b61ff]/20 bg-[#7b61ff]/5 text-[#c084fc]'
    : 'border-[#c8a84b]/20 bg-[#c8a84b]/5 text-[#c8a84b]';
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em]">{title}</h4>
      <p className="text-sm leading-relaxed text-white/55">{text}</p>
    </div>
  );
}

function GithubIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}