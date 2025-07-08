import express from 'express';
import { getAllMatches, getCompletedMatches, create, markMatchCompleted } from '../controllers/matchController.js';

const router = express.Router();

router.get('/all-matches', getAllMatches);
router.get('/completed-matches', getCompletedMatches);
router.post('/', create);
router.patch('/completed/:id', markMatchCompleted);

export default router; 