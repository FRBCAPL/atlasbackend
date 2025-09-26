import express from 'express';
import { sendEmail } from '../controllers/emailController.js';

const router = express.Router();

// Send email from admin interface
router.post('/send-email', sendEmail);

export default router;
