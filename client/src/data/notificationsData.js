// ─── Digital Twin Alert Center — Mock Data Generator ─────────────────────────
// Date-seeded notification generator: same day → same notifications, next day → new set.
// Replace with real API calls when backend is ready.

// Simple deterministic hash from a string seed
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Seeded pseudo-random number generator (mulberry32)
function createRng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick N random items from array using RNG
function pickRandom(arr, n, rng) {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}

// ─── Notification Templates ──────────────────────────────────────────────────

const HEALTH_NOTIFICATIONS = [
  { title: 'Heart Rate Below Normal', message: 'Your resting heart rate dropped to 52 bpm, which is below your baseline of 62 bpm. Consider monitoring hydration and iron levels.', priority: 'critical', actionLabel: 'View Health', actionRoute: '/health/' },
  { title: 'Heart Rate Unusually High', message: 'Your heart rate spiked to 112 bpm during rest at 2:30 PM. This could indicate stress or caffeine overconsumption.', priority: 'critical', actionLabel: 'Check Vitals', actionRoute: '/health/' },
  { title: 'Step Count Below Target', message: 'You\'ve only logged 2,340 steps today. Your daily target is 8,000 steps. Try a 20-minute walk to catch up.', priority: 'warning', actionLabel: 'View Activity', actionRoute: '/health/' },
  { title: 'Sleep Duration Insufficient', message: 'You slept only 4.5 hours last night. Recommended minimum is 7 hours. Sleep debt is accumulating.', priority: 'critical', actionLabel: 'Sleep Analysis', actionRoute: '/health/' },
  { title: 'Water Intake Low', message: 'You\'ve consumed only 3 glasses of water today. Target is 8 glasses. Dehydration impacts focus and energy.', priority: 'warning', actionLabel: 'Log Water', actionRoute: '/health/' },
  { title: 'High Stress Level Detected', message: 'Your stress indicators are elevated based on heart rate variability and activity patterns. Consider a 10-minute breathing exercise.', priority: 'warning', actionLabel: 'Stress Relief', actionRoute: '/health/' },
  { title: 'Workout Missed Today', message: 'No workout activity detected today. You\'re on a 3-day streak — don\'t break it! Even 15 minutes counts.', priority: 'recommendation', actionLabel: 'Quick Workout', actionRoute: '/health/' },
  { title: 'BMI Trending Upward', message: 'Your BMI has increased by 0.4 over the past two weeks. Review your caloric intake and exercise routine.', priority: 'warning', actionLabel: 'View Trends', actionRoute: '/health/' },
  { title: 'Posture Alert', message: 'You\'ve been sedentary for 3 hours straight. Stand up, stretch, and walk for 5 minutes to improve circulation.', priority: 'recommendation', actionLabel: 'Set Reminder', actionRoute: '/health/' },
  { title: 'Caffeine Intake High', message: 'You\'ve had an estimated 4 cups of coffee today. Consider switching to water for the rest of the day.', priority: 'recommendation', actionLabel: 'View Details', actionRoute: '/health/' },
];

const CAREER_NOTIFICATIONS = [
  { title: 'Study Target Not Met', message: 'You studied only 1.5 hours today against your daily target of 4 hours. You\'re falling behind your weekly plan.', priority: 'warning', actionLabel: 'Study Plan', actionRoute: '/career/' },
  { title: 'DSA Practice Incomplete', message: 'You haven\'t solved any DSA problems today. Your target is 2 problems per day. LeetCode streak at risk.', priority: 'warning', actionLabel: 'Open LeetCode', actionRoute: '/career/' },
  { title: 'Internship Applications Pending', message: '5 internship applications have upcoming deadlines this week. 2 are due tomorrow. Don\'t miss them!', priority: 'critical', actionLabel: 'View Applications', actionRoute: '/career/' },
  { title: 'Learning Streak Broken', message: 'Your 12-day continuous learning streak ended yesterday. Start a new streak today — consistency matters.', priority: 'warning', actionLabel: 'Resume Learning', actionRoute: '/career/' },
  { title: 'Coding Activity Low', message: 'Your GitHub contributions are 60% lower than your monthly average. Push some code to maintain visibility.', priority: 'recommendation', actionLabel: 'Open GitHub', actionRoute: '/career/' },
  { title: 'Resume Update Overdue', message: 'Your resume hasn\'t been updated in 45 days. Add recent projects and skills to stay application-ready.', priority: 'recommendation', actionLabel: 'Update Resume', actionRoute: '/career/' },
  { title: 'Skill Gap Detected', message: 'Based on trending job postings in your field, "System Design" is a frequently requested skill you haven\'t covered yet.', priority: 'recommendation', actionLabel: 'Explore Courses', actionRoute: '/career/' },
  { title: 'Project Deadline Approaching', message: 'Your capstone project milestone is due in 3 days. Current progress is at 62%. Increase daily effort.', priority: 'warning', actionLabel: 'View Project', actionRoute: '/career/' },
];

const FINANCE_NOTIFICATIONS = [
  { title: 'Daily Budget Exceeded', message: 'You\'ve spent ₹2,340 today against your daily budget of ₹1,500. Overspending detected in Food & Entertainment.', priority: 'critical', actionLabel: 'View Spending', actionRoute: '/finance/' },
  { title: 'Impulse Purchase Detected', message: 'A purchase of ₹1,899 on "Electronics" was flagged as potentially impulsive. It wasn\'t in your planned expenses.', priority: 'warning', actionLabel: 'Review Purchase', actionRoute: '/finance/' },
  { title: 'Savings Target Behind', message: 'You\'re ₹4,200 behind your monthly savings goal. 8 days remain. Consider reducing discretionary spending.', priority: 'warning', actionLabel: 'Savings Plan', actionRoute: '/finance/' },
  { title: 'Unusual Transaction Detected', message: 'A transaction of ₹5,600 to an unfamiliar merchant was detected. Verify this wasn\'t unauthorized.', priority: 'critical', actionLabel: 'Verify Now', actionRoute: '/finance/' },
  { title: 'Subscription Renewal Approaching', message: 'Your Netflix subscription (₹649/mo) renews in 3 days. Review if you want to continue or cancel.', priority: 'recommendation', actionLabel: 'Manage Subs', actionRoute: '/finance/' },
  { title: 'Weekly Spending Summary', message: 'You spent ₹8,450 this week — 12% over your weekly budget. Top categories: Food (38%), Transport (24%), Shopping (18%).', priority: 'warning', actionLabel: 'Full Report', actionRoute: '/finance/' },
  { title: 'Investment Opportunity', message: 'Based on your risk profile, a recurring SIP of ₹2,000/month in an index fund could grow to ₹3.2L in 5 years.', priority: 'recommendation', actionLabel: 'Explore', actionRoute: '/finance/' },
  { title: 'Bill Payment Due', message: 'Your electricity bill of ₹1,230 is due in 2 days. Set up auto-pay to avoid late charges.', priority: 'warning', actionLabel: 'Pay Now', actionRoute: '/finance/' },
];

const GOAL_NOTIFICATIONS = [
  { title: 'Daily Goal Incomplete', message: 'You\'ve completed only 3 of 6 daily tasks. Focus on the remaining 3 before end of day to maintain your streak.', priority: 'warning', actionLabel: 'View Goals', actionRoute: '/goals/' },
  { title: 'Weekly Goal Falling Behind', message: 'Your weekly goal "Read 2 chapters" is only 25% complete with 2 days remaining. Allocate time tonight.', priority: 'warning', actionLabel: 'Goal Details', actionRoute: '/goals/' },
  { title: 'Goal Streak Broken', message: 'Your 8-day goal completion streak ended yesterday. Every streak starts with day 1 — restart now.', priority: 'warning', actionLabel: 'New Streak', actionRoute: '/goals/' },
  { title: 'Goal Deadline Approaching', message: 'Your goal "Complete ML Course" has a deadline in 5 days. Current progress: 71%. Increase daily effort.', priority: 'critical', actionLabel: 'View Progress', actionRoute: '/goals/' },
  { title: 'Monthly Review Due', message: 'Your monthly goal review is due. Reflect on what worked, what didn\'t, and set next month\'s targets.', priority: 'recommendation', actionLabel: 'Start Review', actionRoute: '/goals/' },
  { title: 'New Goal Suggestion', message: 'Based on your patterns, consider adding a "Mindfulness" goal. Users with similar profiles see 23% productivity gains.', priority: 'recommendation', actionLabel: 'Add Goal', actionRoute: '/goals/' },
];

const AI_INSIGHT_NOTIFICATIONS = [
  { title: 'Productivity Up 15%', message: 'Your productivity score increased by 15% this week compared to last week. Key driver: consistent morning routine and reduced social media usage.', priority: 'recommendation', actionLabel: 'View Analysis', actionRoute: '/intelligence/' },
  { title: 'Sleep Quality Improving', message: 'Your deep sleep duration has increased by 22 minutes on average over the past 10 days. Keep maintaining your current bedtime routine.', priority: 'recommendation', actionLabel: 'Sleep Report', actionRoute: '/health/' },
  { title: 'Spending Habits Healthier', message: 'Your impulse purchases decreased by 34% this month. Planned spending ratio improved from 62% to 78%.', priority: 'recommendation', actionLabel: 'Finance Report', actionRoute: '/finance/' },
  { title: 'Study Consistency Improving', message: 'Your study sessions are more consistent — standard deviation dropped by 40%. You\'re building a reliable habit.', priority: 'recommendation', actionLabel: 'View Pattern', actionRoute: '/career/' },
  { title: 'Optimal Focus Window Detected', message: 'Your most productive hours are between 9 AM - 12 PM. Schedule deep work during this window for maximum output.', priority: 'recommendation', actionLabel: 'Optimize Schedule', actionRoute: '/intelligence/' },
  { title: 'Correlation Detected', message: 'Days with 7+ hours of sleep show 28% higher productivity scores. Prioritizing sleep directly impacts your career goals.', priority: 'recommendation', actionLabel: 'Explore Insights', actionRoute: '/intelligence/' },
  { title: 'Weekly Pattern Analysis', message: 'Tuesdays and Thursdays are your most productive days. Mondays show the lowest engagement. Consider lighter tasks on Mondays.', priority: 'recommendation', actionLabel: 'View Patterns', actionRoute: '/intelligence/' },
  { title: 'Burnout Risk Decreasing', message: 'Your burnout risk score dropped from 68% to 52% over 2 weeks. Better sleep and regular breaks are making a difference.', priority: 'recommendation', actionLabel: 'View Trend', actionRoute: '/health/' },
];

const ACHIEVEMENT_NOTIFICATIONS = [
  { title: '7-Day Study Streak! 🔥', message: 'You\'ve studied consistently for 7 days straight. You\'re in the top 12% of learners on the platform.', priority: 'achievement', actionLabel: 'Share', actionRoute: '/career/' },
  { title: 'Savings Milestone Reached! 💰', message: 'You\'ve saved ₹25,000 this month — hitting your monthly savings milestone! Keep building your financial safety net.', priority: 'achievement', actionLabel: 'View Savings', actionRoute: '/finance/' },
  { title: 'Fitness Target Achieved! 💪', message: 'You hit your weekly step goal of 56,000 steps! That\'s 8 km of walking. Your cardiovascular health thanks you.', priority: 'achievement', actionLabel: 'View Stats', actionRoute: '/health/' },
  { title: 'Goal Completed: ML Basics ✅', message: 'You completed "Learn ML Fundamentals" — 100% done! This unlocks the "Data Science Path" in your career roadmap.', priority: 'achievement', actionLabel: 'Next Goal', actionRoute: '/goals/' },
  { title: '30-Day Streak! 🏆', message: 'You\'ve maintained at least one daily goal for 30 consecutive days. Incredible discipline — keep going!', priority: 'achievement', actionLabel: 'View Journey', actionRoute: '/goals/' },
  { title: 'Budget Master Badge 🎖️', message: 'You stayed under budget for 4 consecutive weeks. You\'ve earned the Budget Master badge!', priority: 'achievement', actionLabel: 'View Badges', actionRoute: '/finance/' },
  { title: 'Early Riser Achievement ☀️', message: 'You woke up before 7 AM for 5 consecutive days. Morning routines correlate with higher productivity.', priority: 'achievement', actionLabel: 'View Habits', actionRoute: '/health/' },
];

// ─── Category Metadata ───────────────────────────────────────────────────────

export const CATEGORIES = {
  health:       { label: 'Health',       emoji: '🧬', color: '#10c7a1', iconKey: 'HeartPulse' },
  career:       { label: 'Career',       emoji: '🎯', color: '#7b61ff', iconKey: 'Briefcase' },
  finance:      { label: 'Finance',      emoji: '💎', color: '#c8a84b', iconKey: 'Wallet' },
  goals:        { label: 'Goals',        emoji: '🏁', color: '#38bdf8', iconKey: 'Target' },
  ai_insights:  { label: 'AI Insights',  emoji: '🤖', color: '#a78bfa', iconKey: 'Brain' },
  achievements: { label: 'Achievements', emoji: '🏆', color: '#f59e0b', iconKey: 'Trophy' },
};

export const PRIORITY_CONFIG = {
  critical:       { label: 'Critical',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  sortOrder: 0 },
  warning:        { label: 'Warning',        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', sortOrder: 1 },
  recommendation: { label: 'Recommendation', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', sortOrder: 2 },
  achievement:    { label: 'Achievement',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', sortOrder: 3 },
};

// ─── Generator ───────────────────────────────────────────────────────────────

export function generateDailyNotifications(date = new Date()) {
  const seed = hashSeed(date.toDateString());
  const rng = createRng(seed);

  const pools = [
    { category: 'health',       items: HEALTH_NOTIFICATIONS },
    { category: 'career',       items: CAREER_NOTIFICATIONS },
    { category: 'finance',      items: FINANCE_NOTIFICATIONS },
    { category: 'goals',        items: GOAL_NOTIFICATIONS },
    { category: 'ai_insights',  items: AI_INSIGHT_NOTIFICATIONS },
    { category: 'achievements', items: ACHIEVEMENT_NOTIFICATIONS },
  ];

  const notifications = [];
  let idCounter = 0;

  for (const pool of pools) {
    // Pick 3-6 items from each category
    const count = 3 + Math.floor(rng() * 4);
    const selected = pickRandom(pool.items, Math.min(count, pool.items.length), rng);

    for (const item of selected) {
      idCounter++;
      // Generate a realistic timestamp for today (spread throughout the day)
      const hour = Math.floor(rng() * 16) + 6; // 6 AM to 10 PM
      const minute = Math.floor(rng() * 60);
      const ts = new Date(date);
      ts.setHours(hour, minute, 0, 0);

      notifications.push({
        id: `notif-${seed}-${idCounter}`,
        category: pool.category,
        title: item.title,
        message: item.message,
        priority: item.priority,
        timestamp: ts.toISOString(),
        isRead: rng() > 0.65, // ~35% chance already read
        actionLabel: item.actionLabel,
        actionRoute: item.actionRoute,
      });
    }
  }

  // Sort: priority order first, then by time (newest first)
  notifications.sort((a, b) => {
    const pa = PRIORITY_CONFIG[a.priority]?.sortOrder ?? 99;
    const pb = PRIORITY_CONFIG[b.priority]?.sortOrder ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return notifications;
}

// ─── Twin Analysis ───────────────────────────────────────────────────────────

const SUMMARIES = [
  "Your health metrics are solid today with good sleep recovery, but career engagement dropped — you missed your study target. Finance is on track with no impulse spending detected. Focus on completing at least 2 study hours before EOD to maintain momentum.",
  "Mixed signals today: excellent financial discipline and goal progress, but your step count and water intake are lagging. Heart rate variability suggests moderate stress. Schedule a 15-minute walk and hydration break.",
  "Strong overall performance today. Productivity is trending upward and sleep quality continues to improve. Minor concern: spending slightly over daily budget. Your Twin recommends reviewing entertainment expenses.",
  "Today shows a classic pattern — high career output at the cost of physical wellness. You've been sedentary for extended periods and skipped your workout. Remember: sustainable performance requires balance.",
  "Great momentum across all modules! Your study streak is intact, savings are growing, and fitness targets are on track. One suggestion: your deep sleep percentage can improve with a consistent bedtime.",
  "Your Digital Twin detected a correlation: yesterday's poor sleep (4.5 hrs) is affecting today's focus scores. Productivity dropped 18% compared to your baseline. Prioritize recovery tonight for a better tomorrow.",
  "Financial health is excellent — you're ahead on savings and no unusual transactions detected. Career module shows declining engagement though. Your Twin suggests committing to 1 focused study session today.",
  "Balanced day so far. Health score is steady, career goals are progressing, and your spending is within limits. Your Twin highlights an opportunity: your morning productivity window (9-11 AM) is underutilized.",
];

export function getTwinAnalysis(date = new Date()) {
  const seed = hashSeed(date.toDateString());
  const rng = createRng(seed + 42); // Different seed offset for analysis

  const healthScore = 65 + Math.floor(rng() * 30);    // 65-94
  const careerScore = 55 + Math.floor(rng() * 35);    // 55-89
  const financeScore = 70 + Math.floor(rng() * 25);   // 70-94
  const goalCompletion = 45 + Math.floor(rng() * 45);  // 45-89

  const summaryIndex = Math.floor(rng() * SUMMARIES.length);

  return {
    healthScore,
    careerScore,
    financeScore,
    goalCompletion,
    summary: SUMMARIES[summaryIndex],
    overallScore: Math.round((healthScore + careerScore + financeScore + goalCompletion) / 4),
  };
}
