import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import DigitalTwinLogo from '../components/DigitalTwinLogo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const activeSignals = [
  {
    emoji: '🧬',
    label: 'Health',
    title: 'Shape your energy profile',
    copy: 'See the health layer pulse through a calm neon frame that feels alive.',
    accent: 'from-[#ff4d7d] via-[#7b61ff] to-[#10c7a1]',
  },
  {
    emoji: '💎',
    label: 'Finance',
    title: 'Build a sharper money rhythm',
    copy: 'Stay inside a premium finance layer with motion, clarity, and depth.',
    accent: 'from-[#0fbf87] via-[#1d5fff] to-[#c8a84b]',
  },
  {
    emoji: '🎯',
    label: 'Career',
    title: 'Move with sharper intent',
    copy: 'Turn opportunity into a visible, animated next step with style.',
    accent: 'from-[#7b61ff] via-[#0fbf87] to-[#1e2d7a]',
  },
];

const signalStats = [
  { label: 'Health', value: 84, bar: 92 },
  { label: 'Finance', value: 71, bar: 74 },
  { label: 'Career', value: 78, bar: 82 },
];

const nextBestMoves = [
  'Protect a 45-minute focus block before noon.',
  'Reduce late-night screen exposure tonight.',
  'Maintain current productivity rhythm.',
  'Financial stress levels remain stable.',
];

const orbitEmojis = ['🧬', '💎', '🎯'];

// ==========================================
// Live Premium Background (Synced with Login)
// ==========================================
function LivePremiumBackground() {
  const shootingStars = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 8,
    duration: 1.5 + Math.random() * 2,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0f]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />

      <motion.div
        animate={{
          rotate: [0, 5, -5, 0],
          scale: [1, 1.1, 1],
          y: [0, -30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-[20%] top-[30%] h-[300px] w-[140%] origin-center rotate-[-15deg] rounded-[100%] bg-gradient-to-r from-transparent via-[#ff4d7d40] to-transparent opacity-60 mix-blend-screen blur-[60px]"
      />
      
      <motion.div
        animate={{
          rotate: [0, -8, 8, 0],
          scale: [1, 1.2, 1],
          y: [0, 40, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -right-[10%] top-[40%] h-[200px] w-[120%] origin-center rotate-[10deg] rounded-[100%] bg-gradient-to-r from-transparent via-[#10c7a130] to-[#7b61ff30] opacity-70 mix-blend-screen blur-[50px]"
      />

      {shootingStars.map((star) => (
        <motion.div
          key={star.id}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: [0, -300],
            y: [0, 300],
            scale: [0, 1, 0.5, 0],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "linear",
          }}
          className="absolute"
          style={{ top: star.top, left: star.left }}
        >
          <div className="absolute h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          <div className="absolute top-[1px] left-[1px] h-[1px] w-[60px] origin-top-left rotate-[45deg] bg-gradient-to-r from-white/80 to-transparent" />
        </motion.div>
      ))}

      <div className="absolute -top-[20%] -left-[10%] h-[40vw] w-[40vw] rounded-full bg-[#7b61ff] opacity-10 blur-[100px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[40vw] w-[40vw] rounded-full bg-[#10c7a1] opacity-10 blur-[100px]" />
    </div>
  );
}

// ==========================================
// Rotating Signal (Synced with Login physics)
// ==========================================
function RotatingSignal({ signal }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={signal.label}
        initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -20, scale: 1.05, filter: 'blur(10px)' }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${signal.accent} p-[1px] shadow-[0_24px_80px_-34px_rgba(0,0,0,0.75)]`}
      >
        <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-[#080b12]/90 p-6 text-white backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,199,161,0.16),transparent_30%)]" />
          <div className="relative flex items-center gap-5">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.7rem] border border-white/12 bg-white/10 text-[2.5rem] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              <span className="translate-y-[-2px]">{signal.emoji}</span>
            </motion.div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">{signal.label}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{signal.title}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/72">{signal.copy}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [animatedStats, setAnimatedStats] = useState(signalStats.map(() => 0));
  const [barsReady, setBarsReady] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);

  useEffect(() => {
    const duration = 2200;
    const startTime = performance.now();
    let animationFrame;

    const animateCounters = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setAnimatedStats(signalStats.map((stat) => Math.round(stat.value * easedProgress)));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateCounters);
      }
    };

    animationFrame = requestAnimationFrame(animateCounters);
    const barTimer = window.setTimeout(() => setBarsReady(true), 420);
    const suggestionTimer = window.setInterval(() => {
      setSuggestionIndex((current) => (current + 1) % nextBestMoves.length);
    }, 3600);
    const signalTimer = window.setInterval(() => {
      setActiveSignalIndex((current) => (current + 1) % activeSignals.length);
    }, 3500); // Synced timing with login

    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(barTimer);
      window.clearInterval(suggestionTimer);
      window.clearInterval(signalTimer);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('Please fill all required fields');
      return false;
    }

    if (firstName.trim().length < 2) {
      toast.error('First name must be at least 2 characters');
      return false;
    }

    if (lastName.trim().length < 2) {
      toast.error('Last name must be at least 2 characters');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return false;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, formData);
      const { token, user } = response.data.data;

      toast.success('Account created successfully!');
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      setTimeout(() => {
        navigate('/onboarding');
      }, 500);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070c] text-white">
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(9, 12, 20, 0.92)',
            color: '#f3f4f6',
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 24px 60px -28px rgba(0, 0, 0, 0.7)',
          },
          success: {
            style: { background: '#0f8a5f' },
            iconTheme: { primary: '#fff', secondary: '#0f8a5f' },
          },
          error: {
            style: { background: '#dc1f45' },
            iconTheme: { primary: '#fff', secondary: '#dc1f45' },
          },
        }}
      />

      {/* 🌟 THE NEW BACKGROUND 🌟 */}
      <LivePremiumBackground />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl overflow-hidden lg:grid-cols-[0.88fr_1.12fr] py-4 px-4 sm:px-6 lg:px-8">
        
        {/* BENTO BOX CONTAINER - LEFT */}
        <section className="relative flex overflow-hidden rounded-[2rem] lg:rounded-r-none lg:rounded-l-[2rem] border border-white/10 bg-[#0a0e17]/60 px-6 py-8 sm:px-8 lg:border-r lg:px-10 lg:py-10 shadow-[0_32px_120px_-40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_35%)]" />
          
          <motion.div
            aria-hidden="true"
            className="absolute inset-0"
            animate={{ rotate: [0, 1.2, 0, -1.2, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          >
            {orbitEmojis.map((emoji, index) => (
              <motion.div
                key={emoji}
                animate={{
                  x: [0, index % 2 === 0 ? 18 : -18, 0],
                  y: [0, index === 1 ? -10 : 12, 0],
                  rotate: [0, index % 2 === 0 ? 10 : -10, 0],
                }}
                transition={{ duration: 7 + index, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[1.75rem] leading-none shadow-[0_18px_40px_-26px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                style={{
                  left: `${18 + index * 18}%`,
                  top: `${18 + index * 20}%`,
                }}
              >
                <span className="translate-y-[-2px]">{emoji}</span>
              </motion.div>
            ))}
          </motion.div>
          
          <div className="relative flex w-full flex-col justify-between gap-10">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl hover:bg-white/10 transition">
                <DigitalTwinLogo className="h-8 w-8 rounded-full" />
                DigitalTwin
              </Link>

              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55 sm:inline-flex">
                Build your profile
              </div>
            </div>

            <div className="max-w-xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                <span className="h-2 w-2 rounded-full bg-[#10c7a1] shadow-[0_0_18px_rgba(16,199,161,0.85)]" />
                New account flow
              </div>

              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
                Start with a
                <span className="mt-2 block bg-gradient-to-r from-[#ffffff] via-[#9db7ff] to-[#7df3cc] bg-clip-text text-transparent">
                  cinematic digital twin.
                </span>
              </h1>

              <p className="max-w-xl text-base leading-7 text-white/68 sm:text-lg">
                Create your profile and unlock a dark premium interface where health, finance, and career signals move in sync.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {signalStats.map((item, index) => (
                <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-md">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{animatedStats[index]}%</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7b61ff] via-[#10c7a1] to-[#7df3cc] transition-all duration-[2200ms] ease-out"
                      style={{
                        width: barsReady ? `${item.bar}%` : '0%',
                        transitionDelay: `${index * 140}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/45">Next best move</p>
                <span className="h-2 w-2 rounded-full bg-[#7df3cc] shadow-[0_0_18px_rgba(125,243,204,0.85)]" />
              </div>
              <p key={suggestionIndex} className="mt-3 min-h-10 text-sm leading-6 text-white/72 signup-suggestion-fade">
                {nextBestMoves[suggestionIndex]}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 text-white/72 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Onboarding</p>
                <p className="mt-2 text-sm font-semibold text-white">3 quick steps.</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 text-white/72 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Privacy</p>
                <p className="mt-2 text-sm font-semibold text-white">Private by default.</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 text-white/72 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Result</p>
                <p className="mt-2 text-sm font-semibold text-white">Signals online.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BENTO BOX CONTAINER - RIGHT */}
        <section className="relative flex items-center justify-center rounded-[2rem] lg:rounded-l-none lg:rounded-r-[2rem] border border-white/10 lg:border-l-0 bg-[#0a0e17]/60 px-5 py-6 sm:px-8 sm:py-8 lg:px-8 lg:py-10 shadow-[0_32px_120px_-40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(123,97,255,0.12),transparent_24%),radial-gradient(circle_at_90%_20%,rgba(16,199,161,0.08),transparent_20%)]" />
          <div className="relative w-full max-w-2xl space-y-6">
            
            <RotatingSignal signal={activeSignals[activeSignalIndex]} />

            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-7">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Create account</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Join DigitalTwin</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-[0_0_30px_rgba(123,97,255,0.18)]">
                  ✨
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">First name</span>
                    <input
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Anjali"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#7b61ff]/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#7b61ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Last name</span>
                    <input
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      placeholder="Kumari"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#10c7a1]/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#10c7a1]/30 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Email</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#7b61ff]/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#7b61ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Password</span>
                    <input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="8+ characters"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#10c7a1]/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#10c7a1]/30 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Confirm password</span>
                    <input
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#7b61ff]/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#7b61ff]/30 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                </div>

                <motion.button
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword}
                  className="mt-2 flex w-full items-center justify-center gap-3 rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-4 text-sm font-semibold text-white shadow-[0_24px_60px_-28px_rgba(16,199,161,0.4)] ring-1 ring-white/20 transition hover:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </motion.button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/38">or</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              </div>

              <motion.button
                whileHover={{ y: -1, backgroundColor: "rgba(255,255,255,0.08)" }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm font-semibold text-white/88 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.8)] transition focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-black">G</span>
                Continue with Google
              </motion.button>

              <p className="mt-6 text-center text-sm text-white/62">
                Already have an account?{' '}
                <Link to="/" className="font-semibold text-[#9db7ff] transition hover:text-[#7df3cc]">
                  Log in
                </Link>
              </p>

              <p className="mt-3 text-center text-[11px] leading-5 text-white/38">
                By signing up, you agree to DigitalTwin&apos;s Terms and Privacy Policy.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Signup;