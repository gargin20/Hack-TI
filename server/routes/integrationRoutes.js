import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getGithubIntegration, getLeetcodeIntegration, postLinkedinIntegration } from '../controllers/integrationController.js';

const router = express.Router();

// Helper to simulate network delay
const simulateNetwork = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. HEALTH: Simulate Apple Health / Fitbit API
// ── PASTE THIS INTO YOUR backend/routes/integrations.js ──────────────────────
// Replace the existing router.get('/health', ...) block with this.
// The only change: Math.random() → seeded deterministic values based on today's date.
// This means the numbers stay the same for a full day (convincing demo),
// but change the next day (feels alive over time).

router.get('/health', authenticateToken, async (req, res) => {
  await simulateNetwork(800); // reduced from 1500ms for snappier UX

  // Seed from today's date + userId so values are stable within a day
  // but different per user and change daily.
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const userId = String(req.user?.userId || 'default');
  const seed = parseInt(today, 10) + userId.charCodeAt(0) + (userId.charCodeAt(1) || 0);

  // Simple seeded pseudo-random (no library needed)
  const rng = (offset, min, max) => {
    const x = Math.sin(seed + offset) * 10000;
    const t = x - Math.floor(x); // 0..1
    return Math.floor(t * (max - min + 1)) + min;
  };

  const steps        = rng(1, 5500, 11800);
  const sleepRaw     = (rng(2, 45, 85) / 10).toFixed(1);   // 4.5h – 8.5h
  const avgHeartRate = rng(3, 62, 84);
  const restingHR    = rng(4, 58, 78);
  const hrv          = rng(5, 32, 78);
  const activeCalories = rng(6, 280, 880);

  const mockHealthData = {
    source: 'Fitbit (Demo)',
    lastSync: new Date().toISOString(),
    metrics: {
      steps,
      activeCalories,
      sleepHours: sleepRaw,
      avgHeartRate,
      restingHeartRate: restingHR,
      hrv,
    },
  };

  res.status(200).json({ success: true, data: mockHealthData });
});

// 2. FINANCE: Simulate Banking API / Credit Score
router.get('/finance', authenticateToken, async (req, res) => {
  await simulateNetwork(2000); // 2s delay
  
  const mockFinanceData = {
    source: 'Plaid Banking',
    lastSync: new Date().toISOString(),
    creditScore: Math.floor(Math.random() * (850 - 650) + 650),
    
    // ✅ NEW: Smart Signals for cross-domain budget analysis
    accountBalance: 4250.75,
    metrics: {
      monthlySavingsRate: "12%",
      unusualSpikeDetected: true, 
    },
    
    // Existing transactions + Timestamps added for AI correlation
    recentTransactions: [
      { id: 'txn_1', vendor: 'Starbucks', amount: 5.40, category: 'food', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { id: 'txn_2', vendor: 'Netflix', amount: 15.99, category: 'entertainment', timestamp: new Date(Date.now() - 172800000).toISOString() },
      { id: 'txn_3', vendor: 'Tech Corp Salary', amount: 2500.00, category: 'income', timestamp: new Date(Date.now() - 432000000).toISOString() },
      // Added an impulse expense to give the AI something to complain about!
      { id: 'txn_4', vendor: 'UberEats Delivery', amount: 45.50, category: 'food', timestamp: new Date(Date.now() - 4000000).toISOString() } 
    ]
  };

  res.status(200).json({ success: true, data: mockFinanceData });
});

// 3. CAREER: Simulate GitHub / Coursera API
router.get('/career', authenticateToken, async (req, res) => {
  await simulateNetwork(1200); // 1.2s delay
  
  const mockCareerData = {
    source: 'GitHub & LinkedIn Connect',
    lastSync: new Date().toISOString(),
    
    // Existing metrics
    githubCommitsThisWeek: Math.floor(Math.random() * (45 - 5) + 5),
    topLanguages: ['JavaScript', 'Python', 'C++'],
    recentCertificates: ['Advanced React Patterns', 'GenAI Prompt Engineering'],
    
    // ✅ NEW: Smart Signals for burnout and upskilling detection
    linkedInProfileStrength: 'All-Star',
    hoursInMeetingsToday: (Math.random() * (6 - 1) + 1).toFixed(1),
    learning: {
      courseraActiveCourse: 'Advanced Machine Learning',
      courseProgress: '65%'
    }
  };

  res.status(200).json({ success: true, data: mockCareerData });
});
// ==========================================
// ONBOARDING VERIFICATION ROUTES
// ==========================================

router.get('/github/:username(*)', authenticateToken, getGithubIntegration);
router.get('/leetcode/:username(*)', authenticateToken, getLeetcodeIntegration);
router.post('/linkedin', authenticateToken, postLinkedinIntegration);
export default router;
