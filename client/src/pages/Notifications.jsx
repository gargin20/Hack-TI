import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Brain, Briefcase, CheckCircle2, ChevronRight, Clock,
  Eye, EyeOff, Filter, HeartPulse, Sparkles, Target, Trophy,
  Wallet, AlertTriangle, ShieldAlert, Lightbulb, Award,
  TrendingUp, Activity, Zap, X, ChevronDown,
} from 'lucide-react';
import {
  generateDailyNotifications,
  getTwinAnalysis,
  CATEGORIES,
  PRIORITY_CONFIG,
} from '../data/notificationsData';

// ─── Animation Variants ──────────────────────────────────────────────────────

const pageVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 22 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 24, delay: i * 0.04 },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// ─── Icon Map ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  health: HeartPulse,
  career: Briefcase,
  finance: Wallet,
  goals: Target,
  ai_insights: Brain,
  achievements: Trophy,
};

const PRIORITY_ICONS = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  recommendation: Lightbulb,
  achievement: Award,
};

// ─── Filter Config ───────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: 'all', label: 'All', emoji: '📡' },
  { key: 'health', label: 'Health', emoji: '🧬' },
  { key: 'career', label: 'Career', emoji: '🎯' },
  { key: 'finance', label: 'Finance', emoji: '💎' },
  { key: 'goals', label: 'Goals', emoji: '🏁' },
  { key: 'ai_insights', label: 'AI Insights', emoji: '🤖' },
  { key: 'achievements', label: 'Achievements', emoji: '🏆' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate();
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const [notifications, setNotifications] = useState([]);
  const [twinAnalysis, setTwinAnalysis] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(true);

  // Generate daily data on mount
  useEffect(() => {
    setNotifications(generateDailyNotifications(today));
    setTwinAnalysis(getTwinAnalysis(today));
  }, []);

  // Filtered + sorted notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => n.category === activeFilter);
  }, [notifications, activeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: notifications.length,
    critical: notifications.filter(n => n.priority === 'critical').length,
    unread: notifications.filter(n => !n.isRead).length,
    achievements: notifications.filter(n => n.category === 'achievements').length,
  }), [notifications]);

  // Mark as read
  const toggleRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
  }, []);

  // Mark all as read
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  return (
    <div className="flex min-h-screen min-w-0 flex-1 overflow-hidden bg-[#05070c] text-white" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.016)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
        <div className="absolute -left-40 top-0 h-[480px] w-[480px] rounded-full bg-[#7b61ff]/6 blur-[130px]" />
        <div className="absolute -right-40 bottom-0 h-[560px] w-[560px] rounded-full bg-[#ef4444]/4 blur-[150px]" />
        <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] rounded-full bg-[#10c7a1]/4 blur-[120px]" />
      </div>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Page Header */}
        <PageHeader
          dateLabel={dateLabel}
          unreadCount={stats.unread}
          onMarkAllRead={markAllRead}
        />

        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-6 lg:px-8" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          <motion.div className="mx-auto w-full max-w-[1480px] space-y-5" variants={pageVariants} initial="hidden" animate="show">

            {/* Twin Analysis Banner */}
            {twinAnalysis && (
              <motion.div variants={itemVariants}>
                <TwinAnalysisBanner analysis={twinAnalysis} />
              </motion.div>
            )}

            {/* Stats Row */}
            <motion.div variants={itemVariants}>
              <StatsRow stats={stats} />
            </motion.div>

            {/* Filters */}
            <motion.div variants={itemVariants}>
              <NotificationFilters
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                notifications={notifications}
              />
            </motion.div>

            {/* Notification Cards */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                  {activeFilter === 'all' ? 'All Alerts' : CATEGORIES[activeFilter]?.label} · {filteredNotifications.length} notifications
                </p>
                {filteredNotifications.some(n => !n.isRead) && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-bold uppercase tracking-wider text-[#10c7a1]/80 hover:text-[#10c7a1] transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <AnimatePresence mode="popLayout">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification, i) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      index={i}
                      onToggleRead={toggleRead}
                      onAction={() => navigate(notification.actionRoute)}
                    />
                  ))
                ) : (
                  <EmptyState filter={activeFilter} />
                )}
              </AnimatePresence>
            </motion.div>

          </motion.div>
        </main>
      </section>
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────

function PageHeader({ dateLabel, unreadCount, onMarkAllRead }) {
  return (
    <motion.header
      className="flex shrink-0 items-center justify-between border-b border-white/8 bg-[#070a10]/80 px-4 py-3.5 backdrop-blur-xl lg:px-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-[#ef4444]/20 to-[#7b61ff]/20 shadow-[0_0_16px_rgba(239,68,68,0.15)]">
          <Bell className="h-5 w-5 text-white/90" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
            Alert Center
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{dateLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/55">
          <Sparkles className="h-3.5 w-3.5 text-[#c8a84b]" />
          Digital Twin Intelligence
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1.5 rounded-xl border border-[#10c7a1]/20 bg-[#10c7a1]/8 px-3 py-2 text-xs font-semibold text-[#10c7a1] transition hover:bg-[#10c7a1]/15"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mark All Read</span>
          </button>
        )}
      </div>
    </motion.header>
  );
}

// ─── Twin Analysis Banner ────────────────────────────────────────────────────

function TwinAnalysisBanner({ analysis }) {
  const scores = [
    { label: 'Health Score', value: analysis.healthScore, color: '#10c7a1', emoji: '🧬' },
    { label: 'Career Score', value: analysis.careerScore, color: '#7b61ff', emoji: '🎯' },
    { label: 'Finance Score', value: analysis.financeScore, color: '#c8a84b', emoji: '💎' },
    { label: 'Goal Completion', value: analysis.goalCompletion, color: '#38bdf8', emoji: '🏁' },
  ];

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0a0e18]/90 backdrop-blur-2xl">
      <div className="relative px-6 py-7 lg:px-8">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,97,255,0.06),transparent_40%)]" />
        <motion.div
          className="pointer-events-none absolute right-8 top-4 h-32 w-32 rounded-full bg-[#ef4444]/8 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 9, repeat: Infinity }}
        />

        <div className="relative z-10">
          {/* Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
                <Activity className="h-3 w-3 text-[#10c7a1]" />
                Today's Twin Analysis
              </div>
              <p className="text-sm text-white/50 max-w-xl leading-relaxed">
                Your Digital Twin has analyzed all signals and generated today's status report.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[#10c7a1]/20 bg-[#10c7a1]/8 px-3 py-1.5 text-xs font-semibold text-[#10c7a1]">
                <Zap className="h-3.5 w-3.5" />
                Overall: {analysis.overallScore}%
              </div>
            </div>
          </div>

          {/* Score Gauges */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            {scores.map((s) => (
              <ScoreGauge key={s.label} {...s} />
            ))}
          </div>

          {/* AI Summary */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#a78bfa]/25 bg-[#a78bfa]/10">
                <Brain className="h-4 w-4 text-[#a78bfa]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#a78bfa] mb-1.5">AI Summary</p>
                <p className="text-sm leading-relaxed text-white/65">{analysis.summary}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ label, value, color, emoji }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const start = performance.now();
    const tick = (ts) => {
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(value * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayed / 100) * circumference;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.025] p-4 backdrop-blur-md transition-colors hover:border-white/15"
    >
      <div className="relative">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <motion.circle
            cx="38" cy="38" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
            transform="rotate(-90 38 38)"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{displayed}</span>
          <span className="text-[9px] text-white/40">%</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{emoji}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">{label}</span>
      </div>
    </motion.div>
  );
}

// ─── Stats Row ───────────────────────────────────────────────────────────────

function StatsRow({ stats }) {
  const items = [
    { label: 'Total Notifications', value: stats.total, icon: Bell, color: '#7b61ff', gradient: 'from-[#7b61ff]/15 to-[#7b61ff]/5' },
    { label: 'Critical Alerts', value: stats.critical, icon: ShieldAlert, color: '#ef4444', gradient: 'from-[#ef4444]/15 to-[#ef4444]/5' },
    { label: 'Unread', value: stats.unread, icon: EyeOff, color: '#f59e0b', gradient: 'from-[#f59e0b]/15 to-[#f59e0b]/5' },
    { label: 'Achievements', value: stats.achievements, icon: Trophy, color: '#10b981', gradient: 'from-[#10b981]/15 to-[#10b981]/5' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, gradient }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const tick = (ts) => {
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(value * e));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-4 backdrop-blur-xl transition-colors hover:border-white/20`}
    >
      <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full blur-2xl" style={{ background: `${color}15` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <span className="text-2xl font-bold text-white">{displayed}</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Notification Filters ────────────────────────────────────────────────────

function NotificationFilters({ activeFilter, onFilterChange, notifications }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3 backdrop-blur-md">
      <div className="flex items-center gap-2 mr-2">
        <Filter className="h-3.5 w-3.5 text-white/30" />
        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-white/30">Filter</span>
      </div>
      {FILTER_OPTIONS.map((f) => {
        const isActive = activeFilter === f.key;
        const count = f.key === 'all' ? notifications.length : notifications.filter(n => n.category === f.key).length;
        const catColor = f.key === 'all' ? '#7b61ff' : CATEGORIES[f.key]?.color || '#7b61ff';

        return (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-300 border ${
              isActive
                ? 'text-white shadow-lg'
                : 'border-transparent text-white/45 hover:bg-white/5 hover:text-white/70'
            }`}
            style={isActive ? {
              background: `${catColor}20`,
              borderColor: `${catColor}40`,
              boxShadow: `0 0 16px ${catColor}25`,
            } : {}}
          >
            <span className="text-sm">{f.emoji}</span>
            <span className="hidden sm:inline">{f.label}</span>
            <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
              isActive ? 'bg-white/15 text-white' : 'bg-white/5 text-white/30'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Notification Card ───────────────────────────────────────────────────────

function NotificationCard({ notification, index, onToggleRead, onAction }) {
  const { category, title, message, priority, timestamp, isRead, actionLabel } = notification;
  const catMeta = CATEGORIES[category];
  const prioMeta = PRIORITY_CONFIG[priority];
  const CatIcon = CATEGORY_ICONS[category] || Bell;
  const PrioIcon = PRIORITY_ICONS[priority] || Bell;

  return (
    <motion.div
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      whileHover={{ y: -2, scale: 1.005 }}
      className={`group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
        isRead
          ? 'border-white/6 bg-white/[0.015]'
          : 'border-white/12 bg-white/[0.035] shadow-[0_0_20px_rgba(255,255,255,0.02)]'
      }`}
    >
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{ background: `linear-gradient(180deg, ${prioMeta.color}, ${prioMeta.color}60)` }}
      />

      {/* Unread glow */}
      {!isRead && (
        <div
          className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2 h-32 w-32 rounded-full blur-3xl"
          style={{ background: `${prioMeta.color}10` }}
        />
      )}

      <div className="relative z-10 flex items-start gap-4 p-4 pl-5 sm:p-5 sm:pl-6">
        {/* Category Icon */}
        <div
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{
            background: `${catMeta.color}15`,
            border: `1px solid ${catMeta.color}30`,
          }}
        >
          <CatIcon className="h-4.5 w-4.5" style={{ color: catMeta.color }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Unread dot */}
              {!isRead && (
                <motion.span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: prioMeta.color, boxShadow: `0 0 8px ${prioMeta.color}` }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <h3 className={`text-sm font-semibold truncate ${isRead ? 'text-white/60' : 'text-white'}`}>
                {title}
              </h3>
            </div>

            {/* Priority Badge */}
            <div
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider"
              style={{
                background: prioMeta.bg,
                border: `1px solid ${prioMeta.border}`,
                color: prioMeta.color,
              }}
            >
              <PrioIcon className="h-3 w-3" />
              {prioMeta.label}
            </div>
          </div>

          <p className={`text-xs leading-relaxed mb-3 ${isRead ? 'text-white/35' : 'text-white/55'}`}>
            {message}
          </p>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category pill */}
            <span
              className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{ background: `${catMeta.color}12`, color: catMeta.color }}
            >
              <span className="text-xs">{catMeta.emoji}</span>
              {catMeta.label}
            </span>

            {/* Timestamp */}
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(timestamp)} · {formatTime(timestamp)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {/* Read/Unread toggle */}
              <button
                onClick={() => onToggleRead(notification.id)}
                className="flex items-center gap-1 rounded-lg border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/50 transition hover:bg-white/10 hover:text-white/80"
              >
                {isRead ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span className="hidden sm:inline">{isRead ? 'Mark Unread' : 'Mark Read'}</span>
              </button>

              {/* Action button */}
              <button
                onClick={onAction}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: `${catMeta.color}15`,
                  border: `1px solid ${catMeta.color}30`,
                  color: catMeta.color,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${catMeta.color}30`;
                  e.currentTarget.style.boxShadow = `0 0 12px ${catMeta.color}30`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `${catMeta.color}15`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {actionLabel}
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ filter }) {
  const catMeta = CATEGORIES[filter];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] py-16 text-center backdrop-blur-md"
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 mb-4">
        <Bell className="h-7 w-7 text-white/20" />
      </div>
      <h3 className="text-base font-semibold text-white/50 mb-1">No {catMeta?.label || ''} Alerts</h3>
      <p className="text-xs text-white/30 max-w-xs">
        All clear! Your Digital Twin hasn't generated any {catMeta?.label?.toLowerCase() || ''} notifications for today.
      </p>
    </motion.div>
  );
}
