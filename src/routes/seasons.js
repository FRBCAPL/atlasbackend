import express from 'express';
import * as seasonController from '../controllers/seasonController.js';

const router = express.Router();

// Create a new division/season
router.post('/', seasonController.createSeason);

// List all divisions/seasons
router.get('/', seasonController.listSeasons);

// List all division names (for scripts)
router.get('/divisions', seasonController.listDivisionNames);

// Get current season for a division
router.get('/current/:division', seasonController.getCurrentSeason);

// Get current phase and week for a division
router.get('/phase/:division', seasonController.getCurrentPhaseAndWeek);

// Get all seasons for a division
router.get('/:division', seasonController.getSeasonsByDivision);

// Auto-update season phases
router.post('/update-phases/:division', seasonController.updateSeasonPhases);

// Assign players to a division
router.post('/:division/players', seasonController.assignPlayers);

// Remove a player from a division
router.delete('/:division/players/:playerId', seasonController.removePlayer);

// List players in a division
router.get('/:division/players', seasonController.listPlayers);

export default router; 