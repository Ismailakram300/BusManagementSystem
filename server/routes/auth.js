const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const TOKEN_EXPIRY = '7d';

function buildAuthResponse(user) {
  const safeUser = user.toJSON();
  const token = jwt.sign({ userId: safeUser._id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return { user: safeUser, token };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', rollNumber } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      rollNumber
    });

    return res.status(201).json(buildAuthResponse(user));
  } catch (error) {
    console.error('Failed to register user', error);
    
    // Handle database connection errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ message: 'Database unavailable. Please try again later.' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: messages });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    
    return res.status(500).json({ message: error.message || 'Unable to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordsMatch = await bcrypt.compare(password, user.password);
    if (!passwordsMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    console.error('Failed to login user', error);
    
    // Handle database connection errors
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ message: 'Database unavailable. Please try again later.' });
    }
    
    return res.status(500).json({ message: 'Unable to login user' });
  }
});
router.post('/logout', authMiddleware, (req, res) => {
  // Since JWT is stateless, we cannot invalidate on server unless using a blacklist.
  return res.json({ message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
