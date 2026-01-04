const express = require('express');
const Chat = require('../models/Chat');
const Assignment = require('../models/Assignments');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get messages for a bus (all authenticated users can access - group chat)
router.get('/bus/:busId', authMiddleware, async (req, res) => {
  try {
    const { busId } = req.params;
    
    // Allow all authenticated users to view bus chat (group chat feature)
    const messages = await Chat.find({ bus: busId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages
    
    return res.json({ messages });
  } catch (error) {
    console.error('Failed to fetch messages', error);
    return res.status(500).json({ message: 'Unable to fetch messages' });
  }
});

// Send a message (all authenticated users can send - group chat feature)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { busId, message } = req.body;
    
    if (!busId || !message || !message.trim()) {
      return res.status(400).json({ message: 'Bus ID and message are required' });
    }
    
    // Allow all authenticated users to send messages (group chat feature)
    const chatMessage = await Chat.create({
      bus: busId,
      sender: req.user._id,
      message: message.trim()
    });
    
    const populated = await Chat.findById(chatMessage._id)
      .populate('sender', 'name email');
    
    return res.status(201).json({ message: populated });
  } catch (error) {
    console.error('Failed to send message', error);
    return res.status(500).json({ message: 'Unable to send message' });
  }
});

module.exports = router;

