import express from 'express';
import * as userController from '../controllers/userController.js';
import User from '../models/User.js'; // Added import for User model

const router = express.Router();

// Public routes
router.post('/register', userController.registerUser);
router.post('/verify-pin', userController.verifyPin);

// Admin routes
router.get('/', userController.getAllUsers);
router.get('/search', userController.searchUsers);
router.get('/pending-registrations', userController.getPendingRegistrations);
router.post('/admin/sync-users', userController.syncUsers);
router.post('/admin/approve-registration/:registrationId', userController.approveRegistration);
router.post('/admin/reject-registration/:registrationId', userController.rejectRegistration);

// User management routes
router.get('/:idOrEmail', userController.getUser);
router.put('/:idOrEmail/preferences', userController.updatePreferences);
router.put('/:userId/profile', userController.updateUserProfile);

// Confirm payment and send PIN email
router.post('/:userId/confirm-payment', async (req, res) => {
  try {
    const { userId } = req.params;
    const { paymentMethod, paymentNotes } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Update payment status
    user.paymentStatus = 'paid';
    user.hasPaidRegistrationFee = true;
    user.paymentDate = new Date();
    user.paymentMethod = paymentMethod || 'Admin Confirmed';
    user.paymentNotes = paymentNotes || '';
    
    await user.save();
    
    // Send payment confirmation email with PIN
    // Note: You'll need to implement the email sending here
    // For now, we'll just return the PIN in the response
    const pin = user.pin; // This will be the hashed PIN, you might want to store the original
    
    res.json({ 
      success: true, 
      message: 'Payment confirmed successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        pin: pin, // In production, you'd send this via email instead
        paymentStatus: user.paymentStatus
      }
    });
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error confirming payment' 
    });
  }
});

// Get users pending payment
router.get('/pending-payment', async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      paymentStatus: 'pending',
      isActive: true 
    }).select('firstName lastName email registrationDate paymentStatus');
    
    res.json({ 
      success: true, 
      users: pendingUsers 
    });
    
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching pending payments' 
    });
  }
});

// Check if PIN already exists
router.get('/check-pin/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    
    // Check if PIN exists in database
    const existingUser = await User.findOne({ pin });
    
    res.json({ 
      success: true, 
      exists: !!existingUser 
    });
  } catch (error) {
    console.error('Error checking PIN:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking PIN uniqueness' 
    });
  }
});

// Add payment to user
router.post('/:userId/add-payment', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, paymentType, paymentMethod, notes, date } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize paymentHistory if it doesn't exist
    if (!user.paymentHistory) {
      user.paymentHistory = [];
    }
    
    // Add payment record
    const payment = {
      amount: parseFloat(amount),
      paymentType,
      paymentMethod,
      notes: notes || '',
      date: date || new Date(),
      addedBy: 'admin',
      timestamp: new Date()
    };
    
    user.paymentHistory.push(payment);
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Payment added successfully',
      payment,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ success: false, message: 'Error adding payment' });
  }
});

// Add penalty to user
router.post('/:userId/add-penalty', async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason, strikeLevel, notes, date } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Initialize penalties if it doesn't exist
    if (!user.penalties) {
      user.penalties = [];
    }
    
    // Add penalty record
    const penalty = {
      amount: parseFloat(amount),
      reason: reason || '',
      strikeLevel: parseInt(strikeLevel),
      notes: notes || '',
      date: date || new Date(),
      addedBy: 'admin',
      timestamp: new Date()
    };
    
    user.penalties.push(penalty);
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Penalty added successfully',
      penalty,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error adding penalty:', error);
    res.status(500).json({ success: false, message: 'Error adding penalty' });
  }
});

// Get user payment history
router.get('/:userId/payments', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({
      success: true,
      payments: user.paymentHistory || [],
      penalties: user.penalties || [],
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
});

export default router; 