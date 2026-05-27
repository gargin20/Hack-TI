import GamificationEngine from '../services/GamificationEngine.js';

// @desc    Log a workout and award XP
// @route   POST /api/health-metrics/workout
export const logWorkout = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId from your auth middleware
    const userId = req.user.userId; 
    const { type, duration } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'WORKOUT_LOGGED', 
      { type, duration }
    );

    res.status(201).json({
      success: true,
      message: 'Workout logged successfully!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Health Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Log sleep and award XP
// @route   POST /api/health-metrics/sleep
export const logSleep = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId
    const userId = req.user.userId; 
    const { hours } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'SLEEP_LOGGED', 
      { hours }
    );

    res.status(201).json({
      success: true,
      message: 'Sleep logged successfully!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Health Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};