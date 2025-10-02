const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  trigger: {
    type: String,
    required: true,
    trim: true
  },
  stackedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    default: null
  },
  streakCount: {
    type: Number,
    default: 0,
    min: 0
  },
  completionHistory: [{
    date: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      required: true
    }
  }],
  reminderEnabled: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Calculate current streak
habitSchema.methods.calculateStreak = function() {
  if (this.completionHistory.length === 0) return 0;
  
  const sortedHistory = this.completionHistory
    .sort((a, b) => b.date - a.date);
  
  let streak = 0;
  for (let record of sortedHistory) {
    if (record.completed) {
      streak++;
    } else {
      break;
    }
  }
  
  this.streakCount = streak;
  return streak;
};

module.exports = mongoose.model('Habit', habitSchema);
