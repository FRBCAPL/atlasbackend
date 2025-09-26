import express from 'express';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  getUnreadNotificationCount 
} from '../services/notificationService.js';

const router = express.Router();

// Get notifications for a user
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 50 } = req.query;
    
    const result = await getUserNotifications(email, parseInt(limit));
    
    if (result.success) {
      res.json({
        success: true,
        notifications: result.notifications
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error in GET /notifications/user/:email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark a notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }
    
    const result = await markNotificationAsRead(id, userEmail);
    
    if (result.success) {
      res.json({
        success: true,
        notification: result.notification
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error in PUT /notifications/:id/read:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark all notifications as read for a user
router.put('/mark-all-read', async (req, res) => {
  try {
    const { userEmail } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'User email is required'
      });
    }
    
    const result = await markAllNotificationsAsRead(userEmail);
    
    if (result.success) {
      res.json({
        success: true,
        updatedCount: result.updatedCount
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error in PUT /notifications/mark-all-read:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get unread notification count for a user
router.get('/unread-count/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await getUnreadNotificationCount(email);
    
    if (result.success) {
      res.json({
        success: true,
        count: result.count
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error in GET /notifications/unread-count/:email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
