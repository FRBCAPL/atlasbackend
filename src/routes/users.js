import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

router.get('/', userController.getAllUsers);
router.post('/admin/sync-users', userController.syncUsers);
router.get('/:idOrEmail', userController.getUser);

export default router; 