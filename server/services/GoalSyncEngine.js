/**
 * GoalSyncEngine.js
 * ─────────────────────────────────────────────────────────────────
 * Autonomous goal progress engine.
 * Called automatically whenever DailyTracking is updated.
 * Maps tracked data → matching SmartGoals → updates currentMetric.
 * Zero manual input required from the user.
 * ─────────────────────────────────────────────────────────────────
 */

import SmartGoal from '../models/SmartGoal.js';
import GamificationEngine from './GamificationEngine.js';

// ── Mapping rules ──────────────────────────────────────────────────
// Each rule defines:
//   source      : dot-path into DailyTracking (health.* or finance.*)
//   unitPatterns: regex list to match goal.unit against
//   domain      : which SmartGoal domain to search
//   mode        : 'increment' (add delta) | 'set' (replace value)
//   transform   : optional fn to convert raw value before applying

const SYNC_RULES = [
  // ── HEALTH ──────────────────────────────────────────────────────

  {
    source:       'health.caloriesConsumed',
    domain:       'health',
    unitPatterns: [/kcal/i, /calorie/i, /cal\b/i],
    mode:         'increment',
  },
  {
    source:       'health.proteinConsumed',
    domain:       'health',
    unitPatterns: [/protein/i, /\bg\b/, /gram/i],
    mode:         'increment',
  },
  {
    source:       'health.waterLiters',
    domain:       'health',
    unitPatterns: [/liter/i, /litre/i, /\bl\b/, /water/i],
    mode:         'increment',
  },
  {
    source:       'health.sleepHours',
    domain:       'health',
    unitPatterns: [/hour/i, /sleep/i, /\bhr/i, /night/i],
    mode:         'increment',
  },
  {
    source:       'health.workouts',        // array → sum of durationMinutes
    domain:       'health',
    unitPatterns: [/min/i, /workout/i, /session/i, /exercise/i],
    mode:         'increment',
    transform:    (workouts) =>
      Array.isArray(workouts)
        ? workouts.reduce((s, w) => s + (w.durationMinutes || 0), 0)
        : 0,
  },

  // ── FINANCE ─────────────────────────────────────────────────────

  {
    source:       'finance.moneySpent',
    domain:       'finance',
    unitPatterns: [/₹/i, /\binr\b/i, /\brs\b/i, /rupee/i, /spend/i],
    mode:         'increment',
  },
  {
    source:       'finance.moneyCredited',
    domain:       'finance',
    unitPatterns: [/save/i, /saving/i, /invest/i, /credit/i],
    mode:         'increment',
  },
  {
    source:       'finance.portfolioValue',
    domain:       'finance',
    unitPatterns: [/portfolio/i, /invest/i, /value/i, /holding/i, /mutual/i, /fund/i],
    mode:         'set',
  },
  // ── CAREER ──────────────────────────────────────────────────────
  {
    source:       'career.studyHours',
    domain:       'career',
    unitPatterns: [/hour/i, /study/i, /learn/i, /\bhr/i, /class/i],
    mode:         'increment',
  },
  {
    source:       'career.completedCourses',
    domain:       'career',
    unitPatterns: [/course/i, /cert/i, /certificate/i, /degree/i],
    mode:         'increment',
  },
  {
    source:       'career.githubCommits',
    domain:       'career',
    unitPatterns: [/commit/i, /push/i, /code/i, /contribution/i],
    mode:         'increment',
  },
  {
    source:       'career.projectsCompleted',
    domain:       'career',
    unitPatterns: [/project/i, /app\b/i, /repo/i, /build/i],
    mode:         'increment',
  },
];

// ── Utility: read nested value from object by dot-path ────────────
function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// ── Core sync function ─────────────────────────────────────────────
/**
 * syncGoalsFromDailyLog
 * @param {string}        userId       - Mongo ObjectId string
 * @param {DailyTracking} dailyLog     - The full saved DailyTracking document
 * @param {object}        prevSnapshot - Optional: values BEFORE this save (to compute delta)
 *
 * Returns: array of { goal, addedValue } for every goal updated
 */
async function syncGoalsFromDailyLog(userId, dailyLog, prevSnapshot = null) {
  const updatedGoals = [];

  // Fetch all active goals for this user once
  const activeGoals = await SmartGoal.find({ userId, status: { $ne: 'completed' } });
  if (!activeGoals.length) return updatedGoals;

  for (const rule of SYNC_RULES) {
    // ── 1. Extract raw value from today's log ──
    const rawValue = getNestedValue(dailyLog, rule.source);
    if (rawValue === undefined || rawValue === null) continue;

    // ── 2. Apply transform if defined (e.g. workouts array → minutes) ──
    const currentValue = rule.transform ? rule.transform(rawValue) : Number(rawValue);
    if (!currentValue || currentValue <= 0) continue;

    // ── 3. Compute delta (only the NEW amount added this save) ──
    let delta = currentValue;
    if (prevSnapshot) {
      const prevRaw   = getNestedValue(prevSnapshot, rule.source);
      const prevValue = rule.transform
        ? rule.transform(prevRaw || (Array.isArray(rawValue) ? [] : 0))
        : Number(prevRaw || 0);
      delta = currentValue - prevValue;
    }
    if (delta <= 0) continue;

    // ── 4. Find matching goals by domain + unit pattern ──
    const matchingGoals = activeGoals.filter(goal => {
      if (goal.domain !== rule.domain) return false;
      return rule.unitPatterns.some(pattern => pattern.test(goal.unit));
    });

    // ── 5. Update each matching goal ──
    for (const goal of matchingGoals) {
      const before = goal.currentMetric;

      if (rule.mode === 'increment') {
        goal.currentMetric = Math.min(goal.currentMetric + delta, goal.targetMetric);
      } else if (rule.mode === 'set') {
        goal.currentMetric = Math.min(currentValue, goal.targetMetric);
      }

      const added = goal.currentMetric - before;
      if (added <= 0) continue;

      // Streak update
      const now       = new Date();
      const lastLog   = goal.lastLoggedAt ? new Date(goal.lastLoggedAt) : null;
      const daysSince = lastLog ? (now - lastLog) / 86_400_000 : null;

      if (!lastLog)            goal.streak = 1;
      else if (daysSince < 1)  { /* same day — no streak change */ }
      else if (daysSince < 2)  goal.streak = (goal.streak || 0) + 1;
      else                     goal.streak = 1;

      goal.lastLoggedAt = now;
      goal.progressLogs.push({
        value:    added,
        note:     `Auto-synced from ${rule.source}`,
        loggedAt: now,
      });

      await goal.save(); // pre-save hook sets status automatically

      // Fire gamification event
      const eventName = goal.status === 'completed'
        ? 'GOAL_COMPLETED'
        : 'GOAL_PROGRESS_LOGGED';

      await GamificationEngine.logEvent(userId, eventName, {
        goalId:    goal._id,
        autoSync:  true,
        addedValue: added,
      });

      updatedGoals.push({
        goalId:    goal._id,
        title:     goal.title,
        domain:    goal.domain,
        added,
        current:   goal.currentMetric,
        target:    goal.targetMetric,
        unit:      goal.unit,
        completed: goal.status === 'completed',
      });
    }
  }

  return updatedGoals;
}

export default { syncGoalsFromDailyLog };