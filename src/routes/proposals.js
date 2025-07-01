const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');

router.get('/by-name', proposalController.getByReceiver);
router.get('/by-sender', proposalController.getBySender);
router.post('/', proposalController.create);
router.put('/:id', proposalController.update);
router.patch('/:id/status', proposalController.updateStatus);
router.patch('/:id/counter', proposalController.counter);
router.get('/debug-list', proposalController.debugList);
router.post('/:id/cancel', proposalController.cancel);

module.exports = router; 