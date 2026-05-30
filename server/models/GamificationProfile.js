import mongoose from 'mongoose';

const gamificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  unlockedBadges: [{ type: String }], // Array of badge IDs
  history: [{
    activity: String,
    points: Number,
    emoji: String,
    timestamp: { type: Date, default: Date.now }
  }],
  lastSyncDate: { type: Date }
});

export default mongoose.model('GamificationProfile', gamificationSchema);