import express from 'express';
import {
  lookupPlayerAndMatches,
  submitMatchSchedulingRequest,
  getPendingMatchRequests,
  getAllMatchRequests,
  approveMatchRequest,
  rejectMatchRequest
} from '../controllers/matchSchedulingController.js';

const router = express.Router();

// Lookup player and get available matches (public endpoint)
router.post('/lookup-player', lookupPlayerAndMatches);

// Submit a new match scheduling request (public endpoint)
router.post('/submit', submitMatchSchedulingRequest);

// Get pending match requests (admin only)
router.get('/pending', getPendingMatchRequests);

// Get all match requests (admin only)
router.get('/all', getAllMatchRequests);

// Approve a match request (admin only)
router.post('/:id/approve', approveMatchRequest);

// Reject a match request (admin only)
router.post('/:id/reject', rejectMatchRequest);

export default router;
