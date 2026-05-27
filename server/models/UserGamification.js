import mongoose from 'mongoose';

const UserGamificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  totalXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streaks: {
    finance: { current: { type: Number, default: 0 }, best: { type: Number, default: 0 }, lastActivity: { type: Date, default: null } },
    health: { current: { type: Number, default: 0 }, best: { type: Number, default: 0 }, lastActivity: { type: Date, default: null } },
    career: { current: { type: Number, default: 0 }, best: { type: Number, default: 0 }, lastActivity: { type: Date, default: null } }
  },
  badges: [{
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now }
  }],
  weeklyXP: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('UserGamification', UserGamificationSchema);