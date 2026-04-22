const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { parseTaskFromPrompt, findTasksWithAI } = require('../services/aiService');
const authMiddleware = require('../middleware/auth');

// 🔒 All task routes require a valid JWT
router.use(authMiddleware);

// ─── POST /api/tasks/create-from-prompt ───────────────────────────────────────
router.post('/create-from-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const taskData = await parseTaskFromPrompt(prompt);

    // Link task to the logged-in user
    const newTask = new Task({ ...taskData, userId: req.user.id, userPrompt: prompt, });
    await newTask.save();

    res.status(201).json({ message: 'Task created successfully!', task: newTask });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/tasks/search ───────────────────────────────────────────────────
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    // Only search THIS user's tasks
    const allTasks = await Task.find({ userId: req.user.id });

    if (allTasks.length === 0)
      return res.json({ message: 'No tasks found', tasks: [] });

    const matchingIds = await findTasksWithAI(query, allTasks);
    const matchedTasks = allTasks.filter((t) => matchingIds.includes(t._id.toString()));

    res.json({ message: `Found ${matchedTasks.length} matching task(s)`, tasks: matchedTasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    // Make sure user owns this task
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;