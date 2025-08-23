import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import syncSheetUsersToMongo from '../utils/syncUsersFromSheet.js';
import bcrypt from 'bcryptjs';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).lean();
    res.json(users);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Search users endpoint
export const searchUsers = async (req, res) => {
  try {
    const { approved, division, search } = req.query;
    
    let query = {};
    
    // Filter by approval status
    if (approved === 'true') {
      query.isApproved = true;
    } else if (approved === 'false') {
      query.isApproved = false;
    }
    
    // Filter by division
    if (division) {
      query.$or = [
        { division: division },
        { divisions: { $in: [division] } }
      ];
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('firstName lastName email phone locations availability preferredContacts division divisions isApproved')
      .lean();
    
    res.json({
      success: true,
      users: users
    });
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const idOrEmail = decodeURIComponent(req.params.idOrEmail);
    // Try to find by id or email
    const user = await User.findOne({ $or: [ { id: idOrEmail }, { email: idOrEmail } ] });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// New registration endpoint
export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      textNumber,
      emergencyContactName,
      emergencyContactPhone,
      preferredContacts,
      availability,
      locations,
      pin,
      division,
      notes
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if pending registration already exists
    const existingPending = await PendingRegistration.findOne({ email: email.toLowerCase() });
    if (existingPending) {
      return res.status(400).json({ error: 'Registration already submitted and pending approval' });
    }

    // Create pending registration
    const pendingRegistration = new PendingRegistration({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      textNumber,
      emergencyContactName,
      emergencyContactPhone,
      preferredContacts,
      availability,
      locations,
      pin,
      division,
      notes
    });

    await pendingRegistration.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Please wait for admin approval.',
      registrationId: pendingRegistration._id
    });

  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Get pending registrations (admin only)
export const getPendingRegistrations = async (req, res) => {
  try {
    const pendingRegistrations = await PendingRegistration.find({ 
      status: { $in: ['pending', 'payment_pending'] } 
    }).sort({ registrationDate: -1 });
    
    res.json(pendingRegistrations);
  } catch (err) {
    console.error('Error fetching pending registrations:', err);
    res.status(500).json({ error: 'Failed to fetch pending registrations' });
  }
};

// Approve registration (admin only)
export const approveRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { approvedBy, paymentInfo, division } = req.body;

    const pendingRegistration = await PendingRegistration.findById(registrationId);
    if (!pendingRegistration) {
      return res.status(404).json({ error: 'Pending registration not found' });
    }

    if (pendingRegistration.status !== 'pending' && pendingRegistration.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Registration has already been processed' });
    }

    // Update division if provided
    if (division) {
      pendingRegistration.division = division;
    }

    // Approve the registration
    const user = await pendingRegistration.approve(approvedBy, paymentInfo);

    res.json({
      success: true,
      message: 'Registration approved successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        division: user.division,
        isApproved: user.isApproved
      }
    });

  } catch (err) {
    console.error('Error approving registration:', err);
    res.status(500).json({ error: 'Failed to approve registration' });
  }
};

// Reject registration (admin only)
export const rejectRegistration = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { rejectedBy, notes } = req.body;

    const pendingRegistration = await PendingRegistration.findById(registrationId);
    if (!pendingRegistration) {
      return res.status(404).json({ error: 'Pending registration not found' });
    }

    if (pendingRegistration.status !== 'pending' && pendingRegistration.status !== 'payment_pending') {
      return res.status(400).json({ error: 'Registration has already been processed' });
    }

    // Reject the registration
    await pendingRegistration.reject(rejectedBy, notes);

    res.json({
      success: true,
      message: 'Registration rejected successfully'
    });

  } catch (err) {
    console.error('Error rejecting registration:', err);
    res.status(500).json({ error: 'Failed to reject registration' });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.pin;
    delete updateData.isAdmin;
    delete updateData.isApproved;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        ...updateData,
        lastProfileUpdate: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isApproved: user.isApproved
      }
    });

  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

// Verify PIN for login
export const verifyPin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    // First check approved users
    let user = await User.findOne({ email: email.toLowerCase(), isApproved: true });
    
    if (user) {
      const isValidPin = await user.comparePin(pin);
      if (isValidPin) {
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        return res.json({
          success: true,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            isAdmin: user.isAdmin,
            isApproved: user.isApproved
          }
        });
      }
    }

    // If not found in approved users, check pending registrations
    const pendingRegistration = await PendingRegistration.findOne({ 
      email: email.toLowerCase(),
      status: { $in: ['pending', 'payment_pending'] }
    });

    if (pendingRegistration) {
      const isValidPin = await bcrypt.compare(pin, pendingRegistration.pin);
      if (isValidPin) {
        return res.status(403).json({ 
          error: 'Registration pending approval. Please contact admin.',
          status: 'pending_approval'
        });
      }
    }

    res.status(401).json({ error: 'Invalid email or PIN' });

  } catch (err) {
    console.error('Error verifying PIN:', err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
};

export const syncUsers = async (req, res) => {
  try {
    await syncSheetUsersToMongo();
    res.json({ success: true, message: 'Users synced successfully' });
  } catch (err) {
    console.error('Error syncing users:', err);
    res.status(500).json({ error: 'Failed to sync users' });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { idOrEmail } = req.params;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences object is required' });
    }

    const user = await User.findOneAndUpdate(
      { $or: [ { id: idOrEmail }, { email: idOrEmail } ] },
      { 
        $set: { 
          preferences: {
            ...preferences,
            // Ensure we don't overwrite existing preferences
            googleCalendarIntegration: preferences.googleCalendarIntegration ?? false,
            emailNotifications: preferences.emailNotifications ?? true
          }
        } 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error updating user preferences:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
}; 