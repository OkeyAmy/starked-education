const mongoose = require('mongoose');

const leaderboardEntrySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  points: {
    type: Number,
    default: 0,
    index: true
  },
  level: {
    type: Number,
    default: 1
  },
  streak: {
    type: Number,
    default: 0
  },
  badgesEarned: {
    type: Number,
    default: 0
  },
  coursesCompleted: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    index: true
  },
  previousRank: {
    type: Number
  },
  rankChange: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['global', 'course', 'friends', 'weekly', 'monthly'],
    default: 'global',
    index: true
  },
  categoryId: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient leaderboard queries
leaderboardEntrySchema.index({ category: 1, categoryId: 1, points: -1 });

module.exports = mongoose.model('LeaderboardEntry', leaderboardEntrySchema);
