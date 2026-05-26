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
    title: 'Reset your rhythm',
    copy: 'Track strain, energy, and recovery without losing the premium feel.',
    accent: 'from-[#ff4d7d] via-[#7b61ff] to-[#10c7a1]',
  },
  {
    emoji: '💎',
    label: 'Finance',
    title: 'Stay on top of cash flow',
    copy: 'See your financial pulse in a calm, high-clarity dashboard layer.',
    accent: 'from-[#0fbf87] via-[#1d5fff] to-[#c8a84b]',
  },
  {
    emoji: '🎯',
    label: 'Career',
    title: 'Move with intent',
    copy: 'Focus on momentum, progress, and the next high-value move.',
    accent: 'from-[#7b61ff] via-[#0fbf87] to-[#1e2d7a]',
  },
];

const trustMetrics = [
  { label: 'Signals live', value: '24/7' },
  { label: 'Focus mode', value: 'On' },
  { label: 'Glow score', value: 'A+' },
];

const loginPulseBadges = ['Health', 'Finance', 'Career'];

// ==========================================
// NEW: Shooting Stars & Aurora Wave Background
// ==========================================
function LivePremiumBackground() {
  // Generate random shooting stars
  const shootingStars = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 8,
    duration: 1.5 + Math.random() * 2,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0f]">
      {/* Base Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />

      {/* ================= AURORA WAVES (Like Reference Image) ================= */}
      {/* Pink/Purple Wave */}
      <motion.div
        animate={{
          rotate: [0, 5, -5, 0],
          scale: [1, 1.1, 1],
          y: [0, -30, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -left-[20%] top-[30%] h-[300px] w-[140%] origin-center rotate-[-15deg] rounded-[100%] bg-gradient-to-r from-transparent via-[#ff4d7d40] to-transparent opacity-60 mix-blend-screen blur-[60px]"
      />
      
      {/* Cyan/Blue Wave */}
      <motion.div
        animate={{
          rotate: [0, -8, 8, 0],
          scale: [1, 1.2, 1],
          y: [0, 40, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -right-[10%] top-[40%] h-[200px] w-[120%] origin-center rotate-[10deg] rounded-[100%] bg-gradient-to-r from-transparent via-[#10c7a130] to-[#7b61ff30] opacity-70 mix-blend-screen blur-[50px]"
      />

      {/* ================= SHOOTING STARS ================= */}
      {shootingStars.map((star) => (
        <motion.div
          key={star.id}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: [0, -300], // Moves diagonally left
            y: [0, 300],  // Moves diagonally down
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
          {/* Star Head */}
          <div className="absolute h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
          {/* Star Tail */}
          <div className="absolute top-[1px] left-[1px] h-[1px] w-[60px] origin-top-left rotate-[45deg] bg-gradient-to-r from-white/80 to-transparent" />
        </motion.div>
      ))}

      {/* Ambient corner glows to frame the page */}
      <div className="absolute -top-[20%] -left-[10%] h-[40vw] w-[40vw] rounded-full bg-[#7b61ff] opacity-10 blur-[100px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[40vw] w-[40vw] rounded-full bg-[#10c7a1] opacity-10 blur-[100px]" />
    </div>
  );
}

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

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSignalIndex((current) => (current + 1) % activeSignals.length);
    }, 3500); 

    return () => window.clearInterval(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const { email, password } = formData;

    if (!email.trim() || !password.trim()) {
      toast.error('Please fill all required fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
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
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);
      const { token, user } = response.data.data;

      toast.success('Login successful!');
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
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

      <section className="relative isolate flex min-h-screen items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0e17]/60 shadow-[0_32px_120px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/5 backdrop-blur-2xl lg:grid-cols-[0.95fr_1.05fr]">
          
          <div className="relative flex overflow-hidden border-b border-white/10 bg-white/[0.02] px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.05),transparent_35%)]" />
            
            <div className="relative flex w-full flex-col justify-between gap-10">
              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl hover:bg-white/10 transition">
                  <DigitalTwinLogo className="h-8 w-8 rounded-full" />
                  DigitalTwin
                </Link>

                <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55 sm:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10c7a1]" />
                  Live in motion
                </div>
              </div>

              <div className="max-w-xl space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                  <span className="h-2 w-2 rounded-full bg-[#10c7a1] shadow-[0_0_18px_rgba(16,199,161,0.85)]" />
                  Health · Finance · Career
                </div>

                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
                  Welcome back to your
                  <span className="mt-2 block bg-gradient-to-r from-[#ffffff] via-[#9db7ff] to-[#7df3cc] bg-clip-text text-transparent">
                    living digital twin.
                  </span>
                </h1>

                <p className="max-w-xl text-base leading-7 text-white/68 sm:text-lg">
                  Sign in to a cinematic dashboard that keeps your health, money, and career signals in one moving view.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {loginPulseBadges.map((badge, index) => (
                  <motion.span
                    key={badge}
                    animate={{ y: [0, index % 2 === 0 ? -4 : 4, 0] }}
                    transition={{ duration: 3.2 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/58"
                  >
                    {badge}
                  </motion.span>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {trustMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4 shadow-lg backdrop-blur-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">{metric.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-8 lg:py-10">
            <div className="relative w-full max-w-lg space-y-6">
              
              <RotatingSignal signal={activeSignals[activeSignalIndex]} />

              <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">Secure access</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Sign in</h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl shadow-[0_0_30px_rgba(123,97,255,0.18)]">
                    ✨
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Email address</span>
                    <input
                      id="email"
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

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/48">Password</span>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      className="w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#10c7a1]/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#10c7a1]/30 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-sm text-white/65">
                    <label className="flex cursor-pointer items-center gap-2 transition hover:text-white">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/10 text-[#7b61ff] focus:ring-[#7b61ff]/40"
                      />
                      Remember me
                    </label>
                    <a href="#forgot-password" className="font-medium text-[#8fd9ff] transition hover:text-[#b7f7d4]">
                      Forgot password?
                    </a>
                  </div>

                  <motion.button
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isLoading || !formData.email || !formData.password}
                    className="mt-2 flex w-full items-center justify-center gap-3 rounded-[1rem] bg-gradient-to-r from-[#1a2b4c] via-[#2a3f6a] to-[#1d463d] px-4 py-4 text-sm font-semibold text-white shadow-[0_24px_60px_-28px_rgba(16,199,161,0.4)] ring-1 ring-white/20 transition hover:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Authenticating...
                      </>
                    ) : (
                      'Enter digital twin'
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
                  New to DigitalTwin?{' '}
                  <Link to="/signup" className="font-semibold text-[#9db7ff] transition hover:text-[#7df3cc]">
                    Create an account
                  </Link>
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 text-white/72 backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Pulse</p>
                  <p className="mt-1 text-xs font-semibold text-white">Quiet, focused.</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 text-white/72 backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Tone</p>
                  <p className="mt-1 text-xs font-semibold text-white">Dark, premium.</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.02] p-4 text-white/72 backdrop-blur-md">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Mode</p>
                  <p className="mt-1 text-xs font-semibold text-white">Live AI sync.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;