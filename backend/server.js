const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors()); // Enable CORS for frontend requests
app.use(express.json()); // For parsing JSON requests

// Use JWT_SECRET from env or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'default_fallback_secret_change_in_production';

// Connect to MongoDB
mongoose.connect("mongodb+srv://neuroflow_user:neuroflow123@cluster0.skyfw7b.mongodb.net/neuroflow_db?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));

// User Model Schema
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

const User = mongoose.model('User', userSchema);

// Helper function: Calculate Euclidean Distance
function euclideanDistance(desc1, desc2) {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += (desc1[i] - desc2[i]) * (desc1[i] - desc2[i]);
  }
  return Math.sqrt(sum);
}

// JWT Middleware for authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

// ============= FACE RECOGNITION ROUTES =============

// Face Login Route
app.post('/api/login/face', async (req, res) => {
  try {
    const { descriptor } = req.body;
    
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor' });
    }

    const users = await User.find({ faceDescriptor: { $ne: null } });
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'No registered faces in system' });
    }

    const THRESHOLD = 0.6;
    let matchedUser = null;
    let minDistance = Infinity;
    
    for (const user of users) {
      if (!user.faceDescriptor || user.faceDescriptor.length === 0) continue;
      
      const dist = euclideanDistance(descriptor, user.faceDescriptor);
      console.log(`Distance for ${user.username}: ${dist}`);
      
      if (dist < THRESHOLD && dist < minDistance) {
        minDistance = dist;
        matchedUser = user;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ 
        error: 'Face not recognized. Please try again or sign up.',
        minDistance: minDistance 
      });
    }

    const token = jwt.sign(
      { 
        id: matchedUser._id, 
        username: matchedUser.username, 
        email: matchedUser.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    console.log(`✓ Login successful for ${matchedUser.username}, distance: ${minDistance}`);
    
    return res.json({ 
      token,
      user: { 
        id: matchedUser._id, 
        username: matchedUser.username, 
        email: matchedUser.email, 
        adhdSubtype: matchedUser.adhdSubtype 
      }
    });
    
  } catch (error) {
    console.error('Face login error:', error);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
});

// Face Signup Route
app.post('/api/signup/face', async (req, res) => {
  try {
    const { username, email, descriptor, adhdSubtype } = req.body;
    
    if (!username || !email || !descriptor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor format' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username 
          ? 'Username already taken' 
          : 'Email already registered' 
      });
    }

    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      faceDescriptor: descriptor,
      adhdSubtype: adhdSubtype || 'combined'
    });

    await newUser.save();
    
    console.log(`✓ New user registered: ${username}`);
    
    return res.json({ 
      message: 'Registration successful', 
      username: newUser.username 
    });
    
  } catch (error) {
    console.error('Face signup error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ============= OTHER API ROUTES =============

// Example protected route - Habits
app.get('/api/habits', authenticateToken, async (req, res) => {
  try {
    // Here you would fetch habits from database
    res.json({ 
      message: "Habits data retrieved successfully", 
      userId: req.user.id 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve habits' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NeuroFlow Suite API', 
    version: '1.0.0',
    endpoints: {
      faceLogin: 'POST /api/login/face',
      faceSignup: 'POST /api/signup/face',
      habits: 'GET /api/habits',
      health: 'GET /api/health'
    }
  });
});

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Server listen
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 NeuroFlow Suite server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
});
// Add this endpoint to your server.js

app.post('/api/chatbot/message', authenticateToken, async (req, res) => {
  try {
    const { message, context } = req.body;
    const userId = req.user.id;
    
    // Get empathetic ADHD response
    const botResponse = await getADHDEmpathyResponse(message, context);
    
    // Log conversation for pattern analysis
    console.log(`Chatbot - User ${userId}: ${message}`);
    
    return res.json({
      response: botResponse.text,
      emotion: botResponse.emotion,
      suggestions: botResponse.suggestions
    });
    
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ error: 'Chatbot unavailable' });
  }
});

// ADHD Empathetic Response Generator
function getADHDEmpathyResponse(userMessage, context = {}) {
  const message = userMessage.toLowerCase();
  
  // Emotion detection patterns
  const emotionPatterns = {
    overwhelmed: ['overwhelmed', 'too much', 'can\'t handle', 'stressed', 'drowning'],
    frustrated: ['frustrated', 'annoyed', 'irritated', 'angry', 'mad'],
    anxious: ['anxious', 'worried', 'scared', 'nervous', 'afraid'],
    stuck: ['stuck', 'can\'t start', 'procrastinating', 'don\'t know how'],
    rejected: ['rejected', 'failure', 'not good enough', 'disappointed'],
    hyperfocus: ['can\'t stop', 'hours passed', 'forgot to eat', 'lost track'],
    timeBlind: ['time', 'late', 'forgot', 'didn\'t realize']
  };
  
  // Detect emotion
  let detectedEmotion = 'neutral';
  for (const [emotion, keywords] of Object.entries(emotionPatterns)) {
    if (keywords.some(keyword => message.includes(keyword))) {
      detectedEmotion = emotion;
      break;
    }
  }
  
  // Generate empathetic responses based on ADHD research
  const responses = {
    overwhelmed: {
      text: "I hear you—that feeling of being overwhelmed is so real with ADHD. Your brain is dealing with a lot right now, and that's completely valid. 🌊\n\nLet's use the STOP method:\n• **Stop** - Pause what you're doing\n• **Take a breath** - Try 7-11 breathing (breathe in for 7, out for 11)\n• **Observe** - What's the ONE thing causing the most stress?\n• **Proceed** - We'll tackle just that one thing\n\nWhat feels most urgent right now?",
      emotion: 'overwhelmed',
      suggestions: [
        'Start guided breathing exercise',
        'Break task into micro-steps',
        'Set a 5-minute timer'
      ]
    },
    
    frustrated: {
      text: "Frustration with ADHD is exhausting, and you're allowed to feel this way. Your brain works differently, and that's not a flaw—it's just how you're wired. 💙\n\nADHD brains need different strategies, not more willpower. Let's figure out what's blocking you right now instead of fighting against yourself.\n\nWhat specifically is frustrating you? Sometimes naming it helps.",
      emotion: 'frustrated',
      suggestions: [
        'Take a 2-minute movement break',
        'Switch to a different task',
        'Use the fidget tool'
      ]
    },
    
    anxious: {
      text: "Anxiety and ADHD often go hand-in-hand, and what you're feeling is real. Your brain's threat detection system might be working overtime right now. 🫂\n\nLet's ground you with box breathing:\n• Breathe in for 4 counts\n• Hold for 4 counts\n• Breathe out for 4 counts\n• Hold for 4 counts\n• Repeat 3 times\n\nI'm here with you. Want to tell me what's making you anxious?",
      emotion: 'anxious',
      suggestions: [
        'Start box breathing exercise',
        'List 3 things you can see/touch',
        'Talk through your worry'
      ]
    },
    
    stuck: {
      text: "Task initiation struggles are one of the HARDEST parts of ADHD—it's not laziness, it's executive dysfunction. Your brain literally needs help getting started. 🧠\n\nLet's use the '2-minute rule': Just commit to 2 minutes. Often starting is the only hard part.\n\nOr we can break this task into tiny micro-steps—so small they feel almost silly. What task are you trying to start?",
      emotion: 'stuck',
      suggestions: [
        'Use the 2-minute rule',
        'Body doubling (I\'ll sit with you virtually)',
        'Create task micro-steps'
      ]
    },
    
    rejected: {
      text: "Rejection sensitivity dysphoria (RSD) is incredibly painful, and I'm so sorry you're experiencing this. What you're feeling isn't an overreaction—it's a real ADHD symptom. 💔\n\nRemind yourself: This intense feeling will pass. RSD makes emotions feel 10x stronger than they are. The criticism might be real, but your brain is amplifying the pain.\n\nYou're not broken. You're dealing with a neurological response. Would it help to talk about what happened?",
      emotion: 'rejected',
      suggestions: [
        'Read affirmations',
        'Remember past successes',
        'Practice self-compassion'
      ]
    },
    
    hyperfocus: {
      text: "Hyperfocus can be both a superpower and a trap with ADHD! It's amazing that you can focus so intensely, but forgetting to eat/drink/move isn't sustainable. 🎯\n\n**Right now:**\n1. Stand up and stretch for 30 seconds\n2. Drink some water\n3. Set a timer for 45 minutes to remind you to break\n\nYour brain needs fuel to keep going. What were you hyperfocused on?",
      emotion: 'hyperfocus',
      suggestions: [
        'Set break reminders',
        'Drink water now',
        'Do a 1-minute stretch'
      ]
    },
    
    timeBlind: {
      text: "Time blindness is SO frustrating—your brain literally doesn't process time like neurotypical brains do. You didn't 'forget on purpose.' ⏰\n\nLet's set up systems to support your brain:\n• Visual time timers (not just alarms)\n• Backward planning from deadlines\n• Buffer time (always add 1.5x the time you think)\n\nWhat time-related thing is causing problems right now?",
      emotion: 'timeBlind',
      suggestions: [
        'Set visual timer',
        'Create time-blocking plan',
        'Add buffer time to estimates'
      ]
    },
    
    neutral: {
      text: "Hey there! I'm here to support you with ADHD-friendly strategies. I understand that your brain works differently, and I'm here to help—not judge. 🌟\n\nI can help with:\n• Emotional regulation and STOP method\n• Task initiation and breaking down overwhelm\n• Time management strategies\n• Dealing with rejection sensitivity\n• Hyperfocus management\n\nWhat's on your mind today?",
      emotion: 'neutral',
      suggestions: [
        'Check my task priorities',
        'Practice breathing exercises',
        'Review my achievements'
      ]
    }
  };
  
  return responses[detectedEmotion] || responses.neutral;
}
