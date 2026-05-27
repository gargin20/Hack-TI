import express from 'express';
import UserGamification from '../models/UserGamification.js';
import BadgeDefinition from '../models/BadgeDefinition.js';
// ✅ Import the correct middleware
import { authenticateToken } from '../middleware/auth.js'; 

const router = express.Router();

// ✅ Add the middleware here
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // ✅ FIXED: Your auth.js uses .userId!
    const userId = req.user.userId; 

    let gamification = await UserGamification.findOne({ userId });
    
    if (!gamification) {
      return res.status(200).json({
        success: true,
        data: {
          totalXP: 0,
          level: 1,
          streaks: {
            finance: { current: 0, best: 0 },
            health: { current: 0, best: 0 },
            career: { current: 0, best: 0 }
          },
          badges: [],
          weeklyXP: 0
        }
      });
    }

    res.status(200).json({
      success: true,
      data: gamification
    });
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.get('/badges', async (req, res) => {
  try {
    const badges = await BadgeDefinition.find({});
    res.status(200).json({
      success: true,
      data: badges
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;