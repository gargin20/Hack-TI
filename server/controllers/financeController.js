import GamificationEngine from '../services/GamificationEngine.js';

export const logExpense = async (req, res) => {
  try {
    // ✅ FIXED: Your auth.js uses .userId!
    const userId = req.user.userId; 
    const { amount, description } = req.body;

    const gamificationResult = await GamificationEngine.logEvent(
      userId, 
      'EXPENSE_LOGGED', 
      { amount, description }
    );

    res.status(201).json({
      success: true,
      message: 'Expense logged successfully!',
      gamification: gamificationResult 
    });

  } catch (error) {
    console.error('Finance Controller Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};