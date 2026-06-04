import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    domain: {
      type: String,
      enum: ['health', 'finance', 'career'],
      required: true,
    },
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Upload', uploadSchema);
