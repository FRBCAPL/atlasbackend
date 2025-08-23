import express from 'express';
import DivisionConfig from '../models/DivisionConfig.js';
import Division from '../models/Division.js';

const router = express.Router();

// Get division configuration
router.get('/:divisionId', async (req, res) => {
  try {
    const { divisionId } = req.params;
    
    let config = await DivisionConfig.findOne({ divisionId });
    
    if (!config) {
      // Create default config if it doesn't exist
      const division = await Division.findById(divisionId);
      if (!division) {
        return res.status(404).json({ error: 'Division not found' });
      }
      
      config = new DivisionConfig({
        divisionId,
        divisionName: division.name,
        phase1Weeks: 6,
        currentSession: {
          name: `${division.name} Session`,
          startDate: null,
          endDate: null,
          isActive: true
        }
      });
      await config.save();
    }
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error getting division config:', error);
    res.status(500).json({ error: 'Failed to get division configuration' });
  }
});

// Update division configuration
router.put('/:divisionId', async (req, res) => {
  try {
    const { divisionId } = req.params;
    const { phase1Weeks, currentSession } = req.body;
    
    const division = await Division.findById(divisionId);
    if (!division) {
      return res.status(404).json({ error: 'Division not found' });
    }
    
    let config = await DivisionConfig.findOne({ divisionId });
    
    if (!config) {
      // Create new config if it doesn't exist
      config = new DivisionConfig({
        divisionId,
        divisionName: division.name
      });
    }
    
    // Update fields
    if (phase1Weeks !== undefined) {
      config.phase1Weeks = phase1Weeks;
    }
    
    if (currentSession) {
      config.currentSession = {
        ...config.currentSession,
        ...currentSession
      };
    }
    
    config.updatedAt = new Date();
    await config.save();
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error updating division config:', error);
    res.status(500).json({ error: 'Failed to update division configuration' });
  }
});

// Get all division configurations
router.get('/', async (req, res) => {
  try {
    const configs = await DivisionConfig.find({}).populate('divisionId', 'name description');
    res.json({ success: true, configs });
  } catch (error) {
    console.error('Error getting all division configs:', error);
    res.status(500).json({ error: 'Failed to get division configurations' });
  }
});

export default router;
