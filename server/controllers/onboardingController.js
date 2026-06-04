import OnboardingProfile from '../models/OnboardingProfile.js';
import { analyzeCorrelations, predictBurnout, predictProductivity } from '../services/aiService.js';
import { fetchGithubProfile } from '../services/githubService.js';
import { fetchLeetcodeProfile } from '../services/leetcodeService.js';
import { fetchLinkedinProfile } from '../services/linkedinService.js';

export const saveOnboardingProfile = async (req, res, next) => {
  try {
    const normalized = normalizeOnboardingPayload(req.body);
    const validationError = validateOnboardingPayload(normalized);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const ruleScores = calculateRuleBasedScores(normalized);
    const aiResults = await getAiResults(normalized, ruleScores);
    const integrationAnalytics = await getIntegrationAnalytics(normalized);
    const thresholdStates = calculateThresholdStates(normalized, aiResults.scores);
    const recommendations = generateRecommendations(normalized, aiResults, thresholdStates, integrationAnalytics);
    const aiInsights = generateAiInsights(normalized, aiResults, thresholdStates, integrationAnalytics);

    const profile = await OnboardingProfile.findOneAndUpdate(
      { userId: req.user.userId },
      {
        ...normalized,
        ...aiResults.scores,
        ...integrationAnalytics,
        recommendations,
        aiInsights,
        thresholdStates,
        correlationAnalysis: aiResults.correlationAnalysis,
        aiSource: aiResults.aiSource,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Onboarding profile processed successfully',
      data: buildDashboardResponse(profile),
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardProfile = async (req, res, next) => {
  try {
    const profile = await OnboardingProfile.findOne({ userId: req.user.userId }).sort({ updatedAt: -1 });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding profile not found',
        code: 'ONBOARDING_REQUIRED',
      });
    }

    return res.status(200).json({
      success: true,
      data: buildDashboardResponse(profile),
    });
  } catch (error) {
    next(error);
  }
};

export const completeDailyGoals = async (req, res, next) => {
  try {
    const goals = sanitizeStringArray(req.body?.goals);

    if (goals.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Complete at least one daily goal to update streak',
      });
    }

    const profile = await OnboardingProfile.findOne({ userId: req.user.userId }).sort({ updatedAt: -1 });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Onboarding profile not found',
        code: 'ONBOARDING_REQUIRED',
      });
    }

    updateGoalStreak(profile, goals);
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Daily goals completed',
      data: buildDashboardResponse(profile),
    });
  } catch (error) {
    next(error);
  }
};

function normalizeOnboardingPayload(body = {}) {
  const integrations = body.integrations || {};
  const lifestyle = body.lifestyle || {};
  const financialPatterns = body.financialPatterns || {};
  const behavioralAnalysis = body.behavioralAnalysis || {};

  return {
    selectedSignals: sanitizeStringArray(body.selectedSignals || behavioralAnalysis.focusAreas),
    githubUsername: sanitizeString(body.githubUsername ?? integrations.github?.username),
    leetcodeUsername: sanitizeString(body.leetcodeUsername ?? integrations.leetcode?.username),
    fitbitProfile: sanitizeString(body.fitbitProfile ?? integrations.fitbit?.profileLink),
    calendarProfile: sanitizeString(body.calendarProfile ?? integrations.googleCalendar?.profileLink),
    linkedinProfile: sanitizeString(body.linkedinProfile ?? integrations.linkedin?.profileLink),
    bankingProfile: sanitizeString(body.bankingProfile ?? integrations.banking?.profileLink),
    gender: sanitizeGender(body.gender ?? lifestyle.gender),
    sleepHours: sanitizeNumber(body.sleepHours ?? lifestyle.sleepHours, 7),
    studyHours: sanitizeNumber(body.studyHours ?? lifestyle.studyHours, 4),
    exerciseFrequency: sanitizeNumber(body.exerciseFrequency ?? lifestyle.exerciseFrequency, 2),
    spendingStyle: sanitizeString(body.spendingStyle ?? lifestyle.spendingStyle, 'balanced'),
    smokingHabit: sanitizeString(body.smokingHabit ?? lifestyle.smokingHabits, 'no'),
    periodTracking: sanitizeString(body.periodTracking ?? lifestyle.periodTracking, 'not_now'),
    genderSpecificHealthContext: sanitizeString(
      body.genderSpecificHealthContext ?? lifestyle.genderSpecificHealthContext,
      'not_now'
    ),
    monthlyIncome: sanitizeNumber(body.monthlyIncome ?? financialPatterns.monthlyIncome, 0),
    monthlyExpenditure: sanitizeNumber(body.monthlyExpenditure ?? financialPatterns.monthlyExpenditure, 0),
    savingsHabit: sanitizeString(body.savingsHabit ?? financialPatterns.savingsHabits, 'moderate'),
    financialStressLevel: sanitizeNumber(body.financialStressLevel ?? financialPatterns.financialStressLevel, 5),
  };
}

function validateOnboardingPayload(payload) {
  if (!['female', 'male'].includes(payload.gender)) {
    return 'Select your gender';
  }

  if (!Array.isArray(payload.selectedSignals) || payload.selectedSignals.length === 0) {
    return 'Select at least one behavioral signal';
  }

  if (payload.sleepHours < 0 || payload.sleepHours > 24) {
    return 'Sleep hours must be between 0 and 24';
  }

  if (payload.studyHours < 0 || payload.studyHours > 24) {
    return 'Study hours must be between 0 and 24';
  }

  if (payload.exerciseFrequency < 0 || payload.exerciseFrequency > 7) {
    return 'Exercise frequency must be between 0 and 7';
  }

  if (payload.monthlyIncome < 0 || payload.monthlyExpenditure < 0) {
    return 'Financial values cannot be negative';
  }

  if (payload.financialStressLevel < 1 || payload.financialStressLevel > 10) {
    return 'Financial stress level must be between 1 and 10';
  }

  return null;
}

async function getAiResults(payload, ruleScores) {
  const aiPayload = buildAiEnginePayload(payload);
  const correlationPayload = {
    data: buildCorrelationDataPoints(payload),
    selectedSignals: payload.selectedSignals,
    gender: payload.gender,
    periodTracking: payload.periodTracking,
    genderSpecificHealthContext: payload.genderSpecificHealthContext,
  };

  const results = await Promise.allSettled([
    predictBurnout(aiPayload),
    predictProductivity(aiPayload),
    analyzeCorrelations(correlationPayload),
  ]);

  const burnoutData = results[0].status === 'fulfilled' ? results[0].value : null;
  const productivityData = results[1].status === 'fulfilled' ? results[1].value : null;
  const correlationData = results[2].status === 'fulfilled' ? results[2].value : null;
  const fulfilledCount = results.filter((result) => result.status === 'fulfilled').length;

  return {
    aiSource: fulfilledCount === 3 ? 'flask' : fulfilledCount > 0 ? 'mixed' : 'fallback',
    scores: {
      burnoutRisk: clamp(extractPercentScore(burnoutData, ['burnoutRisk', 'burnout_risk', 'risk_score', 'score'], ruleScores.burnoutRisk), 0, 100),
      productivityScore: clamp(extractScore(productivityData, ['productivityScore', 'productivity_score', 'score'], ruleScores.productivityScore), 0, 100),
      financialHealth: ruleScores.financialHealth,
      wellnessBalance: ruleScores.wellnessBalance,
    },
    correlationAnalysis: correlationData || {
      summary: ruleScores.correlationSummary,
      source: 'fallback',
    },
  };
}

async function getIntegrationAnalytics(payload) {
  const [githubResult, leetcodeResult, linkedinResult] = await Promise.allSettled([
    payload.githubUsername ? fetchGithubProfile(payload.githubUsername) : Promise.resolve(null),
    payload.leetcodeUsername ? fetchLeetcodeProfile(payload.leetcodeUsername) : Promise.resolve(null),
    payload.linkedinProfile ? fetchLinkedinProfile({ linkedinProfile: payload.linkedinProfile }) : Promise.resolve(null),
  ]);

  const githubData = githubResult.status === 'fulfilled' && githubResult.value ? githubResult.value : {};
  const leetcodeData = leetcodeResult.status === 'fulfilled' && leetcodeResult.value ? leetcodeResult.value : {};
  const linkedinData = linkedinResult.status === 'fulfilled' && linkedinResult.value ? linkedinResult.value : {};
  const careerScores = calculateCareerScores({ githubData, leetcodeData, linkedinData });
  const careerInsights = generateCareerInsights({ githubData, leetcodeData, linkedinData, careerScores });

  return {
    githubData,
    leetcodeData,
    linkedinData,
    careerInsights,
    ...careerScores,
  };
}

function calculateRuleBasedScores(payload) {
  const genderThresholds = getGenderThresholds(payload.gender);
  const savingsRate = payload.monthlyIncome > 0
    ? ((payload.monthlyIncome - payload.monthlyExpenditure) / payload.monthlyIncome) * 100
    : 0;
  const overspendingPenalty = payload.monthlyExpenditure > payload.monthlyIncome && payload.monthlyIncome > 0 ? 18 : 0;
  const sleepDeficit = Math.max(0, genderThresholds.idealSleepHours - payload.sleepHours);
  const heavyStudyLoad = Math.max(0, payload.studyHours - genderThresholds.heavyStudyHours);
  const periodRecoveryLoad = payload.gender === 'female' && payload.periodTracking === 'irregular' ? 5 : 0;
  const maleRecoveryCredit = payload.gender === 'male' && payload.genderSpecificHealthContext !== 'not_now' && payload.exerciseFrequency >= 3 ? 3 : 0;

  const burnoutRisk = clamp(
    Math.round(35 + sleepDeficit * 9 + heavyStudyLoad * 6 + payload.financialStressLevel * 2 - payload.exerciseFrequency * 3 + periodRecoveryLoad - maleRecoveryCredit),
    10,
    95
  );

  const productivityScore = clamp(
    Math.round(58 + payload.studyHours * 5 + payload.exerciseFrequency * 3 - Math.max(0, genderThresholds.minimumRecoverySleep - payload.sleepHours) * 4 - Math.max(0, payload.financialStressLevel - 6) * 3 - Math.max(0, periodRecoveryLoad - 2)),
    20,
    98
  );

  const wellnessBalance = clamp(
    Math.round(52 + payload.sleepHours * 4 + payload.exerciseFrequency * genderThresholds.exerciseWeight - payload.financialStressLevel * 3 - (payload.smokingHabit === 'yes' ? 10 : 0) - periodRecoveryLoad),
    15,
    96
  );

  const financialHealth = clamp(
    Math.round(52 + savingsRate * 0.85 - payload.financialStressLevel * 2 - overspendingPenalty),
    5,
    98
  );

  return {
    burnoutRisk,
    productivityScore,
    financialHealth,
    wellnessBalance,
    savingsRate: Math.round(savingsRate),
    correlationSummary: payload.sleepHours < 6 && payload.studyHours > 7
      ? 'Low sleep paired with heavy study hours is the strongest burnout driver.'
      : 'Behavior, finance, and wellness signals are stable enough for dashboard personalization.',
  };
}

function generateRecommendations(payload, aiResults, thresholdStates, integrationAnalytics = {}) {
  const recommendations = [];
  const overspending = payload.monthlyIncome > 0 && payload.monthlyExpenditure > payload.monthlyIncome;
  const lowSleepHighStudy = payload.sleepHours < 5 && payload.studyHours > 8;
  const highExerciseLowStress = payload.exerciseFrequency >= 4 && payload.financialStressLevel <= 3;
  const hasCodingSignals = Boolean(payload.githubUsername || payload.leetcodeUsername);

  if (lowSleepHighStudy) {
    recommendations.push({
      title: 'Prioritize 7+ hours of sleep',
      detail: 'Protect the next 3 nights with an earlier wind-down window.',
      category: 'wellness',
      severity: 'high',
      colorState: 'red',
    });
  } else if (payload.sleepHours < 7) {
    recommendations.push({
      title: 'Protect recovery tonight',
      detail: 'Move bedtime 45 minutes earlier to improve tomorrow recovery.',
      category: 'wellness',
      severity: 'medium',
      colorState: 'orange',
    });
  } else if (highExerciseLowStress) {
    recommendations.push({
      title: 'Maintain current health rhythm',
      detail: 'Keep the same workout cadence for the next week.',
      category: 'health',
      severity: 'low',
      colorState: 'green',
    });
  }

  if (overspending) {
    recommendations.push({
      title: 'Reduce discretionary spending this week',
      detail: 'Pause flexible purchases and review recurring expenses.',
      category: 'finance',
      severity: thresholdStates.financial.status === 'critical' ? 'high' : 'medium',
      colorState: thresholdStates.financial.colorState,
    });
  } else if (payload.monthlyIncome > 0) {
    recommendations.push({
      title: 'Increase long-term savings allocation',
      detail: 'Move a small surplus into savings while income stays ahead of expenditure.',
      category: 'finance',
      severity: 'low',
      colorState: 'green',
    });
  }

  if (aiResults.scores.burnoutRisk > 65) {
    recommendations.push({
      title: 'Take a recovery break',
      detail: 'Schedule a 20-minute reset before the next deep-work block.',
      category: 'health',
      severity: thresholdStates.burnout.severity,
      colorState: thresholdStates.burnout.colorState,
    });
  }

  if (aiResults.scores.productivityScore >= 75) {
    recommendations.push({
      title: 'Maintain productivity rhythm',
      detail: hasCodingSignals
        ? 'Keep one focused coding or practice block active today.'
        : 'Add one focused morning work session and connect a coding signal.',
      category: 'career',
      severity: 'low',
      colorState: 'green',
    });
  } else if (payload.studyHours > 6) {
    recommendations.push({
      title: 'Split study into recovery-safe blocks',
      detail: 'Use two shorter focus sessions instead of one long late-night block.',
      category: 'career',
      severity: 'medium',
      colorState: 'orange',
    });
  }

  if (integrationAnalytics.codingConsistency >= 70) {
    recommendations.push({
      title: 'Protect coding consistency',
      detail: 'Keep the current GitHub or LeetCode rhythm active this week.',
      category: 'career',
      severity: 'low',
      colorState: 'green',
    });
  } else if (hasCodingSignals) {
    recommendations.push({
      title: 'Rebuild coding rhythm',
      detail: 'Add one small commit or one practice problem to restore momentum.',
      category: 'career',
      severity: 'medium',
      colorState: 'orange',
    });
  }

  if (integrationAnalytics.professionalGrowthScore >= 70) {
    recommendations.push({
      title: 'Use LinkedIn momentum',
      detail: 'Share one project update or learning milestone with your network.',
      category: 'career',
      severity: 'low',
      colorState: 'green',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: 'Keep your current baseline',
      detail: 'Your core profile is stable. Continue gathering signals for better personalization.',
      category: 'general',
      severity: 'low',
      colorState: 'green',
    });
  }

  return recommendations;
}

function generateAiInsights(payload, aiResults, thresholdStates, integrationAnalytics = {}) {
  const insights = [];
  const overspending = payload.monthlyIncome > 0 && payload.monthlyExpenditure > payload.monthlyIncome;
  const lowSleepHighStudy = payload.sleepHours < 5 && payload.studyHours > 8;
  const highExerciseLowStress = payload.exerciseFrequency >= 4 && payload.financialStressLevel <= 3;
  const hasCodingSignals = Boolean(payload.githubUsername || payload.leetcodeUsername);

  if (lowSleepHighStudy || aiResults.scores.burnoutRisk > 65) {
    insights.push({
      label: 'Burnout Risk',
      message: lowSleepHighStudy
        ? 'Late-night study patterns may increase burnout risk because recovery time is reduced.'
        : 'Recovery pressure is rising from sleep, study, or stress signals.',
      score: aiResults.scores.burnoutRisk,
      highlightedProblemTags: lowSleepHighStudy
        ? ['Late-night study patterns', 'burnout risk', 'recovery time is reduced']
        : ['Recovery pressure'],
      sentiment: 'negative',
      ...thresholdStates.burnout,
    });
  } else if (highExerciseLowStress) {
    insights.push({
      label: 'Recovery',
      message: 'Exercise frequency is improving recovery rhythm and focus stability.',
      score: aiResults.scores.wellnessBalance,
      highlightedProblemTags: [],
      sentiment: 'positive',
      ...thresholdStates.wellness,
    });
  } else {
    insights.push({
      label: 'Burnout Risk',
      message: 'Burnout risk is currently controlled by your recovery baseline.',
      score: aiResults.scores.burnoutRisk,
      highlightedProblemTags: [],
      sentiment: thresholdStates.burnout.status === 'healthy' ? 'positive' : 'neutral',
      ...thresholdStates.burnout,
    });
  }

  if (overspending) {
    insights.push({
      label: 'Finance',
      message: 'Financial stress indicators are increasing because spending trajectory exceeds income stability.',
      score: aiResults.scores.financialHealth,
      highlightedProblemTags: ['Financial stress indicators', 'spending trajectory exceeds income stability'],
      sentiment: 'negative',
      ...thresholdStates.financial,
    });
  } else if (payload.monthlyIncome > 0) {
    const financialMessage = thresholdStates.financial.status === 'critical'
      ? 'Financial buffer is weak because savings rate is below a healthy range.'
      : thresholdStates.financial.status === 'warning'
        ? 'Financial buffer is moderate and needs more stability before it becomes strong.'
        : 'Financial discipline is currently stable as income stays ahead of expenditure.';

    insights.push({
      label: 'Finance',
      message: financialMessage,
      score: aiResults.scores.financialHealth,
      highlightedProblemTags: thresholdStates.financial.status === 'critical'
        ? ['Financial buffer is weak', 'savings rate is below a healthy range']
        : [],
      sentiment: thresholdStates.financial.status === 'critical' ? 'negative' : thresholdStates.financial.status === 'warning' ? 'neutral' : 'positive',
      ...thresholdStates.financial,
    });
  }

  if (payload.smokingHabit === 'yes') {
    insights.push({
      label: 'Wellness',
      message: 'Smoking habit is adding recovery friction to the wellness model.',
      score: aiResults.scores.wellnessBalance,
      status: 'critical',
      severity: 'high',
      colorState: 'red',
      sentiment: 'negative',
      highlightedProblemTags: ['Smoking habit', 'recovery friction'],
    });
  }

  const productivityIsRisky = !hasCodingSignals && payload.studyHours > 6;

  insights.push({
    label: 'Productivity',
    message: hasCodingSignals
      ? 'GitHub or LeetCode signals strengthen the career momentum pattern.'
      : productivityIsRisky
        ? 'Late-night productivity spikes may affect wellness balance if recovery stays low.'
        : 'Productivity can improve with more consistent focus blocks and coding signals.',
    score: aiResults.scores.productivityScore,
    highlightedProblemTags: productivityIsRisky
      ? ['Late-night productivity spikes', 'wellness balance', 'recovery stays low']
      : [],
    sentiment: productivityIsRisky ? 'negative' : hasCodingSignals ? 'positive' : 'neutral',
    ...thresholdStates.productivity,
  });

  return [...insights, ...(integrationAnalytics.careerInsights || [])];
}

function calculateThresholdStates(payload, scores) {
  const genderThresholds = getGenderThresholds(payload.gender);
  const savingsRate = payload.monthlyIncome > 0
    ? Math.round(((payload.monthlyIncome - payload.monthlyExpenditure) / payload.monthlyIncome) * 100)
    : 0;

  return {
    sleep: buildThresholdState({
      score: payload.sleepHours,
      status: payload.sleepHours < genderThresholds.criticalSleepHours
        ? 'critical'
        : payload.sleepHours < genderThresholds.idealSleepHours
          ? 'warning'
          : 'healthy',
      label: `${payload.sleepHours}h sleep`,
    }),
    stress: buildThresholdState({
      score: payload.financialStressLevel,
      status: payload.financialStressLevel >= 7 ? 'critical' : payload.financialStressLevel >= 5 ? 'warning' : 'healthy',
      label: `Stress ${payload.financialStressLevel}/10`,
    }),
    burnout: buildThresholdState({
      score: scores.burnoutRisk,
      status: scores.burnoutRisk > genderThresholds.criticalBurnout
        ? 'critical'
        : scores.burnoutRisk >= genderThresholds.warningBurnout
          ? 'warning'
          : 'healthy',
      label: `${scores.burnoutRisk}% burnout risk`,
    }),
    financial: buildThresholdState({
      score: scores.financialHealth,
      status: getSavingsStatus(savingsRate),
      label: `${scores.financialHealth}% financial health`,
    }),
    wellness: buildThresholdState({
      score: scores.wellnessBalance,
      status: scores.wellnessBalance < genderThresholds.criticalWellness
        ? 'critical'
        : scores.wellnessBalance < genderThresholds.warningWellness
          ? 'warning'
          : 'healthy',
      label: `${scores.wellnessBalance}% wellness balance`,
    }),
    productivity: buildThresholdState({
      score: scores.productivityScore,
      status: scores.productivityScore < 45 ? 'critical' : scores.productivityScore < 65 ? 'warning' : 'healthy',
      label: `${scores.productivityScore}% productivity`,
    }),
  };
}

function buildThresholdState({ score, status, label }) {
  const severityMap = {
    healthy: 'low',
    warning: 'medium',
    critical: 'high',
  };
  const colorMap = {
    healthy: 'green',
    warning: 'orange',
    critical: 'red',
  };

  return {
    score,
    status,
    severity: severityMap[status],
    colorState: colorMap[status],
    label,
  };
}

export function buildDashboardResponse(profile) {
  const cleanProfile = profile.toObject ? profile.toObject() : profile;
  const charts = buildCharts(cleanProfile);
  const signals = buildSignals(cleanProfile);
  const metricStates = buildMetricStates(cleanProfile);

  return {
    profile: cleanProfile,
    analytics: {
      burnoutRisk: cleanProfile.burnoutRisk,
      productivityScore: cleanProfile.productivityScore,
      financialHealth: cleanProfile.financialHealth,
      wellnessBalance: cleanProfile.wellnessBalance,
      codingConsistency: cleanProfile.codingConsistency,
      careerMomentum: cleanProfile.careerMomentum,
      professionalGrowthScore: cleanProfile.professionalGrowthScore,
      aiSource: cleanProfile.aiSource,
      thresholds: cleanProfile.thresholdStates || {},
      metricStates,
    },
    githubData: cleanProfile.githubData || {},
    leetcodeData: cleanProfile.leetcodeData || {},
    linkedinData: cleanProfile.linkedinData || {},
    careerInsights: cleanProfile.careerInsights || [],
    codingConsistency: cleanProfile.codingConsistency || 0,
    careerMomentum: cleanProfile.careerMomentum || 0,
    professionalGrowthScore: cleanProfile.professionalGrowthScore || 0,
    aiInsights: cleanProfile.aiInsights || [],
    recommendations: cleanProfile.recommendations || [],
    thresholds: cleanProfile.thresholdStates || {},
    metricStates,
    charts,
    signals,
    streak: buildStreakState(cleanProfile),
    insightCards: [
      {
        title: 'Burnout Risk',
        value: `${cleanProfile.burnoutRisk}%`,
        trend: cleanProfile.burnoutRisk > 65 ? 'Increasing' : 'Stable',
      },
      {
        title: 'Productivity Score',
        value: `${cleanProfile.productivityScore}/100`,
        trend: cleanProfile.productivityScore > 75 ? 'Improving' : 'Building',
      },
      {
        title: 'Financial Health',
        value: `${cleanProfile.financialHealth}%`,
        trend: cleanProfile.monthlyExpenditure > cleanProfile.monthlyIncome ? 'Pressure' : 'Stable',
      },
      {
        title: 'Wellness Balance',
        value: `${cleanProfile.wellnessBalance}%`,
        trend: `${cleanProfile.exerciseFrequency} days/wk`,
      },
    ],
    adaptiveSuggestions: cleanProfile.recommendations || [],
  };
}

function updateGoalStreak(profile, goals) {
  const today = getDateKey(new Date());
  const yesterday = getDateKey(addDays(new Date(), -1));
  if (!Array.isArray(profile.completedDailyGoals)) {
    profile.completedDailyGoals = [];
  }
  const completedDailyGoals = profile.completedDailyGoals;
  const existingEntry = completedDailyGoals.find((entry) => entry.date === today);

  if (existingEntry) {
    existingEntry.goals = Array.from(new Set([...(existingEntry.goals || []), ...goals]));
    existingEntry.completedAt = new Date();
  } else {
    profile.completedDailyGoals.push({
      date: today,
      goals,
      completedAt: new Date(),
    });
  }

  if (profile.lastGoalCompletionDate === today) {
    profile.currentStreak = Math.max(1, profile.currentStreak || 1);
  } else if (profile.lastGoalCompletionDate === yesterday) {
    profile.currentStreak = (profile.currentStreak || 0) + 1;
  } else {
    profile.currentStreak = 1;
  }

  profile.streakStarted = true;
  profile.lastGoalCompletionDate = today;
}

function buildStreakState(profile) {
  const entries = Array.isArray(profile.completedDailyGoals)
    ? profile.completedDailyGoals.map(normalizeStreakEntry)
    : [];
  const currentStreak = calculateCurrentStreak(entries, getDateKey(new Date()));

  return {
    currentStreak: entries.length ? currentStreak : Number(profile.currentStreak || 0),
    streakStarted: Boolean(profile.streakStarted || entries.length),
    lastGoalCompletionDate: profile.lastGoalCompletionDate || '',
    completedDailyGoals: entries,
  };
}

function normalizeStreakEntry(entry) {
  const completedAtKey = entry.completedAt ? getDateKey(new Date(entry.completedAt)) : '';
  const storedKey = typeof entry.date === 'string' ? entry.date : '';
  const date = shouldPreferCompletedAtDate(storedKey, completedAtKey) ? completedAtKey : storedKey;

  return {
    date,
    goals: entry.goals || [],
    goalCompleted: entry.goalCompleted !== false,
    completed: entry.completed !== false,
    completedAt: entry.completedAt,
  };
}

function shouldPreferCompletedAtDate(storedKey, completedAtKey) {
  if (!storedKey || !completedAtKey || storedKey === completedAtKey) return false;
  const storedTime = new Date(`${storedKey}T00:00:00`).getTime();
  const completedTime = new Date(`${completedAtKey}T00:00:00`).getTime();
  return Math.abs(completedTime - storedTime) <= 86400000;
}

function calculateCurrentStreak(entries, todayKey) {
  const completedDates = new Set(
    entries
      .filter((entry) => entry.goalCompleted !== false && entry.completed !== false)
      .map((entry) => entry.date),
  );
  let cursor = new Date(`${todayKey}T00:00:00`);
  let streak = 0;

  while (completedDates.has(getDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

function buildMetricStates(profile) {
  const savingsRate = profile.monthlyIncome > 0
    ? Math.round(((profile.monthlyIncome - profile.monthlyExpenditure) / profile.monthlyIncome) * 100)
    : 0;
  const bufferAmount = profile.monthlyIncome - profile.monthlyExpenditure;
  const financialStatus = getSavingsStatus(savingsRate);

  return {
    savingsRate: buildThresholdState({
      score: savingsRate,
      status: financialStatus,
      label: `${savingsRate}% savings rate`,
    }),
    savingsBuffer: buildThresholdState({
      score: bufferAmount,
      status: financialStatus,
      label: `${bufferAmount} monthly buffer`,
    }),
    financialHealth: buildThresholdState({
      score: profile.financialHealth,
      status: financialStatus,
      label: `${profile.financialHealth}% financial health`,
    }),
  };
}

function calculateCareerScores({ githubData = {}, leetcodeData = {}, linkedinData = {} }) {
  const githubScore = githubData.connected
    ? clamp(35 + githubData.recentActivityCount * 4 + githubData.publicRepos * 1.5 + githubData.followers * 0.4, 20, 100)
    : 0;
  const leetcodeScore = leetcodeData.connected
    ? clamp(30 + leetcodeData.totalSolved * 0.35 + leetcodeData.mediumSolved * 0.6 + leetcodeData.hardSolved * 1.2 + leetcodeData.acceptanceRate * 0.25, 20, 100)
    : 0;
  const linkedinScore = linkedinData.connected ? clamp(linkedinData.profileStrength || 0, 20, 100) : 0;
  const codingSources = [githubScore, leetcodeScore].filter((score) => score > 0);
  const careerSources = [githubScore, leetcodeScore, linkedinScore].filter((score) => score > 0);

  return {
    codingConsistency: codingSources.length > 0 ? clamp(average(codingSources), 0, 100) : 0,
    careerMomentum: careerSources.length > 0 ? clamp(average(careerSources), 0, 100) : 0,
    professionalGrowthScore: linkedinScore || (careerSources.length > 0 ? clamp(average(careerSources) * 0.72, 0, 100) : 0),
  };
}

function generateCareerInsights({ githubData = {}, leetcodeData = {}, linkedinData = {}, careerScores = {} }) {
  const insights = [];

  if (githubData.connected) {
    insights.push({
      label: 'Career',
      source: 'github',
      message: githubData.recentActivityCount > 8
        ? 'GitHub activity is increasing and supports career momentum.'
        : 'GitHub signal is connected, but recent activity could be stronger.',
      severity: githubData.recentActivityCount > 8 ? 'low' : 'medium',
      colorState: githubData.recentActivityCount > 8 ? 'green' : 'orange',
    });
  }

  if (leetcodeData.connected) {
    insights.push({
      label: 'Career',
      source: 'leetcode',
      message: leetcodeData.totalSolved > 100
        ? 'Problem-solving consistency is strengthening technical growth.'
        : 'LeetCode profile is connected; more solved problems will improve coding consistency.',
      severity: leetcodeData.totalSolved > 100 ? 'low' : 'medium',
      colorState: leetcodeData.totalSolved > 100 ? 'green' : 'orange',
    });
  }

  if (linkedinData.connected) {
    insights.push({
      label: 'Career',
      source: 'linkedin',
      message: linkedinData.profileStrength >= 70
        ? 'Professional networking momentum looks stable from your LinkedIn profile.'
        : 'LinkedIn profile signal is early and needs more professional context.',
      severity: linkedinData.profileStrength >= 70 ? 'low' : 'medium',
      colorState: linkedinData.profileStrength >= 70 ? 'green' : 'orange',
    });
  }

  if (careerScores.careerMomentum >= 75) {
    insights.push({
      label: 'Career',
      source: 'career',
      message: 'Technical growth aligns with your broader career trajectory.',
      severity: 'low',
      colorState: 'green',
    });
  }

  return insights;
}

function getSavingsStatus(savingsRate) {
  if (savingsRate <= 33) return 'critical';
  if (savingsRate <= 66) return 'warning';
  return 'healthy';
}

function buildCharts(profile) {
  return {
    sleepTrend: [profile.sleepHours - 1, profile.sleepHours, profile.sleepHours + 0.5].map((value) => clamp(Math.round(value * 10), 0, 100)),
    productivityTrend: [58, 64, profile.productivityScore - 5, profile.productivityScore].map((value) => clamp(value, 0, 100)),
    spendingTrend: [42, 48, profile.monthlyExpenditure > profile.monthlyIncome ? 82 : 56, profile.financialHealth].map((value) => clamp(value, 0, 100)),
    stressTrend: [profile.financialStressLevel * 8, profile.financialStressLevel * 9, profile.burnoutRisk].map((value) => clamp(value, 0, 100)),
  };
}

function buildSignals(profile) {
  return {
    selectedSignals: profile.selectedSignals,
    integrations: {
      github: Boolean(profile.githubUsername),
      leetcode: Boolean(profile.leetcodeUsername),
      fitbit: Boolean(profile.fitbitProfile),
      calendar: Boolean(profile.calendarProfile),
      linkedin: Boolean(profile.linkedinProfile),
      banking: Boolean(profile.bankingProfile),
    },
    lifestyle: {
      gender: profile.gender,
      sleepHours: profile.sleepHours,
      studyHours: profile.studyHours,
      exerciseFrequency: profile.exerciseFrequency,
      periodTracking: profile.periodTracking,
      genderSpecificHealthContext: profile.genderSpecificHealthContext,
    },
    financial: {
      monthlyIncome: profile.monthlyIncome,
      monthlyExpenditure: profile.monthlyExpenditure,
      savingsHabit: profile.savingsHabit,
      financialStressLevel: profile.financialStressLevel,
    },
  };
}

function sanitizeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).replace(/[<>]/g, '').trim().slice(0, 300);
}

function sanitizeGender(value) {
  const gender = sanitizeString(value).toLowerCase();
  return ['female', 'male'].includes(gender) ? gender : '';
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => sanitizeString(item)).filter(Boolean).slice(0, 20);
}

function buildAiEnginePayload(payload) {
  const deepWorkRatio = clampDecimal(
    0.35 + (payload.sleepHours - 6) * 0.05 + payload.exerciseFrequency * 0.03 - payload.financialStressLevel * 0.025,
    0.1,
    0.95
  );
  const interruptions = clamp(payload.financialStressLevel * 2 + Math.max(0, 6 - payload.sleepHours), 0, 50);
  const breaksTaken = clamp(Math.round(2 + payload.exerciseFrequency + Math.max(0, payload.sleepHours - 6)), 0, 20);

  return {
    hours_worked: clampDecimal(payload.studyHours, 0, 24),
    sleep_hours: clampDecimal(payload.sleepHours, 0, 24),
    stress_level: clamp(payload.financialStressLevel, 1, 10),
    breaks_taken: breaksTaken,
    screen_time: clampDecimal(payload.studyHours + 3 + payload.financialStressLevel * 0.35, 0, 24),
    social_interactions: clamp(payload.exerciseFrequency + (payload.spendingStyle === 'variable' ? 2 : 1), 0, 50),
    tasks_completed: clamp(Math.round(payload.studyHours * 2 + payload.exerciseFrequency), 0, 100),
    focus_time_hours: clampDecimal(payload.studyHours, 0, 24),
    meetings_count: clamp(Math.round(payload.financialStressLevel / 2), 0, 20),
    deep_work_ratio: deepWorkRatio,
    interruptions,
    gender: payload.gender,
    periodTracking: payload.periodTracking,
    genderSpecificHealthContext: payload.genderSpecificHealthContext,
  };
}

function buildCorrelationDataPoints(payload) {
  return [-2, -1, 0, 1, 2].map((offset) => ({
    sleep_hours: clampDecimal(payload.sleepHours + offset * 0.25, 0, 24),
    study_hours: clampDecimal(payload.studyHours + offset * 0.4, 0, 24),
    exercise_frequency: clamp(payload.exerciseFrequency + (offset > 0 ? 1 : 0), 0, 7),
    financial_stress: clamp(payload.financialStressLevel + offset, 1, 10),
    spending_pressure: payload.monthlyIncome > 0
      ? clampDecimal((payload.monthlyExpenditure / payload.monthlyIncome) * 100 + offset * 2, 0, 200)
      : 0,
  }));
}

function getGenderThresholds(gender) {
  if (gender === 'female') {
    return {
      idealSleepHours: 7.5,
      minimumRecoverySleep: 6.5,
      criticalSleepHours: 5.5,
      heavyStudyHours: 6,
      warningBurnout: 38,
      criticalBurnout: 68,
      warningWellness: 67,
      criticalWellness: 47,
      exerciseWeight: 5.5,
    };
  }

  return {
    idealSleepHours: 7,
    minimumRecoverySleep: 6,
    criticalSleepHours: 5,
    heavyStudyHours: 7,
    warningBurnout: 42,
    criticalBurnout: 72,
    warningWellness: 63,
    criticalWellness: 43,
    exerciseWeight: 6,
  };
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function sanitizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function extractScore(data, keys, fallback) {
  if (!data || typeof data !== 'object') return fallback;

  for (const key of keys) {
    if (Number.isFinite(Number(data[key]))) {
      return Number(data[key]);
    }
  }

  if (data.data && typeof data.data === 'object') {
    return extractScore(data.data, keys, fallback);
  }

  return fallback;
}

function extractPercentScore(data, keys, fallback) {
  const score = extractScore(data, keys, fallback);
  return score > 0 && score <= 1 ? score * 100 : score;
}

function clamp(value, min, max) {
  return Math.min(Math.max(Math.round(value), min), max);
}

function clampDecimal(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default {
  saveOnboardingProfile,
  getDashboardProfile,
  completeDailyGoals,
};
