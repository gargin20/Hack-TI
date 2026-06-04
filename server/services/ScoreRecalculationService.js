import OnboardingProfile from '../models/OnboardingProfile.js';

export async function recalculateScoresAfterUpload(userId, domain, data) {
  try {
    const profile = await OnboardingProfile.findOne({ userId }).sort({ updatedAt: -1 });
    if (!profile) return null;

    if (domain === 'finance') {
      let financeDelta = 0;
      let burnoutDelta = 0;
      if (data.subType === 'bank') {
        const spent = data.moneySpent || 0;
        const credited = data.moneyCredited || 0;
        if (spent > credited && spent > 0) {
          financeDelta = -4;
          burnoutDelta = 2;
        } else if (credited > spent) {
          financeDelta = 5;
          burnoutDelta = -2;
        }
      } else if (data.subType === 'mutual_fund') {
        const returns = data.returns || 0;
        if (returns > 0) {
          financeDelta = 6;
        } else if (returns < 0) {
          financeDelta = -3;
        }
      }
      profile.financialHealth = Math.min(Math.max(Number(profile.financialHealth || 60) + financeDelta, 5), 98);
      profile.burnoutRisk = Math.min(Math.max(Number(profile.burnoutRisk || 35) + burnoutDelta, 0), 100);
    } else if (domain === 'health') {
      let healthDelta = 0;
      let burnoutDelta = 0;
      if (data.deficiencies && data.deficiencies.length > 0) {
        healthDelta -= (data.deficiencies.length * 3);
        burnoutDelta += (data.deficiencies.length * 2);
      }
      if (data.vitals) {
        const { systolic, diastolic, heartRate } = data.vitals;
        let abnormalCount = 0;
        if (systolic && (systolic < 90 || systolic > 140)) abnormalCount++;
        if (diastolic && (diastolic < 60 || diastolic > 90)) abnormalCount++;
        if (heartRate && (heartRate < 50 || heartRate > 100)) abnormalCount++;
        
        if (abnormalCount > 0) {
          healthDelta -= (abnormalCount * 2);
        } else if (systolic || diastolic || heartRate) {
          healthDelta += 4; // all checked vitals normal
        }
      }
      profile.wellnessBalance = Math.min(Math.max(Number(profile.wellnessBalance || 60) + healthDelta, 15), 96);
      profile.burnoutRisk = Math.min(Math.max(Number(profile.burnoutRisk || 35) + burnoutDelta, 0), 100);
    } else if (domain === 'career') {
      let careerDelta = 0;
      let burnoutDelta = 0;
      const completedCourses = data.completedCourses || 0;
      const githubCommits = data.githubCommits || 0;
      const projectsCompleted = data.projectsCompleted || 0;
      const studyHours = data.studyHours || 0;

      if (completedCourses > 0) {
        careerDelta += (completedCourses * 5);
        burnoutDelta -= 3;
      }
      if (githubCommits > 0) {
        careerDelta += 3;
        burnoutDelta -= 1;
      }
      if (projectsCompleted > 0) {
        careerDelta += 4;
        burnoutDelta -= 2;
      }
      if (studyHours > 0) {
        careerDelta += Math.min(studyHours * 2, 6);
      }
      profile.productivityScore = Math.min(Math.max(Number(profile.productivityScore || 60) + careerDelta, 20), 98);
      profile.burnoutRisk = Math.min(Math.max(Number(profile.burnoutRisk || 35) + burnoutDelta, 0), 100);
    }

    // Recalculate threshold states dynamically
    const severityMap = { healthy: 'low', warning: 'medium', critical: 'high' };
    const colorMap = { healthy: 'green', warning: 'orange', critical: 'red' };
    
    const buildThresholdState = ({ score, status, label }) => ({
      score, status, severity: severityMap[status], colorState: colorMap[status], label
    });

    const getSavingsStatus = (rate) => rate >= 20 ? 'healthy' : rate >= 10 ? 'warning' : 'critical';
    const savingsRate = profile.monthlyIncome > 0
      ? ((profile.monthlyIncome - profile.monthlyExpenditure) / profile.monthlyIncome) * 100
      : 0;

    profile.thresholdStates = {
      ...(profile.thresholdStates || {}),
      burnout: buildThresholdState({
        score: profile.burnoutRisk,
        status: profile.burnoutRisk > 65 ? 'critical' : profile.burnoutRisk >= 45 ? 'warning' : 'healthy',
        label: `${profile.burnoutRisk}% burnout risk`
      }),
      financial: buildThresholdState({
        score: profile.financialHealth,
        status: getSavingsStatus(savingsRate),
        label: `${profile.financialHealth}% financial health`
      }),
      wellness: buildThresholdState({
        score: profile.wellnessBalance,
        status: profile.wellnessBalance < 45 ? 'critical' : profile.wellnessBalance < 65 ? 'warning' : 'healthy',
        label: `${profile.wellnessBalance}% wellness balance`
      }),
      productivity: buildThresholdState({
        score: profile.productivityScore,
        status: profile.productivityScore < 45 ? 'critical' : profile.productivityScore < 65 ? 'warning' : 'healthy',
        label: `${profile.productivityScore}% productivity`
      })
    };

    profile.markModified('thresholdStates');

    await profile.save();
    return profile;
  } catch (error) {
    console.error('[ScoreRecalculationService] Recalculation failed:', error.message);
    return null;
  }
}
