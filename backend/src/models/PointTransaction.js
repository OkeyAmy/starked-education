const mongoose = require('mongoose');

const pointTransactionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['earned', 'spent', 'bonus', 'penalty'],
    required: true
  },
  category: {
    type: String,
    enum: ['lesson', 'quiz', 'achievement', 'streak', 'bonus', 'reward', 'challenge', 'social'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  metadata: {
    courseId: String,
    quizId: String,
    achievementId: String,
    challengeId: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
pointTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PointTransaction', pointTransactionSchema);
