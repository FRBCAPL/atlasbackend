import express from 'express';
import { getAllMatches, getCompletedMatches, create, markMatchCompleted, validateMatch, rejectMatch, getMatchStats } from '../controllers/matchController.js';

const router = express.Router();

router.get('/all-matches', getAllMatches);
router.get('/completed-matches', getCompletedMatches);
router.get('/stats/:player/:division', getMatchStats);
router.post('/', create);
router.patch('/completed/:id', markMatchCompleted);

// New match validation routes
router.post('/validate/:id', validateMatch);
router.post('/reject/:id', rejectMatch);

export default router; 