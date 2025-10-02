const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');

// GET /api/habits - Get user's habits
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id })
      .populate('stackedTo')
      .sort({ createdAt: -1 });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/habits - Create new habit
router.post('/', async (req, res) => {
  try {
    const habit = new Habit({
      ...req.body,
      userId: req.user.id
    });
    await habit.save();
    res.status(201).json(habit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/habits/:id/complete - Mark habit completed today
router.post('/:id/complete', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user.id
    });
    
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    
    // Check if already completed today
    const todayEntry = habit.completionHistory.find(
      entry => entry.date.getTime() === today.getTime()
    );
    
    if (todayEntry) {
      todayEntry.completed = true;
    } else {
      habit.completionHistory.push({
        date: today,
        completed: true
      });
    }
    
    // Recalculate streak
    habit.calculateStreak();
    await habit.save();
    
    res.json(habit);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/habits/streaks - Get current streaks
router.get('/streaks', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user.id });
    const streaks = habits.map(habit => ({
      id: habit._id,
      name: habit.name,
      streak: habit.streakCount
    }));
    res.json(streaks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
