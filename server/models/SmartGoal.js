import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date }
});

const progressLogSchema = new mongoose.Schema({
  value:    { type: Number, required: true },
  note:     { type: String },
  loggedAt: { type: Date, default: Date.now }
});

const smartGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  domain: { type: String, enum: ['health', 'finance', 'career'], required: true },
  title:       { type: String, required: true },
  description: { type: String },

  // S.M.A.R.T Tracking
  targetMetric:  { type: Number, required: true },
  currentMetric: { type: Number, default: 0 },
  unit:          { type: String, required: true },

  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline: { type: Date, required: true },

  milestones:   [milestoneSchema],
  progressLogs: [progressLogSchema],  // NEW: full history of every log entry

  // NEW: streak intelligence
  streak:       { type: Number, default: 0 },
  lastLoggedAt: { type: Date },

  status: { type: String, enum: ['active', 'completed', 'at-risk'], default: 'active' }
}, { timestamps: true });

// Auto-update status before every save
smartGoalSchema.pre('save', function (next) {
  if (this.currentMetric >= this.targetMetric) {
    this.status = 'completed';
  } else if (new Date(this.deadline) < new Date() && this.status !== 'completed') {
    this.status = 'at-risk';
  } else {
    this.status = 'active';
  }
  next();
});

export default mongoose.model('SmartGoal', smartGoalSchema);