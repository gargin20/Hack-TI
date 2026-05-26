import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Activity, Wallet, Target, BarChart3, PieChart } from 'lucide-react';
import DigitalTwinLogo from '../components/DigitalTwinLogo';


function FloatingDashboards() {
  return (
    <div className="relative h-[600px] w-full perspective-[1000px] flex items-center justify-center">
      {/* Main Center Card (Health) */}
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute z-20 w-72 rounded-2xl border border-white/10 bg-[#1e132e]/90 p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        style={{ transform: 'rotateX(15deg) rotateY(-15deg) rotateZ(5deg)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff007f]/20 text-[#ff007f]">
              <Activity size={16} />
            </div>
            <span className="text-sm font-bold text-white">Vitality</span>
          </div>
          <span className="text-xs font-semibold text-[#10c7a1]">+12%</span>
        </div>
        <div className="flex items-end gap-2 h-20">
          {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 1, delay: i * 0.1 }}
              className="w-full rounded-t-sm bg-gradient-to-t from-[#ff7a00] to-[#ff007f]"
            />
          ))}
        </div>
      </motion.div>

      {/* Top Right Card (Finance) */}
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute z-10 -right-4 top-10 w-56 rounded-2xl border border-white/10 bg-[#1e132e]/80 p-4 shadow-2xl backdrop-blur-md"
        style={{ transform: 'rotateX(15deg) rotateY(-15deg) rotateZ(5deg) translateZ(-50px)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#c8a84b]/20 text-[#c8a84b]">
            <Wallet size={14} />
          </div>
          <span className="text-xs font-bold text-white">Wealth Flow</span>
        </div>
        <div className="flex items-center justify-center py-2">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/5 border-t-[#c8a84b] border-r-[#c8a84b]">
            <span className="text-sm font-bold text-white">68%</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom Left Card (Career) */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute z-30 -left-10 bottom-20 w-64 rounded-2xl border border-white/10 bg-[#1e132e]/90 p-4 shadow-2xl backdrop-blur-xl"
        style={{ transform: 'rotateX(15deg) rotateY(-15deg) rotateZ(5deg) translateZ(50px)' }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10c7a1]/20 text-[#10c7a1]">
            <Target size={14} />
          </div>
          <span className="text-xs font-bold text-white">Momentum</span>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full rounded-full bg-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full rounded-full bg-[#10c7a1]" />
          </div>
          <div className="h-2 w-full rounded-full bg-white/5">
            <motion.div initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 1.5, delay: 0.7 }} className="h-full rounded-full bg-[#7b61ff]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}


function ReferenceBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#130b1c]">
      {/* Diagonal Design Lines */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute h-[1px] w-[150%] bg-gradient-to-r from-transparent via-white to-transparent"
            style={{
              top: `${i * 15}%`,
              left: '-25%',
              transform: 'rotate(-35deg)',
            }}
          />
        ))}
      </div>

      {/* Massive Gradient Orbs */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#ff7a00] to-[#ff007f] opacity-40 blur-[80px]"
      />
      
      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: [0, -10, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -top-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#ff007f] to-[#7b61ff] opacity-40 blur-[80px]"
      />

      {/* Floating Geometric Circles (Like the image) */}
      <motion.div
        animate={{ y: [0, -30, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[15%] left-[5%] h-32 w-32 rounded-full bg-gradient-to-br from-[#ff7a00] to-[#ff007f] shadow-[0_0_50px_rgba(255,0,127,0.5)]"
      />
      
      <motion.div
        animate={{ y: [0, 40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[15%] right-[35%] h-16 w-16 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff7a00] shadow-[0_0_30px_rgba(255,122,0,0.5)]"
      />
    </div>
  );
}

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#130b1c] text-white selection:bg-[#ff007f]/30">
      <ReferenceBackground />

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <div className="flex items-center gap-3 text-xl font-bold tracking-tighter">
          <DigitalTwinLogo className="h-8 w-8 rounded-full" />
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">DigitalTwin</span>
        </div>
        <div className="hidden gap-8 text-sm font-medium text-white/70 md:flex">
          {['Home', 'Features', 'Intelligence', 'Contact'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="transition hover:text-white">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden text-sm font-semibold text-white/80 transition hover:text-white sm:block">
            Log In
          </Link>
          <Link to="/signup" className="rounded-full bg-gradient-to-r from-[#ff7a00] to-[#ff007f] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,0,127,0.3)] transition hover:opacity-90 hover:shadow-[0_0_30px_rgba(255,0,127,0.5)]">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pt-12 md:px-12 lg:grid-cols-2 lg:pt-20">
        
        {/* Left: Typography & CTA */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ffd700]/30 bg-[#ffd700]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#ffd700]">
            <Sparkles size={14} /> Next-Gen Life Sync
          </div>
          
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Synchronize your <br />
            <span className="bg-gradient-to-r from-[#ff7a00] via-[#ff007f] to-[#7b61ff] bg-clip-text text-transparent">
              digital existence.
            </span>
          </h1>
          
          <p className="mt-6 text-lg leading-relaxed text-white/60 sm:text-xl">
            Unify your health metrics, financial cashflow, and career momentum into one intelligent, cinematic control room.
          </p>
          
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link to="/signup" className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#ff7a00] to-[#ff007f] px-8 py-4 font-semibold text-white shadow-[0_0_30px_rgba(255,0,127,0.4)] transition hover:shadow-[0_0_50px_rgba(255,0,127,0.6)]">
              <span className="relative z-10 flex items-center gap-2">
                Launch Dashboard <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link to="/login" className="px-8 py-4 font-semibold text-white/80 transition hover:text-white">
              View Demo
            </Link>
          </div>

          {/* Quick Social Proof / Data Points */}
          <div className="mt-14 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            <div>
              <p className="text-2xl font-bold text-white">24/7</p>
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">AI Analysis</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">3</p>
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">Core Sectors</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs font-medium uppercase tracking-wider text-white/40">Encrypted</p>
            </div>
          </div>
        </motion.div>

        {/* Right: The Live Animated Isometric UI */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
          className="hidden lg:block"
        >
          <FloatingDashboards />
        </motion.div>

      </section>
    </main>
  );
}