import express from 'express';
import { 
  login, 
  validatePin, 
  searchLadderPlayer, 
  submitAccountClaim, 
  getPendingClaims, 
  approveAccountClaim, 
  rejectAccountClaim 
} from '../controllers/authController.js';

const router = express.Router();

// Login endpoint - accepts email or PIN
router.post('/login', login);

// PIN validation endpoint
router.post('/validate-pin', validatePin);

// Account claiming endpoints for ladder players
router.post('/search-ladder-player', searchLadderPlayer);
router.post('/submit-account-claim', submitAccountClaim);
router.get('/pending-claims', getPendingClaims);
router.post('/approve-account-claim', approveAccountClaim);
router.post('/reject-account-claim', rejectAccountClaim);

export default router;
