import express from 'express';
import multer from 'multer';
import fargoUpdateService from '../services/fargoUpdateService.js';
import fargoScraperService from '../services/fargoScraperService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../temp/'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV and text files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'text/plain' || 
        file.originalname.endsWith('.csv') || 
        file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and text files are allowed'), false);
    }
  }
});

// Get current Fargo ratings for a ladder
router.get('/ratings/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    const ratings = await fargoUpdateService.getCurrentRatings(ladderName);
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching Fargo ratings:', error);
    res.status(500).json({ error: 'Failed to fetch Fargo ratings' });
  }
});

// Update Fargo ratings manually
router.post('/update/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    const { ratings } = req.body;
    
    if (!ratings || !Array.isArray(ratings)) {
      return res.status(400).json({ error: 'Invalid ratings format' });
    }

    // Create backup before updating
    const backupPath = await fargoUpdateService.createBackup(ladderName);
    
    // Update ratings
    const results = await fargoUpdateService.updateFargoRatings(ratings, ladderName);
    
    res.json({
      success: true,
      results,
      backupPath
    });
  } catch (error) {
    console.error('Error updating Fargo ratings:', error);
    res.status(500).json({ error: 'Failed to update Fargo ratings' });
  }
});

// Upload and update ratings from file
router.post('/upload/:ladderName', upload.single('ratingsFile'), async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempPath = req.file.path;
    
    try {
      // Load ratings from file
      const ratings = await fargoUpdateService.loadRatingsFromFile(tempPath);
      
      // Create backup before updating
      const backupPath = await fargoUpdateService.createBackup(ladderName);
      
      // Update ratings
      const results = await fargoUpdateService.updateFargoRatings(ratings, ladderName);
      
      res.json({
        success: true,
        results,
        backupPath
      });
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  } catch (error) {
    console.error('Error uploading and updating Fargo ratings:', error);
    res.status(500).json({ error: 'Failed to upload and update Fargo ratings' });
  }
});

// Get update history
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await fargoUpdateService.getUpdateHistory(parseInt(limit));
    res.json(history);
  } catch (error) {
    console.error('Error fetching update history:', error);
    res.status(500).json({ error: 'Failed to fetch update history' });
  }
});

// Create backup of current ratings
router.post('/backup/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    const backupPath = await fargoUpdateService.createBackup(ladderName);
    res.json({ success: true, backupPath });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Get available ladders
router.get('/ladders', async (req, res) => {
  try {
    const ladders = ['499-under', '500-549', '550-plus'];
    res.json(ladders);
  } catch (error) {
    console.error('Error fetching ladders:', error);
    res.status(500).json({ error: 'Failed to fetch ladders' });
  }
});

// Test endpoint to check if service is working
router.get('/health', async (req, res) => {
  try {
    const testRatings = await fargoUpdateService.getCurrentRatings('499-under');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      playersCount: testRatings.length
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test scraper with a single player
router.post('/test-scraper', async (req, res) => {
  try {
    const { playerName } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const result = await fargoScraperService.testScraper(playerName);
    
    res.json({
      success: true,
      playerName,
      result
    });
  } catch (error) {
    console.error('Error testing scraper:', error);
    res.status(500).json({ error: 'Failed to test scraper' });
  }
});

// Run automated scraper update
router.post('/scrape-update/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    if (!['499-under', '500-549', '550-plus'].includes(ladderName)) {
      return res.status(400).json({ error: 'Invalid ladder name' });
    }

    // Create backup before scraping
    const backupPath = await fargoUpdateService.createBackup(ladderName);
    
    // Run the scraper
    const results = await fargoScraperService.updateLadderRatings(ladderName);
    
    res.json({
      success: true,
      results,
      backupPath
    });
  } catch (error) {
    console.error('Error running scraper update:', error);
    res.status(500).json({ error: 'Failed to run scraper update' });
  }
});

// Get scraper status and configuration
router.get('/scraper-status', async (req, res) => {
  try {
    res.json({
      status: 'active',
      baseUrl: fargoScraperService.baseUrl,
      searchUrl: fargoScraperService.searchUrl,
      rateLimitDelay: fargoScraperService.rateLimitDelay,
      userAgent: fargoScraperService.userAgent,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting scraper status:', error);
    res.status(500).json({ error: 'Failed to get scraper status' });
  }
});

// Update a single player (gradual update)
router.post('/update-single-player/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    const { playerIndex } = req.body;
    
    if (!['499-under', '500-549', '550-plus'].includes(ladderName)) {
      return res.status(400).json({ error: 'Invalid ladder name' });
    }

    const index = playerIndex !== undefined ? playerIndex : await fargoScraperService.getNextPlayerIndex(ladderName);
    
    const result = await fargoScraperService.updateSinglePlayer(ladderName, index);
    
    if (result.success) {
      // Save the next index
      await fargoScraperService.savePlayerIndex(ladderName, result.nextIndex);
    }
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error updating single player:', error);
    res.status(500).json({ error: 'Failed to update single player' });
  }
});

// Get current player index
router.get('/player-index/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    if (!['499-under', '500-549', '550-plus'].includes(ladderName)) {
      return res.status(400).json({ error: 'Invalid ladder name' });
    }

    const index = await fargoScraperService.getNextPlayerIndex(ladderName);
    const players = await fargoUpdateService.getCurrentRatings(ladderName);
    
    res.json({
      currentIndex: index,
      totalPlayers: players.length,
      nextPlayer: players[index] || null,
      progress: `${index + 1}/${players.length}`
    });
  } catch (error) {
    console.error('Error getting player index:', error);
    res.status(500).json({ error: 'Failed to get player index' });
  }
});

// Reset player index (start over)
router.post('/reset-player-index/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    if (!['499-under', '500-549', '550-plus'].includes(ladderName)) {
      return res.status(400).json({ error: 'Invalid ladder name' });
    }

    await fargoScraperService.savePlayerIndex(ladderName, 0);
    
    res.json({
      success: true,
      message: `Player index reset for ${ladderName}`,
      newIndex: 0
    });
  } catch (error) {
    console.error('Error resetting player index:', error);
    res.status(500).json({ error: 'Failed to reset player index' });
  }
});

export default router;
