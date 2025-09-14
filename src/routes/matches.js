import express from 'express';
import * as matchController from '../controllers/matchController.js';

const router = express.Router();

// Get all matches (with optional filters)
router.get('/', matchController.getMatches);

// Get matches by status
router.get('/status/:division/:status', matchController.getMatchesByStatus);

// Get player's matches
router.get('/player/:playerId/:division', matchController.getPlayerMatches);

// Create match from proposal
router.post('/from-proposal', matchController.createMatchFromProposal);

// Complete a match
router.patch('/:id/complete', matchController.completeMatch);

// Cancel a match
router.patch('/:id/cancel', matchController.cancelMatch);

// Get match statistics
router.get('/stats/:division', matchController.getMatchStats);

// Get head-to-head record between two players
router.get('/head-to-head/:player1Id/:player2Id', matchController.getHeadToHeadRecord);

export default router; 