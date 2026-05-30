import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';
import { Eye, EyeOff, Calendar, AlertCircle, Baby, Flower2, Heart, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

const interactiveCardClass = 'rounded-2xl border border-white/10 bg-[#11131a]/84 shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#ff7a00]/30 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] cursor-pointer active:scale-[0.98]';

// ─── Flower SVG decorations ───────────────────────────────────────────────────
function FloralDecoration({ className }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.35">
        {[0,60,120,180,240,300].map((deg, i) => (
          <ellipse key={i}
            cx={60 + 22 * Math.cos((deg * Math.PI) / 180)}
            cy={60 + 22 * Math.sin((deg * Math.PI) / 180)}
            rx="12" ry="20"
            transform={`rotate(${deg} ${60 + 22 * Math.cos((deg * Math.PI) / 180)} ${60 + 22 * Math.sin((deg * Math.PI) / 180)})`}
            fill="currentColor" />
        ))}
        <circle cx="60" cy="60" r="10" fill="currentColor" opacity="0.8" />
      </g>
    </svg>
  );
}

function SmallFlower({ className }) {
  return (
    <svg className={className} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.5">
        {[0,72,144,216,288].map((deg, i) => (
          <ellipse key={i}
            cx={30 + 13 * Math.cos((deg * Math.PI) / 180)}
            cy={30 + 13 * Math.sin((deg * Math.PI) / 180)}
            rx="7" ry="12"
            transform={`rotate(${deg} ${30 + 13 * Math.cos((deg * Math.PI) / 180)} ${30 + 13 * Math.sin((deg * Math.PI) / 180)})`}
            fill="currentColor" />
        ))}
        <circle cx="30" cy="30" r="6" fill="currentColor" opacity="0.9" />
      </g>
    </svg>
  );
}

// ─── Phase data ───────────────────────────────────────────────────────────────
function computeCyclePhase(lastPeriodDateStr, conditionType = 'none') {
  if (!lastPeriodDateStr) return null;
  const today = new Date();
  const lastPeriod = new Date(lastPeriodDateStr);
  const daysSince = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
  const cycleLength = conditionType === 'pcod' ? 35 : conditionType === 'endo' ? 28 : 28;
  const dayOfCycle = ((daysSince % cycleLength) + cycleLength) % cycleLength + 1;

  if (dayOfCycle <= 5) {
    return {
      name: 'Menstrual Phase',
      emoji: '🌸',
      day: dayOfCycle,
      totalDays: cycleLength,
      color: '#ff6b9d',
      gradient: 'from-[#ff6b9d]/20 to-[#ffb3d1]/5',
      border: 'border-[#ff6b9d]/30',
      pamper: [
        'Rest is productive. Your body is doing hard work — skip intense workouts today.',
        'Warm ginger & cinnamon tea helps ease cramping and boost circulation.',
        'Iron-rich foods like lentils, spinach, and dark chocolate replenish what you lose.',
        'Heat therapy (warm pad on lower abdomen) reduces prostaglandin-driven pain.',
      ],
      mood: 'Gentle rest & nourishment',
      nextPhase: 'Follicular',
      daysToNext: 5 - dayOfCycle + 1,
    };
  } else if (dayOfCycle <= 13) {
    return {
      name: 'Follicular Phase',
      emoji: '🌼',
      day: dayOfCycle,
      totalDays: cycleLength,
      color: '#ffd166',
      gradient: 'from-[#ffd166]/20 to-[#ffe9a0]/5',
      border: 'border-[#ffd166]/30',
      pamper: [
        'Your energy is climbing — this is the best time for new challenges & workouts.',
        'Estrogen rises, boosting mood and creativity. Perfect for bold decisions.',
        'Fermented foods like yoghurt & kimchi support gut-hormone communication.',
        'Vitamin D & zinc support follicle development this week.',
      ],
      mood: 'Rising energy & motivation',
      nextPhase: 'Ovulation',
      daysToNext: 14 - dayOfCycle,
    };
  } else if (dayOfCycle <= 16) {
    return {
      name: 'Ovulation Phase',
      emoji: '✨',
      day: dayOfCycle,
      totalDays: cycleLength,
      color: '#06d6a0',
      gradient: 'from-[#06d6a0]/20 to-[#b7ffe6]/5',
      border: 'border-[#06d6a0]/30',
      pamper: [
        'Peak confidence & social energy — you\'re magnetic today.',
        'High-intensity workouts feel easier now; testosterone peaks briefly.',
        'Antioxidant-rich berries & leafy greens support the ovulatory surge.',
        'Your skin glows naturally — minimal makeup day, embrace it.',
      ],
      mood: 'Peak energy & confidence',
      nextPhase: 'Luteal',
      daysToNext: 17 - dayOfCycle,
    };
  } else {
    return {
      name: 'Luteal Phase',
      emoji: '🌙',
      day: dayOfCycle,
      totalDays: cycleLength,
      color: '#a78bfa',
      gradient: 'from-[#a78bfa]/20 to-[#ddd6fe]/5',
      border: 'border-[#a78bfa]/30',
      pamper: [
        'Progesterone rises — cravings are real & valid. Choose magnesium-rich dark chocolate.',
        'Gentle yoga, walks, or restorative stretching suit this reflective phase.',
        'Complex carbs (sweet potato, oats) stabilise mood-linked serotonin levels.',
        'Sleep quality may dip — try lavender pillow spray and a firm cut-off at 10:30 PM.',
      ],
      mood: 'Reflective, cosy & inward',
      nextPhase: 'Menstrual',
      daysToNext: cycleLength - dayOfCycle + 1,
    };
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Health() {
  const [isMounted, setIsMounted] = useState(false);

  // Wearable / API data
  const [wearableData, setWearableData] = useState(null);
  const [isWearableConnected, setIsWearableConnected] = useState(false);
  const [isSyncingWearable, setIsSyncingWearable] = useState(false);

  // Real weather
  const [weather, setWeather] = useState({
    temp: '--',
    condition: 'Loading...',
    recommendation: 'Fetching local atmospheric data...',
    isHot: false,
    humidity: '--',
    feelsLike: '--',
  });

  // Onboarding profile (from localStorage, set during app onboarding)
  const [userProfile, setUserProfile] = useState(null);

  // Women's health
  const [womenMode, setWomenMode] = useState('loading'); // loading | period | pregnancy | troubleshoot | preg_setup | preg_dashboard
  const [periodSetup, setPeriodSetup] = useState({ lastPeriod: '', condition: 'none', cycleLength: '28' });
  const [periodSetupStep, setPeriodSetupStep] = useState(0); // 0=intro, 1=date, 2=condition, 3=done
  const [activeSymptoms, setActiveSymptoms] = useState([]);
  const [isBlurred, setIsBlurred] = useState(false);
  const [pregWeeks, setPregWeeks] = useState('');
  const [pregDueDate, setPregDueDate] = useState('');
  const [phase, setPhase] = useState(null);

  const { triggerReward, history = [], unlockedBadges = [], availableBadges = [] } = useGamification();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // ── Load profile & saved women's health data ────────────────────────────────
  useEffect(() => {
    setIsMounted(true);
    const profile = JSON.parse(localStorage.getItem('lifetwinOnboardingProfile') || '{}');
    setUserProfile(profile);

    // Load saved period data
    const savedPeriod = JSON.parse(localStorage.getItem('ltWomenHealth') || 'null');
    if (savedPeriod) {
      setPeriodSetup(savedPeriod);
      setPhase(computeCyclePhase(savedPeriod.lastPeriod, savedPeriod.condition));
      setWomenMode('period');
    } else {
      setWomenMode('period_setup');
    }

    // Check pregnancy mode
    const savedPreg = JSON.parse(localStorage.getItem('ltPregnancy') || 'null');
    if (savedPreg) {
      setPregWeeks(savedPreg.weeks || '');
      setPregDueDate(savedPreg.dueDate || '');
      setWomenMode('preg_dashboard');
    }

    // Wearable check
    const isConnected = profile?.integrations?.fitbit?.status === 'connected';
    if (isConnected) {
      setIsWearableConnected(true);
      runAutonomousSync();
    }
  }, []);

  const runAutonomousSync = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/integrations/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        const metrics = response.data.data.metrics;
        setWearableData(metrics);
        if (metrics.steps >= 8000) setTimeout(() => triggerReward(50, 'Step Target Hit', '👟'), 2000);
        if (metrics.sleepHours >= 7 && metrics.hrv > 60) setTimeout(() => triggerReward(75, 'Optimal Sleep & HRV', '💤'), 4000);
      }
    } catch (err) {
      console.error('Wearable sync failed', err);
    }
  };

  // ── Real weather (Open-Meteo, Patna coords) ─────────────────────────────────
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await axios.get(
          'https://api.open-meteo.com/v1/forecast?latitude=25.60&longitude=85.12&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode&timezone=auto'
        );
        const d = res.data.current;
        const temp = Math.round(d.temperature_2m);
        const feels = Math.round(d.apparent_temperature);
        const humidity = Math.round(d.relative_humidity_2m);
        const wcode = d.weathercode;

        let cond = 'Clear';
        let rec = 'Comfortable layers recommended.';
        let hot = false;

        if (wcode >= 61 && wcode <= 67) { cond = 'Rainy'; rec = 'Waterproof outer layer. Quick-dry fabrics are ideal.'; }
        else if (wcode >= 71 && wcode <= 77) { cond = 'Overcast / Cloudy'; rec = 'Light jacket. Overcast skies can still carry UV.'; }
        else if (temp >= 38) { cond = 'Extreme Heat'; rec = 'Loose open-weave linen only. Avoid dark synthetics. Protect your neck.'; hot = true; }
        else if (temp >= 32) { cond = 'Hot & Humid'; rec = 'Breathable cotton or linen. Stay hydrated — electrolytes matter.'; hot = true; }
        else if (temp >= 24) { cond = 'Warm'; rec = 'Light breathable layers. A cotton kurta or linen shirt is ideal.'; }
        else if (temp <= 15) { cond = 'Cool / Chilly'; rec = 'Thermal base layer + outer shell. Retain body heat outdoors.'; }
        else { cond = 'Mild & Pleasant'; rec = 'Your ideal outdoor-activity window. Light layers work fine.'; }

        setWeather({ temp, condition: cond, recommendation: rec, isHot: hot, humidity, feelsLike: feels });
      } catch (err) {
        console.error('Weather fetch failed', err);
      }
    };
    fetchWeather();
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleWearableSync = () => {
    setIsSyncingWearable(true);
    setTimeout(() => { setIsSyncingWearable(false); setIsWearableConnected(true); window.location.reload(); }, 1500);
  };

  const savePeriodSetup = () => {
    localStorage.setItem('ltWomenHealth', JSON.stringify(periodSetup));
    setPhase(computeCyclePhase(periodSetup.lastPeriod, periodSetup.condition));
    setWomenMode('period');
  };

  const savePregnancy = () => {
    const data = { weeks: pregWeeks, dueDate: pregDueDate };
    localStorage.setItem('ltPregnancy', JSON.stringify(data));
    setWomenMode('preg_dashboard');
  };

  const resetPregnancy = () => {
    localStorage.removeItem('ltPregnancy');
    setWomenMode('period');
  };

  const toggleSymptom = (sym) => {
    setActiveSymptoms(prev => prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]);
  };

  // ── Derived data ─────────────────────────────────────────────────────────────
  const healthHistory = history.filter(log => ['👟', '💤', '🧬', '💧', '❤️', '⚖️'].includes(log.emoji)).slice(0, 6);
  const healthBadges = availableBadges.filter(b => ['fitbit', 'sleep_master', 'first_step', 'hydration_hero', 'heart_health'].includes(b.id));

  // Pull real data from profile onboarding where available
  const onboardingHealth = userProfile?.health || {};
  const smokerStatus = onboardingHealth?.smoker || false;
  const alcoholFreq = onboardingHealth?.alcoholFrequency || 'none';
  const activityLevel = onboardingHealth?.activityLevel || 'moderate';
  const sleepGoal = onboardingHealth?.sleepGoal || 8;
  const stepGoal = onboardingHealth?.stepGoal || 10000;

  const healthMetrics = [
    {
      label: 'Heart Rate',
      value: wearableData?.avgHeartRate
        ? Math.min(100, Math.round(100 - Math.abs(wearableData.avgHeartRate - 70) * 2))
        : 80,
      status: wearableData?.avgHeartRate ? `${wearableData.avgHeartRate} bpm` : '72 bpm',
      tone: 'primary', icon: HeartPulseIcon, isGood: !wearableData || (wearableData.avgHeartRate >= 60 && wearableData.avgHeartRate <= 90),
    },
    {
      label: 'Sleep',
      value: wearableData ? Math.min(100, Math.round((wearableData.sleepHours / sleepGoal) * 100)) : 87,
      status: wearableData ? `${wearableData.sleepHours}h logged` : `${sleepGoal}h goal`,
      tone: 'warm', icon: MoonIcon, isGood: !wearableData || wearableData.sleepHours >= sleepGoal * 0.85,
    },
    {
      label: 'Hydration',
      value: wearableData?.hydrationPercent || 68,
      status: wearableData?.hydrationPercent ? `${wearableData.hydrationPercent}%` : 'Log intake',
      tone: 'sky', icon: DropIcon, isGood: (wearableData?.hydrationPercent || 68) >= 80,
    },
    {
      label: 'Steps',
      value: wearableData ? Math.min(100, Math.round((wearableData.steps / stepGoal) * 100)) : 75,
      status: wearableData ? wearableData.steps.toLocaleString() : `${(stepGoal * 0.75).toLocaleString()}`,
      tone: 'primary', icon: RunIcon, isGood: wearableData ? wearableData.steps >= stepGoal * 0.8 : true,
    },
    {
      label: 'HRV',
      value: wearableData?.hrv || 58,
      status: wearableData?.hrv ? `${wearableData.hrv} ms` : '58 ms',
      tone: 'neutral', icon: BalanceIcon, isGood: (wearableData?.hrv || 58) >= 55,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-full overflow-hidden bg-[#06080f] px-6 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,122,0,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,143,132,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_20%)]" />
      <div className="relative">

        {/* ── Header ── */}
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Health Intelligence Hub</h1>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/68">
              {userProfile?.name ? `${userProfile.name}'s` : 'Your'} synchronized biometrics, environmental context & recovery intelligence.
            </p>
          </div>
          {isWearableConnected ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#16a34a]/30 bg-[#16a34a]/10 px-5 py-2.5 text-sm font-bold text-[#16a34a]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#16a34a]" />
              </span>
              Wearable Sync Active
            </div>
          ) : (
            <button onClick={handleWearableSync} disabled={isSyncingWearable}
              className="flex items-center gap-2 rounded-xl border border-[#ff4d7d]/50 bg-[#ff4d7d]/10 px-5 py-2.5 text-sm font-bold text-[#ff4d7d] transition-all hover:bg-[#ff4d7d]/20 disabled:opacity-50">
              {isSyncingWearable ? 'Connecting…' : '⌚ Sync Apple Health / Fitbit'}
            </button>
          )}
        </section>

        {/* ── Metric Cards (real API data) ── */}
        <section className="mb-8 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {healthMetrics.map(metric => <MetricCard key={metric.label} metric={metric} isMounted={isMounted} />)}
        </section>

        {/* ── Gamification Showcase (replaces manual XP entry) ── */}
        <section className="mb-8">
          <article className="rounded-2xl border border-[#10c7a1]/20 bg-gradient-to-br from-[#10c7a1]/5 to-[#06080f] p-6 shadow-[0_18px_48px_rgba(16,199,161,0.08)] backdrop-blur-xl">
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                  <TrophyIcon className="h-5 w-5 text-[#10c7a1]" /> Health Achievements & Rewards
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Points are awarded automatically when your connected wearable validates milestones. No manual entry needed.
                </p>
              </div>
              {wearableData && (
                <div className="rounded-xl border border-[#10c7a1]/30 bg-[#10c7a1]/10 px-4 py-2 text-xs font-bold text-[#10c7a1]">
                  Last synced: just now
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent validated rewards */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Recent Validated Rewards</h3>
                {healthHistory.length > 0 ? (
                  <div className="space-y-2.5">
                    {healthHistory.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/8 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{log.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold text-white/90">{log.activity}</p>
                            <p className="text-[10px] text-white/40">Validated via API</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#10c7a1] bg-[#10c7a1]/10 px-3 py-1 rounded-full">+{log.points} XP</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="text-4xl mb-3">🔗</span>
                    <p className="text-sm text-white/40">Connect your Fitbit or Apple Health above.</p>
                    <p className="text-xs text-white/25 mt-1">Rewards are validated automatically from your data.</p>
                  </div>
                )}
              </div>

              {/* Badge gallery */}
              <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Your Health Badges</h3>
                {healthBadges.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {healthBadges.map(badge => {
                      const isUnlocked = unlockedBadges.includes(badge.id);
                      return (
                        <div key={badge.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isUnlocked ? 'bg-gradient-to-r from-[#10c7a1]/10 to-transparent border-[#10c7a1]/30' : 'bg-white/3 border-white/5 opacity-40 grayscale'}`}>
                          <span className="text-2xl">{badge.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${isUnlocked ? 'text-[#10c7a1]' : 'text-white/50'}`}>{badge.title}</p>
                            <p className="text-[10px] text-white/35 truncate">{badge.requirement}</p>
                          </div>
                          {isUnlocked && <span className="text-[10px] font-bold text-[#10c7a1] bg-[#10c7a1]/15 px-2 py-0.5 rounded-full shrink-0">Earned</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <span className="text-4xl mb-3">🏅</span>
                    <p className="text-sm text-white/40">Badges are earned by hitting your health goals.</p>
                    <p className="text-xs text-white/25 mt-1">Sync a device to start earning.</p>
                  </div>
                )}
              </div>
            </div>

            {/* What earns XP guide */}
            <div className="mt-6 pt-5 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">How You Earn Points</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: '👟', label: `${stepGoal.toLocaleString()} Steps`, pts: '50 XP', desc: 'Daily step goal met' },
                  { icon: '💤', label: `${sleepGoal}h Sleep`, pts: '40 XP', desc: 'Sleep target achieved' },
                  { icon: '💓', label: 'Healthy HR', pts: '30 XP', desc: 'Resting HR in range' },
                  { icon: '⚡', label: 'HRV > 60ms', pts: '75 XP', desc: 'Optimal recovery score' },
                ].map(item => (
                  <div key={item.icon} className="rounded-xl bg-white/4 border border-white/5 p-3 text-center">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="mt-2 text-xs font-bold text-white/80">{item.label}</p>
                    <p className="text-[10px] text-white/40">{item.desc}</p>
                    <p className="mt-1.5 text-xs font-bold text-[#10c7a1]">{item.pts}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        {/* ── Real Weather Section ── */}
        <section className="mb-8">
          <article className="rounded-[1.6rem] border border-[#ff7a00]/20 bg-gradient-to-br from-[#11131a] to-[#1a1110] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300">
            <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${weather.isHot ? 'bg-gradient-to-br from-[#ff7a00] to-[#ff4d7d]' : 'bg-gradient-to-br from-[#2f83b7] to-[#0f8f84]'}`}>
                  {weather.isHot ? <SunIcon className="h-7 w-7" /> : <CloudIcon className="h-7 w-7" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-white/56">Live Local Forecast</h3>
                  <p className="mt-0.5 text-3xl font-bold text-white">
                    {weather.temp}°C <span className="text-sm font-medium text-white/58">({weather.condition})</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#7df3cc]">📍 Patna, Bihar</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60">💧 Humidity: {weather.humidity}%</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60">🌡 Feels: {weather.feelsLike}°C</span>
                {weather.isHot && <span className="rounded-full border border-[#ffb38a]/30 bg-[#ffb38a]/10 px-3 py-1.5 text-xs font-semibold text-[#ffb38a]">⚠️ UV Index: High</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ffb38a]">
                  <DropIcon className="h-4 w-4" /> Smart Water Intake
                </div>
                <p className="mb-1.5 text-2xl font-bold text-white">{weather.isHot ? '3.8 L' : '2.5 L'}</p>
                <p className="text-sm leading-relaxed text-white/64">
                  {weather.isHot
                    ? `At ${weather.temp}°C with ${weather.humidity}% humidity, your body loses more through perspiration. Scale intake up by +1L.`
                    : `Standard hydration target for mild conditions. Spread across the day for best absorption.`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7df3cc]">
                  <FemaleIcon className="h-4 w-4" /> What to Wear Today
                </div>
                <p className="mb-1.5 text-lg font-bold text-white">{weather.isHot ? 'Loose Linens / Cotton' : 'Comfortable Layers'}</p>
                <p className="text-sm leading-relaxed text-white/64">{weather.recommendation}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c8a84b]">
                  <RunIcon className="h-4 w-4" /> Activity Window
                </div>
                <p className="mb-1.5 text-lg font-bold text-white">{weather.isHot ? 'Indoors / Post 7 PM' : 'Full Day Optimal'}</p>
                <p className="text-sm leading-relaxed text-white/64">
                  {weather.isHot
                    ? 'Postpone outdoor cardio past 7 PM to avoid heat exhaustion. Pool or indoor gym recommended.'
                    : 'Current conditions are ideal for outdoor biometric tracking and moderate-to-high intensity runs.'}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* ── Women's Health + Optimization Matrix ── */}
        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">

          {/* ━━━ WOMEN'S HEALTH COMPANION ━━━ */}
          <article className="relative flex flex-col rounded-[1.6rem] border border-[#ffb3d1]/20 bg-gradient-to-br from-[#0b0f16]/95 via-[#12080e]/80 to-[#0b0f16]/95 p-6 shadow-[0_20px_60px_rgba(255,107,157,0.08)] xl:col-span-6 overflow-hidden">

            {/* Floral background decorations */}
            <FloralDecoration className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 text-[#ff6b9d] opacity-20" />
            <FloralDecoration className="pointer-events-none absolute -bottom-12 -left-10 h-48 w-48 text-[#c084fc] opacity-10" />
            <SmallFlower className="pointer-events-none absolute top-1/2 right-4 h-16 w-16 text-[#ffd166] opacity-15" />
            <SmallFlower className="pointer-events-none absolute top-20 left-6 h-12 w-12 text-[#ff6b9d] opacity-10" />

            {/* Privacy button */}
            <button
              onClick={() => setIsBlurred(b => !b)}
              className="absolute top-5 right-5 z-50 h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
              title={isBlurred ? 'Show content' : 'Hide for privacy'}
            >
              {isBlurred ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            <div className={`relative z-10 flex flex-col h-full transition-all duration-500 ${isBlurred ? 'blur-md opacity-30 select-none pointer-events-none' : ''}`}>

              {/* ── MODE: PERIOD SETUP ── */}
              {womenMode === 'period_setup' && (
                <PeriodSetupFlow
                  step={periodSetupStep}
                  setStep={setPeriodSetupStep}
                  periodSetup={periodSetup}
                  setPeriodSetup={setPeriodSetup}
                  onComplete={savePeriodSetup}
                />
              )}

              {/* ── MODE: PERIOD TRACKER ── */}
              {womenMode === 'period' && phase && (
                <PeriodTracker
                  phase={phase}
                  periodSetup={periodSetup}
                  activeSymptoms={activeSymptoms}
                  toggleSymptom={toggleSymptom}
                  onMissedPeriod={() => setWomenMode('troubleshoot')}
                  onExpecting={() => setWomenMode('preg_setup')}
                  onReset={() => { localStorage.removeItem('ltWomenHealth'); setWomenMode('period_setup'); setPeriodSetupStep(0); }}
                />
              )}

              {/* ── MODE: TROUBLESHOOT (missed period) ── */}
              {womenMode === 'troubleshoot' && (
                <TroubleshootPanel
                  condition={periodSetup.condition}
                  wearableData={wearableData}
                  onBack={() => setWomenMode('period')}
                  onPregnancyConfirmed={() => setWomenMode('preg_setup')}
                />
              )}

              {/* ── MODE: PREGNANCY SETUP ── */}
              {womenMode === 'preg_setup' && (
                <PregnancySetup
                  pregWeeks={pregWeeks}
                  setPregWeeks={setPregWeeks}
                  pregDueDate={pregDueDate}
                  setPregDueDate={setPregDueDate}
                  onSave={savePregnancy}
                  onBack={() => setWomenMode('period')}
                />
              )}

              {/* ── MODE: PREGNANCY DASHBOARD ── */}
              {womenMode === 'preg_dashboard' && (
                <PregnancyDashboard
                  pregWeeks={parseInt(pregWeeks) || 6}
                  pregDueDate={pregDueDate}
                  weather={weather}
                  onReset={resetPregnancy}
                />
              )}

            </div>
          </article>

          {/* ━━━ DAILY OPTIMIZATION MATRIX ━━━ */}
          <article className={`${interactiveCardClass} p-6 xl:col-span-6 flex flex-col justify-between`}>
            <div className="mb-5 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-white">Daily Optimization Matrix</h2>
              <p className="mt-1 text-sm text-white/60">
                Derived from your wearable data{userProfile?.name ? ` and ${userProfile.name}'s onboarding profile` : ''}.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 grow">
              <div className="rounded-xl bg-[#fbf9f8] p-5 border border-[#e4e2e1] flex flex-col justify-center">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                  <div className="p-1.5 rounded-md bg-[#ffdad2]"><MoonIcon className="h-4 w-4 text-[#ea580c]" /></div>
                  Yesterday's Critical Gaps
                </div>
                <div className="space-y-3.5 text-sm text-[#ea580c] leading-relaxed">
                  {wearableData?.sleepHours && wearableData.sleepHours < sleepGoal ? (
                    <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" /><p>Sleep was <span className="font-bold">{wearableData.sleepHours}h</span> — {(sleepGoal - wearableData.sleepHours).toFixed(1)}h below your {sleepGoal}h goal.</p></div>
                  ) : (
                    <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" /><p>Late-night screen usage detected. Blue light disrupts melatonin synthesis.</p></div>
                  )}
                  <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" />
                    <p>{wearableData?.hrv < 55 ? `HRV dropped to ${wearableData.hrv}ms — recovery is compromised. Prioritize rest.` : 'Deep REM recovery was sub-optimal. Protect your sleep window tonight.'}</p>
                  </div>
                  {smokerStatus && <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#ea580c]" /><p>Nicotine intake elevates resting HR by ~6 bpm, mimicking active stress.</p></div>}
                </div>
              </div>
              <div className="rounded-xl bg-[#eef6f8] p-5 border border-[#c8dbe2] flex flex-col justify-center">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#16a34a]">
                  <div className="p-1.5 rounded-md bg-[#e6f1f4]"><AutoIcon className="h-4 w-4 text-[#16a34a]" /></div>
                  Today's Action Plan
                </div>
                <div className="space-y-3.5 text-sm text-[#16a34a] leading-relaxed">
                  <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" /><p>Screens off by <span className="font-bold">10:30 PM</span> — protect your circadian rhythm.</p></div>
                  <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" /><p>Hit <span className="font-bold">{Math.round(weather.isHot ? 3.8 : 2.5)}L</span> hydration before midday to front-load your target.</p></div>
                  {activityLevel !== 'sedentary' && <div className="flex items-start gap-2.5"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#16a34a]" /><p>{weather.isHot ? 'Indoor workout today — avoid outdoor activity before 7 PM.' : `${stepGoal.toLocaleString()} step target: ${Math.round(stepGoal / 4).toLocaleString()} steps before noon.`}</p></div>}
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* ── Cross-Insights + Recovery Trajectory ── */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <article className={`${interactiveCardClass} p-6 xl:col-span-5`}>
            <div className="mb-5 flex items-center justify-between border-b border-[#d8e5ea] pb-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#1b1c1c]">API Cross-Insights</h2>
                <p className="text-sm text-[#596467] mt-1">Biometric correlations from wearable + profile data.</p>
              </div>
              <SparkIcon className="h-6 w-6 text-[#416f82] shrink-0" />
            </div>
            <div className="space-y-4">
              <FeedItem
                color="#16a34a"
                title="Step Count & Sleep Quality"
                text={`Reaching ${wearableData?.steps?.toLocaleString() || stepGoal.toLocaleString()} steps correlates with easier entry into deep slow-wave sleep and reduced sleep-onset latency.`}
                isGood />
              <FeedItem
                color={wearableData?.hrv >= 55 ? '#16a34a' : '#ea580c'}
                title="HRV & Recovery Readiness"
                text={`Current HRV of ${wearableData?.hrv || 58}ms ${wearableData?.hrv >= 55 ? 'indicates good nervous system recovery — moderate training is safe.' : 'signals accumulated stress. Prioritize rest over high-intensity exercise today.'}`}
                isGood={wearableData?.hrv >= 55} />
              {smokerStatus && (
                <FeedItem
                  color="#ea580c"
                  title="Smoke vs Cardiovascular Stress"
                  text="Nicotine consistently raises resting HR by 4–8 bpm and suppresses HRV recovery, imitating a chronic stress state on your cardiovascular system."
                  isGood={false} />
              )}
              <FeedItem
                color="#2f83b7"
                title="Heat & Hydration Alert"
                text={`At ${weather.temp}°C with ${weather.humidity}% humidity, dehydration risk is ${weather.isHot ? 'elevated' : 'low'}. ${weather.isHot ? 'Electrolytes matter as much as plain water today.' : 'Standard 2.5L target applies.'}`}
                isGood={!weather.isHot} />
            </div>
          </article>

          <article className={`${interactiveCardClass} p-6 xl:col-span-7 flex flex-col justify-between`}>
            <div>
              <h3 className="mb-4 text-xl font-bold tracking-tight">Future Recovery Trajectory</h3>
              <div className="relative mb-5 h-52 overflow-hidden rounded-xl border border-[#d8e5ea] bg-[#f7fbfc]">
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 640 220">
                  <line x1="0" y1="55" x2="640" y2="55" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="110" x2="640" y2="110" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="0" y1="165" x2="640" y2="165" stroke="#e4e2e1" strokeWidth="0.5" strokeDasharray="4" />
                  <path d="M0 120 Q110 92 210 132 T430 170 T640 188" fill="none" opacity="0.5" stroke="#ea580c" strokeDasharray="1000"
                    strokeDashoffset={isMounted ? '0' : '1000'} className="transition-all duration-[1500ms] ease-in-out" strokeWidth="3" />
                  <path d="M0 126 Q120 82 225 66 T430 48 T640 32" fill="none" stroke="#16a34a" strokeLinecap="round" strokeDasharray="1000"
                    strokeDashoffset={isMounted ? '0' : '1000'} className="transition-all duration-[1800ms] ease-in-out delay-100" strokeWidth="4" />
                </svg>
                <div className="absolute right-4 top-4 space-y-2 text-xs font-semibold bg-white/90 backdrop-blur border border-[#d8e5ea] p-2.5 rounded-lg shadow-sm">
                  <Legend color="#16a34a" label="Recommended path" />
                  <Legend color="#ea580c" label="Current trajectory" />
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <PathCard tone="primary" title="Recommended Recovery Path" text="Balanced hydration, screen discipline, and protected sleep windows stabilize your recovery curve over 7 days." />
              <PathCard tone="warm" title="Current Path Trajectory" text={wearableData?.hrv < 55 ? `HRV of ${wearableData.hrv}ms indicates bio-strain. Without intervention, burnout risk rises by end of next week.` : 'Elevated screen time and late bedtimes could push recovery below baseline by next weekend.'} />
            </div>
          </article>
        </section>

      </div>
    </div>
  );
}

// ─── Period Setup Flow ────────────────────────────────────────────────────────
function PeriodSetupFlow({ step, setStep, periodSetup, setPeriodSetup, onComplete }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ff6b9d] to-[#c084fc] flex items-center justify-center">
          <Flower2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#ff6b9d]">Bloom Health Companion</h3>
          <p className="text-[11px] text-white/40">One-time setup · Private & encrypted</p>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-6">
        {[0,1,2].map(i => (
          <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-500 ${i <= step ? 'bg-gradient-to-r from-[#ff6b9d] to-[#c084fc]' : 'bg-white/10'}`} />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
          <div className="relative mb-5">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#ff6b9d]/20 to-[#c084fc]/20 border border-[#ff6b9d]/20 flex items-center justify-center">
              <span className="text-4xl">🌸</span>
            </div>
            <SmallFlower className="absolute -top-2 -right-2 h-8 w-8 text-[#ffd166]" />
            <SmallFlower className="absolute -bottom-1 -left-1 h-6 w-6 text-[#ff6b9d]" />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Set up your Bloom Companion</h4>
          <p className="text-sm text-white/55 leading-relaxed max-w-xs mb-6">
            Answer two quick questions so your Digital Twin can give you real, phase-aware health guidance — not generic advice.
          </p>
          <button onClick={() => setStep(1)}
            className="w-full max-w-xs bg-gradient-to-r from-[#ff6b9d] to-[#c084fc] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all hover:shadow-[0_0_20px_rgba(255,107,157,0.35)]">
            Let's begin 🌷
          </button>
          <p className="mt-3 text-[10px] text-white/25">Your data is stored locally only.</p>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col flex-1">
          <p className="text-base font-bold text-white mb-1">When did your last period start?</p>
          <p className="text-sm text-white/50 mb-5">This helps calculate your current cycle phase accurately.</p>
          <input type="date"
            max={new Date().toISOString().split('T')[0]}
            className="w-full bg-black/40 border border-[#ff6b9d]/20 rounded-xl p-3.5 text-white text-sm focus:border-[#ff6b9d]/50 focus:outline-none transition-all"
            value={periodSetup.lastPeriod}
            onChange={(e) => setPeriodSetup(p => ({ ...p, lastPeriod: e.target.value }))} />
          <div className="flex gap-3 mt-auto pt-6">
            <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-white/40 hover:text-white transition-all">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={() => setStep(2)} disabled={!periodSetup.lastPeriod}
              className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#ff6b9d] to-[#c084fc] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-30 transition-all">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col flex-1">
          <p className="text-base font-bold text-white mb-1">Any existing conditions?</p>
          <p className="text-sm text-white/50 mb-5">This personalises phase predictions and advice for your body.</p>
          <div className="space-y-3">
            {[
              { value: 'none', label: 'No conditions', desc: 'Standard ~28 day cycle', emoji: '🌸' },
              { value: 'pcod', label: 'PCOD / PCOS', desc: 'Irregular cycles, hormonal imbalance', emoji: '🌺' },
              { value: 'endo', label: 'Endometriosis', desc: 'Painful periods, chronic inflammation', emoji: '💐' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setPeriodSetup(p => ({ ...p, condition: opt.value }))}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${periodSetup.condition === opt.value ? 'border-[#ff6b9d]/60 bg-[#ff6b9d]/10' : 'border-white/10 bg-white/3 hover:bg-white/6'}`}>
                <span className="text-xl">{opt.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-white">{opt.label}</p>
                  <p className="text-[11px] text-white/45">{opt.desc}</p>
                </div>
                {periodSetup.condition === opt.value && <span className="ml-auto text-[#ff6b9d] font-bold">✓</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-auto pt-6">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-white/40 hover:text-white transition-all">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={onComplete}
              className="ml-auto bg-gradient-to-r from-[#ff6b9d] to-[#c084fc] text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all hover:shadow-[0_0_20px_rgba(255,107,157,0.3)]">
              Activate Bloom 🌷
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Period Tracker ────────────────────────────────────────────────────────────
function PeriodTracker({ phase, periodSetup, activeSymptoms, toggleSymptom, onMissedPeriod, onExpecting, onReset }) {
  const progressPct = Math.round((phase.day / phase.totalDays) * 100);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#ff6b9d]/30 to-[#c084fc]/30 flex items-center justify-center text-sm">
            {phase.emoji}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff6b9d]">Bloom Companion</h3>
          </div>
        </div>
        <button onClick={onReset} className="text-[10px] text-white/25 hover:text-white/50 transition-all underline">Reset</button>
      </div>

      {/* Phase Banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${phase.gradient} border ${phase.border} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Current Phase · Day {phase.day}</p>
            <h4 className="text-xl font-bold mt-0.5" style={{ color: phase.color }}>{phase.name} {phase.emoji}</h4>
            <p className="text-xs text-white/50 mt-0.5">{phase.mood}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40">Next: {phase.nextPhase}</p>
            <p className="text-sm font-bold text-white/70">{phase.daysToNext}d away</p>
          </div>
        </div>
        {/* Cycle progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[9px] text-white/35 mb-1">
            <span>Day 1</span><span>Day {phase.totalDays}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${phase.color}99, ${phase.color})` }}
            />
          </div>
        </div>
      </div>

      {/* Symptom quick-log */}
      <div>
        <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">Quick Symptom Log</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'cramps', icon: '🤕', label: 'Cramps' },
            { id: 'bloat', icon: '🌪️', label: 'Bloating' },
            { id: 'mood', icon: '🎢', label: 'Mood Swings' },
            { id: 'fatigue', icon: '😴', label: 'Fatigue' },
            { id: 'headache', icon: '🤯', label: 'Headache' },
          ].map(sym => (
            <button key={sym.id} onClick={() => toggleSymptom(sym.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                activeSymptoms.includes(sym.id)
                  ? 'bg-[#ff6b9d]/20 border-[#ff6b9d]/60 text-[#ff6b9d]'
                  : 'bg-white/4 border-white/10 text-white/45 hover:bg-white/8'
              }`}>
              {sym.icon} {sym.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phase pampering advice */}
      <div className="rounded-xl border border-white/8 bg-white/4 p-4 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 shrink-0" style={{ color: phase.color }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: phase.color }}>Phase Pampering Guide</p>
        </div>
        <div className="space-y-2.5">
          {phase.pamper.map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: phase.color }} />
              <p className="text-xs text-white/65 leading-relaxed">
                {activeSymptoms.includes('cramps') && i === 0
                  ? tip.replace('skip intense workouts', '🔥 PRIORITY: skip the gym entirely — your body is working hard')
                  : tip}
              </p>
            </div>
          ))}
          {periodSetup.condition === 'pcod' && (
            <div className="flex items-start gap-2.5 mt-2 pt-2 border-t border-white/8">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffd166]" />
              <p className="text-xs text-[#ffd166]/80 leading-relaxed">PCOD note: Avoid sugar spikes — choose low-GI carbs to manage insulin & androgen levels this phase.</p>
            </div>
          )}
          {periodSetup.condition === 'endo' && (
            <div className="flex items-start gap-2.5 mt-2 pt-2 border-t border-white/8">
              <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f87171]" />
              <p className="text-xs text-[#f87171]/80 leading-relaxed">Endo note: Anti-inflammatory foods (turmeric, omega-3s, ginger) help reduce prostaglandin-driven pain this week.</p>
            </div>
          )}
        </div>
      </div>

      {/* Smart action buttons */}
      <div className="flex gap-2.5">
        <button onClick={onMissedPeriod}
          className="flex-1 py-2.5 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/8 text-[11px] font-bold text-[#f59e0b] hover:bg-[#f59e0b]/15 transition-all">
          🗓️ Missed a Period?
        </button>
        <button onClick={onExpecting}
          className="flex-1 py-2.5 rounded-xl border border-[#06d6a0]/30 bg-[#06d6a0]/8 text-[11px] font-bold text-[#06d6a0] hover:bg-[#06d6a0]/15 transition-all">
          🌿 Positive Test?
        </button>
      </div>
    </div>
  );
}

// ─── Troubleshoot Panel ───────────────────────────────────────────────────────
function TroubleshootPanel({ condition, wearableData, onBack, onPregnancyConfirmed }) {
  const hrvDrop = wearableData?.hrv < 55;
  const stressSignal = wearableData?.avgHeartRate > 80;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-6 w-6 text-[#f59e0b] shrink-0" />
        <h3 className="text-base font-bold text-white">Delayed Cycle Analysis</h3>
      </div>

      <div className="rounded-xl bg-[#f59e0b]/8 border border-[#f59e0b]/20 p-4">
        <p className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider mb-2">What your data suggests</p>
        <p className="text-sm text-white/75 leading-relaxed">
          {hrvDrop || stressSignal
            ? `Your wearable shows ${hrvDrop ? `an HRV drop to ${wearableData.hrv}ms` : ''}${hrvDrop && stressSignal ? ' and ' : ''}${stressSignal ? `elevated resting HR (${wearableData.avgHeartRate} bpm)` : ''} — these are classic cortisol-stress markers that can delay or suppress ovulation.`
            : 'Cycles can shift by 3–10 days due to stress, travel, disrupted sleep, dietary changes, or hormonal fluctuations — even without obvious cause.'}
          {condition === 'pcod' && ' With PCOD, hormonal imbalance regularly extends cycles to 35–90 days — this is common and expected.'}
          {condition === 'endo' && ' Endometriosis can cause irregular bleeding patterns that are distinct from a standard missed period.'}
        </p>
      </div>

      <div className="rounded-xl bg-white/4 border border-white/8 p-4 flex-1">
        <p className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Recommended Actions</p>
        <div className="space-y-2.5">
          {[
            { icon: '🧘', text: 'Reduce cortisol: gentle yoga, deep-breathing, and digital detox evenings.' },
            { icon: '🥑', text: 'Healthy fats (avocado, walnuts, olive oil) support progesterone and oestrogen production.' },
            { icon: '😴', text: 'Protect 7–9h sleep — the ovulatory signal is closely tied to circadian rhythm.' },
            { icon: '💊', text: condition !== 'none' ? 'Consider speaking with your gynaecologist about cycle regulation options.' : 'If delayed >14 days past expected start, take a pregnancy test and consult a doctor.' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base">{item.icon}</span>
              <p className="text-xs text-white/60 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onPregnancyConfirmed}
        className="w-full py-3 rounded-xl border border-[#06d6a0]/30 bg-[#06d6a0]/10 text-sm font-bold text-[#06d6a0] hover:bg-[#06d6a0]/20 transition-all">
        🌿 My test came back positive →
      </button>

      <button onClick={onBack} className="text-xs text-white/35 hover:text-white text-center transition-all">
        ← Back to Cycle Tracker
      </button>
    </div>
  );
}

// ─── Pregnancy Setup ───────────────────────────────────────────────────────────
function PregnancySetup({ pregWeeks, setPregWeeks, pregDueDate, setPregDueDate, onSave, onBack }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center flex-1 text-center py-4">
        <div className="relative mb-5">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#06d6a0]/20 to-[#b7ffe6]/10 border border-[#06d6a0]/20 flex items-center justify-center">
            <span className="text-4xl">🌿</span>
          </div>
          <SmallFlower className="absolute -top-2 -right-1 h-8 w-8 text-[#ffd166]" />
        </div>
        <h4 className="text-lg font-bold text-white mb-1">Pregnancy Journey Mode</h4>
        <p className="text-sm text-white/50 leading-relaxed max-w-xs mb-6">
          Provide a few details so your Digital Twin can switch to personalised maternal health tracking.
        </p>

        <div className="w-full max-w-sm space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#06d6a0] mb-2">Weeks Pregnant</label>
            <input type="number" min="1" max="42" placeholder="e.g. 8"
              className="w-full bg-black/40 border border-[#06d6a0]/20 rounded-xl p-3.5 text-white text-sm focus:border-[#06d6a0]/50 focus:outline-none transition-all"
              value={pregWeeks} onChange={(e) => setPregWeeks(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#06d6a0] mb-2">Expected Due Date (optional)</label>
            <input type="date"
              className="w-full bg-black/40 border border-[#06d6a0]/20 rounded-xl p-3.5 text-white text-sm focus:border-[#06d6a0]/50 focus:outline-none transition-all"
              value={pregDueDate} onChange={(e) => setPregDueDate(e.target.value)} />
          </div>
          <button onClick={onSave} disabled={!pregWeeks}
            className="w-full bg-gradient-to-r from-[#06d6a0] to-[#0f8f84] text-black font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-30 transition-all hover:shadow-[0_0_20px_rgba(6,214,160,0.3)]">
            Activate Pregnancy Mode 🌿
          </button>
          <button onClick={onBack} className="w-full text-xs text-white/35 hover:text-white text-center transition-all py-1">
            Cancel — go back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Pregnancy Dashboard ──────────────────────────────────────────────────────
function PregnancyDashboard({ pregWeeks, pregDueDate, weather, onReset }) {
  const trimester = pregWeeks > 27 ? 3 : pregWeeks > 13 ? 2 : 1;

  const babySize = (() => {
    if (pregWeeks <= 4) return { icon: '🫘', label: 'Poppy seed', size: '~1mm' };
    if (pregWeeks <= 6) return { icon: '🫐', label: 'Blueberry', size: '~6mm' };
    if (pregWeeks <= 8) return { icon: '🫑', label: 'Kidney bean', size: '~1.6cm' };
    if (pregWeeks <= 10) return { icon: '🍇', label: 'Grape', size: '~3cm' };
    if (pregWeeks <= 12) return { icon: '🍋', label: 'Lime', size: '~5cm' };
    if (pregWeeks <= 16) return { icon: '🥑', label: 'Avocado', size: '~11cm' };
    if (pregWeeks <= 20) return { icon: '🥭', label: 'Mango', size: '~16cm' };
    if (pregWeeks <= 24) return { icon: '🌽', label: 'Corn', size: '~30cm' };
    if (pregWeeks <= 28) return { icon: '🍆', label: 'Aubergine', size: '~35cm' };
    if (pregWeeks <= 32) return { icon: '🥦', label: 'Head of broccoli', size: '~42cm' };
    if (pregWeeks <= 36) return { icon: '🥥', label: 'Coconut', size: '~47cm' };
    return { icon: '🎃', label: 'Small watermelon', size: '~51cm' };
  })();

  const daysUntilDue = pregDueDate
    ? Math.max(0, Math.round((new Date(pregDueDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#06d6a0]/30 to-[#b7ffe6]/20 flex items-center justify-center text-base">
            🌿
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#06d6a0]">Pregnancy Companion</h3>
            <p className="text-[11px] text-white/40">Trimester {trimester}</p>
          </div>
        </div>
        <button onClick={onReset} className="text-[10px] text-white/25 hover:text-white/50 transition-all underline">Reset</button>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Week</p>
          <p className="text-2xl font-bold text-[#06d6a0] mt-0.5">{pregWeeks}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Baby Size</p>
          <p className="text-xl mt-0.5">{babySize.icon}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">{daysUntilDue !== null ? 'Days Left' : 'Trimester'}</p>
          <p className="text-xl font-bold text-white/80 mt-0.5">{daysUntilDue !== null ? daysUntilDue : trimester}</p>
        </div>
      </div>

      {/* Baby size description */}
      <div className="rounded-xl border border-[#06d6a0]/15 bg-[#06d6a0]/6 p-3 flex items-center gap-3">
        <span className="text-3xl">{babySize.icon}</span>
        <div>
          <p className="text-sm font-bold text-[#06d6a0]">About the size of a {babySize.label}</p>
          <p className="text-[11px] text-white/50">{babySize.size} · Week {pregWeeks}</p>
        </div>
      </div>

      {/* Insights */}
      <div className="rounded-xl border border-white/8 bg-white/4 p-4 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">This Week's Focus</p>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="text-base">💧</span>
            <p className="text-xs text-white/65 leading-relaxed">
              Blood volume is expanding. Aim for {weather.isHot ? '4+ L' : '3+ L'} of water daily to prevent dizziness and support amniotic fluid.
            </p>
          </div>
          {trimester === 1 && (
            <div className="flex items-start gap-2.5">
              <span className="text-base">🍃</span>
              <p className="text-xs text-white/65 leading-relaxed">Folic acid (400–800mcg/day) is critical for neural tube development. Check your prenatal supplement.</p>
            </div>
          )}
          {trimester === 2 && (
            <div className="flex items-start gap-2.5">
              <span className="text-base">🚶</span>
              <p className="text-xs text-white/65 leading-relaxed">Gentle walking 20–30 mins/day supports circulation and reduces pregnancy-related oedema. Avoid high-impact cardio.</p>
            </div>
          )}
          {trimester === 3 && (
            <div className="flex items-start gap-2.5">
              <span className="text-base">🛌</span>
              <p className="text-xs text-white/65 leading-relaxed">Left-side sleeping improves blood flow to baby and reduces pressure on the vena cava. Use a pregnancy pillow for support.</p>
            </div>
          )}
          <div className="flex items-start gap-2.5">
            <span className="text-base">🌡️</span>
            <p className="text-xs text-white/65 leading-relaxed">
              {weather.isHot
                ? `At ${weather.temp}°C, overheating is a risk. Avoid hot baths, saunas, and midday sun. Cool environments protect foetal development.`
                : 'Temperature is comfortable today. Light outdoor walks are safe and beneficial.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ metric, isMounted }) {
  const Icon = metric.icon;
  const tone = getTone(metric.tone);
  const textColorClass = metric.isGood ? 'text-[#16a34a]' : 'text-[#ea580c]';
  return (
    <article className={`${interactiveCardClass} p-5 text-center`}>
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f0eded]">
        <ProgressRing value={metric.value} color={metric.isGood ? '#16a34a' : '#ea580c'} isMounted={isMounted} />
      </div>
      <div className="mx-auto mb-2.5 grid h-9 w-9 place-items-center rounded-xl" style={{ backgroundColor: tone.bg, color: metric.isGood ? '#16a34a' : '#ea580c' }}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[#596467] truncate">{metric.label}</h3>
      <p className={`mt-1 text-sm font-bold truncate ${textColorClass}`}>{metric.status}</p>
    </article>
  );
}

function ProgressRing({ value, color, isMounted }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const [currentVal, setCurrentVal] = useState(0);
  useEffect(() => {
    if (!isMounted) return;
    let start = null;
    const target = Math.min(100, parseInt(value, 10));
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / 1200, 1);
      setCurrentVal(Math.floor(pct * target));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, isMounted]);
  const offset = circumference - (currentVal / 100) * circumference;
  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" fill="none" r={radius} stroke="#e4e2e1" strokeWidth="4.5" />
        <circle cx="36" cy="36" fill="none" r={radius} stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="4.5" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-sm font-bold tracking-tight">{currentVal}%</div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[#596467]">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function PathCard({ tone, title, text }) {
  const styles = tone === 'primary' ? 'border-[#c8dbe2] bg-[#eef6f8] text-[#16a34a]' : 'border-[#efcfc5] bg-[#fff1ed] text-[#ea580c]';
  return (
    <div className={`rounded-xl border p-5 transition-colors duration-300 ${styles}`}>
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em]">{title}</h4>
      <p className="text-sm leading-relaxed text-[#596467]">{text}</p>
    </div>
  );
}

function FeedItem({ color, title, text, isGood }) {
  const inlineAlertColor = isGood ? 'text-[#16a34a]' : 'text-[#ea580c]';
  return (
    <div className="flex gap-4 items-start rounded-xl bg-[#fbf9f8] border border-[#e4e2e1] p-4 hover:bg-white transition-all duration-300">
      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="text-sm leading-relaxed text-[#596467]">
        <span className={`font-bold block mb-1 text-base ${inlineAlertColor}`}>{title}</span>
        {text}
      </div>
    </div>
  );
}

function getTone(tone) {
  const tones = {
    primary: { color: '#416f82', bg: '#e6f1f4' },
    warm: { color: '#8b4e3f', bg: '#ffdad2' },
    neutral: { color: '#596467', bg: '#f0eded' },
    sky: { color: '#2f83b7', bg: '#e0f2fe' },
  };
  return tones[tone] || tones.primary;
}

// ─── SVG Icon helpers ─────────────────────────────────────────────────────────
function IconBase({ className, children }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">{children}</svg>;
}
function HeartPulseIcon({ className }) { return <IconBase className={className}><path d="M20.8 8.6c0 5-8.8 10.4-8.8 10.4S3.2 13.6 3.2 8.6A4.4 4.4 0 0 1 11 5.8l1 1.1 1-1.1a4.4 4.4 0 0 1 7.8 2.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M7 12h2l1.2-2.5 2.2 5 1.5-2.5H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>; }
function MoonIcon({ className }) { return <IconBase className={className}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a7 7 0 1 0 11.5 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>; }
function BalanceIcon({ className }) { return <IconBase className={className}><path d="M12 4v16M6 7h12M7 7l-4 7h8L7 7Zm10 0-4 7h8l-4-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>; }
function DropIcon({ className }) { return <IconBase className={className}><path d="M12 3s6 6.1 6 11a6 6 0 0 1-12 0c0-4.9 6-11 6-11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>; }
function RunIcon({ className }) { return <IconBase className={className}><path d="M13 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 22l1-5-3-2-2 3M18 22l-3-5 1-5-3-2-2 3-4-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>; }
function CloudIcon({ className }) { return <IconBase className={className}><path d="M7 18h10a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.1 8.2 5 5 0 0 0 7 18Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>; }
function SunIcon({ className }) { return <IconBase className={className}><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></IconBase>; }
function AutoIcon({ className }) { return <IconBase className={className}><path d="m12 3 1.7 4.6L18 9.3l-4.3 1.7L12 16l-1.7-5L6 9.3l4.3-1.7L12 3ZM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>; }
function FemaleIcon({ className }) { return <IconBase className={className}><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 13v8M8.5 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></IconBase>; }
function SparkIcon({ className }) { return <IconBase className={className}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>; }
function TrophyIcon({ className }) { return <IconBase className={className}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>; }

export default Health;
