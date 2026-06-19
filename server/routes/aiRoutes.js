import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { runDiagnostics, getLatestReport } from '../controllers/intelligenceController.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

import VisionAIService      from '../services/VisionAIService.js';
import { authenticateToken } from '../middleware/auth.js';
import GamificationProfile   from '../models/GamificationProfile.js';
import DailyTracking        from '../models/DailyTracking.js';
import CopilotOracleService from '../services/CopilotOracleService.js';
import SmartGoal            from '../models/SmartGoal.js';

import DocumentExtractionService from '../services/DocumentExtractionService.js';
import { recalculateScoresAfterUpload } from '../services/ScoreRecalculationService.js';
import { emitDashboardSync, createNotification } from '../services/notificationService.js';
import { buildDashboardResponse } from '../controllers/onboardingController.js';
import OnboardingProfile from '../models/OnboardingProfile.js';
import Upload from '../models/Upload.js';

const router  = express.Router();
const storage = multer.memoryStorage();
const upload  = multer({ storage });

// ── /analyze — UNCHANGED ──────────────────────────────────────────
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }
    const contextType = req.body.contextType;
    const base64Data  = req.file.buffer.toString('base64');
    const mimeType    = req.file.mimetype;

    const aiAnalysis = await VisionAIService.analyzeImage(mimeType, base64Data, contextType);
    if (!aiAnalysis) {
      return res.status(500).json({ success: false, message: 'AI failed to process the image.' });
    }
    res.status(200).json({ success: true, data: aiAnalysis });
  } catch (error) {
    console.error('AI Analyze Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── /save — UPDATED: attaches prevSnapshot before save() ─────────
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contextType, extractedData } = req.body;

    const today    = new Date().toISOString().split('T')[0];
    let dailyLog   = await DailyTracking.findOne({ userId, dateString: today });
    if (!dailyLog) dailyLog = new DailyTracking({ userId, dateString: today });

    // ── Snapshot BEFORE mutation so GoalSyncEngine gets the delta ──
    dailyLog._prevSnapshot = {
      health:  { ...dailyLog.health.toObject?.() ?? { ...dailyLog.health } },
      finance: { ...dailyLog.finance.toObject?.() ?? { ...dailyLog.finance } },
    };

    let eventName = '';

    if (contextType === 'food') {
      eventName = 'AI_MEAL_LOGGED';
      dailyLog.health.caloriesConsumed += (extractedData.calories || 0);
      dailyLog.health.proteinConsumed  += (extractedData.protein  || 0);
    } else if (contextType === 'finance') {
      eventName = 'AI_RECEIPT_LOGGED';
      if (extractedData.type === 'expense') {
        dailyLog.finance.moneySpent    += (extractedData.totalAmount || 0);
      } else {
        dailyLog.finance.moneyCredited += (extractedData.totalAmount || 0);
      }
    } else if (contextType === 'medical') {
      eventName = 'AI_MEDICAL_LOGGED';
    }

    console.log(`[aiRoutes] /save: saving DailyTracking dailyLog for userId=${userId}`);
    dailyLog._skipGoalSync = true;
    await dailyLog.save();

    console.log(`[aiRoutes] /save: executing explicit GoalSyncEngine`);
    const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');
    const goalsUpdated = await GoalSyncEngine.syncGoalsFromDailyLog(
      userId,
      dailyLog,
      dailyLog._prevSnapshot || null
    );

    const addedVal = Number(extractedData?.calories || extractedData?.totalAmount || extractedData?.amount || extractedData?.value || 1);
    console.log(`[aiRoutes] /save: calling GamificationService.evaluateRules`);
    const { default: GamificationService } = await import('../services/GamificationService.js');
    const gamificationResult = await GamificationService.evaluateRules(userId);

    const profile = await GamificationProfile.findOne({ userId });
    const totalXP = profile ? profile.totalXP : 0;
    res.status(200).json({
      success:      true,
      message:      'Data synchronized with Digital Twin.',
      gamification: gamificationResult,
      totalXP,
      goalProgress: goalsUpdated,
      goalsUpdated,
      dailyLog,
    });
  } catch (error) {
    console.error('AI Save Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── /consult — UPDATED: injects active goals as Oracle context ────
router.post('/consult', authenticateToken, async (req, res) => {
  try {
    const userId       = req.user.userId;
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }

    const activeGoals = await SmartGoal.find({ userId, status: { $ne: 'completed' } })
      .select('domain title currentMetric targetMetric unit priority deadline')
      .lean();

    const goalsContext = activeGoals.length > 0
      ? `\n\nUser's active goals:\n${activeGoals.map(g =>
          `- [${g.domain.toUpperCase()}] "${g.title}": ${g.currentMetric}/${g.targetMetric} ${g.unit} (${g.priority} priority, due ${new Date(g.deadline).toLocaleDateString()})`
        ).join('\n')}`
      : '';

    const advice = await CopilotOracleService.generateCrossDomainAdvice(
      userId,
      question + goalsContext
    );

    res.status(200).json({ success: true, advice });
  } catch (error) {
    console.error('Consult Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── /synthesis ───────────────────────────────────────────────────
const delay = (ms) => new Promise(r => setTimeout(r, ms));

router.post('/synthesis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { healthData, financeData, careerData } = req.body;

    const profile = await OnboardingProfile.findOne({ userId }).lean() || {};
    const today = new Date().toISOString().split('T')[0];
    const dailyLog = await DailyTracking.findOne({ userId, dateString: today }).lean() || { health: {}, finance: {}, career: {} };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `
      You are the LifeTwin Autonomous Intelligence Engine. 
      Your job is to perform Cross-Domain Synthesis on the user's raw API data and real database logs.

      You must look for correlations. For example:
      - Does poor sleep (Health) correlate with high fast-food spending (Finance)?
      - Does high GitHub activity (Career) correlate with low active calories (Health)?
      
      Generate exactly 3 highly actionable, empathetic insights based on the provided data.
      You MUST return ONLY valid, raw JSON (no markdown formatting, no backticks).
      
      JSON STRUCTURE REQUIRED:
      [
        {
          "title": "A punchy, 3-4 word title (e.g., 'Sleep vs. Spending Risk')",
          "domainTags": ["Health", "Finance"],
          "observation": "1 sentence describing the correlation found in the data.",
          "action": "1 specific, immediate step the user should take today.",
          "isPositive": boolean
        }
      ]

      RAW USER DATA TO ANALYZE (FROM INTEGRATIONS):
      - Health Metrics: ${JSON.stringify(healthData)}
      - Financial Records: ${JSON.stringify(financeData)}
      - Career Goals: ${JSON.stringify(careerData)}

      USER REAL PROFILE & DAILY LOGS DATABASE CONTEXT:
      - Target Sleep Hours: ${profile.sleepHours || 7}h/night
      - Target Study Hours: ${profile.studyHours || 4}h/day
      - Exercise Frequency: ${profile.exerciseFrequency || 2} times/week
      - Spending Style: ${profile.spendingStyle || 'balanced'}
      - Savings Habit: ${profile.savingsHabit || 'moderate'}
      - Financial Stress Level: ${profile.financialStressLevel || 5}/10
      - Burnout Risk Score: ${profile.burnoutRisk || 45}%
      - Productivity Score: ${profile.productivityScore || 60}/100
      - Wellness Balance: ${profile.wellnessBalance || 50}/100
      - Today's Logged Sleep: ${dailyLog.health?.sleepHours || 0}h
      - Today's Logged Water: ${dailyLog.health?.waterLiters || 0}L
      - Today's Logged Stress Level: ${dailyLog.health?.stressLevel || 'not logged'}
      - Today's Logged Money Spent: $${dailyLog.finance?.moneySpent || 0}
      - Today's Logged Study Hours: ${dailyLog.career?.studyHours || 0}h
      - Today's GitHub Commits: ${dailyLog.career?.githubCommits || 0}
    `;

    const demoFallbackInsights = [
      {
        "title": "Sleep vs. Spending Risk",
        "domainTags": ["Health", "Finance"],
        "observation": `Your today's sleep of ${dailyLog.health?.sleepHours || healthData?.metrics?.sleepHours || profile.sleepHours || 7}h vs your target of ${profile.sleepHours || 7}h correlates with your ${profile.spendingStyle || 'balanced'} spending style.`,
        "action": "Prioritize a solid 8 hours of rest tonight to avoid impulse decisions.",
        "isPositive": false
      },
      {
        "title": "Deep Work Momentum",
        "domainTags": ["Career", "Health"],
        "observation": `You have maintained a coding consistency score of ${profile.codingConsistency || 50}% while keeping your burnout risk at ${profile.burnoutRisk || 45}%.`,
        "action": "Maintain your steady pace. Continue balancing code commits with restful sleep.",
        "isPositive": true
      },
      {
        "title": "Finance and Wellness Alert",
        "domainTags": ["Finance", "Health"],
        "observation": `Your financial stress is rated ${profile.financialStressLevel || 5}/10, which can impact your overall wellness balance of ${profile.wellnessBalance || 60}%.`,
        "action": "Set a micro-budget for entertainment this week to lower your financial stress.",
        "isPositive": false
      }
    ];

    let result;
    let retries = 1;

    while (retries >= 0) {
      try {
        result = await model.generateContent(systemPrompt);
        break;
      } catch (apiError) {
        if (apiError.status === 429 || apiError.status === 503) {
          console.warn('⚠️ Gemini API Limit Hit! Activating Demo Fallback...');
          return res.status(200).json({ success: true, insights: demoFallbackInsights });
        }
        if (retries > 0) { await delay(2000); retries--; }
        else throw apiError;
      }
    }

    const responseText  = result.response.text();
    const cleanedText   = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedInsights = JSON.parse(cleanedText);

    res.status(200).json({ success: true, insights: parsedInsights });

  } catch (error) {
    console.error('Synthesis AI Error:', error);
    res.status(200).json({
      success: true,
      insights: [{
        "title": "System Rebooting",
        "domainTags": ["System"],
        "observation": "The AI is currently recalibrating your data streams.",
        "action": "Please check back in a few minutes.",
        "isPositive": false
      }]
    });
  }
});

// ── /career-debrief ──────────────────────────────────────────────
router.post('/career-debrief', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { activeDomain } = req.body;

    const profile = await OnboardingProfile.findOne({ userId }).lean();
    if (!profile) {
      return res.status(200).json({
        success: true,
        debrief: "Welcome! Once you complete the onboarding steps, your Digital Twin will generate a custom career debrief right here."
      });
    }

    const domainLabel = activeDomain === 'coding' ? 'Software & Coding' : activeDomain === 'business' ? 'Business & MBA' : 'Creative & Design';
    const momentum = profile.careerMomentum || 0;
    const consistency = profile.codingConsistency || 0;
    const burnout = profile.burnoutRisk || 0;
    const productivity = profile.productivityScore || 0;
    const growth = profile.professionalGrowthScore || 0;
    const study = profile.studyHours || 4;
    const sleep = profile.sleepHours || 7;
    const gh = profile.githubData || {};
    const lc = profile.leetcodeData || {};
    const li = profile.linkedinData || {};

    const fallbackDebriefText = (() => {
      let s1 = `Your ${domainLabel} trajectory shows a stable career momentum score of ${momentum}% with daily study blocks averaging ${study} hours.`;
      if (profile.githubUsername && gh.recentActivityCount !== undefined) {
        s1 = `Your GitHub profile shows ${gh.recentActivityCount} recent commits alongside a consistent coding score of ${consistency}%.`;
      }
      
      let s2 = `With burnout risk at ${burnout}%, you are managing stress levels well, but sleep debt remains a minor risk.`;
      if (burnout > 65) {
        s2 = `With your burnout risk currently elevated at ${burnout}%, fatigue from intense study hours is the single biggest risk to your long-term focus.`;
      } else if (consistency > 0 && consistency < 45) {
        s2 = `Your biggest opportunity is to increase your consistency score from ${consistency}% by establishing a smaller, daily code routine.`;
      }
      
      let s3 = `This week, cap your study sessions at ${Math.min(6, study + 1)} hours and protect a solid ${sleep || 7}-hour sleep window to maximize focus.`;
      if (burnout > 65) {
        s3 = `For this week, reduce your study blocks to ${Math.max(2, study - 1)} hours and focus on a strict screens-off policy after 10:30 PM.`;
      }
      
      return `${s1} ${s2} ${s3}`;
    })();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `
      You are a direct, warm career coach inside a Digital Twin app. Speak in second person.
      Write EXACTLY 3 sentences. No lists, no headers, no markdown formatting.
      Sentence 1: Summarise what the data says about their career trajectory today — use specific numbers from the user data if available.
      Sentence 2: Name the single biggest opportunity or risk in their career right now.
      Sentence 3: Give one concrete, high-leverage action for this week.

      USER DATA:
      - Career domain: ${domainLabel}
      - Burnout risk: ${burnout}%
      - Productivity score: ${productivity}/100
      - Coding consistency: ${consistency}/100
      - Career momentum: ${momentum}/100
      - Professional growth: ${growth}/100
      ${profile.githubUsername ? `- GitHub: ${gh.recentActivityCount || 0} recent commits, ${gh.publicRepos || 0} public repos, ${gh.followers || 0} followers.` : '- GitHub not connected.'}
      ${profile.leetcodeUsername ? `- LeetCode: ${lc.totalSolved || 0} problems solved, ${lc.acceptanceRate || 0}% acceptance.` : '- LeetCode not connected.'}
      ${profile.linkedinProfile ? `- LinkedIn profile strength: ${li.profileStrength || 0}%.` : '- LinkedIn not connected.'}
      - Daily Study Hours: ${study} hours/day
      - Daily Sleep Hours: ${sleep} hours/night
    `;

    let result;
    let retries = 1;

    while (retries >= 0) {
      try {
        result = await model.generateContent(systemPrompt);
        break;
      } catch (apiError) {
        if (apiError.status === 429 || apiError.status === 503) {
          console.warn('⚠️ Gemini API Limit Hit in career debrief! Activating Demo Fallback...');
          return res.status(200).json({ success: true, debrief: fallbackDebriefText });
        }
        if (retries > 0) {
          await delay(2000);
          retries--;
        } else {
          return res.status(200).json({ success: true, debrief: fallbackDebriefText });
        }
      }
    }

    const text = result?.response?.text()?.trim() || fallbackDebriefText;
    res.status(200).json({ success: true, debrief: text });

  } catch (error) {
    console.error('Career Debrief Endpoint Error:', error);
    res.status(500).json({ success: false, message: 'Server Error generating career debrief.' });
  }
});

// ── /upload — NEW: Handles PDF/Excel/CSV/Word/Image uploads ─────────
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const userId = req.user.userId;
    const fileName = req.file.originalname;
    const fileMimeType = req.file.mimetype;
    const fileBuffer = req.file.buffer;

    // AI Extraction
    const extractedData = await DocumentExtractionService.extractDocumentData(fileBuffer, fileName, fileMimeType);
    if (!extractedData || !extractedData.domain) {
      return res.status(400).json({ success: false, message: 'Failed to extract structured data from document.' });
    }

    const domain = extractedData.domain;

    // Get today's daily log
    const today = new Date().toISOString().split('T')[0];
    let dailyLog = await DailyTracking.findOne({ userId, dateString: today });
    if (!dailyLog) {
      dailyLog = new DailyTracking({ userId, dateString: today });
    }

    // Attach prevSnapshot so GoalSyncEngine calculates deltas correctly
    dailyLog._prevSnapshot = {
      health:  { ...dailyLog.health.toObject?.() ?? { ...dailyLog.health } },
      finance: { ...dailyLog.finance.toObject?.() ?? { ...dailyLog.finance } },
      career:  { ...dailyLog.career.toObject?.() ?? { ...dailyLog.career } },
    };

    // Apply extracted data to daily log
    let xpEvent = '';
    if (domain === 'finance') {
      const fin = extractedData.financeData || {};
      if (extractedData.subType === 'bank' || extractedData.subType === 'generic' || !extractedData.subType) {
        xpEvent = 'AI_RECEIPT_LOGGED';
        dailyLog.finance.moneySpent += (fin.moneySpent || 0);
        dailyLog.finance.moneyCredited += (fin.moneyCredited || 0);
        if (Array.isArray(fin.transactions)) {
          dailyLog.finance.transactions.push(...fin.transactions);
        }
      } else if (extractedData.subType === 'mutual_fund') {
        xpEvent = 'AI_RECEIPT_LOGGED'; // Map mutual fund statements to receipt logging XP
        dailyLog.finance.portfolioValue = fin.portfolioValue || 0;
        dailyLog.finance.returns = fin.returns || 0;
        if (Array.isArray(fin.holdings)) {
          dailyLog.finance.holdings = fin.holdings;
        }
      }
    } else if (domain === 'health') {
      xpEvent = 'AI_MEDICAL_LOGGED';
      const hl = extractedData.healthData || {};
      if (Array.isArray(hl.deficiencies)) {
        dailyLog.health.deficiencies = Array.from(new Set([...(dailyLog.health.deficiencies || []), ...hl.deficiencies]));
      }
      if (Array.isArray(hl.medications)) {
        dailyLog.health.medications = Array.from(new Set([...(dailyLog.health.medications || []), ...hl.medications]));
        hl.medications.forEach(med => {
          if (!dailyLog.health.medicationsTaken.some(m => m.name === med)) {
            dailyLog.health.medicationsTaken.push({ name: med, timeTaken: new Date() });
          }
        });
      }
      if (hl.vitals) {
        dailyLog.health.vitals = { ...(dailyLog.health.vitals || {}), ...hl.vitals };
      }
    } else if (domain === 'career') {
      xpEvent = 'COURSE_DONE'; // Default career event
      const car = extractedData.careerData || {};
      dailyLog.career.studyHours += (car.studyHours || 0);
      dailyLog.career.completedCourses += (car.completedCourses || 0);
      dailyLog.career.githubCommits += (car.githubCommits || 0);
      dailyLog.career.projectsCompleted += (car.projectsCompleted || 0);
    }

    // ── Apply Cross-Domain Side Effects ──
    const crossEffects = extractedData.crossDomainEffects || {};
    
    // Apply health effects (e.g. food receipts containing calories)
    if (crossEffects.health) {
      const hlEff = crossEffects.health;
      dailyLog.health.caloriesConsumed += (hlEff.caloriesConsumed || 0);
      dailyLog.health.proteinConsumed += (hlEff.proteinConsumed || 0);
      if (Array.isArray(hlEff.workouts)) {
        dailyLog.health.workouts.push(...hlEff.workouts);
      }
      if (Array.isArray(hlEff.medications)) {
        dailyLog.health.medications = Array.from(new Set([...(dailyLog.health.medications || []), ...hlEff.medications]));
        hlEff.medications.forEach(med => {
          if (!dailyLog.health.medicationsTaken.some(m => m.name === med)) {
            dailyLog.health.medicationsTaken.push({ name: med, timeTaken: new Date() });
          }
        });
      }
    }

    // Apply finance effects (e.g. fitness receipt cost)
    if (crossEffects.finance) {
      const finEff = crossEffects.finance;
      dailyLog.finance.moneySpent += (finEff.moneySpent || 0);
      dailyLog.finance.moneyCredited += (finEff.moneyCredited || 0);
      if (Array.isArray(finEff.transactions)) {
        dailyLog.finance.transactions.push(...finEff.transactions);
      }
    }

    // Apply career effects (e.g. bootcamp receipt study hours)
    if (crossEffects.career) {
      const carEff = crossEffects.career;
      dailyLog.career.studyHours += (carEff.studyHours || 0);
      dailyLog.career.completedCourses += (carEff.completedCourses || 0);
    }

    console.log(`[aiRoutes] /upload: saving DailyTracking dailyLog for userId=${userId}`);
    dailyLog._skipGoalSync = true;
    await dailyLog.save();

    console.log(`[aiRoutes] /upload: executing explicit GoalSyncEngine`);
    const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');
    const updatedGoals = await GoalSyncEngine.syncGoalsFromDailyLog(
      userId,
      dailyLog,
      dailyLog._prevSnapshot || null
    );

    // Recalculate scores inside OnboardingProfile
    const updatedProfile = await recalculateScoresAfterUpload(userId, domain, extractedData);

    // Save upload history
    const uploadRecord = await Upload.create({
      userId,
      fileName,
      fileType: fileMimeType,
      domain,
      extractedData,
    });

    const profile = await GamificationProfile.findOne({ userId });
    const totalXP = profile ? profile.totalXP : 0;

    res.status(200).json({
      success: true,
      message: 'Document processed and Digital Twin synchronized.',
      totalXP,
      goalProgress: updatedGoals,
      data: {
        domain,
        extractedData,
        uploadRecord,
        gamification: null,
        updatedGoals,
      }
    });

    try {
      // Run non-critical side effects after the upload response is already sent.
      if (xpEvent) {
        console.log(`[aiRoutes] /upload: calling GamificationService.evaluateRules`);
        const { default: GamificationService } = await import('../services/GamificationService.js');
        await GamificationService.evaluateRules(userId);
      }

      // Create Notification based on domain
      await createNotification({
        userId,
        category: domain,
        subType: 'document-processed',
        title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Document Sync'd`,
        message: `Your Digital Twin has processed "${fileName}" and extracted structured ${domain} signals.`,
        priority: 'medium',
        actionLink: `/${domain}`,
      });

      // Push live update to frontend via WebSockets
      if (updatedProfile) {
        const dashboardPayload = buildDashboardResponse(updatedProfile);
        emitDashboardSync(userId, dashboardPayload);
      }
    } catch (err) {
      console.error('[aiRoutes] Upload post-response side effect failed:', err.message);
    }

  } catch (error) {
    console.error('[aiRoutes] Upload Endpoint Error:', error);
    res.status(500).json({ success: false, message: 'Server Error processing document upload.' });
  }
});

// ── /uploads — NEW: Retrieves user's upload history ────────────────
router.get('/uploads', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await Upload.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('[aiRoutes] Fetch Upload History Error:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching upload history.' });
  }
});

// ── /diagnostics ──────────────────────────────────────────────────
router.post('/diagnostics', authenticateToken, runDiagnostics);
router.get('/diagnostics/latest', authenticateToken, getLatestReport);

export default router;
