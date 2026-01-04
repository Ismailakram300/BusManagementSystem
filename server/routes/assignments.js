const express = require('express');
const Assignment = require('../models/Assignments');
const Bus = require('../models/Bus');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Get assignment for current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ user: req.user._id })
      .populate('bus', 'routeName busNumber driverName status')
      .populate('user', 'name email rollNumber');
    
    if (!assignment) {
      return res.json({ assignment: null });
    }
    
    return res.json({ assignment });
  } catch (error) {
    console.error('Failed to fetch assignment', error);
    return res.status(500).json({ message: 'Unable to fetch assignment' });
  }
});

// Get all assignments (admin only)
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('user', 'name email rollNumber')
      .populate('bus', 'routeName busNumber driverName')
      .sort({ createdAt: -1 });
    
    return res.json({ assignments });
  } catch (error) {
    console.error('Failed to fetch assignments', error);
    return res.status(500).json({ message: 'Unable to fetch assignments' });
  }
});

// Assign user to bus (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { userId, busId } = req.body;
    
    if (!userId || !busId) {
      return res.status(400).json({ message: 'User ID and Bus ID are required' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if bus exists
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    
    // Check if user already has an assignment
    const existingAssignment = await Assignment.findOne({ user: userId });
    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.bus = busId;
      await existingAssignment.save();
      const updated = await Assignment.findById(existingAssignment._id)
        .populate('user', 'name email rollNumber')
        .populate('bus', 'routeName busNumber driverName');
      return res.json({ assignment: updated });
    }
    
    // Create new assignment
    const assignment = await Assignment.create({ user: userId, bus: busId });
    const populated = await Assignment.findById(assignment._id)
      .populate('user', 'name email rollNumber')
      .populate('bus', 'routeName busNumber driverName');
    
    return res.status(201).json({ assignment: populated });
  } catch (error) {
    console.error('Failed to create assignment', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'User already assigned to a bus' });
    }
    
    return res.status(500).json({ message: 'Unable to create assignment' });
  }
});

// Remove assignment (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    return res.json({ message: 'Assignment removed successfully' });
  } catch (error) {
    console.error('Failed to delete assignment', error);
    return res.status(500).json({ message: 'Unable to delete assignment' });
  }
});

module.exports = router;

