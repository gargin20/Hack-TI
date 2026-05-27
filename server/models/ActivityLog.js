import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain: { type: String, enum: ['finance', 'health', 'career', 'general'], required: true },
  event: { type: String, required: true }, 
  xpAwarded: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export default mongoose.model('ActivityLog', ActivityLogSchema);