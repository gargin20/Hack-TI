import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Activity, DollarSign, Briefcase, Calendar, PlusCircle,
  Flame, TrendingUp, AlertTriangle, Zap, ChevronRight, X,
  CheckCircle, Loader2, Sparkles, Trophy, Clock, BarChart2,
  Plus, Minus, Link2, Shield, Star, ArrowUpRight, Brain
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const glass = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl';
const glassHover = `${glass} transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_28px_70px_rgba(0,0,0,0.55)]`;

const DOMAIN_CONFIG = {
  health:  { icon: Activity,   color: '#ff4d7d', glow: 'rgba(255,77,125,0.25)',  bg: 'bg-[#ff4d7d]/10',  border: 'border-[#ff4d7d]/30',  label: 'Health & Wellness' },
  finance: { icon: DollarSign, color: '#10c7a1', glow: 'rgba(16,199,161,0.25)',  bg: 'bg-[#10c7a1]/10',  border: 'border-[#10c7a1]/30',  label: 'Wealth & Finance' },
  career:  { icon: Briefcase,  color: '#c8a84b', glow: 'rgba(200,168,75,0.25)',  bg: 'bg-[#c8a84b]/10',  border: 'border-[#c8a84b]/30',  label: 'Career & Learning' },
};

const GOAL_TEMPLATES = [
  { domain: 'health',  title: 'Run 5km without stopping',        targetMetric: 5,     unit: 'km',      priority: 'high',   emoji: '🏃' },
  { domain: 'health',  title: 'Lose 5kg body weight',            targetMetric: 5,     unit: 'kg',      priority: 'high',   emoji: '⚖️' },
  { domain: 'health',  title: 'Sleep 8 hours every night',       targetMetric: 30,    unit: 'nights',  priority: 'medium', emoji: '😴' },
  { domain: 'finance', title: 'Save ₹1 Lakh emergency fund',     targetMetric: 100000,unit: '₹',       priority: 'high',   emoji: '💰' },
  { domain: 'finance', title: 'Invest ₹5000/month in SIP',       targetMetric: 60000, unit: '₹',       priority: 'medium', emoji: '📈' },
  { domain: 'finance', title: 'Reduce food spend to ₹8k/month',  targetMetric: 8000,  unit: '₹/mo',    priority: 'low',    emoji: '🍱' },
  { domain: 'career',  title: 'Complete 50 LeetCode problems',   targetMetric: 50,    unit: 'problems',priority: 'high',   emoji: '💻' },
  { domain: 'career',  title: 'Read 12 books this year',         targetMetric: 12,    unit: 'books',   priority: 'medium', emoji: '📚' },
  { domain: 'career',  title: 'Build and ship 3 side projects',  targetMetric: 3,     unit: 'projects',priority: 'high',   emoji: '🚀' },
];

// ─── AI Conflict/Synergy Detection ──────────────────────────────────────────
function detectCrossDomainInsights(goals) {
  const insights = [];
  const healthGoals  = goals.filter(g => g.domain === 'health');
  const financeGoals = goals.filter(g => g.domain === 'finance');
  const careerGoals  = goals.filter(g => g.domain === 'career');

  if (healthGoals.length > 0 && financeGoals.length > 0) {
    const hasDiet    = healthGoals.some(g => g.title.toLowerCase().includes('eat') || g.title.toLowerCase().includes('food') || g.unit.toLowerCase().includes('kg'));
    const hasSavings = financeGoals.some(g => g.title.toLowerCase().includes('save') || g.title.toLowerCase().includes('fund'));
    if (hasDiet && hasSavings) {
      insights.push({ type: 'synergy', icon: Link2, color: '#10c7a1', message: 'Eating at home aligns both your health and savings goals. You could earn 2× XP when both progress together.' });
    }
    const hasSpend = financeGoals.some(g => g.title.toLowerCase().includes('spend') || g.title.toLowerCase().includes('food spend'));
    if (hasSpend) {
      insights.push({ type: 'conflict', icon: AlertTriangle, color: '#ff4d7d', message: 'High food spend targets may conflict with your health goals. Your AI Copilot detected a behavioral loop risk.' });
    }
  }
  if (careerGoals.length > 0 && healthGoals.length > 0) {
    const hasLate = careerGoals.some(g => g.title.toLowerCase().includes('project') || g.title.toLowerCase().includes('leetcode'));
    const hasSleep = healthGoals.some(g => g.title.toLowerCase().includes('sleep'));
    if (hasLate && hasSleep) {
      insights.push({ type: 'conflict', icon: AlertTriangle, color: '#c8a84b', message: 'Late-night coding sessions conflict with your sleep goal. Consider a hard cutoff at 11 PM to protect both.' });
    }
  }
  if (goals.length >= 3) {
    insights.push({ type: 'synergy', icon: Shield, color: '#7b61ff', message: `You have ${goals.length} active objectives. Completing all in the same week unlocks the "Omni-Domain" badge.` });
  }
  return insights;
}

// ─── Predicted completion date ───────────────────────────────────────────────
function getPrediction(goal) {
  if (!goal.currentMetric || goal.currentMetric === 0) return null;
  const created   = new Date(goal.createdAt || Date.now() - 7 * 86400000);
  const now       = new Date();
  const daysElapsed = Math.max((now - created) / 86400000, 1);
  const rate      = goal.currentMetric / daysElapsed; // units per day
  if (rate <= 0) return null;
  const remaining = goal.targetMetric - goal.currentMetric;
  const daysLeft  = Math.ceil(remaining / rate);
  const predicted = new Date(now.getTime() + daysLeft * 86400000);
  const deadline  = new Date(goal.deadline);
  const onTrack   = predicted <= deadline;
  return { predicted, daysLeft, onTrack, rate: rate.toFixed(2) };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Goals() {
  const [goals, setGoals]               = useState([]);
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [logTarget, setLogTarget]       = useState(null); // goal being logged
  const [logValue, setLogValue]         = useState('');
  const [logLoading, setLogLoading]     = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Form state
  const [domain, setDomain]           = useState('health');
  const [title, setTitle]             = useState('');
  const [targetMetric, setTargetMetric] = useState('');
  const [unit, setUnit]               = useState('');
  const [deadline, setDeadline]       = useState('');
  const [priority, setPriority]       = useState('medium');

  const fetchGoals = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res   = await axios.get(`${API_BASE_URL}/api/goals`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setGoals(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const res   = await axios.post(`${API_BASE_URL}/api/goals`,
        { domain, title, targetMetric: Number(targetMetric), unit, deadline, priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setGoals(prev => [...prev, res.data.data]);
        setIsFormOpen(false);
        setTitle(''); setTargetMetric(''); setUnit(''); setDeadline('');
      }
    } catch (e) { console.error(e); }
  };

  const applyTemplate = (tpl) => {
    setDomain(tpl.domain); setTitle(tpl.title);
    setTargetMetric(String(tpl.targetMetric)); setUnit(tpl.unit); setPriority(tpl.priority);
    setShowTemplates(false); setIsFormOpen(true);
  };

  const handleLogProgress = async () => {
    if (!logTarget || !logValue) return;
    setLogLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res   = await axios.patch(`${API_BASE_URL}/api/goals/${logTarget._id}/progress`,
        { increment: Number(logValue) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setGoals(prev => prev.map(g => g._id === logTarget._id ? res.data.data : g));
        setLogTarget(null); setLogValue('');
      }
    } catch (e) { console.error(e); }
    setLogLoading(false);
  };

  const generateWeeklyDigest = async () => {
    setDigestLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res   = await axios.get(`${API_BASE_URL}/api/goals/weekly-digest`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setWeeklyDigest(res.data.digest);
    } catch (e) {
      // Fallback: generate client-side summary
      const completed = goals.filter(g => g.currentMetric >= g.targetMetric).length;
      const active    = goals.filter(g => g.currentMetric < g.targetMetric).length;
      const highPri   = goals.filter(g => g.priority === 'high' && g.currentMetric < g.targetMetric);
      setWeeklyDigest({
        summary: `You have ${goals.length} active objectives. ${completed} completed, ${active} in progress.`,
        highlights: [
          completed > 0 ? `🏆 ${completed} goal(s) fully achieved this period` : null,
          highPri.length > 0 ? `🔴 ${highPri.length} high-priority goal(s) need attention: ${highPri.map(g=>g.title).join(', ')}` : null,
          `📊 Spread: ${goals.filter(g=>g.domain==='health').length} health, ${goals.filter(g=>g.domain==='finance').length} finance, ${goals.filter(g=>g.domain==='career').length} career`,
        ].filter(Boolean),
        advice: 'Focus on your high-priority goals first. Even 10 minutes of daily progress compounds dramatically over 30 days.'
      });
    }
    setDigestLoading(false);
  };

  const crossDomainInsights = detectCrossDomainInsights(goals);

  const filtered = activeFilter === 'all' ? goals : goals.filter(g => g.domain === activeFilter);

  const stats = {
    total:     goals.length,
    completed: goals.filter(g => g.currentMetric >= g.targetMetric).length,
    onTrack:   goals.filter(g => { const p = getPrediction(g); return p?.onTrack; }).length,
    streaks:   goals.filter(g => g.streak > 0).length,
  };

  return (
    <div className="min-h-screen bg-[#05070d] px-5 py-8 text-white sm:px-8 font-sans">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#ff4d7d]/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#10c7a1]/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[#7b61ff]/6 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">

        {/* ── Header ── */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#7b61ff]/30 bg-[#7b61ff]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#7b61ff]">
              <Target className="h-3 w-3" /> S.M.A.R.T Goal Engine
            </div>
            <h1 className="text-4xl font-black tracking-tight">Your Objectives</h1>
            <p className="mt-1 text-white/50 text-sm">Cross-domain milestone tracking, AI predictions & streak intelligence.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={generateWeeklyDigest} disabled={digestLoading || goals.length === 0}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40">
              {digestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4 text-[#7b61ff]" />}
              Weekly Digest
            </button>
            <button onClick={() => setShowTemplates(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10">
              <Sparkles className="h-4 w-4 text-[#c8a84b]" /> Templates
            </button>
            <button onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-2 rounded-xl bg-[#7b61ff] px-6 py-3 font-bold shadow-[0_0_20px_rgba(123,97,255,0.3)] transition hover:bg-[#6345ed] hover:shadow-[0_0_30px_rgba(123,97,255,0.4)]">
              <PlusCircle className="h-5 w-5" /> New Objective
            </button>
          </div>
        </motion.header>

        {/* ── Stats Strip ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Goals',  value: stats.total,     icon: Target,     color: '#7b61ff' },
            { label: 'Completed',    value: stats.completed, icon: Trophy,     color: '#10c7a1' },
            { label: 'On Track',     value: stats.onTrack,   icon: TrendingUp, color: '#c8a84b' },
            { label: 'Active Streaks', value: stats.streaks, icon: Flame,      color: '#ff4d7d' },
          ].map((s, i) => (
            <div key={i} className={`${glass} flex items-center gap-4 p-4`}>
              <div className="rounded-xl p-2.5" style={{ backgroundColor: `${s.color}18` }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-white/50">{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── Weekly Digest Panel ── */}
        <AnimatePresence>
          {weeklyDigest && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className={`mb-8 ${glass} border-[#7b61ff]/30 p-6`}>
              <div className="flex items-start justify-between mb-4">
                <h2 className="flex items-center gap-2 font-bold text-[#7b61ff]">
                  <Brain className="h-5 w-5" /> Weekly AI Digest
                </h2>
                <button onClick={() => setWeeklyDigest(null)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <p className="text-white/80 mb-4">{weeklyDigest.summary}</p>
              <div className="space-y-2 mb-4">
                {weeklyDigest.highlights?.map((h, i) => (
                  <div key={i} className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70">{h}</div>
                ))}
              </div>
              <div className="rounded-xl border border-[#7b61ff]/20 bg-[#7b61ff]/10 p-4 text-sm text-white/90">
                <span className="font-bold text-[#7b61ff]">Copilot Advice: </span>{weeklyDigest.advice}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cross-Domain Insights ── */}
        <AnimatePresence>
          {crossDomainInsights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-3">
              {crossDomainInsights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-xl border px-5 py-4`}
                  style={{ borderColor: `${ins.color}40`, backgroundColor: `${ins.color}0d` }}>
                  <ins.icon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: ins.color }} />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest mr-2" style={{ color: ins.color }}>
                      {ins.type === 'synergy' ? 'Synergy Detected' : 'Conflict Detected'}
                    </span>
                    <span className="text-sm text-white/80">{ins.message}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── New Goal Form ── */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.section initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className={`mb-8 ${glass} border-[#7b61ff]/30 p-6`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2 text-[#7b61ff]">
                  <Target className="h-5 w-5" /> Define New Objective
                </h2>
                <button onClick={() => setIsFormOpen(false)} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCreateGoal} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Domain</label>
                  <select value={domain} onChange={e => setDomain(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none">
                    <option value="health">🏃 Health & Wellness</option>
                    <option value="finance">💰 Wealth & Finance</option>
                    <option value="career">💻 Career & Learning</option>
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Goal Title</label>
                  <input type="text" placeholder="e.g., Save for house downpayment" value={title} onChange={e => setTitle(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Target Number</label>
                  <input type="number" placeholder="e.g., 10000" value={targetMetric} onChange={e => setTargetMetric(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Unit</label>
                  <input type="text" placeholder="e.g., ₹, kg, chapters" value={unit} onChange={e => setUnit(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Target Deadline</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-widest text-white/50">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none">
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-2">
                  <button type="submit"
                    className="w-full rounded-lg bg-gradient-to-r from-[#7b61ff] to-[#10c7a1] px-6 py-3 font-bold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(123,97,255,0.4)]">
                    Initialize Objective & Earn XP
                  </button>
                </div>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Templates Modal ── */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className={`w-full max-w-2xl max-h-[80vh] overflow-y-auto ${glass} p-6`}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-lg flex items-center gap-2 text-[#c8a84b]"><Sparkles className="h-5 w-5" /> Quick-Start Templates</h2>
                  <button onClick={() => setShowTemplates(false)} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {GOAL_TEMPLATES.map((tpl, i) => {
                    const cfg = DOMAIN_CONFIG[tpl.domain];
                    return (
                      <button key={i} onClick={() => applyTemplate(tpl)}
                        className="text-left rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]">
                        <div className="text-2xl mb-2">{tpl.emoji}</div>
                        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: cfg.color }}>{cfg.label}</div>
                        <div className="text-sm font-semibold text-white">{tpl.title}</div>
                        <div className="mt-2 text-xs text-white/40">Target: {tpl.targetMetric.toLocaleString()} {tpl.unit}</div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Log Progress Modal ── */}
        <AnimatePresence>
          {logTarget && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }}
                className={`w-full max-w-sm ${glass} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Log Progress</h3>
                  <button onClick={() => setLogTarget(null)} className="text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
                <p className="text-sm text-white/60 mb-1">{logTarget.title}</p>
                <p className="text-xs text-white/40 mb-5">
                  Current: <span className="text-white font-semibold">{logTarget.currentMetric} / {logTarget.targetMetric} {logTarget.unit}</span>
                </p>
                <div className="flex items-center gap-3 mb-5">
                  <button onClick={() => setLogValue(v => String(Math.max(0, (Number(v)||0) - 1)))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10">
                    <Minus className="h-4 w-4" />
                  </button>
                  <input type="number" value={logValue} onChange={e => setLogValue(e.target.value)}
                    placeholder={`Amount in ${logTarget.unit}`}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 p-3 text-center text-lg font-bold text-white focus:border-[#7b61ff] focus:outline-none" />
                  <button onClick={() => setLogValue(v => String((Number(v)||0) + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button onClick={handleLogProgress} disabled={logLoading || !logValue}
                  className="w-full rounded-xl bg-gradient-to-r from-[#7b61ff] to-[#10c7a1] py-3 font-bold text-white transition hover:scale-[1.02] disabled:opacity-40">
                  {logLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Confirm & Earn XP'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Domain Filter ── */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'health', 'finance', 'career'].map(f => {
            const cfg = f === 'all' ? null : DOMAIN_CONFIG[f];
            return (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all border ${
                  activeFilter === f
                    ? 'bg-white/10 border-white/30 text-white'
                    : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'
                }`}
                style={activeFilter === f && cfg ? { borderColor: `${cfg.color}60`, color: cfg.color } : {}}>
                {f === 'all' ? '✦ All' : `${f === 'health' ? '🏃' : f === 'finance' ? '💰' : '💻'} ${cfg.label}`}
              </button>
            );
          })}
        </div>

        {/* ── Goal Cards Grid ── */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((goal, i) => (
              <motion.div key={goal._id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}>
                <GoalCard goal={goal} onLog={() => setLogTarget(goal)} />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-full py-16 text-center border border-dashed border-white/15 rounded-2xl">
              <Target className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 mb-4">No objectives yet. Start with a template or create your own.</p>
              <button onClick={() => setShowTemplates(true)}
                className="rounded-xl border border-[#7b61ff]/40 bg-[#7b61ff]/10 px-6 py-3 text-sm font-semibold text-[#7b61ff] hover:bg-[#7b61ff]/20 transition">
                Browse Templates
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Goal Card ───────────────────────────────────────────────────────────────
function GoalCard({ goal, onLog }) {
  const cfg            = DOMAIN_CONFIG[goal.domain] || DOMAIN_CONFIG.health;
  const Icon           = cfg.icon;
  const pct            = Math.min(Math.round((goal.currentMetric / goal.targetMetric) * 100), 100);
  const prediction     = getPrediction(goal);
  const isComplete     = pct >= 100;
  const daysToDeadline = Math.ceil((new Date(goal.deadline) - new Date()) / 86400000);

  return (
    <article className={`${glassHover} flex flex-col justify-between p-6 relative overflow-hidden`}
      style={{ boxShadow: isComplete ? `0 0 30px ${cfg.color}30` : undefined }}>

      {/* Completion glow overlay */}
      {isComplete && (
        <div className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: `radial-gradient(circle at 50% 0%, ${cfg.color}15, transparent 70%)` }} />
      )}

      <div>
        {/* Top row */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5" style={{ backgroundColor: `${cfg.color}18` }}>
              <Icon className="h-5 w-5" style={{ color: cfg.color }} />
            </div>
            {goal.streak > 0 && (
              <div className="flex items-center gap-1 rounded-full border border-[#ff4d7d]/30 bg-[#ff4d7d]/10 px-2 py-0.5 text-xs font-bold text-[#ff4d7d]">
                <Flame className="h-3 w-3" /> {goal.streak}d
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isComplete && <CheckCircle className="h-5 w-5 text-[#10c7a1]" />}
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              goal.priority === 'high' ? 'border-[#ff4d7d]/40 text-[#ff4d7d]' :
              goal.priority === 'medium' ? 'border-[#c8a84b]/40 text-[#c8a84b]' :
              'border-white/20 text-white/50'
            }`}>{goal.priority}</span>
          </div>
        </div>

        <h3 className="text-base font-bold leading-snug mb-1">{goal.title}</h3>
        <p className="text-xs text-white/40 mb-5">{cfg.label}</p>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Progress</span>
            <span className="font-bold" style={{ color: cfg.color }}>
              {goal.currentMetric?.toLocaleString()} / {goal.targetMetric?.toLocaleString()} {goal.unit}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
            <motion.div className="h-full rounded-full" initial={{ width: 0 }}
              animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ background: `linear-gradient(90deg, ${cfg.color}aa, ${cfg.color})` }} />
          </div>
          <div className="flex justify-between text-xs text-white/40">
            <span>{pct}% complete</span>
            <span>{100 - pct}% remaining</span>
          </div>
        </div>

        {/* AI Prediction badge */}
        {prediction && !isComplete && (
          <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border ${
            prediction.onTrack
              ? 'border-[#10c7a1]/30 bg-[#10c7a1]/10 text-[#10c7a1]'
              : 'border-[#ff4d7d]/30 bg-[#ff4d7d]/10 text-[#ff4d7d]'
          }`}>
            <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
            {prediction.onTrack
              ? `On track · ~${prediction.daysLeft} days at current pace`
              : `Behind pace · ~${prediction.daysLeft} days needed, ${daysToDeadline} left`
            }
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <Calendar className="h-3.5 w-3.5" />
          {daysToDeadline > 0 ? `${daysToDeadline}d left` : <span className="text-[#ff4d7d]">Overdue</span>}
        </div>

        {!isComplete && (
          <button onClick={onLog}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:scale-105"
            style={{ backgroundColor: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
            <Plus className="h-3.5 w-3.5" /> Log Progress
          </button>
        )}
        {isComplete && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#10c7a1]">
            <Star className="h-3.5 w-3.5" /> Completed!
          </div>
        )}
      </div>
    </article>
  );
}
