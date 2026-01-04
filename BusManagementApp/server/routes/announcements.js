const express = require('express');
const Announcement = require('../models/Announcement');
const Assignment = require('../models/Assignments');
const authMiddleware = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Get all active announcements (for all users - no assignment required)
// IMPORTANT: This route must come before /bus/:busId to avoid route conflicts
router.get('/all', authMiddleware, async (req, res) => {
  try {
    console.log(`[Announcements] GET /all - Fetching all active announcements for user: ${req.user._id}, role: ${req.user.role}`);
    
    const announcements = await Announcement.find({ 
      isActive: true 
    })
      .populate('createdBy', 'name')
      .populate('bus', 'routeName busNumber')
      .sort({ createdAt: -1 })
      .limit(20); // Get latest 20 active announcements
    
    console.log(`[Announcements] Found ${announcements.length} active announcements`);
    
    return res.json({ announcements });
  } catch (error) {
    console.error('[Announcements] Failed to fetch announcements', error);
    return res.status(500).json({ message: 'Unable to fetch announcements' });
  }
});

// Get active announcements for a bus (still available for specific bus queries)
// This route comes after /all to ensure /all is matched first
router.get('/bus/:busId', authMiddleware, async (req, res) => {
  try {
    const { busId } = req.params;
    
    console.log(`[Announcements] Fetching announcements for bus: ${busId}, user: ${req.user._id}, role: ${req.user.role}`);
    
    // No assignment check - all authenticated users can see announcements
    const announcements = await Announcement.find({ 
      bus: busId, 
      isActive: true 
    })
      .populate('createdBy', 'name')
      .populate('bus', 'routeName busNumber')
      .sort({ createdAt: -1 })
      .limit(10); // Get latest 10 active announcements
    
    console.log(`[Announcements] Found ${announcements.length} active announcements for bus ${busId}`);
    
    return res.json({ announcements });
  } catch (error) {
    console.error('[Announcements] Failed to fetch announcements', error);
    return res.status(500).json({ message: 'Unable to fetch announcements' });
  }
});

// Get all announcements for a bus (admin only)
router.get('/bus/:busId/all', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { busId } = req.params;
    
    const announcements = await Announcement.find({ bus: busId })
      .populate('createdBy', 'name')
      .populate('bus', 'routeName busNumber')
      .sort({ createdAt: -1 });
    
    return res.json({ announcements });
  } catch (error) {
    console.error('Failed to fetch announcements', error);
    return res.status(500).json({ message: 'Unable to fetch announcements' });
  }
});

// Create announcement (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { busId, title, message } = req.body;
    
    console.log(`[Announcements] Creating announcement for bus: ${busId}`);
    console.log(`[Announcements] Title: ${title}, Message: ${message}`);
    
    if (!busId || !title || !message) {
      return res.status(400).json({ message: 'Bus ID, title, and message are required' });
    }
    
    const announcement = await Announcement.create({
      bus: busId,
      title: title.trim(),
      message: message.trim(),
      createdBy: req.user._id,
      isActive: true
    });
    
    console.log(`[Announcements] Announcement created with ID: ${announcement._id}`);
    
    const populated = await Announcement.findById(announcement._id)
      .populate('createdBy', 'name')
      .populate('bus', 'routeName busNumber');
    
    console.log(`[Announcements] Announcement populated:`, populated.bus?.routeName);
    
    return res.status(201).json({ announcement: populated });
  } catch (error) {
    console.error('[Announcements] Failed to create announcement', error);
    return res.status(500).json({ message: 'Unable to create announcement' });
  }
});

// Update announcement (admin only)
router.put('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { title, message, isActive } = req.body;
    const updates = {};
    
    if (title !== undefined) updates.title = title.trim();
    if (message !== undefined) updates.message = message.trim();
    if (isActive !== undefined) updates.isActive = isActive;
    
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name')
      .populate('bus', 'routeName busNumber');
    
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    return res.json({ announcement });
  } catch (error) {
    console.error('Failed to update announcement', error);
    return res.status(500).json({ message: 'Unable to update announcement' });
  }
});

// Delete announcement (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    return res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Failed to delete announcement', error);
    return res.status(500).json({ message: 'Unable to delete announcement' });
  }
});

module.exports = router;

