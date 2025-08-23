import express from 'express';
import { login, validatePin } from '../controllers/authController.js';

const router = express.Router();

// Login endpoint - accepts email or PIN
router.post('/login', login);

// PIN validation endpoint
router.post('/validate-pin', validatePin);

export default router;
