import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { connect, callback, live } from '../controllers/googleFitController.js';

const router = express.Router();

router.get('/connect', authenticateToken, asyncHandler(connect));
router.get('/callback', asyncHandler(callback)); // callback may not have auth header
router.get('/live', authenticateToken, asyncHandler(live));

export default router;
