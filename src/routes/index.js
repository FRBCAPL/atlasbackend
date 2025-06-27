const express = require('express');
const proposalRoutes = require('./proposals');
const userRoutes = require('./users');
const matchRoutes = require('./matches');
const noteRoutes = require('./notes');
const { pool } = require('../../database');

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
    database: 'MySQL'
  });
});

// Add database usage monitoring route
router.get('/db-usage', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Get database size information
    const [dbStats] = await connection.execute(`
      SELECT 
        table_schema AS 'Database',
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size_MB'
      FROM information_schema.tables 
      WHERE table_schema = ?
      GROUP BY table_schema
    `, [process.env.DB_NAME]);
    
    // Get table sizes
    const [tableStats] = await connection.execute(`
      SELECT 
        table_name AS 'Table',
        ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size_MB',
        table_rows AS 'Rows'
      FROM information_schema.tables 
      WHERE table_schema = ?
      ORDER BY (data_length + index_length) DESC
    `, [process.env.DB_NAME]);
    
    connection.release();
    
    const totalSizeMB = dbStats[0]?.Size_MB || 0;
    const storageLimitMB = 1000; // Namecheap typical limit
    const usagePercentage = (totalSizeMB / storageLimitMB) * 100;
    
    res.json({
      storageUsedMB: totalSizeMB.toFixed(2),
      storageLimitMB: storageLimitMB,
      usagePercentage: usagePercentage.toFixed(1),
      tables: tableStats,
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