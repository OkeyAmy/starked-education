const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['individual', 'team', 'community', 'course'],
    required: true
  },
  category: {
    type: String,
    enum: ['learning', 'quiz', 'streak', 'social', 'creative'],
    required: true
  },
  objectives: [{
    type: {
      id: String,
      description: String,
      target: Number,
      current: {
        type: Number,
        default: 0
      },
      completed: {
        type: Boolean,
        default: false
      }
    }
  }],
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    badges: [{
      badgeId: String,
      name: String,
      icon: String
    }],
    multipliers: {
      type: Number,
      default: 1.0
    }
  },
  participants: [{
    userId: String,
    joinedAt: Date,
    progress: Number,
    completed: {
      type: Boolean,
      default: false
    },
    rank: Number
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  maxParticipants: {
    type: Number
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'friends'],
    default: 'public'
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
challengeSchema.index({ status: 1, startDate: -1 });
challengeSchema.index({ type: 1, category: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
