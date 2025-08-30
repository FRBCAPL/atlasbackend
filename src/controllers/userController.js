import User from '../models/User.js';
import PendingRegistration from '../models/PendingRegistration.js';
import syncSheetUsersToMongo from '../utils/syncUsersFromSheet.js';
import bcrypt from 'bcryptjs';
import LadderPlayer from '../models/LadderPlayer.js';

export const getAllUsers = async (req, res) => {
  try {
    // Use unified system instead of old User and LadderPlayer models
    const UnifiedUser = (await import('../models/UnifiedUser.js')).default;
    const LeagueProfile = (await import('../models/LeagueProfile.js')).default;
    const LadderProfile = (await import('../models/LadderProfile.js')).default;
    
    const unifiedUsers = await UnifiedUser.find({}).lean();
    
    // Transform unified users to match the expected format for admin interface
    const users = await Promise.all(unifiedUsers.map(async (user) => {
      const leagueProfile = await LeagueProfile.findOne({ userId: user._id }).lean();
      const ladderProfile = await LadderProfile.findOne({ userId: user._id }).lean();
      
      // Determine system type based on profiles
      let system = 'none';
      if (leagueProfile && ladderProfile) {
        system = 'both';
      } else if (leagueProfile) {
        system = 'league';
      } else if (ladderProfile) {
        system = 'ladder';
      }
      
      return {
        ...user,
        system: system,
        isLeaguePlayer: !!leagueProfile,
        isLadderPlayer: !!ladderProfile,
        divisions: leagueProfile?.divisions || [],
        locations: leagueProfile?.locations || user.locations,
        availability: leagueProfile?.availability || user.availability,
        emergencyContactName: leagueProfile?.emergencyContactName || user.emergencyContactName,
        emergencyContactPhone: leagueProfile?.emergencyContactPhone || user.emergencyContactPhone,
        textNumber: leagueProfile?.textNumber || user.textNumber,
        notes: leagueProfile?.notes || user.notes,
        // Ladder info if available
        ladderName: ladderProfile?.ladderName,
        position: ladderProfile?.position,
        fargoRate: ladderProfile?.fargoRate,
        ladderInfo: ladderProfile ? {
          ladderName: ladderProfile.ladderName,
          position: ladderProfile.position,
          fargoRate: ladderProfile.fargoRate,
          isActive: ladderProfile.isActive
        } : null
      };
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Search users endpoint
export const searchUsers = async (req, res) => {
  try {
    const { approved, division, search } = req.query;
    
    // Use unified system instead of old User model
    const UnifiedUser = (await import('../models/UnifiedUser.js')).default;
    const LeagueProfile = (await import('../models/LeagueProfile.js')).default;
    const LadderProfile = (await import('../models/LadderProfile.js')).default;
    
    let query = {};
    
    // Filter by approval status
    if (approved === 'true') {
      query.isApproved = true;
    } else if (approved === 'false') {
      query.isApproved = false;
    }
    
    // Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const unifiedUsers = await UnifiedUser.find(query).lean();
    
    // Transform unified users to match the expected format for admin interface
    const users = await Promise.all(unifiedUsers.map(async (user) => {
      const leagueProfile = await LeagueProfile.findOne({ userId: user._id }).lean();
      const ladderProfile = await LadderProfile.findOne({ userId: user._id }).lean();
      
      // Determine system type based on profiles
      let system = 'none';
      if (leagueProfile && ladderProfile) {
        system = 'both';
      } else if (leagueProfile) {
        system = 'league';
      } else if (ladderProfile) {
        system = 'ladder';
      }
      
      // Filter by division if specified
      if (division) {
        const userDivisions = leagueProfile?.divisions || [];
        if (!userDivisions.includes(division)) {
          return null; // Skip this user
        }
      }
      
      return {
        ...user,
        system: system,
        isLeaguePlayer: !!leagueProfile,
        isLadderPlayer: !!ladderProfile,
        divisions: leagueProfile?.divisions || [],
        locations: leagueProfile?.locations || user.locations,
        availability: leagueProfile?.availability || user.availability,
        emergencyContactName: leagueProfile?.emergencyContactName || user.emergencyContactName,
        emergencyContactPhone: leagueProfile?.emergencyContactPhone || user.emergencyContactPhone,
        textNumber: leagueProfile?.textNumber || user.textNumber,
        notes: leagueProfile?.notes || user.notes,
        // Ladder info if available
        ladderName: ladderProfile?.ladderName,
        position: ladderProfile?.position,
        fargoRate: ladderProfile?.fargoRate,
        ladderInfo: ladderProfile ? {
          ladderName: ladderProfile.ladderName,
          position: ladderProfile.position,
          fargoRate: ladderProfile.fargoRate,
          isActive: ladderProfile.isActive
        } : null
      };
    }));
    
    // Filter out null values (users that didn't match division filter)
    const filteredUsers = users.filter(user => user !== null);
    
    res.json({
      success: true,
      users: filteredUsers
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

// Create new user (admin only)
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      pin,
      division,
      locations,
      isApproved,
      isActive
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      pin,
      division,
      locations,
      isApproved: isApproved !== undefined ? isApproved : true,
      isActive: isActive !== undefined ? isActive : true,
      approvalDate: new Date(),
      approvedBy: 'admin'
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        pin: newUser.pin
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
};

// Update existing user (admin only)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated via this endpoint
    delete updateData._id;
    delete updateData.__v;
    delete updateData.pin; // Don't allow PIN updates via this endpoint
    delete updateData.isAdmin; // Don't allow admin status updates via this endpoint

    // Use unified system instead of old User and LadderPlayer models
    const UnifiedUser = (await import('../models/UnifiedUser.js')).default;
    const LeagueProfile = (await import('../models/LeagueProfile.js')).default;
    const LadderProfile = (await import('../models/LadderProfile.js')).default;

    // Find the unified user
    const unifiedUser = await UnifiedUser.findById(userId);
    if (!unifiedUser) {
        return res.status(404).json({
          success: false,
        message: 'Player not found in unified system'
        });
    }

    // If updating email, check if it already exists
    if (updateData.email && updateData.email.trim() !== '') {
      const existingUser = await UnifiedUser.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: userId } // Exclude current user
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: `Email "${updateData.email}" is already in use by another player`
        });
      }
      
      // Convert email to lowercase
      updateData.email = updateData.email.toLowerCase();
    }

    // Separate unified user data from profile data
    const unifiedUserData = {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      email: updateData.email,
      phone: updateData.phone,
      isApproved: updateData.isApproved,
      isActive: updateData.isActive,
      role: updateData.role
    };

    // League profile data
    const leagueProfileData = {
      divisions: updateData.divisions,
      locations: updateData.locations,
      availability: updateData.availability,
      emergencyContactName: updateData.emergencyContactName,
      emergencyContactPhone: updateData.emergencyContactPhone,
      textNumber: updateData.textNumber,
      notes: updateData.notes
    };

    // Ladder profile data
    const ladderProfileData = {
      ladderName: updateData.ladderName,
      position: updateData.position,
      fargoRate: updateData.fargoRate,
      isActive: updateData.isActive
    };

    // Update unified user
    const updatedUnifiedUser = await UnifiedUser.findByIdAndUpdate(
        userId,
        { 
        ...unifiedUserData,
          lastProfileUpdate: new Date()
        },
      { new: true, runValidators: false }
    );

    // Update or create league profile
    let leagueProfile = await LeagueProfile.findOne({ userId });
    if (leagueProfile) {
      await LeagueProfile.findByIdAndUpdate(
        leagueProfile._id,
        { ...leagueProfileData },
        { new: true, runValidators: false }
      );
    } else if (Object.values(leagueProfileData).some(val => val !== undefined && val !== null && val !== '')) {
      // Create league profile if there's data to save
      leagueProfile = new LeagueProfile({
        userId,
        ...leagueProfileData
      });
      await leagueProfile.save();
    }

    // Update or create ladder profile
    let ladderProfile = await LadderProfile.findOne({ userId });
    if (ladderProfile) {
      await LadderProfile.findByIdAndUpdate(
        ladderProfile._id,
        { ...ladderProfileData },
        { new: true, runValidators: false }
      );
    } else if (Object.values(ladderProfileData).some(val => val !== undefined && val !== null && val !== '')) {
      // Create ladder profile if there's data to save
      ladderProfile = new LadderProfile({
        userId,
        ...ladderProfileData
      });
      await ladderProfile.save();
    }

    res.json({
      success: true,
      message: 'Player updated successfully in unified system',
      user: {
        _id: updatedUnifiedUser._id,
        firstName: updatedUnifiedUser.firstName,
        lastName: updatedUnifiedUser.lastName,
        email: updatedUnifiedUser.email,
        phone: updatedUnifiedUser.phone,
        isApproved: updatedUnifiedUser.isApproved,
        isActive: updatedUnifiedUser.isActive,
        divisions: leagueProfile?.divisions || [],
        locations: leagueProfile?.locations || updatedUnifiedUser.locations,
        notes: leagueProfile?.notes || updatedUnifiedUser.notes
      }
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    
    // Provide more specific error messages
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use by another player'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating player'
    });
  }
};

// Delete user (admin only)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
}; 