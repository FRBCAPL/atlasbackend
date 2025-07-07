const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');

// Send a message
router.post('/', messagesController.sendMessage);

// Get conversation between two users (optionally filter by proposalId)
router.get('/', messagesController.getConversation);

// Get unread messages for a user
router.get('/unread', messagesController.getUnread);

// Get conversations for a user
router.get('/conversations', messagesController.getConversations);

// Mark a message as read
router.put('/:id/read', messagesController.markRead);

module.exports = router; 