import mongoose from 'mongoose';

const BadgeDefinitionSchema = new mongoose.Schema({
  badgeId: { type: String, required: true, unique: true },
  domain: { type: String, enum: ['finance', 'health', 'career', 'general'], required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  condition: {
    type: { type: String, enum: ['streak', 'event_count'], required: true },
    event: { type: String }, 
    targetValue: { type: Number, required: true } 
  }
});

export default mongoose.model('BadgeDefinition', BadgeDefinitionSchema);