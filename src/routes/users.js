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
    
    // Since PINs are hashed, we need to check all users
    const allUsers = await User.find({});
    let existingUser = null;
    
    for (const user of allUsers) {
      try {
        const isPinMatch = await user.comparePin(pin);
        if (isPinMatch) {
          existingUser = user;
          break;
        }
      } catch (error) {
        // Continue checking other users
        continue;
      }
    }
    
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
    console.log('🎯 PAYMENT ENDPOINT HIT - DEBUG VERSION');
    console.log('=== PAYMENT DEBUG START ===');
    console.log('Add payment request:', { params: req.params, body: req.body });
    
    const { userId } = req.params;
    const { amount, paymentType, paymentMethod, notes, date } = req.body;
    
    console.log('Parsed data:', { userId, amount, paymentType, paymentMethod, notes, date });
    
    // Validate required fields
    if (!amount || !paymentType || !paymentMethod) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: amount, paymentType, and paymentMethod are required' 
      });
    }
    
    // Validate amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.log('Validation failed - invalid amount:', amount);
      return res.status(400).json({ 
        success: false, 
        message: 'Amount must be a positive number' 
      });
    }
    
    console.log('Looking for user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('Found user:', { id: user._id, name: `${user.firstName} ${user.lastName}` });
    console.log('User paymentHistory exists:', !!user.paymentHistory);
    console.log('User paymentHistory length:', user.paymentHistory ? user.paymentHistory.length : 'N/A');
    
    // Initialize paymentHistory if it doesn't exist
    if (!user.paymentHistory) {
      console.log('Initializing paymentHistory array');
      user.paymentHistory = [];
    }
    
    // Add payment record
    const payment = {
      amount: parsedAmount,
      paymentType,
      paymentMethod,
      notes: notes || '',
      date: date || new Date(),
      addedBy: 'admin',
      timestamp: new Date()
    };
    
    console.log('Adding payment:', payment);
    
    user.paymentHistory.push(payment);
    console.log('Payment added to array, length now:', user.paymentHistory.length);
    
    console.log('Saving user...');
    
    // Fix any invalid preferredContacts values before saving
    if (user.preferredContacts && user.preferredContacts.length > 0) {
      const validContacts = ['email', 'phone', 'text'];
      user.preferredContacts = user.preferredContacts.filter(contact => 
        validContacts.includes(contact)
      );
      
      // If no valid contacts remain, set default
      if (user.preferredContacts.length === 0) {
        user.preferredContacts = ['email'];
      }
      
      console.log('Fixed preferredContacts:', user.preferredContacts);
    }
    
    await user.save();
    
    console.log('Payment saved successfully');
    console.log('=== PAYMENT DEBUG END ===');
    
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
    console.error('=== PAYMENT ERROR ===');
    console.error('Error adding payment:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END PAYMENT ERROR ===');
    
    res.status(500).json({ 
      success: false, 
      message: 'Error adding payment',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Debug endpoint to help troubleshoot login issues
router.get('/debug-users', async (req, res) => {
  try {
    const users = await User.find({}, {
      firstName: 1,
      lastName: 1,
      email: 1,
      isApproved: 1,
      isActive: 1,
      hasPin: 1 // Check if PIN field exists
    }).lean();
    
    res.json({
      success: true,
      userCount: users.length,
      users: users.map(user => ({
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isApproved: user.isApproved,
        isActive: user.isActive,
        hasPin: !!user.pin
      }))
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user debug info'
    });
  }
});

// Test PIN endpoint (for debugging only)
router.post('/test-pin', async (req, res) => {
  try {
    const { email, pin } = req.body;
    
    if (!email || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Email and PIN are required'
      });
    }
    
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        debug: { email, userExists: false }
      });
    }
    
    const isValidPin = await user.comparePin(pin);
    
    res.json({
      success: true,
      userFound: true,
      isValidPin,
      userInfo: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isApproved: user.isApproved,
        isActive: user.isActive,
        hasPin: !!user.pin
      }
    });
    
  } catch (error) {
    console.error('Error testing PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing PIN',
      error: error.message
    });
  }
});

// Test endpoint to verify server is working
router.get('/test-payment-endpoint', async (req, res) => {
  try {
    console.log('🎯 TEST PAYMENT ENDPOINT HIT');
    res.json({ 
      success: true, 
      message: 'Payment endpoint is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ success: false, message: 'Test endpoint error' });
  }
});

// Quick admin approval endpoint (for emergency admin access)
router.post('/approve-admin/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Approve the user and make them admin
    user.isApproved = true;
    user.isAdmin = true;
    user.isActive = true;
    user.approvalDate = new Date();
    user.approvedBy = 'emergency-admin-fix';
    
    await user.save();
    
    res.json({
      success: true,
      message: 'User approved and made admin successfully',
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isApproved: user.isApproved,
        isAdmin: user.isAdmin,
        isActive: user.isActive
      }
    });
    
  } catch (error) {
    console.error('Error approving admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving admin',
      error: error.message
    });
  }
});

export default router; 