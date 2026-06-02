import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import SmartGoal from '../models/SmartGoal.js';
import DailyTracking from '../models/DailyTracking.js';
import GamificationEngine from '../services/GamificationEngine.js';

const router = express.Router();

// ── POST / — UNCHANGED ────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { domain, title, description, targetMetric, unit, priority, deadline } = req.body;
    const newGoal = await SmartGoal.create({
      userId, domain, title, description, targetMetric, unit, priority, deadline
    });
    const gamification = await GamificationEngine.logEvent(userId, 'GOAL_SET', { goalId: newGoal._id });
    res.status(201).json({ success: true, data: newGoal, gamification });
  } catch (error) {
    console.error('Goal Creation Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── GET / — UNCHANGED ─────────────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const goals = await SmartGoal.find({ userId: req.user.userId }).sort({ deadline: 1 });
    res.status(200).json({ success: true, data: goals });
  } catch (error) {
    console.error('Fetch Goals Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── PATCH /:id/progress — UNCHANGED ──────────────────────────────
router.patch('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { increment, note } = req.body;

    if (increment === undefined || isNaN(Number(increment))) {
      return res.status(400).json({ success: false, message: 'Invalid increment value.' });
    }

    const goal = await SmartGoal.findOne({ _id: req.params.id, userId });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });

    const addAmount = Number(increment);
    goal.currentMetric = Math.min(goal.currentMetric + addAmount, goal.targetMetric);

    const now       = new Date();
    const lastLog   = goal.lastLoggedAt ? new Date(goal.lastLoggedAt) : null;
    const daysSince = lastLog ? (now - lastLog) / 86_400_000 : null;

    if (!lastLog)           goal.streak = 1;
    else if (daysSince < 1) { /* same day */ }
    else if (daysSince < 2) goal.streak = (goal.streak || 0) + 1;
    else                    goal.streak = 1;

    goal.lastLoggedAt = now;
    goal.progressLogs.push({ value: addAmount, note: note || '', loggedAt: now });
    await goal.save();

    const eventName    = goal.status === 'completed' ? 'GOAL_COMPLETED' : 'GOAL_PROGRESS_LOGGED';
    const streakBonus  = goal.streak >= 7 ? 15 : goal.streak >= 3 ? 5 : 0;
    const gamification = await GamificationEngine.logEvent(userId, eventName, { goalId: goal._id, streakBonus });

    res.status(200).json({ success: true, data: goal, gamification });
  } catch (error) {
    console.error('Progress Log Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── GET /weekly-digest — UNCHANGED ───────────────────────────────
router.get('/weekly-digest', authenticateToken, async (req, res) => {
  try {
    const goals = await SmartGoal.find({ userId: req.user.userId });
    if (!goals.length) {
      return res.status(200).json({
        success: true,
        digest: { summary: 'No objectives yet.', highlights: [], advice: 'Create your first goal to unlock the weekly digest.' }
      });
    }

    const completed = goals.filter(g => g.status === 'completed');
    const atRisk    = goals.filter(g => g.status === 'at-risk');
    const active    = goals.filter(g => g.status === 'active');
    const highPri   = active.filter(g => g.priority === 'high');
    const topStreak = goals.reduce((best, g) => g.streak > best ? g.streak : best, 0);
    const avgPct    = goals.reduce((s, g) => s + (g.currentMetric / g.targetMetric), 0) / goals.length * 100;
    const byDomain  = { health: 0, finance: 0, career: 0 };
    goals.forEach(g => byDomain[g.domain]++);

    const highlights = [
      completed.length > 0 ? `🏆 ${completed.length} goal(s) fully completed` : null,
      atRisk.length > 0    ? `⚠️ ${atRisk.length} goal(s) are past deadline` : null,
      highPri.length > 0   ? `🔴 ${highPri.length} high-priority: ${highPri.slice(0,2).map(g=>g.title).join(', ')}` : null,
      topStreak > 1        ? `🔥 Longest active streak: ${topStreak} days` : null,
      `📊 ${byDomain.health} health · ${byDomain.finance} finance · ${byDomain.career} career`,
    ].filter(Boolean);

    let advice = 'Consistent daily progress beats occasional sprints.';
    if (atRisk.length > 0)                   advice = `${atRisk.length} overdue goal(s). Reset deadlines or make one big push this week.`;
    else if (completed.length === goals.length) advice = 'All objectives complete. Time to raise the bar.';
    else if (avgPct < 15)                    advice = 'Early momentum is everything. Even 1% daily compounds dramatically.';

    res.status(200).json({
      success: true,
      digest: {
        summary:    `${goals.length} objectives · ${Math.round(avgPct)}% avg progress · ${completed.length} completed`,
        highlights,
        advice
      }
    });
  } catch (error) {
    console.error('Weekly Digest Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ── NEW: GET /sync-status — what today's tracking auto-synced ─────
// @desc  Returns today's DailyTracking values mapped against goals
//        so the frontend can show "Last synced 2 min ago" badges
// @route GET /api/goals/sync-status
router.get('/sync-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today  = new Date().toISOString().split('T')[0];

    const [dailyLog, goals] = await Promise.all([
      DailyTracking.findOne({ userId, dateString: today }),
      SmartGoal.find({ userId, status: { $ne: 'completed' } }).select('title domain unit currentMetric targetMetric lastLoggedAt streak').lean()
    ]);

    // Build a human-readable sync summary
    const sources = dailyLog ? [
      dailyLog.health.caloriesConsumed  > 0 && { label: 'Calories',    value: `${dailyLog.health.caloriesConsumed} kcal`,  domain: 'health' },
      dailyLog.health.proteinConsumed   > 0 && { label: 'Protein',     value: `${dailyLog.health.proteinConsumed}g`,        domain: 'health' },
      dailyLog.health.sleepHours        > 0 && { label: 'Sleep',       value: `${dailyLog.health.sleepHours}h`,             domain: 'health' },
      dailyLog.health.waterLiters       > 0 && { label: 'Water',       value: `${dailyLog.health.waterLiters}L`,            domain: 'health' },
      dailyLog.health.workouts?.length  > 0 && { label: 'Workouts',    value: `${dailyLog.health.workouts.length} session`, domain: 'health' },
      dailyLog.finance.moneySpent       > 0 && { label: 'Money Spent', value: `₹${dailyLog.finance.moneySpent}`,           domain: 'finance' },
      dailyLog.finance.moneyCredited    > 0 && { label: 'Credited',    value: `₹${dailyLog.finance.moneyCredited}`,        domain: 'finance' },
    ].filter(Boolean) : [];

    res.status(200).json({
      success: true,
      lastSyncedAt: dailyLog?.updatedAt || null,
      sources,
      goals,
    });
  } catch (error) {
    console.error('Sync Status Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;