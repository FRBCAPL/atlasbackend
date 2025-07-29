import express from 'express';
import * as challengeController from '../controllers/challengeController.js';

const router = express.Router();

// Challenge validation
router.post('/validate', challengeController.validateChallenge);
router.post('/validate-defense', challengeController.validateDefenseAcceptance);

// Challenge statistics
router.get('/stats/:playerName/:division', challengeController.getChallengeStats);
router.get('/limits/:playerName/:division', challengeController.getChallengeLimits);

// Eligible opponents
router.get('/eligible-opponents/:playerName/:division', challengeController.getEligibleOpponents);

// Division-wide statistics (admin use)
router.get('/division-stats/:division', challengeController.getDivisionChallengeStats);

// Current phase and week information
router.get('/phase-week/:division', challengeController.getCurrentPhaseAndWeek);

// Manual updates (admin use)
router.put('/stats/:playerName/:division', challengeController.updateChallengeStats);
router.delete('/division-stats/:division', challengeController.resetDivisionChallengeStats);

export default router; 