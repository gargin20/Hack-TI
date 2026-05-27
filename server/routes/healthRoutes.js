import express from 'express';
import { logWorkout, logSleep } from '../controllers/healthController.js';
// ✅ IMPORT MIDDLEWARE
import { authenticateToken } from '../middleware/auth.js'; 

const router = express.Router();

// ✅ APPLY MIDDLEWARE
router.post('/workout', authenticateToken, logWorkout);
router.post('/sleep', authenticateToken, logSleep);

export default router;