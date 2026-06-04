import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function UploadPanel({ isCollapsed }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get(`${API_BASE_URL}/api/ai/uploads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching upload history:', err);
    }
  };

  useEffect(() => {
    if (!isCollapsed) {
      fetchHistory();
    }
  }, [isCollapsed]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    const toastId = toast.loading(`Uploading & extracting ${file.name}...`);

    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_BASE_URL}/api/ai/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.data.success) {
        toast.success(`Successfully sync'd ${file.name}!`, { id: toastId });
        
        // Notify dashboard context and others to refresh
        window.dispatchEvent(new CustomEvent('upload-history-updated'));
        fetchHistory();
      } else {
        toast.error(res.data.message || 'Failed to extract data.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error processing document.', { id: toastId });
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getDomainColor = (domain) => {
    switch (domain) {
      case 'health': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'finance': return 'text-[#c8a84b] bg-[#c8a84b]/10 border-[#c8a84b]/20';
      case 'career': return 'text-[#7b61ff] bg-[#7b61ff]/10 border-[#7b61ff]/20';
      default: return 'text-white/60 bg-white/5 border-white/10';
    }
  };

  const renderExtractedDetails = (upload) => {
    const { domain, extractedData } = upload;
    if (!extractedData) return null;

    if (domain === 'finance') {
      const isMF = upload.extractedData.subType === 'mutual_fund';
      return (
        <div className="space-y-1 text-xs text-white/70">
          {isMF ? (
            <>
              <div><span className="font-semibold text-white">Portfolio Value:</span> ₹{(extractedData.portfolioValue || 0).toLocaleString()}</div>
              <div><span className="font-semibold text-white">Returns:</span> {extractedData.returns}%</div>
              {extractedData.holdings && (
                <div className="mt-1 pl-2 border-l border-white/10">
                  <div className="text-[10px] font-bold text-white/40 uppercase">Holdings</div>
                  {extractedData.holdings.slice(0, 3).map((h, i) => (
                    <div key={i} className="truncate">• {h.assetName} (₹{h.value?.toLocaleString()})</div>
                  ))}
                  {extractedData.holdings.length > 3 && <div className="text-[10px] text-white/40">• and {extractedData.holdings.length - 3} more</div>}
                </div>
              )}
            </>
          ) : (
            <>
              <div><span className="font-semibold text-white">Spent:</span> ₹{extractedData.moneySpent || 0}</div>
              <div><span className="font-semibold text-white">Credited:</span> ₹{extractedData.moneyCredited || 0}</div>
              {extractedData.transactions && (
                <div className="mt-1 pl-2 border-l border-white/10">
                  <div className="text-[10px] font-bold text-white/40 uppercase">Transactions</div>
                  {extractedData.transactions.slice(0, 3).map((t, i) => (
                    <div key={i} className="truncate">• ₹{t.amount} ({t.category}) - <span className={t.type === 'income' ? 'text-emerald-400' : 'text-[#ff4d7d]'}>{t.type}</span></div>
                  ))}
                  {extractedData.transactions.length > 3 && <div className="text-[10px] text-white/40">• and {extractedData.transactions.length - 3} more</div>}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (domain === 'health') {
      return (
        <div className="space-y-1 text-xs text-white/70">
          {extractedData.deficiencies && extractedData.deficiencies.length > 0 && (
            <div><span className="font-semibold text-white">Deficiencies:</span> {extractedData.deficiencies.join(', ')}</div>
          )}
          {extractedData.medications && extractedData.medications.length > 0 && (
            <div><span className="font-semibold text-white">Medications:</span> {extractedData.medications.join(', ')}</div>
          )}
          {extractedData.vitals && (
            <div className="mt-1 pl-2 border-l border-white/10">
              <div className="text-[10px] font-bold text-white/40 uppercase">Vitals</div>
              {extractedData.vitals.systolic && <div>• Blood Pressure: {extractedData.vitals.systolic}/{extractedData.vitals.diastolic} mmHg</div>}
              {extractedData.vitals.heartRate && <div>• Heart Rate: {extractedData.vitals.heartRate} bpm</div>}
              {extractedData.vitals.bloodSugar && <div>• Blood Sugar: {extractedData.vitals.bloodSugar} mg/dL</div>}
            </div>
          )}
        </div>
      );
    }

    if (domain === 'career') {
      return (
        <div className="space-y-1 text-xs text-white/70">
          {extractedData.studyHours > 0 && <div><span className="font-semibold text-white">Study Hours:</span> {extractedData.studyHours}h</div>}
          {extractedData.completedCourses > 0 && <div><span className="font-semibold text-white">Completed Courses:</span> {extractedData.completedCourses}</div>}
          {extractedData.githubCommits > 0 && <div><span className="font-semibold text-white">GitHub Commits:</span> {extractedData.githubCommits}</div>}
          {extractedData.projectsCompleted > 0 && <div><span className="font-semibold text-white">Projects Worked On:</span> {extractedData.projectsCompleted}</div>}
        </div>
      );
    }

    return null;
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <button
          onClick={onButtonClick}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
          title="Upload Twin Documents"
        >
          <UploadCloud className="h-5 w-5" />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx"
            onChange={handleChange}
            disabled={uploading}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 relative overflow-hidden backdrop-blur-md">
      {/* Upload Zone */}
      <form 
        onDragEnter={handleDrag} 
        onDragOver={handleDrag} 
        onDragLeave={handleDrag} 
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 px-4 text-center transition-all duration-300 cursor-pointer
          ${dragActive ? 'border-primary-500 bg-primary-500/5 shadow-[0_0_15px_rgba(123,97,255,0.25)]' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.01]'}`}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.doc,.docx"
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#10c7a1] border-t-transparent" />
            <p className="text-xs font-semibold text-white/70">Syncing Twin Signal…</p>
          </div>
        ) : (
          <>
            <UploadCloud className={`h-8 w-8 mb-2 transition-transform duration-300 ${dragActive ? 'scale-110 text-primary-400' : 'text-white/40'}`} />
            <p className="text-xs font-semibold text-white/80">Upload documents</p>
            <p className="text-[10px] text-white/45 mt-1 font-medium">PDF, Excel, CSV, Image, Word</p>
          </>
        )}
      </form>

      {/* History List */}
      {history.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/8 pt-3 max-h-48 overflow-y-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
            <Clock className="w-3.5 h-3.5" /> Extraction History
          </div>
          <div className="flex flex-col gap-1.5">
            {history.map((upload) => {
              const isExpanded = expandedId === upload._id;
              const dateStr = new Date(upload.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              return (
                <div 
                  key={upload._id}
                  className="rounded-lg border border-white/5 bg-black/20 overflow-hidden transition-all duration-300"
                >
                  {/* Header Row */}
                  <div 
                    onClick={() => toggleExpand(upload._id)}
                    className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-3.5 w-3.5 text-white/50 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-white/90 truncate">{upload.fileName}</div>
                        <div className="text-[9px] text-white/40">{dateStr}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${getDomainColor(upload.domain)}`}>
                        {upload.domain}
                      </span>
                      {isExpanded ? <ChevronUp className="h-3 w-3 text-white/40" /> : <ChevronDown className="h-3 w-3 text-white/40" />}
                    </div>
                  </div>

                  {/* Expanded Extraction Inspector */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-white/5 bg-white/[0.01] p-2.5"
                      >
                        <div className="flex items-center gap-1 text-[9px] font-black text-[#10c7a1] uppercase tracking-wider mb-2">
                          <Sparkles className="w-3 h-3" /> Extracted Structured Signals
                        </div>
                        {renderExtractedDetails(upload)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
