import mongoose from 'mongoose';

const mealPlanProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mealPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealPlan', required: true, index: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  breakfastCompleted: { type: Boolean, default: false },
  lunchCompleted: { type: Boolean, default: false },
  dinnerCompleted: { type: Boolean, default: false },
  waterCompleted: { type: Boolean, default: false },
  completionPercentage: { type: Number, default: 0 }
}, { timestamps: true });

mealPlanProgressSchema.index({ userId: 1, mealPlanId: 1, date: 1 }, { unique: true });

export default mongoose.model('MealPlanProgress', mealPlanProgressSchema);
