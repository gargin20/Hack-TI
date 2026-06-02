import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, Utensils, Receipt, Activity, FileText, CheckCircle,
  Loader2, Sparkles, BrainCircuit, Volume2, StopCircle, Mic, MicOff,
  AlertTriangle, Zap, DollarSign, X, User, Bot, ChevronRight,
  TrendingUp, Target, Send, History, RefreshCw, ArrowRight,
  Link2, BarChart2, Clock, Plus
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const glass = 'rounded-2xl border border-white/10 bg-[#0f1320]/84 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl';

// ─── Follow-up chip suggestions per context ───────────────────────────────────
const FOLLOW_UP_CHIPS = {
  finance: [
    'How does this affect my savings goal?',
    'What if prices rise 10% next month?',
    'Show me a 3-month action plan',
  ],
  health: [
    'How does this affect my calorie goal?',
    'What micronutrients am I missing?',
    'Can I eat this if I\'m trying to lose weight?',
  ],
  medical: [
    'What lifestyle changes help with this?',
    'Should I be worried about these results?',
    'What questions should I ask my doctor?',
  ],
  general: [
    'Break this into weekly milestones',
    'What\'s the biggest risk here?',
    'How does this link to my health data?',
  ],
};

// ─── Compact Receipt Timeline ─────────────────────────────────────────────────
function ReceiptTimeline({ saves }) {
  if (!saves || saves.length === 0) return null;
  const total = saves.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const byCategory = saves.reduce((acc, r) => {
    const cat = r.category || 'Other';
    acc[cat] = (acc[cat] || 0) + (r.totalAmount || 0);
    return acc;
  }, {});

  return (
    <div className={`${glass} p-5 mt-6`}>
      <h3 className="flex items-center gap-2 text-sm font-bold text-[#c8a84b] mb-4">
        <BarChart2 className="h-4 w-4" /> Receipt Intelligence — This Session
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-xs text-white/40 mb-1">Total Scanned</p>
          <p className="text-xl font-black text-[#c8a84b]">₹{total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <p className="text-xs text-white/40 mb-1">Receipts</p>
          <p className="text-xl font-black text-white">{saves.length}</p>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(byCategory).map(([cat, amt]) => {
          const pct = Math.round((amt / total) * 100);
          return (
            <div key={cat}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/60">{cat}</span>
                <span className="font-semibold text-[#c8a84b]">₹{amt.toLocaleString()} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8">
                <motion.div className="h-full rounded-full bg-[#c8a84b]"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full ${
        isUser ? 'bg-[#7b61ff]/20 text-[#7b61ff]' : 'bg-[#10c7a1]/20 text-[#10c7a1]'}`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-[#7b61ff]/15 border border-[#7b61ff]/25 text-white/90 rounded-tr-sm'
          : 'bg-white/5 border border-white/10 text-white/85 rounded-tl-sm'
      }`}>
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <OracleResponse data={msg.content} compact />
        )}
      </div>
    </motion.div>
  );
}

// ─── Oracle response renderer (full + compact) ────────────────────────────────
function OracleResponse({ data, compact = false }) {
  const getRiskStyles = (level) => {
    switch(level?.toLowerCase()) {
      case 'low':  return { border: 'border-[#10c7a1]/40', bg: 'bg-[#10c7a1]/10', text: 'text-[#10c7a1]' };
      case 'high': return { border: 'border-[#ff4d7d]/40', bg: 'bg-[#ff4d7d]/10', text: 'text-[#ff4d7d]' };
      default:     return { border: 'border-[#c8a84b]/40', bg: 'bg-[#c8a84b]/10', text: 'text-[#c8a84b]' };
    }
  };
  const rs = getRiskStyles(data.riskLevel);

  if (compact) {
    return (
      <div>
        <p className="font-semibold mb-2">{data.verdict}</p>
        {data.action && <p className="text-xs text-white/60 mt-1"><span className="text-[#10c7a1] font-bold">Action: </span>{data.action}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border ${rs.border} ${rs.bg} p-5`}>
        <p className={`text-xs font-bold uppercase tracking-widest ${rs.text} mb-2 flex items-center gap-1.5`}>
          <AlertTriangle className="h-3.5 w-3.5" />
          Copilot Verdict · Risk: {data.riskLevel}
        </p>
        <p className="text-base font-semibold text-white leading-relaxed">{data.verdict}</p>
      </div>

      {data.impacts?.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#7b61ff] mb-3">Cross-Domain Impacts</p>
          <div className="space-y-2">
            {data.impacts.map((imp, i) => (
              <div key={i} className="flex gap-2.5 items-start text-sm">
                <div className="mt-0.5 rounded bg-white/10 p-1">
                  {imp.domain?.toLowerCase() === 'health' ? <Activity className="h-3 w-3 text-[#ff4d7d]" /> :
                   imp.domain?.toLowerCase() === 'finance' ? <DollarSign className="h-3 w-3 text-[#10c7a1]" /> :
                   <BrainCircuit className="h-3 w-3 text-[#c8a84b]" />}
                </div>
                <p className="text-white/80"><strong className="text-white">{imp.domain}:</strong> {imp.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.action && (
        <div className="rounded-xl border border-[#10c7a1]/30 bg-gradient-to-br from-[#11131a] to-[#10c7a1]/10 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#10c7a1] mb-1 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Recommended Action
          </p>
          <p className="text-sm text-white/90">{data.action}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Copilot() {
  const [file, setFile]                   = useState(null);
  const [preview, setPreview]             = useState(null);
  const [contextType, setContextType]     = useState('food');
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [result, setResult]               = useState(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [savedGoalUpdate, setSavedGoalUpdate] = useState(null); // which goal was auto-updated

  // Chat
  const [chatInput, setChatInput]         = useState('');
  const [chatHistory, setChatHistory]     = useState([]); // [{role, content}]
  const [isConsulting, setIsConsulting]   = useState(false);
  const [isSpeaking, setIsSpeaking]       = useState(false);
  const [isListening, setIsListening]     = useState(false);
  const [activeGoals, setActiveGoals]     = useState([]);

  // Receipt session tracking
  const [sessionSaves, setSessionSaves]   = useState([]);

  const fileInputRef  = useRef(null);
  const recognitionRef = useRef(null);
  const chatEndRef    = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Fetch active goals for Oracle context injection
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res   = await axios.get(`${API_BASE_URL}/api/goals`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) setActiveGoals(res.data.data.filter(g => g.currentMetric < g.targetMetric));
      } catch (e) { /* silent */ }
    };
    fetchGoals();
  }, []);

  // Speech Recognition setup
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = false; rec.interimResults = false; rec.lang = 'en-US';
      rec.onstart  = () => setIsListening(true);
      rec.onend    = () => setIsListening(false);
      rec.onresult = (e) => setChatInput(e.results[0][0].transcript);
      rec.onerror  = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) { alert("Microphone not supported in this browser."); return; }
    if (isListening) { recognitionRef.current.stop(); }
    else { window.speechSynthesis?.cancel(); setIsSpeaking(false); setChatInput(''); recognitionRef.current.start(); }
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    // Clean text for TTS
    const clean = text.replace(/[*_#`]/g, '').replace(/\n+/g, '. ');
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.rate    = 0.95; utt.pitch = 1.0;
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  };

  const handleSaveToDashboard = async () => {
    if (!result) return;
    setIsSaving(true);
    setSavedGoalUpdate(null);
    try {
      const token = localStorage.getItem('authToken');
      const res   = await axios.post(`${API_BASE_URL}/api/ai/save`,
        { contextType, extractedData: result },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        // Track receipt for session timeline
        if (contextType === 'finance' && result.totalAmount) {
          setSessionSaves(prev => [...prev, result]);
        }
        // Show goal auto-update notification
        if (res.data.goalUpdated) {
          setSavedGoalUpdate(res.data.goalUpdated);
          setTimeout(() => setSavedGoalUpdate(null), 5000);
        }
        clearSelection();
      }
    } catch (e) {
      console.error(e);
      alert('Failed to sync. Check your connection.');
    }
    setIsSaving(false);
  };

  const handleAskOracle = async (questionOverride) => {
    const question = questionOverride || chatInput;
    if (!question?.trim()) return;
    window.speechSynthesis?.cancel(); setIsSpeaking(false);

    // Add user message to history
    setChatHistory(prev => [...prev, { role: 'user', content: question }]);
    setChatInput('');
    setIsConsulting(true);

    try {
      const token = localStorage.getItem('authToken');

      // Inject active goals as context
      const goalsContext = activeGoals.length > 0
        ? `\n\nUser's active goals: ${activeGoals.map(g => `${g.title} (${g.currentMetric}/${g.targetMetric} ${g.unit})`).join('; ')}`
        : '';

      const res = await axios.post(`${API_BASE_URL}/api/ai/consult`,
        { question: question + goalsContext },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const parsed = typeof res.data.advice === 'string' ? JSON.parse(res.data.advice) : res.data.advice;
        setChatHistory(prev => [...prev, { role: 'assistant', content: parsed }]);
      }
    } catch (e) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: { verdict: 'I encountered an error processing that query.', riskLevel: 'Medium', impacts: [], action: 'Please try rephrasing your question.' }
      }]);
    }
    setIsConsulting(false);
  };

  const handleFileSelect = (f) => {
    setFile(f); setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  const clearSelection = () => {
    setFile(null); setPreview(null); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true); setResult(null);
    const formData = new FormData();
    formData.append('image', file); formData.append('contextType', contextType);
    try {
      const token = localStorage.getItem('authToken');
      const res   = await axios.post(`${API_BASE_URL}/api/ai/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setResult(res.data.data);
    } catch (e) { alert('Analysis failed. Check your Gemini API key and backend.'); }
    setIsAnalyzing(false);
  };

  const getFollowUps = () => {
    if (chatHistory.length === 0) return [];
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg.role !== 'assistant') return [];
    const verdict  = lastMsg.content?.verdict?.toLowerCase() || '';
    const detected = verdict.includes('gold') || verdict.includes('invest') ? 'finance' :
                     verdict.includes('calor') || verdict.includes('sleep') ? 'health' : 'general';
    return FOLLOW_UP_CHIPS[detected] || FOLLOW_UP_CHIPS.general;
  };

  const followUps = getFollowUps();

  return (
    <div className="min-h-screen bg-[#05070d] px-5 py-8 text-white sm:px-8">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-[#7b61ff]/8 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[#10c7a1]/6 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl">

        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7b61ff] to-[#10c7a1] shadow-[0_0_30px_rgba(123,97,255,0.3)]">
            <UploadCloud className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Vision Engine Copilot</h1>
          <p className="mt-2 text-white/50 text-sm">Upload a meal, receipt, or medical report — AI extracts data and syncs to your goals.</p>
        </motion.header>

        {/* Goal auto-update notification */}
        <AnimatePresence>
          {savedGoalUpdate && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="mb-6 flex items-center gap-3 rounded-xl border border-[#10c7a1]/40 bg-[#10c7a1]/15 px-5 py-4">
              <Target className="h-5 w-5 text-[#10c7a1] flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-[#10c7a1]">Goal Auto-Updated!</p>
                <p className="text-xs text-white/70">
                  Your "{savedGoalUpdate.title}" goal was automatically updated from this scan.
                  New progress: {savedGoalUpdate.currentMetric} / {savedGoalUpdate.targetMetric} {savedGoalUpdate.unit}
                </p>
              </div>
              <button onClick={() => setSavedGoalUpdate(null)} className="ml-auto text-white/40 hover:text-white"><X className="h-4 w-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context Selector */}
        <div className="mb-8 flex justify-center gap-3 flex-wrap">
          <ContextButton active={contextType === 'food'}    onClick={() => setContextType('food')}    icon={Utensils}  label="Food & Nutrition"   color="#10c7a1" />
          <ContextButton active={contextType === 'finance'} onClick={() => setContextType('finance')} icon={Receipt}   label="Receipts & Bills"   color="#c8a84b" />
          <ContextButton active={contextType === 'medical'} onClick={() => setContextType('medical')} icon={Activity}  label="Medical Reports"    color="#ff4d7d" />
        </div>

        {/* Upload + Results */}
        <div className="grid gap-8 md:grid-cols-2 mb-8">

          {/* Uploader */}
          <div className="flex flex-col gap-4">
            <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFileSelect(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-80 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2rem] border-2 border-dashed border-white/20 bg-white/5 transition-all hover:border-[#7b61ff]/50 hover:bg-white/8">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])} />
              <AnimatePresence mode="wait">
                {preview ? (
                  <motion.img key="prev" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    src={preview} alt="Preview" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                ) : (
                  <motion.div key="placeholder" className="flex flex-col items-center text-white/30">
                    <FileText className="mb-4 h-12 w-12" />
                    <p className="font-semibold">Drag & drop an image</p>
                    <p className="text-xs">or click to browse</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {file && (
              <div className="flex gap-3">
                <button onClick={clearSelection} disabled={isAnalyzing} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-sm transition hover:bg-white/10 disabled:opacity-50">
                  Clear
                </button>
                <button onClick={handleAnalyze} disabled={isAnalyzing}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#7b61ff] px-4 py-3 font-bold text-sm shadow-lg transition hover:bg-[#6345ed] disabled:opacity-50">
                  {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Analyze Image</>}
                </button>
              </div>
            )}

            {/* Receipt Timeline */}
            {contextType === 'finance' && <ReceiptTimeline saves={sessionSaves} />}
          </div>

          {/* Results */}
          <div className={`flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f1320]/80 p-6 shadow-2xl backdrop-blur-xl`}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white/80">
              <CheckCircle className="h-4 w-4 text-[#7df3cc]" /> Extracted Data
            </h2>

            {!result && !isAnalyzing && (
              <div className="flex h-full items-center justify-center text-center text-sm text-white/30">
                <div>
                  <UploadCloud className="h-10 w-10 mx-auto mb-3 text-white/20" />
                  Upload an image to begin analysis
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="flex h-full flex-col items-center justify-center text-[#7b61ff]">
                <Loader2 className="h-10 w-10 animate-spin" />
                <p className="mt-4 animate-pulse text-sm font-semibold">Gemini AI processing...</p>
              </div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-4 overflow-y-auto">
                {contextType === 'food'    && <ResultRow label="Food Name"     value={result.foodName} />}
                {contextType === 'finance' && <ResultRow label="Vendor"        value={result.vendorName} />}
                {contextType === 'medical' && <ResultRow label="Document Type" value={result.documentType} />}

                <div className="grid grid-cols-2 gap-3">
                  {contextType === 'food' && (
                    <>
                      <ResultBox label="Calories" value={`${result.calories} kcal`} color="#10c7a1" />
                      <ResultBox label="Protein"  value={`${result.protein}g`}      color="#3b82f6" />
                      <ResultBox label="Carbs"    value={`${result.carbs}g`}        color="#f59e0b" />
                      <ResultBox label="Fat"      value={`${result.fat}g`}          color="#ef4444" />
                    </>
                  )}
                  {contextType === 'finance' && (
                    <>
                      <ResultBox label="Amount"   value={`₹${result.totalAmount}`} color="#c8a84b" />
                      <ResultBox label="Category" value={result.category}          color="#7b61ff" />
                    </>
                  )}
                </div>

                {contextType === 'medical' && (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Deficiencies</p>
                      {result.detectedDeficiencies?.map((d, i) => <div key={i} className="text-sm text-[#ff4d7d]">• {d}</div>)}
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">Medications</p>
                      {result.medications?.map((m, i) => <div key={i} className="text-sm text-[#10c7a1]">• {m}</div>)}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-[#7b61ff]/30 bg-[#7b61ff]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#7b61ff] mb-1">AI Observation</p>
                  <p className="text-sm text-white/90">{result.advice || result.type}</p>
                </div>

                {/* Active goal linkage indicator */}
                {activeGoals.length > 0 && (
                  <div className="rounded-xl border border-[#10c7a1]/20 bg-[#10c7a1]/8 px-4 py-3 flex items-center gap-2 text-xs text-[#10c7a1]">
                    <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
                    Saving will auto-update matching goals ({activeGoals.length} active)
                  </div>
                )}

                <button onClick={handleSaveToDashboard} disabled={isSaving}
                  className="mt-auto w-full rounded-xl bg-gradient-to-r from-[#10c7a1] to-[#7df3cc] py-4 font-bold text-black shadow-[0_0_20px_rgba(16,199,161,0.3)] transition hover:scale-[1.02] disabled:opacity-50">
                  {isSaving ? 'Syncing & Updating Goals...' : 'Save to Dashboard & Claim XP'}
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* ── Oracle Terminal with Chat History ── */}
        <section className="rounded-[2rem] border border-white/10 bg-[#0c1018]/90 p-6 shadow-2xl backdrop-blur-xl">
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#7b61ff]/20 p-2.5 text-[#7b61ff]">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Twin Copilot Oracle</h2>
                <p className="text-xs text-white/40">
                  {activeGoals.length > 0 ? `${activeGoals.length} active goals loaded as context` : 'Simulate decisions across all life domains'}
                </p>
              </div>
            </div>
            {chatHistory.length > 0 && (
              <button onClick={() => setChatHistory([])}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/60 hover:text-white transition">
                <RefreshCw className="h-3.5 w-3.5" /> Clear Chat
              </button>
            )}
          </header>

          {/* Chat History */}
          {chatHistory.length > 0 && (
            <div className="mb-5 max-h-96 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {chatHistory.map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {isConsulting && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10c7a1]/20 text-[#10c7a1]">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="h-2 w-2 rounded-full bg-[#7b61ff]"
                          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Follow-up chips */}
          <AnimatePresence>
            {followUps.length > 0 && !isConsulting && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4 flex gap-2 flex-wrap">
                {followUps.map((chip, i) => (
                  <button key={i} onClick={() => handleAskOracle(chip)}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white hover:border-white/25">
                    <ChevronRight className="h-3 w-3" /> {chip}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAskOracle()}
                placeholder={isListening ? 'Listening... speak now.' : chatHistory.length === 0 ? 'e.g., Should I buy gold right now based on my savings goal?' : 'Ask a follow-up...'}
                className={`w-full rounded-xl border p-4 pr-14 text-sm text-white placeholder-white/25 bg-white/5 focus:outline-none transition-colors ${
                  isListening ? 'border-[#ff4d7d]/50 bg-[#ff4d7d]/5' : 'border-white/10 focus:border-[#7b61ff]'}`}
                disabled={isConsulting} />
              <button type="button" onClick={toggleListening} disabled={isConsulting}
                className={`absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                  isListening ? 'bg-[#ff4d7d] text-white animate-pulse' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={() => handleAskOracle()} disabled={isConsulting || isListening || !chatInput.trim()}
              className="flex items-center justify-center rounded-xl bg-[#7b61ff] px-5 py-4 font-bold shadow-lg transition hover:bg-[#6345ed] disabled:opacity-40">
              {isConsulting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>

          {/* TTS button for last oracle response */}
          {chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'assistant' && (
            <div className="mt-3 flex justify-end">
              <button onClick={() => {
                const last = chatHistory[chatHistory.length - 1].content;
                handleSpeak(`${last.verdict}. ${last.action || ''}`);
              }} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/50 hover:text-white transition">
                {isSpeaking ? <StopCircle className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {isSpeaking ? 'Stop' : 'Read aloud'}
              </button>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ContextButton({ active, onClick, icon: Icon, label, color }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
        active ? 'bg-white/10 shadow-lg' : 'bg-transparent text-white/40 hover:bg-white/5 hover:text-white'}`}
      style={{ border: active ? `1px solid ${color}` : '1px solid transparent', color: active ? color : undefined }}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function ResultRow({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
      <span className="text-sm text-white/50">{label}</span>
      <span className="text-base font-bold text-white">{value || 'Unknown'}</span>
    </div>
  );
}

function ResultBox({ label, value, color }) {
  return (
    <div className="rounded-xl bg-white/5 p-4 text-center border-b-2" style={{ borderBottomColor: color }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value || '0'}</p>
    </div>
  );
}
