const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Category = require('../models/Category');

// Middleware to check authentication
const checkAuth = (req, res, next) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get all expenses
router.get('/', checkAuth, async (req, res) => {
  try {
    const { type } = req.query;
    let query = { user_id: req.session.user_id };

    if (type) {
      const categories = await Category.find({ type });
      query.category_id = { $in: categories.map(c => c._id) };
    }

    const expenses = await Expense.find(query)
      .populate('category_id', 'name type')
      .sort({ date: -1 });

    res.json({ success: true, data: expenses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add expense
router.post('/', checkAuth, async (req, res) => {
  try {
    const expense = new Expense({
      user_id: req.session.user_id,
      ...req.body,
      date: req.body.date || new Date()
    });
    
    await expense.save();
    res.json({ success: true, id: expense._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete expense
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ 
      _id: req.params.id, 
      user_id: req.session.user_id 
    });

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update expense
router.put('/:id', checkAuth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user_id: req.session.user_id },
      req.body,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single expense
router.get('/:id', checkAuth, async (req, res) => {
  try {
    const expense = await Expense.findOne({ 
      _id: req.params.id, 
      user_id: req.session.user_id 
    }).populate('category_id', 'name type');

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;