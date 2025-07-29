import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { StreamChat } from 'stream-chat';
import cron from 'node-cron';
import { exec } from 'child_process';
import { deleteExpiredMatchChannels } from './src/cleanupChannels.js';
import { createMatchEvent } from './src/googleCalendar.js';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import connectDB from './database.js';
import fs from 'fs';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Import routes
import apiRoutes from './src/routes/index.js';
import Division from './src/models/Division.js';

const allowedOrigins = [
  'https://frusapl.com',
  'https://www.frontrangepool.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://frbcapl.github.io',
  'https://frbcapl.github.io/NEWAPP',
  'https://newapp-1-ic1v.onrender.com',
];

async function startServer() {
  await connectDB();

  const app = express();

  // CORS setup (allow dev and production frontend origins)
  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(helmet());

  console.log('Serving static files from:', path.join(__dirname, 'public'));
  app.use('/static', express.static(path.join(__dirname, 'public')));
  app.use(express.json());

  // Remove any direct mongoose.connect(...) calls from server.js
  // Ensure all MongoDB connections are handled through database.js

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
    // Use the new multi-division scraper
    const cmd = `python scripts/scrape_all_standings.py`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Standings update error:', error);
        return res.status(500).json({ error: stderr || error.message });
      }
      console.log('Standings update output:', stdout);
      res.json({ message: stdout || "All standings updated successfully!" });
    });
  });

  // Use dynamic import for node-fetch (ESM only)
  const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
  app.post('/admin/fetch-standings', async (req, res) => {
    const { standingsUrl } = req.body;
    if (!standingsUrl) {
      return res.status(400).json({ error: 'standingsUrl required' });
    }
    try {
      const response = await fetch(standingsUrl);
      if (!response.ok) throw new Error('Failed to fetch standings');
      const html = await response.text();
      // TODO: Parse the HTML and extract standings as JSON
      // For now, just return the HTML for debugging:
      return res.json({ html });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/admin/update-schedule', (req, res) => {
    const division = req.body.division;
    const safeDivision = division ? division.replace(/[^A-Za-z0-9]/g, '_') : 'default';
    const filename = `public/schedule_${safeDivision}.json`;
    let cmd = `python scripts/scrape_schedule.py "${division}" "${filename}"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr || error.message });
      }
      res.json({ message: stdout || "Schedule updated successfully!" });
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

  app.post('/admin/divisions', async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Division name is required' });
      }
      
      const existingDivision = await Division.findOne({ name });
      if (existingDivision) {
        return res.status(400).json({ error: 'Division already exists' });
      }
      
      const division = new Division({ name, description });
      await division.save();
      res.json({ success: true, division });
    } catch (err) {
      console.error('Error creating division:', err);
      res.status(500).json({ error: 'Failed to create division' });
    }
  });

  app.get('/admin/search-users', async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.json([]);
      }
      
      const { default: User } = await import('./models/User.js');
      const users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      }).lean();
      
      res.json(users);
    } catch (err) {
      console.error('Error searching users:', err);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  app.post('/admin/convert-divisions', async (req, res) => {
    try {
      const User = await import('./models/User.js');
      const users = await User.find({});
      let modified = 0;
      
      for (const user of users) {
        if (user.division && !Array.isArray(user.divisions)) {
          // Convert string division to array
          user.divisions = [user.division];
          await user.save();
          modified++;
        }
      }
      
      res.json({ success: true, modified });
    } catch (err) {
      console.error('Error converting divisions:', err);
      res.status(500).json({ error: 'Failed to convert divisions' });
    }
  });

  app.patch('/admin/user/:userId/add-division', async (req, res) => {
    try {
      const { userId } = req.params;
      const { division } = req.body;
      
      if (!division) {
        return res.status(400).json({ error: 'Division is required' });
      }
      
      const User = await import('./models/User.js');
      const user = await User.findOne({ $or: [{ email: userId }, { id: userId }] });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (!user.divisions) {
        user.divisions = [];
      }
      
      if (!user.divisions.includes(division)) {
        user.divisions.push(division);
        await user.save();
      }
      
      res.json({ success: true, user });
    } catch (err) {
      console.error('Error adding division to user:', err);
      res.status(500).json({ error: 'Failed to add division to user' });
    }
  });

  app.patch('/admin/user/:userId/remove-division', async (req, res) => {
    try {
      const { userId } = req.params;
      const { division } = req.body;
      
      if (!division) {
        return res.status(400).json({ error: 'Division is required' });
      }
      
      const User = await import('./models/User.js');
      const user = await User.findOne({ $or: [{ email: userId }, { id: userId }] });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.divisions) {
        user.divisions = user.divisions.filter(d => d !== division);
        await user.save();
      }
      
      res.json({ success: true, user });
    } catch (err) {
      console.error('Error removing division from user:', err);
      res.status(500).json({ error: 'Failed to remove division from user' });
    }
  });

  app.post('/admin/sync-users', async (req, res) => {
    try {
      const syncUsersFromSheet = await import('./src/utils/syncUsersFromSheet.js');
      await syncUsersFromSheet.default();
      res.json({ success: true, message: 'Users synced successfully' });
    } catch (err) {
      console.error('Error syncing users:', err);
      res.status(500).json({ error: 'Failed to sync users' });
    }
  });

  app.get('/api/db-usage', async (req, res) => {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        return res.status(500).json({ error: 'Database not connected' });
      }

      const stats = await db.stats();
      const storageUsedMB = (stats.dataSize + stats.indexSize) / (1024 * 1024);
      const storageLimitMB = 512; // MongoDB Atlas free tier limit
      const usagePercentage = (storageUsedMB / storageLimitMB) * 100;

      // Get collection stats
      const collections = await db.listCollections().toArray();
      const collectionStats = [];
      
      for (const collection of collections) {
        try {
          const count = await db.collection(collection.name).countDocuments();
          collectionStats.push({
            name: collection.name,
            sizeMB: "0.00", // We can't get exact size without stats()
            count: count
          });
        } catch (err) {
          console.error(`Error getting stats for collection ${collection.name}:`, err);
        }
      }

      const result = {
        storageUsedMB: storageUsedMB.toFixed(2),
        storageLimitMB,
        usagePercentage: usagePercentage.toFixed(1),
        collections: collectionStats,
        warning: usagePercentage > 80 ? 'Database storage limit approaching!' : null,
        critical: usagePercentage > 95 ? 'Database storage limit nearly reached!' : null
      };

      res.json(result);
    } catch (err) {
      console.error('Error getting database usage:', err);
      res.status(500).json({ error: 'Failed to get database usage' });
    }
  });

  app.get('/admin/unentered-matches', async (req, res) => {
    try {
      const Match = await import('./models/Match.js');
      const matches = await Match.default.find({ 
        completed: { $ne: true },
        confirmed: true 
      }).populate('player1 player2').lean();
      
      res.json(matches);
    } catch (err) {
      console.error('Error fetching unentered matches:', err);
      res.status(500).json({ error: 'Failed to fetch unentered matches' });
    }
  });

  app.patch('/admin/mark-lms-entered/:matchId', async (req, res) => {
    try {
      const { matchId } = req.params;
      const Match = await import('./models/Match.js');
      
      const match = await Match.default.findByIdAndUpdate(
        matchId,
        { lmsEntered: true },
        { new: true }
      );
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      res.json({ success: true, match });
    } catch (err) {
      console.error('Error marking match as LMS entered:', err);
      res.status(500).json({ error: 'Failed to mark match as entered' });
    }
  });

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  });

  // Serve division-specific standings JSON
  app.get('/static/standings_:division.json', (req, res) => {
    const division = req.params.division;
    const filePath = path.join(__dirname, 'public', `standings_${division}.json`);
    
    console.log(`📊 Standings request for division: ${division}`);
    console.log(`📊 File path: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Standings file not found: ${filePath}`);
      return res.status(404).json({ 
        error: `Standings file not found for division: ${division}`,
        filePath: filePath
      });
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error sending standings file: ${err.message}`);
        res.status(500).json({ error: 'Failed to send standings file' });
      } else {
        console.log(`✅ Standings file sent successfully: ${filePath}`);
      }
    });
  });

  // Debug route to check static file existence
  app.get('/debug-static', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'public', 'schedule_FRBCAPL_TEST.json');
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.status(404).send('File not found: ' + filePath);
      } else {
        res.send('File exists: ' + filePath);
      }
    });
  });

  app.get('/test-alive', (req, res) => {
    res.send('Backend is alive and running the latest code!');
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

  
}

startServer(); 