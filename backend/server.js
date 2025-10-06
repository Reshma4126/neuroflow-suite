require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Check if OpenAI is available
let openai = null;
try {
  const OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-api-key-here') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('OpenAI initialized successfully');
  }
} catch (error) {
  console.log('OpenAI not available, using rule-based responses');
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'default_fallback_secret_change_in_production';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://neuroflow_user:neuroflow123@cluster0.skyfw7b.mongodb.net/neuroflow_db?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI)
.then(() => console.log("MongoDB connected successfully"))
.catch(err => console.error("MongoDB connection error:", err));

// User Model Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String },
  faceDescriptor: { type: [Number], default: null },
  adhdSubtype: { type: String, enum: ['inattentive', 'hyperactive', 'combined'], default: 'combined' },
  preferences: {
    notifications: { type: Boolean, default: true },
    reminderFrequency: { type: String, default: 'medium' },
    rewardType: { type: String, enum: ['visual', 'audio', 'both'], default: 'both' }
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Helper: Euclidean Distance
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

// JWT Authentication Middleware
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
      return res.status(401).json({ error: 'Face not recognized' });
    }

    const token = jwt.sign(
      { id: matchedUser._id, username: matchedUser.username, email: matchedUser.email }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    console.log(`✓ Login successful for ${matchedUser.username}`);
    
    return res.json({ 
      token,
      user: { id: matchedUser._id, username: matchedUser.username, email: matchedUser.email, adhdSubtype: matchedUser.adhdSubtype }
    });
    
  } catch (error) {
    console.error('Face login error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/signup/face', async (req, res) => {
  try {
    const { username, email, descriptor, adhdSubtype } = req.body;
    
    if (!username || !email || !descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      faceDescriptor: descriptor,
      adhdSubtype: adhdSubtype || 'combined'
    });

    await newUser.save();
    console.log(`✓ New user registered: ${username}`);
    
    return res.json({ message: 'Registration successful', username: newUser.username });
  } catch (error) {
    console.error('Face signup error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ============= ADHD CHATBOT =============

const ADHD_SYSTEM_PROMPT = `You are an empathetic ADHD support companion for NeuroFlow Suite. Your role is to provide emotional validation and practical strategies for adults with ADHD.

CORE PRINCIPLES:
- NEVER judge or blame. ADHD is neurological, not a character flaw
- Validate emotions first, then provide strategies
- Use short, digestible responses (2-4 sentences, then offer to elaborate)
- Acknowledge that ADHD brains work differently, not broken
- Focus on what helps, not what "should" work
- Use the person's name occasionally to personalize responses

KEY ADHD CHALLENGES YOU SUPPORT:
1. OVERWHELM: Use STOP method (Stop, Take breath, Observe, Proceed)
2. TASK INITIATION: Suggest 2-minute rule, body doubling, micro-steps
3. TIME BLINDNESS: Visual timers, buffer time, backward planning
4. REJECTION SENSITIVITY DYSPHORIA (RSD): Validate intense emotions, remind feelings will pass
5. HYPERFOCUS: Encourage breaks, hydration, movement
6. EMOTIONAL DYSREGULATION: Breathing exercises (7-11 breathing, box breathing)

LANGUAGE GUIDELINES:
✓ "Your brain works differently" NOT "You're broken"
✓ "Task initiation is hard with ADHD" NOT "Just start"
✓ "That's executive dysfunction" NOT "You're lazy"
✓ "This will pass" NOT "It's not that bad"

RESPONSE STYLE:
- Lead with empathy emoji (🌊 🫂 💙 🌟)
- Use their name occasionally
- Acknowledge the feeling immediately
- Explain the ADHD connection briefly
- Offer 1-2 specific, actionable strategies
- End with supportive question or validation
- Keep initial response under 100 words

Remember: You're not a therapist, but a supportive companion who understands ADHD struggles.`;

// Emotion Detection Helper
function detectEmotion(message) {
  const msg = message.toLowerCase();
  const emotions = {
    overwhelmed: ['overwhelmed', 'too much', 'can\'t handle', 'stressed', 'drowning'],
    anxious: ['anxious', 'worried', 'scared', 'nervous', 'panic'],
    frustrated: ['frustrated', 'annoyed', 'angry', 'irritated', 'mad'],
    stuck: ['stuck', 'can\'t start', 'procrastinating', 'don\'t know how'],
    rejected: ['rejected', 'failure', 'not good enough', 'disappointed in me'],
    hyperfocus: ['can\'t stop', 'hours passed', 'forgot to eat', 'lost track'],
    timeBlind: ['late', 'forgot', 'didn\'t realize', 'time']
  };
  
  for (const [emotion, keywords] of Object.entries(emotions)) {
    if (keywords.some(keyword => msg.includes(keyword))) {
      return emotion;
    }
  }
  return 'neutral';
}

// Suggestion Generator
function generateSuggestions(emotion) {
  const suggestionMap = {
    overwhelmed: ['Guide me through STOP method', 'Break down this task', 'Start breathing exercise'],
    anxious: ['Do box breathing with me', 'Help me ground myself', 'What can I control?'],
    stuck: ['Use the 2-minute rule', 'Break into micro-steps', 'Body doubling session'],
    frustrated: ['Take a movement break', 'Switch tasks', 'Tell me what\'s frustrating'],
    rejected: ['This will pass', 'Show my past wins', 'RSD coping strategies'],
    hyperfocus: ['Set a break timer', 'Drink water now', 'Stretch for 1 minute'],
    timeBlind: ['Set visual timer', 'Add buffer time', 'Backward plan from deadline'],
    neutral: ['Check my tasks', 'Practice breathing', 'Review achievements']
  };
  
  return suggestionMap[emotion] || suggestionMap.neutral;
}

// General Conversation Handler
function getGeneralResponse(message, username) {
  const msg = message.toLowerCase().trim();
  
  // Greetings
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'hiya'];
  if (greetings.some(greeting => msg === greeting || msg.startsWith(greeting + ' ') || msg.startsWith(greeting + ','))) {
    return {
      text: `Hi ${username}! 👋 So glad you're here.\n\nI'm your ADHD companion, ready to support you with emotional regulation, task initiation, time management, and more.\n\nHow are you feeling today?`,
      suggestions: ['I feel overwhelmed', 'I need help starting a task', 'Just checking in']
    };
  }
  
  // How are you / checking in
  if (msg.includes('how are you') || msg.includes('how r you')) {
    return {
      text: `Thanks for asking, ${username}! 💙 I'm here and ready to support you.\n\nMore importantly—how are YOU doing? What's on your mind today?`,
      suggestions: ['I\'m feeling overwhelmed', 'I\'m doing okay', 'I need help with something']
    };
  }
  
  // Thank you
  if (msg.includes('thank') || msg.includes('thanks') || msg === 'ty') {
    return {
      text: `You're so welcome, ${username}! 🌟 I'm proud of you for reaching out for support—that takes courage.\n\nIs there anything else I can help with?`,
      suggestions: ['I need more help', 'That\'s all for now', 'Tell me about ADHD strategies']
    };
  }
  
  // Goodbye
  const farewells = ['bye', 'goodbye', 'see you', 'talk later', 'gtg', 'gotta go'];
  if (farewells.some(farewell => msg.includes(farewell))) {
    return {
      text: `Take care, ${username}! 💙 Remember—you're doing great, even on the hard days.\n\nI'll be here whenever you need support. Be kind to yourself! ✨`,
      suggestions: []
    };
  }
  
  // Just chatting / random
  if (msg === 'sup' || msg === 'what\'s up' || msg === 'wassup') {
    return {
      text: `Hey ${username}! 👋 Just here ready to help with whatever's on your mind.\n\nAre you checking in, or is there something specific I can support you with?`,
      suggestions: ['I need help', 'Just saying hi', 'I\'m struggling with something']
    };
  }
  
  // Positive mood
  if ((msg.includes('good') || msg.includes('great') || msg.includes('happy') || msg.includes('excited')) && 
      !msg.includes('not') && !msg.includes('not good')) {
    return {
      text: `That's wonderful, ${username}! 🎉 I love hearing when things are going well.\n\nEven on good days, I'm here if you want to talk strategies, plan ahead, or just chat. What's making today good?`,
      suggestions: ['Share what\'s working', 'Get tips for staying productive', 'Just wanted to share']
    };
  }
  
  // Doing okay / neutral
  if (msg.includes('okay') || msg.includes('ok') || msg.includes('fine') || msg.includes('alright')) {
    return {
      text: `I hear you, ${username}. "Okay" is valid too—not every day has to be amazing or terrible. 💙\n\nIs there anything specific on your mind, or are you just taking things one step at a time?`,
      suggestions: ['I have something on my mind', 'Just checking in', 'Need help with a task']
    };
  }
  
  return null; // No general response matched, continue to ADHD-specific
}

// Rule-based Fallback Responses - WITH USERNAME
function getRuleBasedResponse(message, username = 'there') {
  const emotion = detectEmotion(message);
  
  const responses = {
    overwhelmed: {
      text: `🌊 ${username}, I hear you—feeling overwhelmed is so real with ADHD. Your brain is dealing with a lot right now.\n\nLet's use the STOP method:\n• Stop what you're doing\n• Take a breath (7-11 breathing)\n• Observe: What's the ONE most urgent thing?\n• Proceed with just that\n\nWhat feels most urgent to you right now?`,
      suggestions: ['Guide me through STOP method', 'Break down this task', 'Start breathing exercise']
    },
    anxious: {
      text: `🫂 ${username}, anxiety with ADHD is exhausting. Your brain's threat system might be working overtime right now.\n\nLet's ground you with box breathing:\n• In for 4, hold 4, out for 4, hold 4\n• Repeat 3 times\n\nI'm here with you. Want to tell me what's making you anxious?`,
      suggestions: ['Do box breathing with me', 'Help me ground myself', 'What can I control?']
    },
    frustrated: {
      text: `💙 ${username}, frustration with ADHD is exhausting, and you're allowed to feel this way. Your brain works differently—that's not a flaw.\n\nLet's figure out what's blocking you instead of fighting against yourself.\n\nWhat specifically is frustrating you?`,
      suggestions: ['Take a movement break', 'Switch tasks', 'Tell me what\'s frustrating']
    },
    stuck: {
      text: `🌟 Hey ${username}—task initiation struggles are HARD with ADHD. This is executive dysfunction, not laziness.\n\nTry the 2-minute rule: Just commit to 2 minutes. Starting is often the only hard part.\n\nWhat task are you trying to start?`,
      suggestions: ['Use the 2-minute rule', 'Break into micro-steps', 'Body doubling session']
    },
    rejected: {
      text: `💔 ${username}, rejection sensitivity dysphoria (RSD) is incredibly painful. What you're feeling isn't an overreaction—it's a real ADHD symptom.\n\nThis intense feeling will pass. Your brain is amplifying the pain right now, but you're not broken.\n\nWould it help to talk about what happened?`,
      suggestions: ['This will pass', 'Show my past wins', 'RSD coping strategies']
    },
    hyperfocus: {
      text: `🎯 ${username}, hyperfocus can be both a superpower and a trap! It's amazing that you can focus so intensely, but forgetting to eat/drink isn't sustainable.\n\n**Right now:**\n1. Stand up and stretch for 30 seconds\n2. Drink some water\n3. Set a timer for 45 minutes\n\nWhat were you hyperfocused on?`,
      suggestions: ['Set a break timer', 'Drink water now', 'Stretch for 1 minute']
    },
    timeBlind: {
      text: `⏰ ${username}, time blindness is SO frustrating—your brain doesn't process time like neurotypical brains do. You didn't 'forget on purpose.'\n\nLet's set up systems:\n• Visual time timers\n• Backward planning from deadlines\n• Buffer time (add 1.5x what you think)\n\nWhat time-related thing is causing problems?`,
      suggestions: ['Set visual timer', 'Add buffer time', 'Backward plan']
    },
    neutral: {
      text: `💙 Hey ${username}! I'm here to support you with ADHD-friendly strategies. I understand your brain works differently, and I'm here to help—not judge.\n\nI can help with emotional regulation, task initiation, time management, RSD, and hyperfocus.\n\nWhat's on your mind today?`,
      suggestions: ['I feel overwhelmed', 'I can\'t start a task', 'I need breathing exercises']
    }
  };
  
  const response = responses[emotion] || responses.neutral;
  
  return {
    text: response.text,
    suggestions: response.suggestions
  };
}

// OpenAI Chatbot Endpoint - ENHANCED WITH PERSONALIZATION
app.post('/api/chatbot/message', authenticateToken, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    
    console.log(`Chatbot - User ${username}: ${message}`);
    
    // Detect emotion for analytics
    const emotion = detectEmotion(message);
    const suggestions = generateSuggestions(emotion);
    
    // Check for greetings and general conversation first
    const generalResponse = getGeneralResponse(message, username);
    if (generalResponse) {
      console.log('✓ General conversation response sent');
      return res.json({
        response: generalResponse.text,
        emotion: 'neutral',
        suggestions: generalResponse.suggestions
      });
    }
    
    // Try OpenAI first (if available)
    if (openai) {
      try {
        const messages = [
          { role: 'system', content: ADHD_SYSTEM_PROMPT + `\n\nThe user's name is ${username}. Use their name occasionally to personalize responses.` },
          ...conversationHistory.slice(-10).map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.content
          })),
          { role: 'user', content: message }
        ];
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 250,
          temperature: 0.7,
        });
        
        const botResponse = completion.choices[0].message.content;
        
        console.log('✓ OpenAI response sent');
        
        return res.json({
          response: botResponse,
          emotion: emotion,
          suggestions: suggestions
        });
        
      } catch (openaiError) {
        console.error('OpenAI error, using fallback:', openaiError.message);
        // Fall through to rule-based below
      }
    }
    
    // Fallback to rule-based responses
    console.log('✓ Rule-based response sent');
    const fallback = getRuleBasedResponse(message, username);
    
    return res.json({
      response: fallback.text,
      emotion: emotion,
      suggestions: fallback.suggestions
    });
    
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ 
      response: "I'm having connection issues, but I'm here for you. 💙 Try some deep breathing, and we can reconnect soon.",
      emotion: 'neutral',
      suggestions: ['Take a break', 'Try again', 'Deep breathing']
    });
  }
});

// ============= OTHER ROUTES =============

app.get('/api/habits', authenticateToken, async (req, res) => {
  try {
    res.json({ message: "Habits data", userId: req.user.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve habits' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    openaiConfigured: !!openai
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'NeuroFlow Suite API', 
    version: '1.0.0',
    endpoints: {
      faceLogin: 'POST /api/login/face',
      faceSignup: 'POST /api/signup/face',
      chatbot: 'POST /api/chatbot/message',
      habits: 'GET /api/habits',
      health: 'GET /api/health'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 NeuroFlow Suite server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`🤖 OpenAI: ${openai ? 'Configured ✓' : 'Not configured (using rule-based responses)'}`);
});
