const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { StreamChat } = require('stream-chat');
const cron = require('node-cron');
const { exec } = require('child_process');
const { deleteExpiredMatchChannels } = require('./src/cleanupChannels');
const { createMatchEvent } = require('./src/googleCalendar');
const path = require('path');
const Division = require('./models/Division');

// Import routes
const apiRoutes = require('./src/routes');

const app = express();

const allowedOrigins = [
  'https://frbcapl.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://www.frusapl.com',
  'https://frusapl.com',
  'https://www.frontrangepool.com',
  'https://frontrangepool.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
})
  .then(() => {
    console.log("MongoDB is connected!");
    // Log database usage after connection is established
    setTimeout(logDatabaseUsage, 2000);
  })
  .catch(err => console.error("MongoDB connection error:", err));

// Stream Chat setup
const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;
const serverClient = StreamChat.getInstance(apiKey, apiSecret);

// Admin emails
const ADMIN_EMAILS = ["admin@frusapl.com", "admin2@frusapl.com"];

function cleanId(id) {
  return id.toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function isAdminUser(userId) {
  return ADMIN_EMAILS.includes(userId);
}

function getMatchChannelId(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `match-${cleanId(sortedIds[0])}-${cleanId(sortedIds[1])}`;
}

// Stream Chat token endpoint
app.post('/token', async (req, res) => {
  let { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  userId = cleanId(userId);
  try {
    const user = isAdminUser(userId)
      ? { id: userId, name: "Admin", role: "admin" }
      : { id: userId, name: userId };
    await serverClient.upsertUser(user);
    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ error: err.message });
  }
});

// API routes
app.use('/api', apiRoutes);

// Admin endpoints
app.post('/admin/update-standings', (req, res) => {
  const division = req.body.division;
  const safeDivision = division ? division.replace(/[^A-Za-z0-9]/g, '_') : 'default';
  const filename = `public/schedule_${safeDivision}.json`;
  let cmd = `python scripts/scrape_schedule.py "${division}" "${filename}"`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).send(stderr || error.message);
    }
    res.send(stdout || "Schedule updated.");
  });
});

app.get('/admin/divisions', async (req, res) => {
  try {
    const divisions = await Division.find({}, { _id: 0, name: 1, description: 1 }).lean();
    res.json(divisions);
  } catch (err) {
    console.error('Error fetching divisions:', err);
    res.status(500).json({ error: 'Failed to fetch divisions' });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Cron job for cleanup
cron.schedule('0 2 * * *', () => {
  deleteExpiredMatchChannels()
    .then(() => console.log('Expired channels cleaned up!'))
    .catch(err => console.error('Cleanup failed:', err));
});

// Add database usage logging on startup
async function logDatabaseUsage() {
  try {
    const db = mongoose.connection.db;
    if (db) {
      const stats = await db.stats();
      const storageUsedMB = (stats.dataSize + stats.indexSize) / (1024 * 1024);
      const storageLimitMB = 512;
      const usagePercentage = (storageUsedMB / storageLimitMB) * 100;
      
      console.log('=== DATABASE USAGE ===');
      console.log(`Storage Used: ${storageUsedMB.toFixed(2)} MB / ${storageLimitMB} MB`);
      console.log(`Usage: ${usagePercentage.toFixed(1)}%`);
      
      if (usagePercentage > 95) {
        console.log('🚨 CRITICAL: Database storage limit nearly reached!');
      } else if (usagePercentage > 80) {
        console.log('⚠️ WARNING: Database storage limit approaching!');
      } else if (usagePercentage > 60) {
        console.log('📊 INFO: Database usage is moderate');
      } else {
        console.log('✅ Database usage is healthy');
      }
      console.log('=====================');
    }
  } catch (err) {
    console.log('Could not check database usage:', err.message);
  }
}

module.exports = app; 