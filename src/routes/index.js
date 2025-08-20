import express from 'express';
import proposalRoutes from './proposals.js';
import userRoutes from './users.js';
import matchRoutes from './matches.js';
import noteRoutes from './notes.js';
import challengeRoutes from './challenges.js';
import mongoose from 'mongoose';

// New seasons routes
import seasonRoutes from './seasons.js';
import messagesRoutes from './messages.js';
import calendarRoutes from './calendar.js';

const router = express.Router();

router.use('/proposals', proposalRoutes);
router.use('/users', userRoutes);
router.use('/matches', matchRoutes);
router.use('/notes', noteRoutes);
router.use('/challenges', challengeRoutes);
router.use('/seasons', seasonRoutes);
router.use('/messages', messagesRoutes);
router.use('/calendar', calendarRoutes);

// Simple test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    mongooseState: mongoose.connection.readyState
  });
});

// Add database usage monitoring route
router.get('/db-usage', async (req, res) => {
  try {
    // Use mongoose connection directly
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get database stats
    const stats = await db.stats();
    
    // Calculate usage percentages
    const storageUsedMB = (stats.dataSize + stats.indexSize) / (1024 * 1024);
    const storageLimitMB = 512; // Atlas free tier limit
    const usagePercentage = (storageUsedMB / storageLimitMB) * 100;
    
    // Get collection sizes
    const collections = await db.listCollections().toArray();
    const collectionStats = [];
    
    for (const collection of collections) {
      try {
        // Use countDocuments() instead of stats() for collection info
        const count = await db.collection(collection.name).countDocuments();
        collectionStats.push({
          name: collection.name,
          sizeMB: "0.00", // We can't get exact size without stats()
          count: count
        });
      } catch (err) {
        console.error(`Error getting stats for collection ${collection.name}:`, err);
        collectionStats.push({
          name: collection.name,
          sizeMB: "0.00",
          count: 0,
          error: "Could not get stats"
        });
      }
    }

    res.json({
      storageUsedMB: storageUsedMB.toFixed(2),
      storageLimitMB: storageLimitMB,
      usagePercentage: usagePercentage.toFixed(1),
      collections: collectionStats,
      warning: usagePercentage > 80 ? 'Approaching storage limit!' : null,
      critical: usagePercentage > 95 ? 'CRITICAL: Near storage limit!' : null
    });
  } catch (err) {
    console.error('Error getting database usage:', err);
    res.status(500).json({ 
      error: 'Failed to get database usage',
      details: err.message 
    });
  }
});

export default router; 