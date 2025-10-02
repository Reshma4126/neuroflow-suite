const express = require('express');
const router = express.Router();
const Routine = require('../models/Routine');

// GET /api/routines - Get user's routines
router.get('/', async (req, res) => {
  try {
    const routines = await Routine.find({ userId: req.user.id })
      .populate('tasks.taskId')
      .sort({ createdAt: -1 });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/routines - Create new routine
router.post('/', async (req, res) => {
  try {
    const routine = new Routine({
      ...req.body,
      userId: req.user.id
    });
    await routine.save();
    res.status(201).json(routine);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/routines/:id - Update routine
router.put('/:id', async (req, res) => {
  try {
    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    res.json(routine);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/routines/:id/complete - Mark routine completed
router.post('/:id/complete', async (req, res) => {
  try {
    const routine = await Routine.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { 
        $inc: { 'tasks.$[].isCompleted': 1 },
        lastCompleted: new Date()
      },
      { new: true }
    );
    
    // Calculate new success rate
    // Implementation for success rate calculation
    
    res.json(routine);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
