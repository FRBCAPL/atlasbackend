const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/', userController.getAllUsers);
router.post('/admin/sync-users', userController.syncUsers);
router.get('/:idOrEmail', userController.getUser);

module.exports = router; 