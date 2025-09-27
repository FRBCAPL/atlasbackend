import express from 'express';
import {
  checkExistingPlayer,
  claimExistingAccounts,
  searchLadderPlayer,
  claimLadderPosition,
  registerNewUser,
  addLadderAccess
} from '../controllers/unifiedSignupController.js';

const router = express.Router();

// Check for existing players by name or email
router.post('/check-existing-player', checkExistingPlayer);

// Claim existing accounts and create unified account
router.post('/claim-existing-accounts', claimExistingAccounts);

// Search for existing ladder player
router.post('/search-ladder-player', searchLadderPlayer);

// Claim existing ladder position
router.post('/claim-ladder-position', claimLadderPosition);

// Register new user
router.post('/register', registerNewUser);

// Add ladder access to existing league player
router.post('/add-ladder-access', addLadderAccess);

export default router;
