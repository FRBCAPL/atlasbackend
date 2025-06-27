const express = require('express');
const proposalRoutes = require('./proposals');
const userRoutes = require('./users');
const matchRoutes = require('./matches');
const noteRoutes = require('./notes');
const mongoose = require('mongoose');

const router = express.Router();

router.use('/proposals', proposalRoutes);
router.use('/users', userRoutes);
router.use('/matches', matchRoutes);
router.use('/notes', noteRoutes);

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
        const collStats = await db.collection(collection.name).stats();
        collectionStats.push({
          name: collection.name,
          sizeMB: (collStats.size / (1024 * 1024)).toFixed(2),
          count: collStats.count
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

module.exports = router; 