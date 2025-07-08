import express from 'express';
import * as proposalController from '../controllers/proposalController.js';

const router = express.Router();

router.get('/by-name', proposalController.getByReceiver);
router.get('/by-sender', proposalController.getBySender);
router.post('/', proposalController.create);
router.put('/:id', proposalController.update);
router.patch('/:id/status', proposalController.updateStatus);
router.patch('/:id/counter', proposalController.counter);
router.get('/debug-list', proposalController.debugList);
router.post('/:id/cancel', proposalController.cancel);

export default router; 