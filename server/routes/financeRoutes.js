import express from 'express';
import { logExpense } from '../controllers/financeController.js';
// ✅ Import the correct name!
import { authenticateToken } from '../middleware/auth.js'; 

const router = express.Router();

// ✅ Use the correct name here too!
router.post('/expense', authenticateToken, logExpense);

export default router;