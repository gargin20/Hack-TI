import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken } from '../middleware/auth.js';
import DailyTracking from '../models/DailyTracking.js';
import LifeProfile from '../models/LifeProfile.js';
import OnboardingProfile from '../models/OnboardingProfile.js';

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
const round = (value, precision = 1) => Number((Number(value) || 0).toFixed(precision));

function buildCurrentValues({ onboarding, lifeProfile, dailyLog }) {
  const monthlyIncome = onboarding?.monthlyIncome || lifeProfile?.financeContext?.monthlyIncomeTarget || 0;
  const monthlyExpense = onboarding?.monthlyExpenditure || lifeProfile?.financeContext?.monthlySpendLimit || dailyLog?.finance?.moneySpent || 0;
  const savings = monthlyIncome > 0 ? Math.max(0, monthlyIncome - monthlyExpense) / 1000 : 5;
  const workouts = dailyLog?.health?.workouts?.length || onboarding?.exerciseFrequency || 2;

  return {
    sleep: round(dailyLog?.health?.sleepHours || onboarding?.sleepHours || 6),
    exercise: clamp(workouts, 0, 7),
    water: round(dailyLog?.health?.waterLiters || lifeProfile?.healthContext?.dailyWaterTargetLiters || 1),
    savings: round(savings, 0),
    investment: round(Math.max(2, savings * 0.35), 0),
    expenses: round((dailyLog?.finance?.moneySpent || monthlyExpense || 20000) / 1000, 0),
    study: round(onboarding?.studyHours || 1),
    projects: clamp(Math.round((onboarding?.careerMomentum || 25) / 25), 0, 8),
    networking: clamp(Math.round((onboarding?.professionalGrowthScore || 35) / 18), 0, 12),
  };
}

function buildRecommendedValues(current) {
  return {
    sleep: clamp(round(current.sleep + 2), 4, 10),
    exercise: clamp(current.exercise + 2, 0, 7),
    water: clamp(round(current.water + 1.5), 0.5, 5),
    savings: clamp(current.savings + 10, 0, 50),
    investment: clamp(current.investment + 6, 0, 40),
    expenses: clamp(current.expenses - 4, 5, 60),
    study: clamp(round(current.study + 2), 0, 8),
    projects: clamp(current.projects + 2, 0, 8),
    networking: clamp(current.networking + 3, 0, 12),
  };
}

function fallbackAnalysis(current, simulated) {
  const sleepGain = round(simulated.sleep - current.sleep);
  const savingsGain = round(simulated.savings - current.savings, 0);
  const studyGain = round(simulated.study - current.study);

  const healthFrom = clamp(Math.round(58 + current.sleep * 3 + current.exercise * 2 + current.water * 2), 45, 95);
  const financeFrom = clamp(Math.round(52 + current.savings * 1.4 + current.investment * 1.1 - current.expenses * 0.35), 40, 96);
  const careerFrom = clamp(Math.round(55 + current.study * 4 + current.projects * 3 + current.networking * 1.5), 42, 96);
  const healthTo = clamp(Math.round(healthFrom + sleepGain * 4 + (simulated.exercise - current.exercise) * 2 + (simulated.water - current.water) * 1.5), healthFrom, 99);
  const financeTo = clamp(Math.round(financeFrom + savingsGain * 0.8 + (simulated.investment - current.investment) * 1.3 - Math.min(0, simulated.expenses - current.expenses)), financeFrom, 99);
  const careerTo = clamp(Math.round(careerFrom + studyGain * 4 + (simulated.projects - current.projects) * 3 + (simulated.networking - current.networking) * 1.2), careerFrom, 99);
  const currentTwin = Math.round((healthFrom + financeFrom + careerFrom) / 3);
  const simulatedTwin = Math.round((healthTo + financeTo + careerTo) / 3);

  return {
    resultCards: [
      {
        title: 'Health What-If',
        label: 'Health',
        from: healthFrom,
        to: healthTo,
        signals: [
          { label: 'Energy', direction: 'up' },
          { label: 'Stress', direction: 'down' },
          { label: 'Recovery', direction: 'up' },
        ],
      },
      {
        title: 'Finance What-If',
        label: 'Finance',
        from: financeFrom,
        to: financeTo,
        signals: [
          { label: 'Savings', direction: 'up' },
          { label: 'Stability', direction: 'up' },
          { label: 'Financial Risk', direction: 'down' },
        ],
      },
      {
        title: 'Career What-If',
        label: 'Career',
        from: careerFrom,
        to: careerTo,
        signals: [
          { label: 'Productivity', direction: 'up' },
          { label: 'Skill Growth', direction: 'up' },
          { label: 'Interview Readiness', direction: 'up' },
        ],
      },
    ],
    impactChains: [
      {
        title: 'Recovery Loop',
        copy: `Adding ${sleepGain || 0}h of sleep improves recovery and protects deep work energy.`,
        steps: [`Sleep +${sleepGain || 0}h`, `Health +${Math.max(1, healthTo - healthFrom)}`, `Career +${Math.max(1, Math.round((careerTo - careerFrom) * 0.35))}`],
      },
      {
        title: 'Money Calm',
        copy: `Raising savings by Rs ${savingsGain || 0}k reduces financial pressure and frees focus.`,
        steps: [`Savings +Rs ${savingsGain || 0}k`, 'Stress -8', 'Focus +4', `Career +${Math.max(1, Math.round((careerTo - careerFrom) * 0.25))}`],
      },
      {
        title: 'Skill Flywheel',
        copy: `Extra study time compounds into stronger project momentum and income potential.`,
        steps: [`Study +${studyGain || 0}h`, `Career +${Math.max(1, careerTo - careerFrom)}`, 'Income Potential +6', `Finance +${Math.max(1, Math.round((financeTo - financeFrom) * 0.35))}`],
      },
    ],
    twinScore: {
      current: currentTwin,
      simulated: Math.max(currentTwin, simulatedTwin),
    },
    source: 'fallback',
  };
}

async function getUserSimulationContext(userId) {
  const today = new Date().toISOString().split('T')[0];
  const [onboarding, lifeProfile, dailyLog] = await Promise.all([
    OnboardingProfile.findOne({ userId }).sort({ updatedAt: -1 }).lean(),
    LifeProfile.findOne({ userId }).lean(),
    DailyTracking.findOne({ userId, dateString: today }).lean(),
  ]);

  return { onboarding, lifeProfile, dailyLog };
}

router.get('/current', authenticateToken, async (req, res) => {
  try {
    const context = await getUserSimulationContext(req.user.userId);
    const current = buildCurrentValues(context);

    res.status(200).json({
      success: true,
      data: {
        current,
        simulated: buildRecommendedValues(current),
        source: {
          hasOnboarding: Boolean(context.onboarding),
          hasLifeProfile: Boolean(context.lifeProfile),
          hasDailyLog: Boolean(context.dailyLog),
        },
      },
    });
  } catch (error) {
    console.error('Simulation current route error:', error);
    res.status(500).json({ success: false, message: 'Unable to load simulation inputs.' });
  }
});

router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const { current, simulated, simulationContext } = req.body;
    if (!current || !simulated) {
      return res.status(400).json({ success: false, message: 'Current and simulated values are required.' });
    }

    const fallback = fallbackAnalysis(current, simulated);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({ success: true, data: fallback });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1400,
        responseMimeType: 'application/json',
      },
    });
    const prompt = `
You are a concise Personal Digital Twin analyst. Use only the provided simulation context.
Return JSON only. No markdown. Do not calculate scores.

Schema:
{
  "simulationSummary": "One short forecast.",
  "summaryHighlights": [
    "Biggest Positive Change: ...",
    "Biggest Risk: ...",
    "Most Influential Habit: ...",
    "Recommended Next Step: ..."
  ],
  "healthAnalysis": "2 short sentences.",
  "financeAnalysis": "2 short sentences. Weigh savings, investments, expenses, and custom finance inputs together.",
  "careerAnalysis": "2 short sentences.",
  "overallTwinAnalysis": "2 short sentences about the complete scenario.",
  "crossDomainAnalysis": [
    { "title": "Recovery Loop", "status": "Improved|Reduced|Stable|Mixed Impact|High Risk Growth|Stable Growth", "steps": ["Human readable state", "Human readable state"], "analysis": "1 short sentence." },
    { "title": "Money Impact", "status": "Improved|Reduced|Stable|Mixed Impact|High Risk Growth|Stable Growth", "steps": ["Human readable state", "Human readable state"], "analysis": "1 short sentence." },
    { "title": "Career Momentum", "status": "Improved|Reduced|Stable|Mixed Impact|High Risk Growth|Stable Growth", "steps": ["Human readable state", "Human readable state"], "analysis": "1 short sentence." }
  ],
  "timeline": {
    "thirtyDays": "1 short sentence.",
    "ninetyDays": "1 short sentence.",
    "oneYear": "1 short sentence."
  },
  "tradeoffs": [
    { "benefit": "Actual benefit.", "risk": "Actual risk." }
  ],
  "riskAssessment": {
    "health": { "level": "Low|Medium|High", "reason": "Short reason." },
    "finance": { "level": "Low|Medium|High", "reason": "Short reason." },
    "career": { "level": "Low|Medium|High", "reason": "Short reason." },
    "overall": { "level": "Low|Medium|High", "reason": "Short reason." }
  }
}

Rules:
- Never return numeric impact labels such as Focus +26 or Recovery -720.
- Finance must consider savings, investments, expenses, custom finance inputs, and net tradeoff together.
- If savings and investments rise while expenses also rise, do not call finance reduced by default; use Mixed Impact, Stable Growth, High Risk Growth, or Improved as appropriate.
- Only include tradeoffs that exist in the changed inputs.
- Keep every text field concise.

Simulation context:
${JSON.stringify(simulationContext || { currentState: current, simulatedState: simulated })}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      return res.status(200).json({
        success: true,
        data: {
          ...fallback,
          simulationSummary: String(parsed.simulationSummary || ''),
          summaryHighlights: Array.isArray(parsed.summaryHighlights) ? parsed.summaryHighlights : [],
          healthAnalysis: String(parsed.healthAnalysis || ''),
          financeAnalysis: String(parsed.financeAnalysis || ''),
          careerAnalysis: String(parsed.careerAnalysis || ''),
          overallTwinAnalysis: String(parsed.overallTwinAnalysis || ''),
          crossDomainAnalysis: Array.isArray(parsed.crossDomainAnalysis) ? parsed.crossDomainAnalysis : [],
          timeline: parsed.timeline && typeof parsed.timeline === 'object' ? parsed.timeline : null,
          tradeoffs: Array.isArray(parsed.tradeoffs) ? parsed.tradeoffs : [],
          riskAssessment: parsed.riskAssessment && typeof parsed.riskAssessment === 'object' ? parsed.riskAssessment : null,
          source: 'ai',
        },
      });
    } catch (aiError) {
      console.warn('Simulation AI fallback activated:', aiError.message);
      return res.status(200).json({ success: true, data: fallback });
    }
  } catch (error) {
    console.error('Simulation analyze route error:', error);
    res.status(500).json({ success: false, message: 'Unable to run simulation analysis.' });
  }
});

router.post('/run', authenticateToken, async (req, res) => {
  try {
    const { current, simulated } = req.body;
    if (!current || !simulated) {
      return res.status(400).json({ success: false, message: 'Current and simulated values are required.' });
    }

    return res.status(200).json({ success: true, data: fallbackAnalysis(current, simulated) });
  } catch (error) {
    console.error('Simulation run route error:', error);
    return res.status(500).json({ success: false, message: 'Unable to run simulation analysis.' });
  }
});

export default router;
