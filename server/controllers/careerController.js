import GamificationEngine from '../services/GamificationEngine.js';

// @desc    Log a completed course/learning session
// @route   POST /api/career/course
export const logCourse = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId
    const userId = req.user.userId; 
    const { courseName } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'COURSE_DONE', 
      { courseName }
    );

    res.status(201).json({
      success: true,
      message: 'Course completion logged!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Career Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Log a deep work / focus session
// @route   POST /api/career/focus
export const logFocusSession = async (req, res) => {
  try {
    // ✅ FIXED: Using .userId
    const userId = req.user.userId; 
    const { durationMinutes } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'FOCUS_SESSION_COMPLETED', 
      { durationMinutes }
    );

    res.status(201).json({
      success: true,
      message: 'Focus session logged!',
      gamification: gamificationResult 
    });
  } catch (error) {
    console.error('Career Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};