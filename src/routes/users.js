const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/:idOrEmail', userController.getUser);
router.post('/admin/sync-users', userController.syncUsers);

module.exports = router; 