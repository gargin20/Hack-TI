import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Pause, Sparkles, Share2, Send, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const getPatternStyles = (pattern) => {
  switch (pattern) {
    case 'cosmic':
      return {
        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.08) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(236, 72, 153, 0.06) 0%, transparent 50%)',
        backgroundSize: '100% 100%',
      };
    case 'grid':
      return {
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      };
    case 'waves':
      return {
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 20%, transparent 20%, transparent 40%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0.01) 60%, transparent 60%)',
        backgroundSize: '40px 40px',
      };
    case 'glitch':
      return {
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.05) 0.5px, transparent 0.5px)',
        backgroundSize: '4px 4px',
      };
    case 'blueprint':
      return {
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      };
    case 'matrix':
      return {
        backgroundImage: 'radial-gradient(circle, rgba(245, 158, 11, 0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      };
    default:
      return {};
  }
};

export default function StandaloneReflectionStory({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [shareSuccess, setShareSuccess] = useState(false);

  const token = localStorage.getItem('authToken');
  const navigate = useNavigate();

  // Load reflection on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchReflection = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/intelligence/reflection`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && res.data.data) {
          setData(res.data.data);
          setCurrentIdx(0);
          setProgress(0);
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('Failed to load standalone twin reflection:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReflection();
  }, [isOpen, token]);

  // Handle 6-second auto-advancing slide timer with Play/Pause state
  useEffect(() => {
    if (!isOpen || !data?.slides || data.slides.length === 0 || loading) return;
    if (!isPlaying) return; // Freeze execution when paused

    const duration = 6000; // 6 seconds per slide
    const intervalTime = 50;
    const step = (100 / (duration / intervalTime));

    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          // If it is the final slide, freeze at 100% instead of auto-closing or moving forward
          if (currentIdx === data.slides.length - 1) {
            setIsPlaying(false);
            return 100;
          }
          handleNext();
          return 100;
        }
        return p + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, data, currentIdx, loading, isPlaying]);

  const handleNext = () => {
    if (data?.slides && currentIdx < data.slides.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setProgress(0);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setProgress(0);
    }
  };

  const handleShareClick = () => {
    if (!data) return;
    console.log('📤 Shared Standalone Twin Reflection Metadata:', data);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  const handleSyncToCopilot = () => {
    if (!data?.slides || data.slides.length < 6) return;
    const identitySlide = data.slides[5];
    const blueprintText = `I completed my standalone digital twin review as ${identitySlide.themeTitle || 'THE BUILDER'}. Blueprint details: ${identitySlide.messageFromTwin || 'optimize career velocity'}`;
    localStorage.setItem('copilotPresetPrompt', blueprintText);
    navigate('/copilot/');
    onClose();
  };

  if (!isOpen) return null;

  const slides = data?.slides || [];
  const currentSlide = slides[currentIdx];
  const accent = currentSlide?.visualTheme?.accent || '#a855f7';
  const patternStyle = currentSlide ? getPatternStyles(currentSlide.visualTheme.pattern) : {};

  // Custom renders for the 6 condensed layoutTypes
  const renderSlideContent = (slide) => {
    switch (slide.layoutType) {
      case 'verdict':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
            >
              <p className="text-xl sm:text-2xl font-black text-white leading-snug text-center italic">
                "{slide.mainText}"
              </p>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-gray-300 text-sm leading-relaxed text-center font-medium px-2"
            >
              {slide.narrative}
            </motion.p>
          </div>
        );

      case 'split':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm"
              >
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block mb-2">Gained</span>
                <ul className="space-y-1.5">
                  {slide.gained?.map((item, idx) => (
                    <li key={idx} className="text-xs text-white font-semibold flex items-start gap-1">
                      <span className="text-emerald-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm"
              >
                <span className="text-[10px] uppercase tracking-widest text-red-400 font-bold block mb-2">Paid Price</span>
                <ul className="space-y-1.5">
                  {slide.paidPrice?.map((item, idx) => (
                    <li key={idx} className="text-xs text-white font-semibold flex items-start gap-1">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-gray-300 text-sm leading-relaxed font-medium text-center"
            >
              {slide.narrative}
            </motion.p>
          </div>
        );

      case 'ripple':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center"
            >
              <span className="text-[9px] uppercase tracking-widest text-blue-400 font-bold">The Catalyst Habit</span>
              <div className="text-lg font-black text-white mt-1">{slide.catalystEvent}</div>
            </motion.div>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-500/20">
              {slide.rippleChain?.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="flex items-center gap-3 pl-8 relative"
                >
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-500 border border-black flex items-center justify-center">
                    <div className="h-1 w-1 rounded-full bg-white" />
                  </div>
                  <span className="text-xs text-white font-semibold">{step}</span>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-gray-300 text-xs sm:text-sm leading-relaxed font-medium"
            >
              {slide.narrative}
            </motion.p>
          </div>
        );

      case 'timeline':
        return (
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 10, delay: 0.2 }}
              className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-center backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-red-400 font-black">Projected Future Decay</span>
              <div className="text-3xl font-black text-red-500 tracking-tight mt-1">{slide.projectedDrop}</div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-gray-300 text-sm leading-relaxed font-medium text-center"
            >
              {slide.narrative}
            </motion.p>
          </div>
        );

      case 'manual':
        return (
          <div className="space-y-5">
            <div className="space-y-3 font-mono text-xs">
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between"
              >
                <span className="text-white/60">Peak Focus:</span>
                <span className="text-white font-bold">{slide.rules?.peakFocus}</span>
              </motion.div>

              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between"
              >
                <span className="text-white/60">Stress Trigger:</span>
                <span className="text-white font-bold">{slide.rules?.stressTrigger}</span>
              </motion.div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-gray-300 text-xs leading-relaxed font-medium"
            >
              {slide.narrative}
            </motion.p>
          </div>
        );

      case 'final':
        return (
          <div className="space-y-6 text-center">
            {/* Archetype Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-block px-6 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-400 font-extrabold text-base tracking-wide uppercase"
            >
              👑 {slide.themeTitle}
            </motion.div>

            {/* Narrative */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-gray-300 text-xs leading-relaxed font-medium px-2"
            >
              {slide.narrative}
            </motion.p>

            {/* Voice of Twin Blockquote */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="p-3.5 rounded-xl bg-white/5 border border-white/10 italic text-white/80 text-[11px] text-center border-l-4"
              style={{ borderLeftColor: accent }}
            >
              "{slide.messageFromTwin}"
            </motion.div>

            {/* Premium Glassmorphic Summary Card */}
            <motion.div
              initial={{ y: 25, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-4 shadow-xl z-40 relative text-left"
            >
              <div>
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold block font-mono">Stand-alone Identity Blueprint</span>
                <h4 className="text-sm font-black text-white mt-1 uppercase tracking-tight">{slide.themeTitle}</h4>
                <p className="text-xs text-gray-300 mt-1 italic">
                  "{slides[0]?.mainText || 'Sacrificing comfort for growth.'}"
                </p>
              </div>

              {/* Action layout */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleShareClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs hover:opacity-90 transition-all shadow-md shadow-black/25 cursor-pointer border border-white/10"
                >
                  <Share2 className="h-3.5 w-3.5" /> 
                  {shareSuccess ? 'Metadata Logged!' : 'Share Reflection'}
                </button>
                <button
                  onClick={handleSyncToCopilot}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-extrabold text-xs hover:bg-white/90 transition-all shadow-md shadow-black/25 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Sync Blueprint to Copilot
                </button>
              </div>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020308]/98 p-0 sm:p-4">
      {/* 1. Background Gradient (Fades in smoothly) */}
      <AnimatePresence mode="wait">
        {currentSlide && (
          <motion.div
            key={`bg-${currentIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={`absolute inset-0 bg-gradient-to-tr ${currentSlide.visualTheme.bgGradient} transition-all duration-700`}
          />
        )}
      </AnimatePresence>

      {/* Main Slide Card Container */}
      <div
        className="relative w-full max-w-[460px] aspect-[9/16] max-h-[100vh] sm:max-h-[90vh] border rounded-none sm:rounded-[2.5rem] overflow-hidden flex flex-col justify-between shadow-2xl p-6 z-10 transition-colors duration-500 bg-[#000000]/25 backdrop-blur-sm"
        style={{ borderColor: `${accent}25` }}
      >
        {/* Dynamic Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none transition-all duration-500 z-0"
          style={patternStyle}
        />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10">
            <span className="h-10 w-10 border-2 border-white/20 border-t-white rounded-full animate-spin" style={{ borderTopColor: accent }} />
            <h3 className="text-lg font-bold text-white tracking-tight animate-pulse">
              Synthesizing Identity Theme...
            </h3>
            <p className="text-xs text-gray-500">Compiling 6-slide reflection parameters.</p>
          </div>
        ) : !currentSlide ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4 relative z-10">
            <AlertTriangle className="h-10 w-10 text-amber-500 animate-bounce" />
            <h3 className="text-lg font-bold text-white">Reflection Awaiting Data</h3>
            <p className="text-xs text-gray-400">Please establish data integrations or enter check-ins to run the standalone reflection engine.</p>
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-all text-xs">Close</button>
          </div>
        ) : (
          <>
            {/* Top progress indicator bars */}
            <div className="flex gap-1 w-full mb-6 pointer-events-none relative z-30">
              {slides.map((slide, idx) => (
                <div key={slide.slideId} className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: idx < currentIdx ? '100%' : idx === currentIdx ? `${progress}%` : '0%',
                      background: accent,
                      transitionDuration: isPlaying && idx === currentIdx ? '50ms' : '0ms'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Slide Header with persistent CLOSE & PLAY/PAUSE */}
            <div className="flex items-center justify-between w-full relative z-40">
              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/50">
                <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} /> Twin Reflection
              </span>

              <div className="flex items-center gap-3">
                {/* Play/Pause Toggle button */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-7 w-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                  title={isPlaying ? "Pause Story" : "Resume Story"}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                </button>

                {/* Persistent high-contrast Close button */}
                <button
                  onClick={onClose}
                  className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center border border-white/20 text-white hover:scale-105 transition-all cursor-pointer shadow-md"
                  title="Close Presentation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Slide Body */}
            <div className="flex-1 flex flex-col justify-center relative my-4 z-20">
              {/* Split Screen Navigation Zones (left 30% / right 70%) */}
              <div 
                className="absolute inset-y-0 left-0 w-[30%] cursor-w-resize z-30" 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }} 
              />
              <div 
                className="absolute inset-y-0 right-0 w-[70%] cursor-e-resize z-30" 
                onClick={(e) => {
                  // Ensure we are not clicking onto the Share button or Sync to Copilot button inside Slide 6
                  const isActionButton = e.target.closest('button');
                  if (!isActionButton) {
                    handleNext();
                  }
                }} 
              />

              <div className="space-y-4 select-none relative z-10">
                {/* Chapter & Title */}
                <motion.div
                  key={`chapter-${currentIdx}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex flex-col gap-1 text-center"
                >
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40 font-mono">
                    {currentSlide.chapter}
                  </span>
                  <span className="text-base sm:text-lg font-black uppercase tracking-tight" style={{ color: accent }}>
                    {currentSlide.heading}
                  </span>
                </motion.div>

                {/* Main Dynamic Layout Component */}
                <div className="py-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`layout-${currentIdx}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.4 }}
                    >
                      {renderSlideContent(currentSlide)}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Slide Footer */}
            <div className="flex justify-between items-center w-full relative z-40 border-t border-white/5 pt-4">
              <button
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider transition-all ${currentIdx === 0 ? 'opacity-20 cursor-not-allowed' : 'text-white/50 hover:text-white cursor-pointer'}`}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>

              <span className="text-[9px] font-mono text-white/30">
                Slide {currentIdx + 1} of {slides.length} { !isPlaying && currentIdx === slides.length - 1 ? '• FINISHED' : !isPlaying ? '• PAUSED' : ''}
              </span>

              <button
                onClick={handleNext}
                disabled={currentIdx === slides.length - 1}
                className={`flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider transition-all ${currentIdx === slides.length - 1 ? 'opacity-20 cursor-not-allowed' : 'text-white/50 hover:text-white cursor-pointer'}`}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
