import express from 'express';
import { extractReport, reportUploadMiddleware } from '../controllers/reportAnalysisController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/report-analysis/extract
router.post('/extract', authenticateToken, reportUploadMiddleware, extractReport);

export default router;

