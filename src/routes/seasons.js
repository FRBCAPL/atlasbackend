import express from 'express';
import * as seasonController from '../controllers/seasonController.js';

const router = express.Router();

// Create a new division/season
router.post('/', seasonController.createSeason);

// List all divisions/seasons
router.get('/', seasonController.listSeasons);

// List all division names (for scripts)
router.get('/divisions', seasonController.listDivisionNames);

// Assign players to a division
router.post('/:division/players', seasonController.assignPlayers);

// Remove a player from a division
router.delete('/:division/players/:playerId', seasonController.removePlayer);

// List players in a division
router.get('/:division/players', seasonController.listPlayers);

export default router; 