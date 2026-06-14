import express from 'express';
import {
  createMealPlan,
  getMealPlans,
  getMealPlanById,
  regenerateMealPlan,
  updateMealPlanProgress,
  deleteMealPlan,
  getCoachAdvice
} from '../controllers/mealPlanController.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

router.post('/create', authenticateToken, asyncHandler(createMealPlan));
router.get('/', authenticateToken, asyncHandler(getMealPlans));
router.get('/:id', authenticateToken, asyncHandler(getMealPlanById));
router.put('/:id/regenerate', authenticateToken, asyncHandler(regenerateMealPlan));
router.post('/:id/update-progress', authenticateToken, asyncHandler(updateMealPlanProgress));
router.delete('/:id', authenticateToken, asyncHandler(deleteMealPlan));
router.post('/coach-advice', authenticateToken, asyncHandler(getCoachAdvice));

export default router;
