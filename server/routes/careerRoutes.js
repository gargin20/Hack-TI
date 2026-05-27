import express from 'express';
import { logCourse, logFocusSession } from '../controllers/careerController.js';
// ✅ IMPORT MIDDLEWARE
import { authenticateToken } from '../middleware/auth.js'; 

const router = express.Router();

// ✅ APPLY MIDDLEWARE
router.post('/course', authenticateToken, logCourse);
router.post('/focus', authenticateToken, logFocusSession);

export default router;