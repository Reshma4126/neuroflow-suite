const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: '../.env.development' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple auth middleware (mock for now - Team Member 1 will implement JWT)
app.use((req, res, next) => {
 req.user = { id: '507f1f77bcf86cd799439011' }; // Mock user for testing (valid ObjectId)

  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Team Member 4: Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/routines', require('./routes/routines'));
app.use('/api/habits', require('./routes/habits'));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NeuroFlow Suite Backend - Team Member 4 (DevOps)',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Team Member 4 - DevOps server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
