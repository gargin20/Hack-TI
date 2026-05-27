import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import {
  Activity,
  ArrowUpRight,
  BadgeDollarSign,
  Bell,
  Brain,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  HeartPulse,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
// ✅ IMPORT THE GAMIFICATION HOOK
import { useGamification } from '../context/GamificationContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 200, damping: 20 },
  },
};

const fallbackProfile = {
  behavioralAnalysis: { focusAreas: ['productivity', 'finance', 'health'] },
  integrations: {
    github: { status: 'connected', username: 'anjali-dev' },
    leetcode: { status: 'connected', username: 'anjali-codes' },
    fitbit: { status: 'skipped', profileLink: '' },
    linkedin: { status: 'connected', profileLink: 'linkedin' },
    banking: { status: 'skipped', profileLink: '' },
  },
  lifestyle: {
    gender: '',
    sleepHours: 6,
    studyHours: 5,
    exerciseFrequency: 2,
    spendingStyle: 'balanced',
    smokingHabits: 'no',
    periodTracking: 'not_now',
    genderSpecificHealthContext: 'not_now',
  },
  financialPatterns: {
    monthlyIncome: '52000',
    monthlyExpenditure: '34000',
    savingsHabits: 'moderate',
    financialStressLevel: 5,
  },
};

// ==========================================
// THE TWIN — Animated SVG Avatar Component
// ==========================================
function DigitalTwinAvatar({ insights }) {
  const burnout = insights.burnoutRisk;
  const health = insights.healthScore;
  const finance = insights.financeScore;
  const alignmentLabel = insights.alignmentLabel;
  const [blink, setBlink] = useState(false);
  const [breathe, setBreathe] = useState(false);

  // Derive avatar mood
  const mood = useMemo(() => {
    if (burnout > 70 || health < 45) return 'tired';
    if (burnout > 50 || health < 65) return 'alert';
    if (finance < 40) return 'stressed';
    return 'optimal';
  }, [burnout, health, finance]);

  const moodConfig = {
    tired: {
      aura: '#ff4d7d',
      auraOpacity: 0.18,
      eyeOffset: 2,
      mouthPath: 'M 38 62 Q 50 58 62 62',
      eyeScale: 0.7,
      glowColor: 'rgba(255,77,125,0.25)',
      skinGradFrom: '#2a1a1f',
      skinGradTo: '#1a0e14',
      advice: 'Your recovery signals are low. A 20-min nap or walk can reset cortisol levels.',
      label: '😴 Fatigued',
    },
    alert: {
      aura: '#c8a84b',
      auraOpacity: 0.2,
      eyeOffset: 0,
      mouthPath: 'M 40 62 Q 50 64 60 62',
      eyeScale: 1,
      glowColor: 'rgba(200,168,75,0.25)',
      skinGradFrom: '#1e1a10',
      skinGradTo: '#13100a',
      advice: 'Moderate stress detected. Hydrate and take a 5-min breathing break.',
      label: '⚠️ Alert Mode',
    },
    stressed: {
      aura: '#c8a84b',
      auraOpacity: 0.22,
      eyeOffset: 1,
      mouthPath: 'M 38 63 Q 50 59 62 63',
      eyeScale: 0.85,
      glowColor: 'rgba(200,168,75,0.2)',
      skinGradFrom: '#1c1a10',
      skinGradTo: '#121008',
      advice: 'Financial stress is affecting your focus. Review today\'s spending and set one budget goal.',
      label: '💸 Finance Stress',
    },
    optimal: {
      aura: '#10c7a1',
      auraOpacity: 0.22,
      eyeOffset: 0,
      mouthPath: 'M 38 60 Q 50 68 62 60',
      eyeScale: 1,
      glowColor: 'rgba(16,199,161,0.3)',
      skinGradFrom: '#0e1e1a',
      skinGradTo: '#071310',
      advice: 'All systems aligned. Maintain this rhythm — consistency compounds.',
      label: '✨ Optimal',
    },
  };

  const cfg = moodConfig[mood];

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3200 + Math.random() * 1800);
    const breatheInterval = setInterval(() => setBreathe((b) => !b), 3000);
    return () => { clearInterval(blinkInterval); clearInterval(breatheInterval); };
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
    >
      {/* Aura Ring */}
      <div className="relative flex items-center justify-center">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 148, height: 148,
            background: `radial-gradient(circle, ${cfg.aura}33 0%, transparent 70%)`,
            filter: 'blur(18px)',
          }}
          animate={{ scale: breathe ? 1.15 : 1, opacity: breathe ? cfg.auraOpacity * 1.4 : cfg.auraOpacity }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute rounded-full border"
          style={{ width: 120, height: 120, borderColor: `${cfg.aura}40` }}
          animate={{ scale: breathe ? 1.06 : 0.97, opacity: breathe ? 0.8 : 0.4 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />

        {/* SVG Face */}
        <motion.svg
          width="96" height="96" viewBox="0 0 100 100"
          style={{ filter: `drop-shadow(0 0 18px ${cfg.glowColor})` }}
          animate={{ y: breathe ? -3 : 2 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        >
          <defs>
            <radialGradient id="skinGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={cfg.skinGradFrom} />
              <stop offset="100%" stopColor={cfg.skinGradTo} />
            </radialGradient>
            <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={cfg.aura} stopOpacity="0.9" />
              <stop offset="100%" stopColor={cfg.aura} stopOpacity="0.2" />
            </radialGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Head */}
          <ellipse cx="50" cy="52" rx="32" ry="34" fill="url(#skinGrad)" stroke={`${cfg.aura}30`} strokeWidth="1" />

          {/* Neck */}
          <rect x="43" y="82" width="14" height="10" rx="4" fill={cfg.skinGradFrom} />

          {/* Eyes */}
          <motion.g filter="url(#softGlow)" animate={{ scaleY: blink ? 0.08 : cfg.eyeScale, y: cfg.eyeOffset }} style={{ originY: '50%' }} transition={{ duration: blink ? 0.08 : 0.2 }}>
            {/* Left eye */}
            <ellipse cx="36" cy="46" rx="5.5" ry="5.5" fill="url(#eyeGlow)" />
            <circle cx="36" cy="46" r="3.2" fill={cfg.aura} opacity="0.95" />
            <circle cx="37.2" cy="44.8" r="1.1" fill="white" opacity="0.7" />
            {/* Right eye */}
            <ellipse cx="64" cy="46" rx="5.5" ry="5.5" fill="url(#eyeGlow)" />
            <circle cx="64" cy="46" r="3.2" fill={cfg.aura} opacity="0.95" />
            <circle cx="65.2" cy="44.8" r="1.1" fill="white" opacity="0.7" />
          </motion.g>

          {/* Eyebrows */}
          <motion.g animate={{ y: mood === 'tired' ? 2 : mood === 'stressed' ? -1 : 0 }} transition={{ duration: 0.5 }}>
            <path d="M 29 38 Q 36 35 43 37" stroke={cfg.aura} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7" />
            <path d="M 57 37 Q 64 35 71 38" stroke={cfg.aura} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7" />
          </motion.g>

          {/* Nose */}
          <path d="M 48 52 Q 46 58 49 59 Q 51 59 52 58 Q 54 57 52 52" stroke={cfg.aura} strokeWidth="1" fill="none" opacity="0.35" />

          {/* Mouth */}
          <motion.path
            d={cfg.mouthPath}
            stroke={cfg.aura} strokeWidth="2.2" fill="none" strokeLinecap="round"
            animate={{ d: cfg.mouthPath }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            opacity="0.85"
          />

          {/* Circuit marks */}
          <g opacity="0.25">
            <path d="M 18 50 L 14 50 L 14 44 L 10 44" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
            <circle cx="10" cy="44" r="1.5" fill={cfg.aura} />
            <path d="M 82 50 L 86 50 L 86 44 L 90 44" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
            <circle cx="90" cy="44" r="1.5" fill={cfg.aura} />
            <path d="M 18 60 L 12 60" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
            <path d="M 82 60 L 88 60" stroke={cfg.aura} strokeWidth="0.8" fill="none" />
          </g>
        </motion.svg>
      </div>

      {/* Mood Badge */}
      <motion.div
        key={mood}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
        style={{ color: cfg.aura }}
      >
        {cfg.label}
      </motion.div>

      {/* Advice Bubble */}
      <motion.div
        key={cfg.advice}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs leading-5 text-white/70 backdrop-blur-md"
        style={{ boxShadow: `0 0 20px ${cfg.glowColor}` }}
      >
        <span className="mr-1.5 font-bold" style={{ color: cfg.aura }}>Twin:</span>
        {cfg.advice}
      </motion.div>
    </motion.div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(() => getStoredDashboardData());
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const user = getStoredUser();
  const firstName = user?.firstName || 'Anjali';
  const profile = useMemo(() => normalizeProfile(dashboardData?.profile || getStoredProfile()), [dashboardData]);
  const insights = useMemo(() => buildInsights(profile, dashboardData), [profile, dashboardData]);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ✅ NEW GAMIFICATION STATE LOGIC
  const { gamData } = useGamification();

  const getLevelProgress = (xp) => {
    let currentLevelXP = 0;
    let nextLevelXP = 100;
    if (xp >= 100 && xp < 250) { currentLevelXP = 100; nextLevelXP = 250; }
    else if (xp >= 250 && xp < 500) { currentLevelXP = 250; nextLevelXP = 500; }
    else if (xp >= 500 && xp < 900) { currentLevelXP = 500; nextLevelXP = 900; }
    else if (xp >= 900) {
      const levelDiff = Math.floor((xp - 900) / 500);
      currentLevelXP = 900 + (levelDiff * 500);
      nextLevelXP = currentLevelXP + 500;
    }
    const xpIntoLevel = xp - currentLevelXP;
    const levelRequirement = nextLevelXP - currentLevelXP;
    const progressPercent = Math.min((xpIntoLevel / levelRequirement) * 100, 100);
    return { xpIntoLevel, levelRequirement, progressPercent };
  };

  const { progressPercent, levelRequirement, xpIntoLevel } = getLevelProgress(gamData?.totalXP || 0);

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) { setIsLoadingDashboard(false); return; }
      try {
        const response = await axios.get(`${API_BASE_URL}/api/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
        setDashboardData(response.data.data);
        localStorage.setItem('digitalTwinDashboardData', JSON.stringify(response.data.data));
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setIsLoadingDashboard(false);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="app-shell flex min-h-screen min-w-0 flex-1 overflow-hidden bg-[#05070c] text-white selection:bg-[#7b61ff]/30" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Marble/Noise Texture Background */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
        <div className="absolute -left-32 top-0 h-[500px] w-[500px] rounded-full bg-[#7b61ff]/5 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-[600px] w-[600px] rounded-full bg-[#10c7a1]/4 blur-[140px]" />
        <div className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-[#c8a84b]/3 blur-[100px]" />
      </div>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader today={today} onSearchClick={() => navigate('/copilot')} firstName={firstName} />

        <main className="dashboard-scrollbar flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 lg:px-8">
          <motion.div className="mx-auto w-full max-w-[1500px] space-y-6" variants={pageVariants} initial="hidden" animate="show">
            
            <DashboardHero
              firstName={firstName}
              insights={insights}
              isLoadingDashboard={isLoadingDashboard}
              onHealthOpen={() => navigate('/health')}
              onFinanceOpen={() => navigate('/finance')}
              onCareerOpen={() => navigate('/career')}
              today={today}
            />

            {/* ✅ NEW GAMIFICATION WIDGET INTEGRATED HERE */}
            <GamificationStatusWidget 
              gamData={gamData} 
              progressPercent={progressPercent} 
              levelRequirement={levelRequirement} 
              xpIntoLevel={xpIntoLevel} 
            />

            <motion.section className="grid w-full grid-cols-12 gap-6" variants={pageVariants} initial="hidden" animate="show">
              {/* TOP ROW: Health, Finance, Avatar side by side */}
              <motion.div className="col-span-12 xl:col-span-3" variants={itemVariants}>
                <HealthScoreCard insights={insights} onOpen={() => navigate('/health')} />
              </motion.div>
              <motion.div className="col-span-12 xl:col-span-6" variants={itemVariants}>
                <FinanceTrajectory insights={insights} onOpen={() => navigate('/finance')} />
              </motion.div>
              <motion.div className="col-span-12 xl:col-span-3" variants={itemVariants}>
                <DigitalTwinPanel insights={insights} />
              </motion.div>

              {/* MIDDLE ROW: Radar (7) + Calendar (5) */}
              <motion.div className="col-span-12 xl:col-span-7" variants={itemVariants}>
                <LifeBalance insights={insights} />
              </motion.div>
              <motion.div className="col-span-12 xl:col-span-5" variants={itemVariants}>
                <DailyRituals insights={insights} />
              </motion.div>

              {/* COMMAND CENTER PORTALS */}
              <motion.div className="col-span-12" variants={itemVariants}>
                <TrackingPortals navigate={navigate} />
              </motion.div>

              {/* ADAPTIVE RECOMMENDATIONS */}
              <motion.div className="col-span-12" variants={itemVariants}>
                <AdaptiveRecommendations insights={insights} />
              </motion.div>
            </motion.section>

          </motion.div>
        </main>
      </section>

      <AiFeed insights={insights} />
    </div>
  );
}

// ==========================================
// Digital Twin Panel (wraps Avatar for grid)
// ==========================================
function DigitalTwinPanel({ insights }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      className="flex h-full flex-col items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-lg backdrop-blur-xl"
    >
      <div className="mb-2 flex w-full items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Digital Twin</h3>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Live Signal</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-base">🤖</div>
      </div>
      <DigitalTwinAvatar insights={insights} />
    </motion.article>
  );
}

function DashboardHero({ firstName, insights, isLoadingDashboard, onHealthOpen, onFinanceOpen, onCareerOpen, today }) {
  const heroStats = [
    { label: 'Health', value: `${insights.healthScore}%`, icon: HeartPulse, emoji: '🧬', tone: 'health', detail: `${insights.burnoutRisk}% burnout` },
    { label: 'Finance', value: `${insights.financeScore}%`, icon: BadgeDollarSign, emoji: '💎', tone: 'finance', detail: insights.monthlyBuffer },
    { label: 'Career', value: `${insights.productivityScore}%`, icon: Briefcase, emoji: '🎯', tone: 'career', detail: `${insights.recoveryScore}% recovery` },
  ];

  return (
    <motion.section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0e17]/80 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl" variants={itemVariants}>
      <div className="grid gap-0 lg:grid-cols-[1.3fr_0.95fr]">
        <div className="relative overflow-hidden bg-white/[0.02] px-6 py-6 lg:border-r lg:border-white/10 lg:px-8 lg:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_35%)]" />
          <motion.div className="absolute -right-8 top-6 h-28 w-28 rounded-full bg-[#c8a84b]/20 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-6 left-8 h-20 w-20 rounded-full bg-[#7b61ff]/20 blur-3xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-[#c8a84b]" /> Premium Control Room
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Morning, {firstName}.</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
                  Your health, finance, and career signals are in{' '}
                  <span className="font-semibold text-[#10c7a1] drop-shadow-[0_0_8px_rgba(16,199,161,0.5)]">{insights.alignmentLabel}</span> today.
                  {isLoadingDashboard && <span className="ml-2 text-white/40">Refreshing profile...</span>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={onHealthOpen} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90">Open health</button>
              <button type="button" onClick={onFinanceOpen} className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">Open finance</button>
              <button type="button" onClick={onCareerOpen} className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">Open career</button>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col gap-4 bg-white/[0.01] px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">Live snapshot</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">Signal alignment</h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg shadow-lg">🎯</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">{stat.label}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">{stat.value}</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
                      <Icon className="h-4 w-4 text-white/70" />
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs font-medium text-white/60">
                    <span>{stat.emoji}</span>
                    <span>{stat.detail}</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-auto rounded-[1.35rem] border border-[#10c7a1]/20 bg-[#10c7a1]/5 p-4 text-white shadow-[0_0_20px_rgba(16,199,161,0.05)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Today</p>
                <p className="mt-1 text-sm font-medium text-white/90">{today}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#10c7a1]">
                <CheckCircle2 className="h-4 w-4" />
                Premium sync active
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

// ✅ NEW GAMIFICATION WIDGET COMPONENT
function GamificationStatusWidget({ gamData, progressPercent, levelRequirement, xpIntoLevel }) {
  return (
    <motion.section variants={itemVariants} className="w-full">
      <article className="overflow-hidden relative rounded-[2rem] border border-white/10 bg-[#0d1018]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl p-6 transition hover:-translate-y-0.5 hover:border-[#10c7a1]/30">
        <div className="absolute right-0 top-0 h-48 w-48 -translate-y-24 translate-x-12 rounded-full bg-[#10c7a1]/5 blur-3xl" />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 shrink-0">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10c7a1] to-[#0ea988] shadow-[0_0_30px_rgba(16,199,161,0.3)]">
              <div className="absolute inset-1 rounded-xl bg-[#0a0e17] flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#10c7a1]">Level</span>
                <span className="text-3xl font-bold text-white leading-none mt-0.5">{gamData?.level || 1}</span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">System Optimized</h2>
              <p className="text-sm text-white/60 mt-1">Keep logging daily metrics to level up.</p>
            </div>
          </div>
          <div className="w-full max-w-xl">
            <div className="mb-2 flex items-center justify-between text-sm font-bold">
              <span className="text-white/60 uppercase tracking-widest text-xs">Total XP: <span className="text-white">{gamData?.totalXP || 0}</span></span>
              <span className="text-[#10c7a1]">{xpIntoLevel} / {levelRequirement} XP to next level</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 border border-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#10c7a1] to-[#7df3cc] shadow-[0_0_10px_rgba(16,199,161,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>
      </article>
    </motion.section>
  );
}

function DashboardHeader({ today, firstName, onSearchClick }) {
  return (
    <motion.header
      className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#070a10]/80 px-4 py-4 backdrop-blur-xl lg:px-8"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="max-w-2xl flex-1">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Ask DigitalTwin AI"
            onClick={onSearchClick}
            onFocus={onSearchClick}
            readOnly
            className="w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition hover:bg-white/10 focus:border-[#7b61ff]/50 focus:ring-1 focus:ring-[#7b61ff]/50"
          />
        </label>
      </div>

      <div className="ml-4 flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 shadow-lg sm:flex">
          <CalendarDays className="h-4 w-4 text-[#c8a84b]" />
          {today}
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10" type="button">
          <Bell className="h-4.5 w-4.5" />
        </button>
        <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#7b61ff] to-[#10c7a1] text-sm font-bold text-white shadow-[0_0_15px_rgba(16,199,161,0.3)]">
          {firstName.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </motion.header>
  );
}

function HealthScoreCard({ insights, onOpen }) {
  const [displayedScore, setDisplayedScore] = useState(insights.healthScore);
  const [ringReplayKey, setRingReplayKey] = useState(0);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const score = insights.healthScore;
  const dashOffset = circumference - (score / 100) * circumference;
  const healthStyle = getVisualState(insights.healthState.colorState);
  const burnoutStyle = getVisualState(insights.thresholds.burnout.colorState);
  const wellnessStyle = getVisualState(insights.thresholds.wellness.colorState);

  useEffect(() => { setDisplayedScore(score); }, [score]);

  const replayHealthScore = () => {
    const duration = 850;
    const startTime = performance.now();
    setDisplayedScore(0);
    setRingReplayKey((key) => key + 1);
    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.round(score * easedProgress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return (
    <motion.article className={`h-full cursor-pointer rounded-[2rem] p-6 transition-all hover:bg-white/[0.04] ${healthStyle.card}`} onClick={onOpen} whileHover={{ y: -4, scale: 1.01 }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Health Score</h3>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${healthStyle.text}`}>{healthStyle.label} vitals</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg">🧬</div>
      </div>

      <div className="flex flex-1 items-center justify-center py-4">
        <div className="relative h-36 w-36 cursor-default rounded-full" onMouseEnter={replayHealthScore}>
          <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100">
            <circle cx="50" cy="50" fill="none" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              key={ringReplayKey}
              cx="50" cy="50" fill="none" r={radius}
              stroke={healthStyle.stroke}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round" strokeWidth="6"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full">
            <span className={`text-4xl font-semibold ${healthStyle.text}`}>{displayedScore}</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">{healthStyle.label}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <MiniMetric label="Burnout" value={`${insights.burnoutRisk}%`} state={burnoutStyle} />
        <MiniMetric label="Recovery" value={`${insights.recoveryScore}%`} state={wellnessStyle} />
      </div>
    </motion.article>
  );
}

function FinanceTrajectory({ insights, onOpen }) {
  const [selectedRange, setSelectedRange] = useState('1M');
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const activeChart = insights.financeRanges[selectedRange];
  const financeStyle = getVisualState(insights.thresholds.financial.colorState);

  // Generate approximate currency values for bars
  const income = insights.monthlyBufferValue != null ? (insights.monthlyBufferValue + (insights.savingsRate > 0 ? 0 : 0)) : 0;
  const barCurrencyValues = useMemo(() => {
    return activeChart.bars.map((height) => {
      const baseVal = insights.monthlyBufferValue != null
        ? Math.abs(insights.monthlyBufferValue) * (height / 100) * 1.4
        : height * 420;
      return Math.round(baseVal / 500) * 500;
    });
  }, [activeChart.bars, insights.monthlyBufferValue]);

  return (
    <motion.article
      className={`h-full cursor-pointer rounded-[2rem] p-6 transition-all hover:bg-white/[0.04] ${financeStyle.card}`}
      onClick={onOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setHoveredBarIndex(null); }}
      whileHover={{ y: -6, scale: 1.015 }}
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Financial Trajectory</h3>
          <p className={`text-sm ${financeStyle.text}`}>{activeChart.summary}</p>
        </div>
        <div className="flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
          {['1W', '1M'].map((range) => (
            <button
              key={range}
              onClick={(e) => { e.stopPropagation(); setSelectedRange(range); }}
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase transition ${selectedRange === range ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:bg-white/10'}`}
              type="button"
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div key={selectedRange} className="relative mb-6 h-56 overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.01] px-5 pb-8 pt-5">
        <motion.div
          aria-hidden="true"
          animate={{ opacity: isHovered ? 1 : 0.35, scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.08),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(16,199,161,0.08),transparent_24%)]"
        />
        <div className="absolute inset-x-5 top-5 bottom-8 grid grid-rows-4">
          {[0, 1, 2, 3].map((line) => (<div key={line} className="border-t border-white/5" />))}
        </div>

        <div className="absolute inset-x-5 bottom-8 top-5 flex items-end gap-3">
          {activeChart.bars.map((height, index) => (
            <div
              key={`${height}-${index}`}
              className="relative flex h-full flex-1 cursor-pointer items-end"
              onMouseEnter={(e) => { e.stopPropagation(); setHoveredBarIndex(index); }}
              onMouseLeave={() => setHoveredBarIndex(null)}
            >
              <div
                className="w-full rounded-t-xl transition-all duration-300"
                style={{
                  height: `${height}%`,
                  backgroundColor: financeStyle.softStroke,
                  opacity: hoveredBarIndex === index ? 0.95 : (0.4 + index * (0.6 / Math.max(activeChart.bars.length - 1, 1))),
                  transform: `scaleY(${hoveredBarIndex === index ? 1.12 : (isHovered ? 1.08 : 1)}) translateY(${hoveredBarIndex === index ? '-4px' : (isHovered ? '-2px' : '0px')})`,
                  transformOrigin: 'bottom',
                  boxShadow: hoveredBarIndex === index ? `0 0 24px ${financeStyle.stroke}` : (isHovered ? `0 0 18px ${financeStyle.softStroke}` : 'none'),
                }}
              />
              {/* Floating currency tooltip on bar hover */}
              <AnimatePresence>
                {hoveredBarIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    transition={{ duration: 0.18 }}
                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0a0e17]/95 px-3 py-1.5 text-center backdrop-blur-md"
                    style={{ boxShadow: `0 0 16px ${financeStyle.glowColor || 'rgba(16,199,161,0.2)'}` }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">{activeChart.labels[Math.floor(index / Math.max(activeChart.bars.length / 3, 1))] || 'Data'}</p>
                    <p className="mt-0.5 text-sm font-bold" style={{ color: financeStyle.stroke }}>
                      {formatMoney(barCurrencyValues[index])}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <svg className="pointer-events-none absolute inset-x-5 bottom-8 top-5 h-[calc(100%-52px)] w-[calc(100%-40px)] overflow-visible" viewBox="0 0 368 140" preserveAspectRatio="none">
          <polyline points={activeChart.linePoints} fill="none" stroke={financeStyle.stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {activeChart.pointData.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}`}
              cx={point.x} cy={point.y} r="4"
              fill="#0a0e17"
              stroke={financeStyle.stroke} strokeWidth="3"
              style={{ filter: isHovered ? 'drop-shadow(0 0 10px rgba(255,255,255,0.35))' : 'none' }}
            />
          ))}
        </svg>

        <div className="absolute inset-x-5 bottom-3 flex justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          {activeChart.labels.map((label) => (<span key={label}>{label}</span>))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-5">
        <div className="flex gap-8">
          <AnimatedMetricBlock label="Savings Rate" value={insights.savingsRate} suffix="%" state={getVisualState(insights.savingsState.colorState)} />
          <AnimatedMetricBlock label="Monthly Buffer" value={insights.monthlyBufferValue} formatter={formatMoney} fallback="Add data" state={getVisualState(insights.bufferState.colorState)} />
        </div>
      </div>
    </motion.article>
  );
}

// ==========================================
// Enhanced Life Balance Radar with hover breakdowns
// ==========================================
function LifeBalance({ insights }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const data = [
    { subject: 'Health', A: insights.healthScore, fullMark: 100, emoji: '🧬', color: '#10c7a1', desc: 'Biometric + recovery composite' },
    { subject: 'Finance', A: insights.financeScore, fullMark: 100, emoji: '💎', color: '#c8a84b', desc: 'Savings + buffer composite' },
    { subject: 'Career', A: insights.productivityScore, fullMark: 100, emoji: '🎯', color: '#7b61ff', desc: 'Productivity + momentum score' },
    { subject: 'Recovery', A: insights.recoveryScore, fullMark: 100, emoji: '💧', color: '#38bdf8', desc: 'Sleep + exercise + stress inverse' },
    { subject: 'Resilience', A: 100 - insights.burnoutRisk, fullMark: 100, emoji: '🛡️', color: '#f472b6', desc: 'Inverse of burnout risk index' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const entry = data.find((d) => d.subject === payload[0]?.payload?.subject);
    if (!entry) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-[1rem] border border-white/10 bg-[#0a0e17]/95 px-4 py-3 text-left backdrop-blur-xl shadow-2xl"
        style={{ minWidth: 160, boxShadow: `0 0 20px ${entry.color}30` }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{entry.emoji}</span>
          <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: entry.color }}>{entry.subject}</p>
        </div>
        <p className="text-2xl font-bold text-white">{entry.A}<span className="text-sm font-normal text-white/50 ml-0.5">%</span></p>
        <p className="mt-1 text-[10px] text-white/45 leading-4">{entry.desc}</p>
      </motion.div>
    );
  };

  return (
    <motion.article whileHover={{ y: -4, scale: 1.01 }} className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-lg backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Life Balance Radar</h3>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-white/45">Hover each axis for details</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg">⚡</div>
      </div>

      <div className="grid flex-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Expanded Radar */}
        <div className="min-h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis
                dataKey="subject"
                tick={({ x, y, payload }) => {
                  const entry = data.find((d) => d.subject === payload.value);
                  return (
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill={entry?.color || 'rgba(255,255,255,0.5)'} fontSize={10} fontWeight={700} letterSpacing="0.1em">
                      {payload.value}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Radar
                name="Sync Score"
                dataKey="A"
                stroke="#7b61ff"
                strokeWidth={2.5}
                fill="rgba(123,97,255,0.15)"
                fillOpacity={0.9}
                dot={{ r: 5, fill: '#7b61ff', stroke: 'rgba(123,97,255,0.4)', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#7b61ff', stroke: 'white', strokeWidth: 2, filter: 'drop-shadow(0 0 6px rgba(123,97,255,0.8))' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown List */}
        <div className="flex flex-col gap-2.5">
          {data.map((item, index) => (
            <motion.div
              key={item.subject}
              whileHover={{ scale: 1.03, x: 4 }}
              className="group flex items-center justify-between rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-3 transition-colors hover:border-white/15 cursor-default"
              style={{ boxShadow: `0 0 0 0 ${item.color}00` }}
              whileHover={{ boxShadow: `0 0 14px ${item.color}22` }}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{item.emoji}</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">{item.subject}</p>
                  <p className="text-sm font-semibold text-white">{item.A}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.A}%` }}
                    transition={{ duration: 1.2, delay: index * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                </div>
              </div>
            </motion.div>
          ))}

          <div className="mt-auto rounded-[1.1rem] border border-white/10 bg-[#10c7a1]/5 p-3 text-xs leading-5 text-white/60">
            <span className="mr-1.5 inline-block">🧠</span>
            Balance leaning toward recovery. Hydration and finance reminders active.
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function DailyRituals({ insights }) {
  const [now, setNow] = useState(() => new Date());
  const ritualCalendar = useMemo(() => buildRitualCalendar(now, insights), [now, insights]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.article whileHover={{ y: -4, scale: 1.01 }} className="flex h-full flex-col justify-between rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-lg backdrop-blur-xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Day {ritualCalendar.today}</p>
          <p className="mt-0.5 font-mono text-[11px] text-white/50">{formatTimeLeft(now)} left</p>
          {ritualCalendar.streakStarted && (
            <p className="mt-1 text-[11px] font-semibold text-[#10c7a1]">{ritualCalendar.currentStreak} day streak</p>
          )}
        </div>
        <div className="relative h-14 w-14 rotate-45 rounded-[14px] border border-white/10 bg-white/5 shadow-lg">
          <div className="absolute inset-1.5 rounded-[12px] border border-white/5" />
          <div className="flex h-full -rotate-45 flex-col items-center justify-center">
            <span className="text-lg font-bold text-white">{ritualCalendar.today}</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">{ritualCalendar.monthShort}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-4">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <div key={`${day}-${index}`} className="text-center text-xs font-semibold text-white/40">{day}</div>
        ))}
        {ritualCalendar.days.map((day) => (
          <div key={day.key} className="grid h-8 place-items-center">
            {day.type === 'blank' ? <span /> : <RitualDay day={day} />}
          </div>
        ))}
      </div>

      {!ritualCalendar.streakStarted && (
        <p className="mt-6 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-center text-[11px] font-medium text-white/60">
          Complete today's goals to begin streak tracking.
        </p>
      )}
    </motion.article>
  );
}

function RitualDay({ day }) {
  if (day.state === 'today-complete') return <span className="grid h-8 w-8 place-items-center rounded-full bg-[#10c7a1] text-sm font-bold text-[#05070c] shadow-[0_0_12px_rgba(16,199,161,0.6)]">{day.value}</span>;
  if (day.state === 'today') return <span className="grid h-8 w-8 place-items-center rounded-full border border-[#10c7a1] bg-[#10c7a1]/10 text-sm font-bold text-[#10c7a1]">{day.value}</span>;
  if (day.state === 'done') return <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white/20 text-white/60"><CheckIcon className="h-4 w-4" /></span>;
  if (day.state === 'missed') return (
    <span className="relative grid h-8 w-8 place-items-center text-sm font-medium text-white/40">
      {day.value}
      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#ff4d7d]" />
    </span>
  );
  return <span className="text-sm font-medium text-white/50">{day.value}</span>;
}

// ==========================================
// Command Center Portals — enhanced
// ==========================================
function TrackingPortals({ navigate }) {
  const portals = [
    {
      title: 'Vitality Chamber',
      desc: 'Biometrics & Recovery',
      path: '/health',
      icon: '🧬',
      accentColor: '#ff4d7d',
      gradFrom: 'rgba(255,77,125,0.12)',
      gradTo: 'transparent',
      borderHover: '#ff4d7d',
      stat: 'Health Score',
      particles: ['💊', '🏃', '💤'],
    },
    {
      title: 'Wealth Nexus',
      desc: 'Cashflow & Assets',
      path: '/finance',
      icon: '💎',
      accentColor: '#10c7a1',
      gradFrom: 'rgba(16,199,161,0.12)',
      gradTo: 'transparent',
      borderHover: '#10c7a1',
      stat: 'Finance Score',
      particles: ['📈', '💳', '🏦'],
    },
    {
      title: 'Trajectory Forge',
      desc: 'Focus & Momentum',
      path: '/career',
      icon: '🎯',
      accentColor: '#7b61ff',
      gradFrom: 'rgba(123,97,255,0.12)',
      gradTo: 'transparent',
      borderHover: '#7b61ff',
      stat: 'Career Score',
      particles: ['⚡', '🧠', '🚀'],
    },
  ];

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Command Center</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {portals.map((p) => (
          <PortalCard key={p.title} portal={p} navigate={navigate} />
        ))}
      </div>
    </section>
  );
}

function PortalCard({ portal: p, navigate }) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={cardRef}
      onClick={() => navigate(p.path)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 backdrop-blur-xl"
      style={{
        borderColor: isHovered ? `${p.accentColor}50` : 'rgba(255,255,255,0.1)',
        boxShadow: isHovered ? `0 0 40px ${p.accentColor}18, 0 20px 60px -20px rgba(0,0,0,0.6)` : '0 10px 40px -15px rgba(0,0,0,0.5)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Spotlight effect on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(160px circle at ${mousePos.x}px ${mousePos.y}px, ${p.accentColor}14, transparent 65%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Base gradient */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at top left, ${p.gradFrom}, ${p.gradTo})`,
          opacity: isHovered ? 0.7 : 0.35,
        }}
      />

      {/* Animated corner glow */}
      <motion.div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
        style={{ backgroundColor: p.accentColor }}
        animate={{ opacity: isHovered ? 0.18 : 0.06, scale: isHovered ? 1.3 : 1 }}
        transition={{ duration: 0.4 }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">{p.desc}</p>
            <h3 className="mt-1.5 text-2xl font-bold tracking-tight text-white">{p.title}</h3>
          </div>
          <motion.div
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-lg"
            animate={{ rotate: isHovered ? 8 : 0, scale: isHovered ? 1.1 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            style={{ boxShadow: isHovered ? `0 0 20px ${p.accentColor}40` : 'none' }}
          >
            {p.icon}
          </motion.div>
        </div>

        {/* Particle row */}
        <div className="mt-5 flex gap-2">
          {p.particles.map((particle, i) => (
            <motion.span
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-sm"
              animate={{ y: isHovered ? [0, -3, 0] : 0 }}
              transition={{ duration: 0.5, delay: i * 0.08, repeat: isHovered ? Infinity : 0, repeatType: 'reverse' }}
            >
              {particle}
            </motion.span>
          ))}
        </div>

        {/* Footer CTA */}
        <motion.div
          className="mt-6 flex items-center gap-2 text-sm font-semibold"
          style={{ color: p.accentColor }}
          animate={{ x: isHovered ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          Enter Portal
          <motion.div animate={{ x: isHovered ? 4 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function AdaptiveRecommendations({ insights }) {
  return (
    <section className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0e17]/80 p-6 sm:p-8 shadow-lg backdrop-blur-2xl">
      <div className="relative z-10">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Adaptive Recommendations</h2>
          <div className="flex w-fit items-center gap-2 rounded-full border border-[#10c7a1]/30 bg-[#10c7a1]/10 px-4 py-1.5 shadow-[0_0_15px_rgba(16,199,161,0.15)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#10c7a1]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#10c7a1]">Deep Sync Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {insights.recommendations.slice(0, 3).map((item) => {
            const state = getVisualState(item.colorState);
            return (
              <motion.article key={item.title} whileHover={{ y: -4, scale: 1.02 }} className={`relative overflow-hidden rounded-[1.5rem] border bg-white/[0.02] p-0 backdrop-blur transition-colors ${state.card}`}>
                <div className="relative z-10 border-b border-white/5 px-6 py-5 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-bold ${state.text}`}>{item.title}</h4>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-inner ${state.icon}`}>
                      {item.icon ? <item.icon className="h-4 w-4" /> : '•'}
                    </div>
                  </div>
                </div>
                <div className="relative z-10 px-6 py-5">
                  <p className="text-sm leading-6 text-white/60">{item.detail}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-16 -right-12 h-52 w-52 rounded-full bg-[#7b61ff]/10 blur-3xl" />
    </section>
  );
}

function AiFeed({ insights }) {
  const sectorReminders = [
    { emoji: '💧', title: 'Drink your water', detail: `${Math.max(2, 8 - Math.round(insights.stressLevel / 2))} glasses left today`, tone: 'health' },
    { emoji: '📘', title: 'Course left', detail: `${Math.max(1, Math.ceil((100 - insights.productivityScore) / 12))} lessons left to finish`, tone: 'career' },
    { emoji: '💸', title: 'Save this month', detail: `Set aside ${formatMoney(Math.max(0, Math.round((insights.monthlyBufferValue || 0) * 0.2)))}`, tone: 'finance' },
  ];

  return (
    <aside className="hidden xl:flex h-screen w-80 shrink-0 flex-col overflow-hidden border-l border-white/10 bg-[#070a10]/50 backdrop-blur-xl">
      <div className="flex h-[73px] shrink-0 items-center border-b border-white/10 px-6 bg-[#070a10]/80">
        <Sparkles className="mr-3 h-5 w-5 text-[#c8a84b]" />
        <h3 className="text-lg font-semibold text-white">AI Insight</h3>
      </div>

      <div className="dashboard-scrollbar flex-1 space-y-6 overflow-y-auto p-5">
        <section className="space-y-4">
          {insights.feed.map((item) => {
            const state = getVisualState(item.colorState);
            const isHarmful = item.sentiment === 'negative' || normalizeColorState(item.colorState) === 'red';
            const textState = isHarmful ? getVisualState('red') : state;
            return (
              <motion.article key={item.title} whileHover={{ scale: 1.02 }} className={`space-y-3 rounded-[1.2rem] border bg-white/[0.03] p-4 shadow-lg backdrop-blur-md transition-colors ${state.card}`}>
                <div className="flex items-start justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${state.badge}`}>{item.label}</span>
                  <span className="text-[10px] font-medium text-white/40">{item.time}</span>
                </div>
                <p className={`text-sm font-medium leading-6 ${isHarmful ? textState.text : 'text-white/90'}`}>{item.title}</p>
              </motion.article>
            );
          })}
        </section>

        <section>
          <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Historical Alignment</h4>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
            <div className="flex h-24 items-end gap-1 px-1">
              {insights.alignmentBars.map((height, index) => {
                const state = getVisualState(alignmentColorState(height));
                return (
                  <div key={`${height}-${index}`} className="flex-1 rounded-t-sm transition-all hover:opacity-100"
                    style={{ height: `${height}%`, backgroundColor: state.stroke, opacity: 0.4 + index * 0.1, boxShadow: `0 0 10px ${state.softStroke}` }}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex justify-between text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
              <span>Mon</span><span>Today</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {sectorReminders.map((item, index) => (
              <motion.div
                key={item.title}
                animate={{ y: [0, index % 2 === 0 ? -2 : 2, 0] }}
                transition={{ duration: 4.2 + index * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                className={`rounded-[1.1rem] border border-white/10 bg-white/[0.03] p-3 ${item.tone === 'health' ? 'shadow-[0_0_0_1px_rgba(16,199,161,0.08)]' : item.tone === 'finance' ? 'shadow-[0_0_0_1px_rgba(212,175,55,0.08)]' : 'shadow-[0_0_0_1px_rgba(123,97,255,0.08)]'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg">{item.emoji}</div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-white/70">{item.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

// ==========================================
// Sub-components
// ==========================================
function MiniMetric({ label, value, state = getVisualState('green') }) {
  return (
    <div className={`rounded-[1.2rem] p-3.5 transition-colors ${state.surface}`}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</p>
      <p className={`text-lg font-bold ${state.text}`}>{value}</p>
    </div>
  );
}

function AnimatedMetricBlock({ label, value, state = null, suffix = '', formatter = null, fallback = '' }) {
  const numericValue = Number(value);
  const hasValue = Number.isFinite(numericValue);
  const [displayValue, setDisplayValue] = useState(hasValue ? 0 : value);

  useEffect(() => {
    if (!hasValue) { setDisplayValue(value || fallback); return; }
    const duration = 850;
    const startTime = performance.now();
    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(numericValue * easedProgress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    setDisplayValue(0);
    requestAnimationFrame(tick);
  }, [fallback, hasValue, numericValue, value]);

  const renderedValue = hasValue ? `${formatter ? formatter(displayValue) : displayValue}${suffix}` : displayValue || fallback;

  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">{label}</p>
      <p className={`text-xl font-bold ${state ? state.text : 'text-white'}`}>{renderedValue}</p>
    </div>
  );
}

function RadarLabel({ label, className }) {
  return <span className={`absolute text-[9px] font-bold uppercase tracking-[0.16em] text-white/50 ${className}`}>{label}</span>;
}

// ==========================================
// Data Utilities
// ==========================================
function getVisualState(colorState = 'green') {
  const normalizedColorState = normalizeColorState(colorState);
  const states = {
    green: {
      label: 'Healthy', stroke: '#10c7a1', softStroke: 'rgba(16,199,161,0.2)', glowColor: 'rgba(16,199,161,0.2)',
      text: 'text-[#10c7a1]', card: 'border-white/10 hover:border-[#10c7a1]/40',
      icon: 'bg-[#10c7a1]/10 text-[#10c7a1] border border-[#10c7a1]/20',
      badge: 'bg-[#10c7a1]/10 text-[#10c7a1] border border-[#10c7a1]/20',
      surface: 'bg-[#10c7a1]/5 border border-[#10c7a1]/10',
    },
    orange: {
      label: 'Warning', stroke: '#c8a84b', softStroke: 'rgba(200,168,75,0.2)', glowColor: 'rgba(200,168,75,0.2)',
      text: 'text-[#c8a84b]', card: 'border-white/10 hover:border-[#c8a84b]/40',
      icon: 'bg-[#c8a84b]/10 text-[#c8a84b] border border-[#c8a84b]/20',
      badge: 'bg-[#c8a84b]/10 text-[#c8a84b] border border-[#c8a84b]/20',
      surface: 'bg-[#c8a84b]/5 border border-[#c8a84b]/10',
    },
    red: {
      label: 'Critical', stroke: '#ff4d7d', softStroke: 'rgba(255,77,125,0.2)', glowColor: 'rgba(255,77,125,0.2)',
      text: 'text-[#ff4d7d]', card: 'border-white/10 hover:border-[#ff4d7d]/40',
      icon: 'bg-[#ff4d7d]/10 text-[#ff4d7d] border border-[#ff4d7d]/20',
      badge: 'bg-[#ff4d7d]/10 text-[#ff4d7d] border border-[#ff4d7d]/20',
      surface: 'bg-[#ff4d7d]/5 border border-[#ff4d7d]/10',
    },
  };
  return states[normalizedColorState] || states.green;
}

function getStoredProfile() {
  try { return localStorage.getItem('lifetwinOnboardingProfile') ? JSON.parse(localStorage.getItem('lifetwinOnboardingProfile')) : fallbackProfile; }
  catch { return fallbackProfile; }
}

function getStoredDashboardData() {
  try { return localStorage.getItem('digitalTwinDashboardData') ? JSON.parse(localStorage.getItem('digitalTwinDashboardData')) : null; }
  catch { return null; }
}

function getStoredUser() {
  try { return localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null; }
  catch { return null; }
}

function normalizeProfile(rawProfile) {
  if (!rawProfile) return fallbackProfile;
  if (rawProfile.lifestyle && rawProfile.financialPatterns) return rawProfile;
  return {
    behavioralAnalysis: { focusAreas: rawProfile.selectedSignals || [] },
    integrations: {
      github: { status: rawProfile.githubUsername ? 'connected' : 'skipped', username: rawProfile.githubUsername || '' },
      leetcode: { status: rawProfile.leetcodeUsername ? 'connected' : 'skipped', username: rawProfile.leetcodeUsername || '' },
      fitbit: { status: rawProfile.fitbitProfile ? 'connected' : 'skipped', profileLink: rawProfile.fitbitProfile || '' },
      googleCalendar: { status: rawProfile.calendarProfile ? 'connected' : 'skipped', profileLink: rawProfile.calendarProfile || '' },
      linkedin: { status: rawProfile.linkedinProfile ? 'connected' : 'skipped', profileLink: rawProfile.linkedinProfile || '' },
      banking: { status: rawProfile.bankingProfile ? 'connected' : 'skipped', profileLink: rawProfile.bankingProfile || '' },
    },
    lifestyle: {
      gender: rawProfile.gender || '',
      sleepHours: rawProfile.sleepHours ?? 7,
      studyHours: rawProfile.studyHours ?? 4,
      exerciseFrequency: rawProfile.exerciseFrequency ?? 2,
      spendingStyle: rawProfile.spendingStyle || 'balanced',
      smokingHabits: rawProfile.smokingHabit || 'no',
      periodTracking: rawProfile.periodTracking || 'not_now',
      genderSpecificHealthContext: rawProfile.genderSpecificHealthContext || 'not_now',
    },
    financialPatterns: {
      monthlyIncome: rawProfile.monthlyIncome ?? 0,
      monthlyExpenditure: rawProfile.monthlyExpenditure ?? 0,
      savingsHabits: rawProfile.savingsHabit || 'moderate',
      financialStressLevel: rawProfile.financialStressLevel ?? 5,
    },
    aiScores: {
      burnoutRisk: rawProfile.burnoutRisk,
      productivityScore: rawProfile.productivityScore,
      financialHealth: rawProfile.financialHealth,
      wellnessBalance: rawProfile.wellnessBalance,
    },
  };
}

function buildInsights(profile, dashboardData = null) {
  const sleepHours = Number(profile.lifestyle.sleepHours || 7);
  const studyHours = Number(profile.lifestyle.studyHours || 4);
  const exerciseFrequency = Number(profile.lifestyle.exerciseFrequency || 2);
  const stressLevel = Number(profile.financialPatterns.financialStressLevel || 4);
  const income = Number(profile.financialPatterns.monthlyIncome || 0);
  const expenditure = Number(profile.financialPatterns.monthlyExpenditure || 0);
  const rawSavingsRate = income > 0 ? Math.round(((income - expenditure) / income) * 100) : 0;
  const savingsRate = income > 0 ? Math.max(0, rawSavingsRate) : 28;
  const connectedCount = Object.values(profile.integrations || {}).filter((item) => item.status === 'connected').length;
  const monthlyBufferValue = income > 0 ? income - expenditure : null;
  const monthlyBuffer = monthlyBufferValue !== null ? formatMoney(monthlyBufferValue) : 'Add data';
  const hasGithub = profile.integrations?.github?.status === 'connected';
  const hasLeetcode = profile.integrations?.leetcode?.status === 'connected';
  const smokingHabit = profile.lifestyle.smokingHabits || 'no';
  const gender = profile.lifestyle.gender || '';
  const genderThresholds = getGenderThresholds(gender);
  const periodRecoveryLoad = gender === 'female' && profile.lifestyle.periodTracking === 'irregular' ? 5 : 0;
  const maleRecoveryCredit = gender === 'male' && profile.lifestyle.genderSpecificHealthContext !== 'not_now' && exerciseFrequency >= 3 ? 3 : 0;

  const calculatedBurnout = clamp(Math.round(42 + Math.max(0, genderThresholds.idealSleepHours - sleepHours) * 8 + Math.max(0, studyHours - genderThresholds.heavyStudyHours) * 5 + stressLevel * 2 - exerciseFrequency * 3 + (smokingHabit === 'yes' ? 8 : 0) + periodRecoveryLoad - maleRecoveryCredit), 18, 95);
  const calculatedProductivity = clamp(Math.round(58 + studyHours * 5 + connectedCount * 3 + (hasGithub ? 4 : 0) + (hasLeetcode ? 3 : 0) - Math.max(0, genderThresholds.idealSleepHours - sleepHours) * 3 - Math.max(0, stressLevel - 6) * 3), 30, 98);
  const calculatedRecovery = clamp(Math.round(54 + sleepHours * 4 + exerciseFrequency * genderThresholds.exerciseWeight - stressLevel * 3 - (smokingHabit === 'yes' ? 10 : 0) - periodRecoveryLoad), 18, 96);
  const calculatedFinance = clamp(Math.round(50 + rawSavingsRate * 0.8 - stressLevel * 2 - (expenditure > income && income > 0 ? 18 : 0)), 8, 98);

  const analytics = dashboardData?.analytics || profile.aiScores || {};
  const burnoutRisk = clamp(Number.isFinite(Number(analytics.burnoutRisk)) ? Number(analytics.burnoutRisk) : calculatedBurnout, 0, 100);
  const productivityScore = clamp(Number.isFinite(Number(analytics.productivityScore)) ? Number(analytics.productivityScore) : calculatedProductivity, 0, 100);
  const recoveryScore = clamp(Number.isFinite(Number(analytics.wellnessBalance)) ? Number(analytics.wellnessBalance) : calculatedRecovery, 0, 100);
  const financeScore = clamp(Number.isFinite(Number(analytics.financialHealth)) ? Number(analytics.financialHealth) : calculatedFinance, 0, 100);
  const healthScore = clamp(Math.round((100 - burnoutRisk) * 0.35 + recoveryScore * 0.65), 35, 96);
  const thresholds = normalizeThresholds(dashboardData?.thresholds || analytics.thresholds, { sleepHours, stressLevel, burnoutRisk, financeScore, recoveryScore, productivityScore, income, expenditure, gender });
  const healthState = deriveHealthState({ healthScore, burnoutState: thresholds.burnout, wellnessState: thresholds.wellness });
  const metricStates = dashboardData?.metricStates || dashboardData?.analytics?.metricStates || {};
  const savingsState = metricStates.savingsRate || deriveSavingsState({ rawSavingsRate });
  const bufferState = metricStates.savingsBuffer || deriveBufferState({ income, expenditure });
  const financeRanges = buildFinanceRanges({ income, expenditure, stressLevel, savingsRate: rawSavingsRate, financeScore });
  const recommendations = normalizeRecommendations(dashboardData?.recommendations, { sleepHours, studyHours, savingsRate, rawSavingsRate, burnoutRisk, stressLevel, exerciseFrequency, smokingHabit, hasGithub, hasLeetcode });
  const feed = buildFeed(dashboardData?.aiInsights, { exerciseFrequency, savingsRate, rawSavingsRate, sleepHours, burnoutRisk, stressLevel, productivityScore, studyHours, smokingHabit, hasGithub, hasLeetcode, financeScore, recoveryScore });
  const streak = normalizeStreak(dashboardData?.streak || dashboardData?.profile);

  return {
    burnoutRisk, productivityScore, recoveryScore, financeScore, healthScore, sleepHours, studyHours, exerciseFrequency, stressLevel, streak, thresholds, healthState, savingsState, bufferState, savingsRate, monthlyBufferValue, monthlyBuffer,
    financeTrend: rawSavingsRate < 0 ? '-3.8% spending pressure' : rawSavingsRate > 25 ? '+2.4% growth' : '+0.6% stabilizing',
    financeTone: rawSavingsRate < 0 ? '#ff4d7d' : '#10c7a1',
    financeRanges,
    alignmentBars: buildAlignmentBars({ sleepHours, studyHours, exerciseFrequency, stressLevel, rawSavingsRate, healthScore, financeScore, productivityScore, recoveryScore, burnoutRisk, hasGithub, hasLeetcode }),
    alignmentLabel: burnoutRisk > 70 ? 'active recovery mode' : rawSavingsRate < 0 ? 'financial caution mode' : 'optimal alignment',
    recommendations, feed,
  };
}

function normalizeRecommendations(apiRecommendations, context) {
  const source = mergeByTitle([...buildFallbackRecommendations(context), ...(Array.isArray(apiRecommendations) ? apiRecommendations : [])]);
  return source.map((item, index) => ({
    title: item.title,
    detail: item.detail || item.message || 'Personalized from your latest onboarding signals.',
    icon: iconForCategory(item.category || item.title),
    severity: item.severity || 'low',
    colorState: normalizeColorState(item.colorState || colorStateFromSeverity(item.severity)),
    originalIndex: index,
  })).sort((first, second) => recommendationPriority(second) - recommendationPriority(first) || first.originalIndex - second.originalIndex).slice(0, 3);
}

function buildFallbackRecommendations({ sleepHours, studyHours, savingsRate, rawSavingsRate, burnoutRisk, stressLevel, exerciseFrequency, smokingHabit, hasGithub, hasLeetcode }) {
  const items = [];
  const lowSleepHighStudy = sleepHours < 5 && studyHours > 8;
  const highExerciseLowStress = exerciseFrequency >= 4 && stressLevel <= 3;
  if (lowSleepHighStudy) items.push({ title: 'Prioritize 7+ hours of sleep', detail: 'Protect the next 3 nights with an earlier wind-down window.', category: 'wellness', severity: 'high', colorState: 'red' });
  else if (sleepHours < 7) items.push({ title: 'Early Recharge', detail: 'Move bedtime 45 minutes earlier to improve tomorrow recovery.', category: 'wellness', severity: 'medium', colorState: 'orange' });
  else if (highExerciseLowStress) items.push({ title: 'Maintain current health rhythm', detail: 'Keep the same workout cadence for the next week.', category: 'health', severity: 'low', colorState: 'green' });
  if (rawSavingsRate < 0) items.push({ title: 'Reduce discretionary spending this week', detail: 'Pause flexible purchases and review recurring expenses.', category: 'finance', severity: 'high', colorState: 'red' });
  else if (savingsRate > 25) items.push({ title: 'Increase long-term savings allocation', detail: 'Move a small surplus into savings while income stays ahead of expenditure.', category: 'finance', severity: 'low', colorState: 'green' });
  if (burnoutRisk > 65 || stressLevel > 7) items.push({ title: 'Recovery Break', detail: 'Schedule a 20-minute reset before the next deep-work block.', category: 'health', severity: burnoutRisk > 70 ? 'high' : 'medium', colorState: burnoutRisk > 70 ? 'red' : 'orange' });
  if (smokingHabit === 'yes') items.push({ title: 'Reduce recovery friction', detail: 'Pair one craving window with a short walk or breathing reset.', category: 'health', severity: 'medium', colorState: 'orange' });
  if (hasGithub || hasLeetcode) items.push({ title: 'Protect coding momentum', detail: 'Keep one focused coding or practice block active today.', category: 'career', severity: 'low', colorState: 'green' });
  else items.push({ title: 'Add a coding signal', detail: 'Connect GitHub or LeetCode to make career intelligence more specific.', category: 'career', severity: 'low', colorState: 'green' });
  return items;
}

function buildFeed(apiInsights, context) {
  const behavioralFeed = buildBehaviorFeed(context);
  const aiFeed = Array.isArray(apiInsights) ? apiInsights.map((item, index) => ({
    label: item.label || 'Insight', time: index === 0 ? 'Now' : index === 1 ? '12m ago' : '28m ago',
    title: item.message || item.title || 'Digital Twin insight updated from your profile.',
    colorState: normalizeColorState(item.colorState || colorStateFromSeverity(item.severity) || 'green'),
    sentiment: item.sentiment || sentimentFromColorState(item.colorState || colorStateFromSeverity(item.severity)),
  })) : [];
  return mergeFeed([...behavioralFeed, ...aiFeed]).slice(0, 3);
}

function buildBehaviorFeed(context) {
  const items = [];
  const lowSleepHighStudy = context.sleepHours < 5 && context.studyHours > 8;
  const highExerciseLowStress = context.exerciseFrequency >= 4 && context.stressLevel <= 3;
  if (lowSleepHighStudy) {
    items.push({ label: 'Burnout', time: 'Now', title: 'Late-night study patterns may increase burnout risk because recovery time is reduced.', colorState: 'red', sentiment: 'negative' });
    items.push({ label: 'Wellness', time: '4m ago', title: 'Reduced sleep consistency is impacting recovery stability.', colorState: 'orange', sentiment: 'negative' });
  } else if (highExerciseLowStress) {
    items.push({ label: 'Recovery', time: 'Now', title: 'Exercise frequency is improving recovery rhythm and focus stability.', colorState: 'green', sentiment: 'positive' });
    items.push({ label: 'Productivity', time: '9m ago', title: 'Wellness consistency is positively impacting productivity confidence.', colorState: 'green', sentiment: 'positive' });
  } else {
    items.push({ label: 'Biometric', time: 'Now', title: context.exerciseFrequency > 2 ? 'Workout consistency is improving recovery confidence.' : 'A short mobility block today would improve recovery confidence.', colorState: context.exerciseFrequency > 2 ? 'green' : 'orange', sentiment: context.exerciseFrequency > 2 ? 'positive' : 'neutral' });
  }
  if (context.rawSavingsRate < 0) items.push({ label: 'Finance', time: '11m ago', title: 'Financial stress indicators are increasing because spending trajectory exceeds income stability.', colorState: 'red', sentiment: 'negative' });
  else if (context.savingsRate > 25) items.push({ label: 'Finance', time: '18m ago', title: 'Financial discipline is currently stable as income stays ahead of expenditure.', colorState: 'green', sentiment: 'positive' });
  if (context.hasGithub || context.hasLeetcode) items.push({ label: 'Career', time: '24m ago', title: 'GitHub or LeetCode signals strengthen the career momentum pattern.', colorState: 'green', sentiment: 'positive' });
  if (context.smokingHabit === 'yes') items.push({ label: 'Wellness', time: '31m ago', title: 'Smoking habit is adding recovery friction to the wellness model.', colorState: 'red', sentiment: 'negative' });
  return items;
}

function mergeByTitle(items) {
  const seen = new Set();
  return items.filter((item) => { const key = String(item.title || '').toLowerCase(); if (!key || seen.has(key)) return false; seen.add(key); return true; });
}

function mergeFeed(items) {
  const seen = new Set();
  return items.filter((item) => { const key = `${item.label}-${item.title}`.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}

function normalizeThresholds(apiThresholds, context) {
  const genderThresholds = getGenderThresholds(context.gender);
  return {
    sleep: apiThresholds?.sleep || thresholdState(context.sleepHours < genderThresholds.criticalSleepHours ? 'critical' : context.sleepHours < genderThresholds.idealSleepHours ? 'warning' : 'healthy', context.sleepHours),
    stress: apiThresholds?.stress || thresholdState(context.stressLevel >= 7 ? 'critical' : context.stressLevel >= 5 ? 'warning' : 'healthy', context.stressLevel),
    burnout: apiThresholds?.burnout || thresholdState(context.burnoutRisk > genderThresholds.criticalBurnout ? 'critical' : context.burnoutRisk >= genderThresholds.warningBurnout ? 'warning' : 'healthy', context.burnoutRisk),
    financial: apiThresholds?.financial || thresholdState(savingsStatusFromRate(context.income > 0 ? ((context.income - context.expenditure) / context.income) * 100 : 0), context.financeScore),
    wellness: apiThresholds?.wellness || thresholdState(context.recoveryScore < genderThresholds.criticalWellness ? 'critical' : context.recoveryScore < genderThresholds.warningWellness ? 'warning' : 'healthy', context.recoveryScore),
    productivity: apiThresholds?.productivity || thresholdState(context.productivityScore < 45 ? 'critical' : context.productivityScore < 65 ? 'warning' : 'healthy', context.productivityScore),
  };
}

function getGenderThresholds(gender) {
  if (gender === 'female') return { idealSleepHours: 7.5, criticalSleepHours: 5.5, heavyStudyHours: 6, warningBurnout: 38, criticalBurnout: 68, warningWellness: 67, criticalWellness: 47, exerciseWeight: 5.5 };
  return { idealSleepHours: 7, criticalSleepHours: 5, heavyStudyHours: 7, warningBurnout: 42, criticalBurnout: 72, warningWellness: 63, criticalWellness: 43, exerciseWeight: 6 };
}

function thresholdState(status, score) { return { score, status, severity: status === 'critical' ? 'high' : status === 'warning' ? 'medium' : 'low', colorState: status === 'critical' ? 'red' : status === 'warning' ? 'orange' : 'green' }; }
function deriveHealthState({ healthScore, burnoutState, wellnessState }) {
  if (burnoutState.status === 'critical' || wellnessState.status === 'critical' || healthScore < 45) return thresholdState('critical', healthScore);
  if (burnoutState.status === 'warning' || wellnessState.status === 'warning' || healthScore < 65) return thresholdState('warning', healthScore);
  return thresholdState('healthy', healthScore);
}
function deriveSavingsState({ rawSavingsRate }) { return thresholdState(savingsStatusFromRate(rawSavingsRate), rawSavingsRate); }
function deriveBufferState({ income, expenditure }) {
  if (income <= 0) return thresholdState('warning', 0);
  return thresholdState(savingsStatusFromRate(((income - expenditure) / income) * 100), ((income - expenditure) / income) * 100);
}
function savingsStatusFromRate(savingsRate) {
  if (savingsRate <= 33) return 'critical';
  if (savingsRate <= 66) return 'warning';
  return 'healthy';
}
function colorStateFromSeverity(severity) {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'orange';
  return 'green';
}
function recommendationPriority(item) {
  if (normalizeColorState(item.colorState) === 'red' || item.severity === 'high') return 3;
  if (normalizeColorState(item.colorState) === 'orange' || item.severity === 'medium') return 2;
  return 1;
}
function alignmentColorState(value) {
  if (value <= 33) return 'red';
  if (value <= 66) return 'orange';
  return 'green';
}
function sentimentFromColorState(colorState) { return normalizeColorState(colorState) === 'red' ? 'negative' : 'neutral'; }
function normalizeColorState(colorState = 'green') {
  const legacyMap = { healthy: 'green', warning: 'orange', danger: 'red', critical: 'red' };
  return legacyMap[colorState] || colorState || 'green';
}
function iconForCategory(category = '') {
  const text = String(category).toLowerCase();
  if (text.includes('finance') || text.includes('spending') || text.includes('saving')) return WalletIcon;
  if (text.includes('career') || text.includes('product') || text.includes('learning')) return BriefIcon;
  return MoonIcon;
}

function buildFinanceRanges({ income, expenditure, stressLevel, savingsRate, financeScore }) {
  const weeklySeries = buildFinanceSeries({ income, expenditure, stressLevel, savingsRate, financeScore, points: 7, volatility: 7, rangeWeight: 0.65 });
  const monthlySeries = buildFinanceSeries({ income, expenditure, stressLevel, savingsRate, financeScore, points: 12, volatility: 4.5, rangeWeight: 1 });
  const pressure = income > 0 && expenditure > income;
  const stable = savingsRate >= 20;
  return {
    '1W': { bars: weeklySeries, linePoints: buildLinePoints(weeklySeries), pointData: buildPointData(weeklySeries), labels: ['Mon', 'Thu', 'Today'], summary: pressure ? 'Weekly cashflow dipping under spending pressure' : stable ? 'Weekly cashflow holding healthy surplus' : 'Weekly cashflow stabilizing near baseline' },
    '1M': { bars: monthlySeries, linePoints: buildLinePoints(monthlySeries), pointData: buildPointData(monthlySeries), labels: ['Last Month', 'Baseline', 'Today'], summary: pressure ? '-3.8% monthly spending pressure against baseline' : stable ? '+2.4% monthly growth against baseline' : '+0.6% monthly stabilization against baseline' },
  };
}

function buildFinanceSeries({ income, expenditure, stressLevel, savingsRate, financeScore, points, volatility, rangeWeight }) {
  const pressure = income > 0 && expenditure > income;
  const trendDirection = pressure ? -1 : savingsRate > 25 ? 1 : 0.35;
  const base = clamp(financeScore - trendDirection * 22 * rangeWeight - stressLevel, 12, 82);
  return Array.from({ length: points }, (_, index) => clamp(base + (index * (trendDirection * 5.5 * rangeWeight)) + (Math.sin(index * 0.9 + stressLevel * 0.2) * volatility) - (pressure ? index * 2.8 * rangeWeight : 0), 10, 96));
}

function buildLinePoints(series) { return buildPointData(series).map((point) => `${point.x},${point.y}`).join(' '); }
function buildPointData(series) {
  const step = 352 / Math.max(series.length - 1, 1);
  return series.map((value, index) => ({ x: 8 + index * step, y: 140 - value * 1.25 }));
}

function buildAlignmentBars({ sleepHours, studyHours, exerciseFrequency, stressLevel, rawSavingsRate, healthScore, financeScore, productivityScore, recoveryScore, burnoutRisk, hasGithub, hasLeetcode }) {
  const sleepAlignment = clamp(35 + sleepHours * 7 - Math.max(0, studyHours - 7) * 4, 8, 96);
  const stressAlignment = clamp(100 - stressLevel * 8 + exerciseFrequency * 4, 8, 96);
  const financeAlignment = clamp(55 + rawSavingsRate * 0.75 - stressLevel * 2, 8, 96);
  const careerAlignment = clamp(productivityScore + (hasGithub ? 4 : 0) + (hasLeetcode ? 4 : 0) - Math.max(0, 6 - sleepHours) * 3, 8, 96);
  const recoveryAlignment = clamp((recoveryScore + sleepAlignment + stressAlignment) / 3, 8, 96);
  const twinAlignment = clamp((healthScore + financeScore + careerAlignment + recoveryAlignment + (100 - burnoutRisk)) / 5, 8, 96);
  return [recoveryAlignment, sleepAlignment, careerAlignment, financeAlignment, stressAlignment, twinAlignment];
}

function buildRitualCalendar(date, insights) {
  const year = date.getFullYear(); const month = date.getMonth(); const today = date.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay();
  const shortFormatter = new Intl.DateTimeFormat('en-US', { month: 'short' });
  const streak = insights.streak || normalizeStreak();
  const completedDates = new Set(streak.completedDailyGoals.map((entry) => entry.date));
  const blanks = Array.from({ length: firstDay }, (_, index) => ({ key: `blank-${index}`, type: 'blank' }));
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const value = index + 1; const isToday = value === today; const isFuture = value > today;
    const completed = completedDates.has(formatDateKey(year, month, value));
    return { key: `day-${value}`, type: 'day', value, state: isToday && completed ? 'today-complete' : isToday ? 'today' : isFuture ? 'future' : completed ? 'done' : streak.streakStarted ? 'missed' : 'empty' };
  });
  return { today, monthShort: shortFormatter.format(date), currentStreak: streak.currentStreak, streakStarted: streak.streakStarted, days: [...blanks, ...days] };
}

function normalizeStreak(rawStreak = {}) {
  return { currentStreak: Number(rawStreak.currentStreak || 0), streakStarted: Boolean(rawStreak.streakStarted), lastGoalCompletionDate: rawStreak.lastGoalCompletionDate || '', completedDailyGoals: Array.isArray(rawStreak.completedDailyGoals) ? rawStreak.completedDailyGoals : [] };
}

function formatDateKey(year, month, day) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
function formatTimeLeft(date) {
  const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
  const secondsLeft = Math.max(0, Math.floor((endOfDay.getTime() - date.getTime()) / 1000));
  return [Math.floor(secondsLeft / 3600), Math.floor((secondsLeft % 3600) / 60), secondsLeft % 60].map((v) => String(v).padStart(2, '0')).join(':');
}
function formatMoney(value) { return Number.isNaN(value) ? 'Add data' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value); }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

// Icon components
function WalletIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="2" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" stroke="currentColor" strokeWidth="2" /></svg>; }
function MoonIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>; }
function BriefIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="M9 7V5h6v2m-9 3h12m-14 0h18v10H4V10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>; }
function CheckIcon({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

export default Dashboard;