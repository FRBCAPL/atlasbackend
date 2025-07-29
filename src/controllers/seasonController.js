import Season from '../models/Season.js';
import User from '../models/User.js';

// Create a new division/season
export const createSeason = async (req, res) => {
  try {
    const { name, division, seasonStart, description, rules, scheduleUrl, standingsUrl } = req.body;
    if (!name || !division || !seasonStart || !scheduleUrl || !standingsUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    // Calculate all dates and week counts
    const startDate = new Date(seasonStart);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid seasonStart date.' });
    }
    // Phase 1: 6 weeks, Phase 2: 4 weeks, Season: 10 weeks
    const phase1Start = new Date(startDate);
    const phase1End = new Date(startDate); phase1End.setDate(phase1End.getDate() + 7 * 6 - 1);
    const phase2Start = new Date(phase1End); phase2Start.setDate(phase2Start.getDate() + 1);
    const phase2End = new Date(phase2Start); phase2End.setDate(phase2End.getDate() + 7 * 4 - 1);
    const seasonEnd = new Date(phase2End);
    const totalWeeks = 10;
    const phase1Weeks = 6;
    const phase2Weeks = 4;
    const season = new Season({
      name,
      division,
      description,
      rules,
      scheduleUrl,
      standingsUrl,
      seasonStart: phase1Start,
      seasonEnd,
      phase1Start,
      phase1End,
      phase2Start,
      phase2End,
      totalWeeks,
      phase1Weeks,
      phase2Weeks,
      isActive: true,
      isCurrent: true
    });
    await season.save();
    res.status(201).json({ success: true, season });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// List all divisions/seasons
export const listSeasons = async (req, res) => {
  try {
    const seasons = await Season.find().sort({ seasonStart: -1 });
    res.json({ success: true, seasons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Assign players to a division (by division name)
export const assignPlayers = async (req, res) => {
  try {
    const { division } = req.params;
    const { playerIds } = req.body; // Array of user _id's
    if (!Array.isArray(playerIds)) {
      return res.status(400).json({ success: false, error: 'playerIds must be an array' });
    }
    // Add division to each user if not already present
    await User.updateMany(
      { _id: { $in: playerIds } },
      { $addToSet: { divisions: division } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Remove a player from a division
export const removePlayer = async (req, res) => {
  try {
    const { division, playerId } = req.params;
    await User.updateOne(
      { _id: playerId },
      { $pull: { divisions: division } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// List players in a division
export const listPlayers = async (req, res) => {
  try {
    const { division } = req.params;
    const players = await User.find({ divisions: division });
    res.json({ success: true, players });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// List all division names (for scripts)
export const listDivisionNames = async (req, res) => {
  try {
    const seasons = await Season.find({}, { division: 1, _id: 0 });
    const divisionNames = [...new Set(seasons.map(s => s.division))];
    res.json({ success: true, divisions: divisionNames });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get current season for a division
export const getCurrentSeason = async (req, res) => {
  try {
    const { division } = req.params;
    const season = await Season.getCurrentSeason(division);
    
    if (!season) {
      return res.status(404).json({ 
        success: false, 
        error: 'No current season found for this division' 
      });
    }
    
    res.json({ success: true, season });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get current phase and week for a division
export const getCurrentPhaseAndWeek = async (req, res) => {
  try {
    const { division } = req.params;
    const result = await Season.getCurrentPhaseAndWeek(division);
    
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all seasons for a division
export const getSeasonsByDivision = async (req, res) => {
  try {
    const { division } = req.params;
    const seasons = await Season.find({ division }).sort({ seasonStart: -1 });
    
    res.json({ success: true, seasons });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}; 