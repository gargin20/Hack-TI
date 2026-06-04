import mongoose from 'mongoose';

const dailyTrackingSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateString: { type: String, required: true },
  health: {
    caloriesConsumed:  { type: Number, default: 0 },
    proteinConsumed:   { type: Number, default: 0 },
    waterLiters:       { type: Number, default: 0 },
    stressLevel:       { type: Number, min: 1, max: 10, default: null },
    mood:              { type: String, enum: ['excellent', 'good', 'neutral', 'bad', 'terrible'], default: null },
    sleepHours:        { type: Number, default: 0 },
    medicationsTaken:  [{ name: { type: String }, timeTaken: { type: Date, default: Date.now } }],
    workouts:          [{ type: { type: String }, durationMinutes: { type: Number } }],
    deficiencies:      [{ type: String }],
    medications:       [{ type: String }],
    vitals:            { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  finance: {
    moneySpent:    { type: Number, default: 0 },
    moneyCredited: { type: Number, default: 0 },
    transactions:  [{
      amount:    { type: Number },
      category:  { type: String },
      type:      { type: String, enum: ['income', 'expense'] },
      isImpulse: { type: Boolean, default: false },
    }],
    portfolioValue: { type: Number, default: 0 },
    returns:        { type: Number, default: 0 },
    holdings:       [{
      assetName: { type: String },
      value:     { type: Number },
      shares:    { type: Number },
    }],
  },
  career: {
    studyHours:        { type: Number, default: 0 },
    completedCourses:  { type: Number, default: 0 },
    githubCommits:     { type: Number, default: 0 },
    projectsCompleted: { type: Number, default: 0 },
  },
}, { timestamps: true });

// ── Autonomous Goal Sync Hook ──────────────────────────────────────
// Fires after EVERY save of a DailyTracking document.
// Passes the previous snapshot so GoalSyncEngine computes only
// the NEW delta added this save — not the full day total.
dailyTrackingSchema.post('save', async function (doc) {
  try {
    // Lazy import to avoid circular dependency issues
    const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');

    // _prevSnapshot is attached before save() in the routes (see ai.js)
    // If not present, GoalSyncEngine will use the full day value (safe fallback)
    await GoalSyncEngine.syncGoalsFromDailyLog(
      doc.userId.toString(),
      doc,
      doc._prevSnapshot || null
    );
  } catch (err) {
    // Never crash the main request if goal sync fails
    console.error('GoalSyncEngine post-save error:', err.message);
  }
});

export default mongoose.model('DailyTracking', dailyTrackingSchema);