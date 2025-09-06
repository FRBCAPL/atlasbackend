import express from 'express';
import { sendChallengeConfirmationEmail, sendChallengeNotificationEmail } from '../services/nodemailerService.js';

const router = express.Router();

// Send challenge confirmation email
router.post('/send-challenge-confirmation', async (req, res) => {
  try {
    const emailData = req.body;
    
    // Validate required fields
    if (!emailData.to_email || !emailData.to_name || !emailData.from_name) {
      return res.status(400).json({ 
        error: 'Missing required email fields: to_email, to_name, from_name' 
      });
    }
    
    const result = await sendChallengeConfirmationEmail(emailData);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Challenge confirmation email sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send email', 
        details: result.error 
      });
    }
    
  } catch (error) {
    console.error('Error in email route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send challenge notification email
router.post('/send-challenge-notification', async (req, res) => {
  try {
    const emailData = req.body;
    
    // Validate required fields
    if (!emailData.to_email || !emailData.to_name || !emailData.from_name) {
      return res.status(400).json({ 
        error: 'Missing required email fields: to_email, to_name, from_name' 
      });
    }
    
    const result = await sendChallengeNotificationEmail(emailData);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Challenge notification email sent successfully',
        messageId: result.messageId 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send email', 
        details: result.error 
      });
    }
    
  } catch (error) {
    console.error('Error in challenge notification email route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
