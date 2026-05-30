import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import GamificationProfile from '../models/GamificationProfile.js';

const router = express.Router();

// Define available badges and their XP thresholds
const BADGE_DICTIONARY = [
  { id: 'first_step', title: 'Genesis Sync', xpNeeded: 50, icon: '⚡', requirement: 'Connect your first live API link' },
  { id: 'disciplined_spender', title: 'Frugal Titan', xpNeeded: 150, icon: '🛡️', requirement: 'Log 3 consecutive non-impulse days' },
  { id: 'sleep_master', title: 'Circadian King', xpNeeded: 300, icon: '💤', requirement: 'Achieve >7.5 hours of tracked sleep' },
  { id: 'deep_worker', title: '10x Architect', xpNeeded: 500, icon: '💻', requirement: 'Pass 30 GitHub commits in a cycle' }
];

// @desc    Evaluate background API data against rules and award XP
// @route   POST /api/gamification/evaluate-sync
router.post('/evaluate-sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { healthData, financeData, careerData } = req.body;

    // 1. Fetch or Create the User's Gamification Profile
    let profile = await GamificationProfile.findOne({ userId });
    if (!profile) {
      profile = new GamificationProfile({ userId });
    }

    let xpEarnedThisSync = 0;
    let newLogs = [];

    // ==========================================
    // 2. THE LOGIC RULES (Now Crash-Proof with '?.' Optional Chaining)
    // ==========================================

    // Rule 1: Health Goal - Steps
    if (healthData?.metrics?.steps >= 8000) {
      xpEarnedThisSync += 50;
      newLogs.push({ activity: `Hit daily movement target (${healthData.metrics.steps} steps)`, points: 50, emoji: '👟' });
    }

    // Rule 2: Health Goal - Deep Recovery
    if (healthData?.metrics?.sleepHours >= 7 && healthData?.metrics?.hrv > 60) {
      xpEarnedThisSync += 75;
      newLogs.push({ activity: 'Optimal sleep & HRV recovery detected', points: 75, emoji: '💤' });
    }

    // Rule 3: Finance Goal - Credit / Savings
    if (financeData?.creditScore >= 750) {
      xpEarnedThisSync += 100;
      newLogs.push({ activity: `Maintained Prime Credit (${financeData.creditScore})`, points: 100, emoji: '🏦' });
    }

    // Rule 4: Career Goal - Deep Work (Fixed path to githubCommitsThisWeek)
    if (careerData?.githubCommitsThisWeek > 20) {
      xpEarnedThisSync += 60;
      newLogs.push({ activity: `High-volume deep work session verified (${careerData.githubCommitsThisWeek} commits)`, points: 60, emoji: '💻' });
    }

    // ==========================================
    // 3. APPLY UPDATES & UNLOCK BADGES
    // ==========================================
    
    // Only update if points were actually earned
    let newlyUnlockedBadges = [];
    if (xpEarnedThisSync > 0) {
      profile.totalXP += xpEarnedThisSync;
      profile.level = Math.floor(profile.totalXP / 500) + 1; // Level up every 500 XP
      
      // Add new logs to history
      profile.history.push(...newLogs);

      // Check for new badges
      BADGE_DICTIONARY.forEach(badge => {
        if (profile.totalXP >= badge.xpNeeded && !profile.unlockedBadges.includes(badge.id)) {
          profile.unlockedBadges.push(badge.id);
          newlyUnlockedBadges.push(badge);
        }
      });

      profile.lastSyncDate = new Date();
      await profile.save();
    }

    // 4. Return the updated truth to the frontend
    res.status(200).json({
      success: true,
      data: profile,
      syncResults: {
        xpEarned: xpEarnedThisSync,
        logs: newLogs,
        newBadges: newlyUnlockedBadges
      }
    });

  } catch (error) {
    console.error('Gamification Evaluation Error:', error);
    res.status(500).json({ success: false, message: 'Gamification Engine Error' });
  }
});

// @desc    Get Current Gamification State
// @route   GET /api/gamification/status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    let profile = await GamificationProfile.findOne({ userId: req.user.userId });
    if (!profile) profile = await GamificationProfile.create({ userId: req.user.userId });
    res.status(200).json({ success: true, data: profile, availableBadges: BADGE_DICTIONARY });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

export default router;