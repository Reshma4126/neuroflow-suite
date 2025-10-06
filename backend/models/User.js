const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  password: { 
    type: String 
  },
  faceDescriptor: { 
    type: [Number], 
    default: null 
  },
  adhdSubtype: { 
    type: String, 
    enum: ['inattentive', 'hyperactive', 'combined'],
    default: 'combined'
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    reminderFrequency: { type: String, default: 'medium' },
    rewardType: { 
      type: String, 
      enum: ['visual', 'audio', 'both'],
      default: 'both' 
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('User', userSchema);
