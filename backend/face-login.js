const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path as needed

const app = express();

app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/neuroflow';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for face recognition'))
.catch(err => console.error('MongoDB connection error:', err));

// Helper: Calculate Euclidean Distance between two face descriptors
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

// Endpoint: Face Login
app.post('/api/login/face', async (req, res) => {
  try {
    const { descriptor } = req.body;
    
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor' });
    }

    // Find all users with face descriptors
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

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: matchedUser._id, 
        username: matchedUser.username,
        email: matchedUser.email 
      }, 
      JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    console.log(`Login successful for ${matchedUser.username}, distance: ${minDistance}`);
    
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

// Endpoint: Face Signup
app.post('/api/signup/face', async (req, res) => {
  try {
    const { username, email, descriptor, adhdSubtype } = req.body;
    
    if (!username || !email || !descriptor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Invalid face descriptor format' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.username === username 
          ? 'Username already taken' 
          : 'Email already registered' 
      });
    }

    // Create new user
    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      faceDescriptor: descriptor,
      adhdSubtype: adhdSubtype || 'combined'
    });

    await newUser.save();
    
    console.log(`New user registered: ${username}`);
    
    return res.json({ 
      message: 'Registration successful',
      username: newUser.username 
    });
    
  } catch (error) {
    console.error('Face signup error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Face recognition server running on port ${PORT}`);
});
