import React, { useState } from 'react';
import axios from 'axios';
import { useGamification } from '../context/GamificationContext';

const glassCardClass = 'rounded-2xl border border-white/10 bg-[#0d1018]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#7b61ff]/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.52)]';

const careerMetrics = [
  { label: 'Career Stability', value: 88, status: 'Resilient', icon: ShieldIcon, tone: 'primary' },
  { label: 'Productivity Balance', value: 76, status: 'Balanced', icon: BalanceIcon, tone: 'neutral' },
  { label: 'Burnout Risk', value: 24, status: 'Low', icon: PulseIcon, tone: 'primary' },
  { label: 'Roadmap Progress', value: 42, status: 'Phase 2', icon: RouteIcon, tone: 'warm' },
];

const roadmapSteps = [
  { label: 'Month 1', detail: 'HTML/CSS', status: 'Completed', icon: CheckIcon, state: 'done' },
  { label: 'Month 2', detail: 'JavaScript', status: 'In Progress', icon: PlayIcon, state: 'active' },
  { label: 'Month 3', detail: 'React & Next.js', status: 'Upcoming', icon: LockIcon, state: 'locked' },
];

function Career() {
  // --- NEW GAMIFICATION LOGIC START ---
  const [activeTab, setActiveTab] = useState('course'); // 'course' or 'focus'
  const [courseName, setCourseName] = useState('');
  const [focusDuration, setFocusDuration] = useState('');
  
  const { triggerReward } = useGamification();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const handleLogCareer = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const endpoint = activeTab === 'course' ? '/api/career/course' : '/api/career/focus';
      const payload = activeTab === 'course' 
        ? { courseName }
        : { durationMinutes: Number(focusDuration) };

      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`, 
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setCourseName('');
        setFocusDuration('');
        
        const gamificationData = response.data.gamification;
        if (gamificationData) {
          triggerReward(
            gamificationData.xpAwarded, 
            gamificationData.newBadges, 
            gamificationData.newTotalXP
          );
        }
      }
    } catch (error) {
      console.error(`Failed to log ${activeTab}:`, error);
    }
  };
  // --- NEW GAMIFICATION LOGIC END ---

  return (
    <div className="relative min-h-full overflow-hidden bg-[#05060b] px-5 py-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(123,97,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(200,168,75,0.10),transparent_26%),radial-gradient(circle_at_center,rgba(216,139,161,0.08),transparent_30%)]" />
      <div className="relative">
      {/* 1. Dashboard Header */}
      <header className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Career Intelligence</h1>
        <p className="mt-2 text-sm text-white/68">
          Monitoring structural risk vectors, milestone velocity, and cross-disciplinary trajectory.
        </p>
      </header>

      {/* --- NEW GAMIFICATION QUICK ACTION FORM --- */}
      <section className="mb-6">
        <article className={`${glassCardClass} p-6`}>
          <div className="mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Log Progress</h2>
              <p className="mt-1 text-sm text-white/60">Upskill consistently and level up your career profile.</p>
            </div>
            
            <div className="flex rounded-lg bg-white/5 p-1">
              <button 
                onClick={() => setActiveTab('course')}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'course' ? 'bg-[#7b61ff] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Course
              </button>
              <button 
                onClick={() => setActiveTab('focus')}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-all ${activeTab === 'focus' ? 'bg-[#c8a84b] text-black shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Focus Session
              </button>
            </div>
          </div>

          <form onSubmit={handleLogCareer} className="flex w-full flex-col gap-3 sm:flex-row items-end">
            {activeTab === 'course' ? (
              <div className="w-full sm:w-2/3">
                <label className="mb-1 block text-xs uppercase text-white/60">Module / Course Name</label>
                <input type="text" placeholder="e.g., Advanced React Patterns" value={courseName} onChange={(e) => setCourseName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#7b61ff] focus:outline-none" required />
              </div>
            ) : (
              <div className="w-full sm:w-2/3">
                <label className="mb-1 block text-xs uppercase text-white/60">Focus Duration (Mins)</label>
                <input type="number" placeholder="e.g., 90" value={focusDuration} onChange={(e) => setFocusDuration(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-white focus:border-[#c8a84b] focus:outline-none" required />
              </div>
            )}
            
            <button type="submit" className={`w-full sm:w-1/3 whitespace-nowrap rounded-lg px-6 py-3 font-bold transition-all ${activeTab === 'course' ? 'bg-[#7b61ff] text-white hover:shadow-[0_0_15px_rgba(123,97,255,0.4)]' : 'bg-[#c8a84b] text-black hover:shadow-[0_0_15px_rgba(200,168,75,0.4)]'}`}>
              Save & Earn XP
            </button>
          </form>
        </article>
      </section>
      {/* --- END GAMIFICATION FORM --- */}

      {/* 2. Target Metrics Row */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {careerMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {/* 3. Mid-Section: Roadmap, Warnings, and Cross-Domain Cards */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12 mb-6">
        
        {/* Left Sub-Column (Roadmap + Burnout) */}
        <div className="space-y-6 xl:col-span-8 flex flex-col justify-between">
          {/* AI Learning Roadmap */}
          <article className={`${glassCardClass} p-6 flex-1 flex flex-col justify-between`}>
            <h2 className="text-xl font-semibold mb-8">AI Learning Roadmap</h2>
            <div className="relative flex items-center justify-between w-full px-4 sm:px-12 pb-4">
              <div className="absolute left-16 right-16 top-6 z-0 h-1 bg-white/10" />
              <div className="absolute left-16 top-6 z-0 h-1 w-[40%] bg-gradient-to-r from-[#7b61ff] via-[#d98ba1] to-[#c8a84b]" />
              
              {roadmapSteps.map((step) => (
                <RoadmapStep key={step.label} step={step} />
              ))}
            </div>
          </article>

          {/* Burnout Warning */}
          <article className="rounded-2xl border border-white/10 border-l-4 border-l-[#c8a84b] bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#c8a84b]">Burnout Warning</h2>
                <p className="mt-1 text-sm text-white/64">Detected anomalous high intensity cycle</p>
              </div>
              <WarningIcon className="h-6 w-6 shrink-0 text-[#c8a84b]" />
            </div>
            <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm italic leading-6 text-white/68">
                Late-night coding detected for 4 consecutive days. Your cognitive recovery capacity is down 14%.
              </p>
            </div>
            <ProgressBar label="Fatigue Accumulation" value="68%" width="68%" color="#c8a84b" />
          </article>
        </div>

        {/* Right Sub-Column: Dedicated AI Observation, Suggestion, and Cross-Domain Cards */}
        <aside className="space-y-4 xl:col-span-4 flex flex-col justify-between">
          <ObservationCard 
            icon={MoonIcon} 
            title="AI Observation" 
            detail="Sleep consistency is directly improving coding block speed and structural logic accuracy." 
          />
          <ObservationCard 
            icon={LightIcon} 
            title="AI Suggestion" 
            detail="Shift focus to raw project architecture over certificates to secure market velocity." 
          />
          
          {/* Enhanced Cross-Domain Impact Analysis Card */}
          <article className="rounded-2xl border border-white/10 border-l-4 border-l-[#7b61ff] bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.42)]">
            <div className="mb-2 flex items-center gap-2 text-[#7b61ff]">
              <SparkIcon className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-[0.14em]">Cross-Domain Analysis</h3>
            </div>
            <p className="mb-2 text-sm font-semibold text-white">Systemic Ripple Effect Detected</p>
            <p className="text-xs leading-relaxed text-white/66">
              Pushing <span className="font-semibold text-[#ffb38a]">12-hour study blocks</span> forces a high career roadmap velocity, but risks a critical drop in <span className="font-semibold text-[#7df3cc]">Health capacity</span> (Sleep debt/Cognitive strain) and drops long-term <span className="font-semibold text-[#c8a84b]">Finance performance</span> due to immediate medical or recovery overhead risks.
            </p>
          </article>
        </aside>
      </section>

      {/* 4. Full-Width Macro Future Trajectory at the very bottom */}
      <section className="w-full">
        <article className={`${glassCardClass} p-6`}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Future Trajectory Model</h2>
            <p className="mt-1 text-sm text-white/60">Predictive matrix showing projected milestones over sustainable vs high-fatigue routes.</p>
          </div>
          <div className="relative h-64 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 800 240">
              {/* Grid Lines */}
              <line x1="0" x2="800" y1="200" y2="200" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
              <line x1="40" x2="40" y1="0" y2="240" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />
              
              {/* Trajectory Paths */}
              <path d="M0 180 Q200 130 400 150 T800 210" fill="none" stroke="#c8a84b" strokeDasharray="7 7" strokeWidth="3" />
              <path d="M0 180 Q250 150 550 60 T800 30" fill="none" stroke="#7b61ff" strokeLinecap="round" strokeWidth="4" />
            </svg>
            <div className="absolute right-6 top-6 space-y-1 text-right text-[11px] font-bold uppercase tracking-[0.12em]">
              <p className="flex items-center justify-end gap-2 text-[#7b61ff]">
                <span className="inline-block h-1.5 w-6 rounded-full bg-[#7b61ff]" /> Balanced Growth Path
              </p>
              <p className="flex items-center justify-end gap-2 pt-2 text-[#c8a84b]">
                <span className="inline-block h-1.5 w-6 border-b-2 border-dashed border-[#c8a84b]" /> Fatigue/Burnout Trajectory
              </p>
            </div>
          </div>
          <div className="mt-6">
            <ProgressBar label="Sustainable Career Outlook" value="+34%" width="85%" color="#7b61ff" />
          </div>
        </article>
      </section>
      </div>
    </div>
  );
}

{/* --- Pure Layout & Structural Sub-Components --- */}

function MetricCard({ metric }) {
  const Icon = metric.icon;
  const tone = metric.tone === 'warm' ? '#c8a84b' : metric.tone === 'neutral' ? '#9aa4b2' : '#7df3cc';

  return (
    <article className={`${glassCardClass} p-5 flex flex-col items-center justify-center`}>
      <div className="relative mb-3 h-14 w-14 flex items-center justify-center">
        <ProgressRing value={metric.value} color={tone} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-5 w-5" style={{ color: tone }} />
        </div>
      </div>
      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#72655e]">{metric.label}</p>
      <p className="text-sm font-semibold" style={{ color: tone }}>{metric.status}</p>
    </article>
  );
}

function RoadmapStep({ step }) {
  const Icon = step.icon;
  const isLocked = step.state === 'locked';

  return (
    <div className={`relative z-10 flex flex-col items-center text-center ${isLocked ? 'opacity-45' : ''}`}>
      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ring-8 ring-[#05060b] ${isLocked ? 'bg-white/8 text-white/55' : 'bg-gradient-to-br from-[#7b61ff] via-[#d98ba1] to-[#c8a84b] text-white'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm font-bold text-white">{step.label}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">{step.detail}</p>
      <span className={`mt-2 text-[10px] font-bold uppercase tracking-[0.12em] ${isLocked ? 'text-white/45' : 'text-[#7b61ff]'}`}>
        {step.status}
      </span>
    </div>
  );
}

function ProgressRing({ value, color }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
      <circle cx="32" cy="32" fill="none" r={radius} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="4" />
      <circle cx="32" cy="32" fill="none" r={radius} stroke={color} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="4" />
    </svg>
  );
}

function ProgressBar({ label, value, width, color }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all duration-500" style={{ width, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ObservationCard({ icon: Icon, title, detail }) {
  return (
    <article className={`${glassCardClass} flex w-full flex-1 items-start gap-4 p-4`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#7b61ff]/15 text-[#7b61ff]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/48">{title}</p>
        <p className="text-xs font-medium leading-relaxed text-white/72">{detail}</p>
      </div>
    </article>
  );
}

{/* --- SVGs --- */}

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

function BalanceIcon({ className, style }) {
  return <IconBase className={className} style={style}><path d="M12 4v16M5 7h14M7 7l-4 7h8L7 7ZM17 7l-4 7h8l-4-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function PulseIcon({ className, style }) {
  return <IconBase className={className} style={style}><path d="M4 13h4l2-6 4 10 2-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function RouteIcon({ className, style }) {
  return <IconBase className={className} style={style}><path d="M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" /><path d="M8.5 13.5 15.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></IconBase>;
}

function SparkIcon({ className }) {
  return <IconBase className={className}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function CheckIcon({ className }) {
  return <IconBase className={className}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function PlayIcon({ className }) {
  return <IconBase className={className}><path d="m8 5 11 7-11 7V5Z" fill="currentColor" /></IconBase>;
}

function LockIcon({ className }) {
  return <IconBase className={className}><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v10H6V11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function WarningIcon({ className }) {
  return <IconBase className={className}><path d="M12 9v4M12 17h.01M10.3 4.4 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

function MoonIcon({ className }) {
  return <IconBase className={className}><path d="M20 15.3A8 8 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></IconBase>;
}

function LightIcon({ className }) {
  return <IconBase className={className}><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1.2.8-1.5 1.8-1.5 3h-5c0-1.2-.3-2.2-1.5-3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></IconBase>;
}

export default Career;