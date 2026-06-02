import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

import VisionAIService      from '../services/VisionAIService.js';
import { authenticateToken } from '../middleware/auth.js';
import GamificationEngine   from '../services/GamificationEngine.js';
import DailyTracking        from '../models/DailyTracking.js';
import CopilotOracleService from '../services/CopilotOracleService.js';
import SmartGoal            from '../models/SmartGoal.js';

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

    // post-save hook fires GoalSyncEngine automatically
    await dailyLog.save();

    const gamificationResult = await GamificationEngine.logEvent(userId, eventName, extractedData);

    res.status(200).json({
      success:      true,
      message:      'Data synchronized with Digital Twin.',
      gamification: gamificationResult,
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

// ── /synthesis — COMPLETELY UNCHANGED ────────────────────────────
const delay = (ms) => new Promise(r => setTimeout(r, ms));

router.post('/synthesis', authenticateToken, async (req, res) => {
  try {
    const { healthData, financeData, careerData } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const systemPrompt = `
      You are the LifeTwin Autonomous Intelligence Engine. 
      Your job is to perform Cross-Domain Synthesis on the user's raw API data.

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

      RAW USER DATA TO ANALYZE:
      - Health Metrics: ${JSON.stringify(healthData)}
      - Financial Records: ${JSON.stringify(financeData)}
      - Career Goals: ${JSON.stringify(careerData)}
    `;

    const demoFallbackInsights = [
      {
        "title": "Sleep vs. Spending Risk",
        "domainTags": ["Health", "Finance"],
        "observation": `Your ${healthData?.metrics?.sleepHours || 'low'} hours of sleep correlates directly with an unusual spike in food delivery expenses.`,
        "action": "Prioritize 8 hours of rest tonight to protect your savings.",
        "isPositive": false
      },
      {
        "title": "Deep Work Momentum",
        "domainTags": ["Career", "Health"],
        "observation": `You logged ${careerData?.metrics?.githubCommitsThisWeek || 'multiple'} commits this week while maintaining a stable resting heart rate.`,
        "action": "Keep up the balanced schedule. You are successfully avoiding burnout.",
        "isPositive": true
      },
      {
        "title": "Credit Stability Verified",
        "domainTags": ["Finance"],
        "observation": `Your Plaid connection verifies a secure credit score of ${financeData?.creditScore || '750+'}.`,
        "action": "Redirect $50 from entertainment to your high-yield savings to maintain velocity.",
        "isPositive": true
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

export default router;
