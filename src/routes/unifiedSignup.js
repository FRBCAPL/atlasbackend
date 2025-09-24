import express from 'express';
import {
  searchLadderPlayer,
  claimLadderPosition,
  registerNewUser,
  addLadderAccess
} from '../controllers/unifiedSignupController.js';

const router = express.Router();

// Search for existing ladder player
router.post('/search-ladder-player', searchLadderPlayer);

// Claim existing ladder position
router.post('/claim-ladder-position', claimLadderPosition);

// Register new user
router.post('/register', registerNewUser);

// Add ladder access to existing league player
router.post('/add-ladder-access', addLadderAccess);

export default router;
