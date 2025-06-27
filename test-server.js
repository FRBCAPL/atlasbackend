const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool, testConnection, initializeDatabase } = require('./database');

const app = express();

// CORS setup
app.use(cors({
  origin: [
    'https://frontrangepool.com',
    'https://www.frontrangepool.com',
    'http://localhost:5173'
  ]
}));

app.use(express.json());

// Test database connection
app.get('/health', async (req, res) => {
  try {
    const connected = await testConnection();
    if (connected) {
      res.json({ 
        status: 'ok', 
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test database initialization
app.get('/init-db', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({ 
      status: 'ok', 
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test basic query
app.get('/test-query', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    res.json({ 
      status: 'ok', 
      result: rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ 
      status: 'error', 
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Front Range Pool League API - Test Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🧪 Test server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️  DB init: http://localhost:${PORT}/init-db`);
}); 