const express = require('express');
const seasonController = require('../controllers/seasonController');

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

module.exports = router; 