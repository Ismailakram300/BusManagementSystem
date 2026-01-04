// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const assignmentRoutes = require('./routes/assignments');
const chatRoutes = require('./routes/chat');
const announcementRoutes = require('./routes/announcements');

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    ok: true, 
    msg: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/announcements', announcementRoutes);

// connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

// Set up MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

async function connectToMongoDB() {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI not set in .env — server will start but DB features will be unavailable');
    return false;
  }

  try {
    // Remove deprecated options - they're no longer needed in Mongoose 6+
    // serverSelectionTimeoutMS: reduces timeout from 30s to 5s for faster failure detection
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.warn('⚠️  Server will start without database. Some features may be unavailable.');
    console.warn('   Troubleshooting:');
    console.warn('   1. Check your MONGO_URI in .env file');
    console.warn('   2. Verify network connectivity and DNS resolution');
    console.warn('   3. Check if MongoDB Atlas IP whitelist includes your IP (or use 0.0.0.0/0 for development)');
    console.warn('   4. For local development, you can remove MONGO_URI to skip DB connection');
    console.warn('   5. Common issue: ESERVFAIL usually means DNS/network issue or Atlas cluster is down');
    return false;
  }
}

async function start() {
  try {
    // Attempt to connect to MongoDB, but don't block server startup
    const dbConnected = await connectToMongoDB();

    // Listen on all network interfaces (0.0.0.0) to allow connections from emulators and devices
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
      console.log(`   Local access: http://localhost:${PORT}`);
      console.log(`   Network access: http://<your-ip>:${PORT}`);
      console.log(`   Android emulator: http://10.0.2.2:${PORT}`);
      if (!dbConnected) {
        console.log(`   ⚠️  Running without database connection`);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
