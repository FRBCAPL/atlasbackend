import UnifiedUser from '../models/UnifiedUser.js';
import LeagueProfile from '../models/LeagueProfile.js';
import LadderProfile from '../models/LadderProfile.js';
import bcrypt from 'bcryptjs';

export const unifiedLogin = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or PIN

    console.log('🔍 Unified Login attempt with identifier:', identifier);

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or PIN is required'
      });
    }

    // Search in unified user database
    let foundUser = null;
    let userType = null;
    let leagueProfile = null;
    let ladderProfile = null;

    // 1. Try to find by email first
    foundUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${identifier}$`, 'i') }
    });

    if (foundUser) {
      console.log('🔍 Found unified user by email:', `${foundUser.firstName} ${foundUser.lastName}`);
    }

    // 2. If not found by email, try to find by PIN
    if (!foundUser) {
      console.log('🔍 Checking PIN for all unified users...');
      const allUsers = await UnifiedUser.find({});
      
      for (const potentialUser of allUsers) {
        try {
          // Check if the identifier matches the pin field (handle both plain text and hashed PINs)
          if (potentialUser.pin) {
            // If PIN looks like a hash (starts with $2a$), use bcrypt.compare
            if (potentialUser.pin.startsWith('$2a$')) {
              const isPinMatch = await bcrypt.compare(identifier, potentialUser.pin);
              if (isPinMatch) {
                foundUser = potentialUser;
                console.log(`🔍 Found unified user by hashed PIN: ${foundUser.firstName} ${foundUser.lastName}`);
                break;
              }
            } else {
              // If PIN is plain text, compare directly
              if (potentialUser.pin === identifier) {
                foundUser = potentialUser;
                console.log(`🔍 Found unified user by plain text PIN: ${foundUser.firstName} ${foundUser.lastName}`);
                break;
              }
            }
          }
        } catch (error) {
          console.log(`🔍 Error checking PIN for ${potentialUser.firstName}: ${error.message}`);
          continue;
        }
      }
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        message: 'No user found with that email or PIN. You may need to claim your account.'
      });
    }

    // Check if user is approved and active
    if (!foundUser.isApproved) {
      return res.status(401).json({
        success: false,
        message: 'Your account is pending approval. Please contact an administrator.'
      });
    }

    if (!foundUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Get league and ladder profiles
    leagueProfile = await LeagueProfile.findOne({ userId: foundUser._id });
    ladderProfile = await LadderProfile.findOne({ userId: foundUser._id });

    // Determine user type based on profiles
    if (leagueProfile && ladderProfile) {
      userType = 'both';
      console.log('🔍 User has both league and ladder profiles');
    } else if (leagueProfile) {
      userType = 'league';
      console.log('🔍 User has league profile only');
    } else if (ladderProfile) {
      userType = 'ladder';
      console.log('🔍 User has ladder profile only');
    } else {
      userType = 'unified';
      console.log('🔍 User has unified account only (no game profiles)');
    }

    // Update last login
    await UnifiedUser.updateOne(
      { _id: foundUser._id },
      { $set: { lastLogin: new Date() } }
    );

    // Build response data
    const responseData = {
      success: true,
      userType: userType,
      user: {
        _id: foundUser._id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        email: foundUser.email,
        pin: identifier,
        isAdmin: foundUser.isAdmin,
        isSuperAdmin: foundUser.isSuperAdmin,
        isPlatformAdmin: foundUser.isPlatformAdmin,
        role: foundUser.role,
        phone: foundUser.phone,
        isActive: foundUser.isActive,
        isApproved: foundUser.isApproved,
        registrationDate: foundUser.registrationDate,
        lastLogin: foundUser.lastLogin,
        preferences: foundUser.preferences
      }
    };

    // Add league data if available
    if (leagueProfile) {
      responseData.user.leagueProfile = {
        division: leagueProfile.division,
        divisions: leagueProfile.divisions,
        locations: leagueProfile.locations,
        availability: leagueProfile.availability,
        totalMatches: leagueProfile.totalMatches,
        wins: leagueProfile.wins,
        losses: leagueProfile.losses,
        paymentStatus: leagueProfile.paymentStatus,
        hasPaidRegistrationFee: leagueProfile.hasPaidRegistrationFee
      };
    }

    // Add ladder data if available
    if (ladderProfile) {
      responseData.user.ladderProfile = {
        ladderId: ladderProfile.ladderId,
        ladderName: ladderProfile.ladderName,
        position: ladderProfile.position,
        fargoRate: ladderProfile.fargoRate,
        totalMatches: ladderProfile.totalMatches,
        wins: ladderProfile.wins,
        losses: ladderProfile.losses,
        isActive: ladderProfile.isActive,
        immunityUntil: ladderProfile.immunityUntil,
        vacationMode: ladderProfile.vacationMode,
        vacationUntil: ladderProfile.vacationUntil
      };
    }

    console.log('✅ Unified login successful for:', `${foundUser.firstName} ${foundUser.lastName} (${userType})`);

    res.json(responseData);

  } catch (error) {
    console.error('❌ Unified login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

export const getUnifiedUserStatus = async (req, res) => {
  try {
    const { email } = req.params;

    console.log('🔍 Getting unified user status for email:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find unified user
    const unifiedUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!unifiedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get profiles
    const leagueProfile = await LeagueProfile.findOne({ userId: unifiedUser._id });
    const ladderProfile = await LadderProfile.findOne({ userId: unifiedUser._id });

    const response = {
      success: true,
      isUnifiedUser: true,
      isLeaguePlayer: !!leagueProfile,
      isLadderPlayer: !!ladderProfile,
      user: {
        firstName: unifiedUser.firstName,
        lastName: unifiedUser.lastName,
        email: unifiedUser.email,
        isActive: unifiedUser.isActive,
        isApproved: unifiedUser.isApproved,
        role: unifiedUser.role
      }
    };

    // Add league data if available
    if (leagueProfile) {
      response.leagueData = {
        division: leagueProfile.division,
        divisions: leagueProfile.divisions,
        totalMatches: leagueProfile.totalMatches,
        wins: leagueProfile.wins,
        losses: leagueProfile.losses,
        paymentStatus: leagueProfile.paymentStatus
      };
    }

    // Add ladder data if available
    if (ladderProfile) {
      response.ladderData = {
        ladderName: ladderProfile.ladderName,
        position: ladderProfile.position,
        fargoRate: ladderProfile.fargoRate,
        totalMatches: ladderProfile.totalMatches,
        wins: ladderProfile.wins,
        losses: ladderProfile.losses
      };
    }

    console.log('✅ Unified user status retrieved for:', `${unifiedUser.firstName} ${unifiedUser.lastName}`);

    res.json(response);

  } catch (error) {
    console.error('❌ Get unified user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting user status'
    });
  }
};

export const claimUnifiedAccount = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    console.log('🔍 Claiming unified account for:', `${firstName} ${lastName} (${email})`);

    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, firstName, and lastName are required'
      });
    }

    // Check if user already exists
    const existingUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Look for existing profiles by name
    const leagueProfile = await LeagueProfile.findOne({
      $or: [
        { 'user.firstName': { $regex: new RegExp(`^${firstName}$`, 'i') } },
        { 'user.lastName': { $regex: new RegExp(`^${lastName}$`, 'i') } }
      ]
    }).populate('userId');

    const ladderProfile = await LadderProfile.findOne({
      $or: [
        { 'user.firstName': { $regex: new RegExp(`^${firstName}$`, 'i') } },
        { 'user.lastName': { $regex: new RegExp(`^${lastName}$`, 'i') } }
      ]
    }).populate('userId');

    // Create new unified user
    const newUnifiedUser = new UnifiedUser({
      firstName: firstName,
      lastName: lastName,
      email: email.toLowerCase(),
      pin: `${firstName}${lastName}`, // Default PIN
      isActive: true,
      isApproved: true,
      role: 'player',
      registrationDate: new Date(),
      preferences: {
        googleCalendarIntegration: false,
        emailNotifications: true
      }
    });

    await newUnifiedUser.save();

    console.log('✅ Created new unified user:', `${newUnifiedUser.firstName} ${newUnifiedUser.lastName}`);

    res.json({
      success: true,
      message: 'Account claimed successfully',
      user: {
        _id: newUnifiedUser._id,
        firstName: newUnifiedUser.firstName,
        lastName: newUnifiedUser.lastName,
        email: newUnifiedUser.email,
        pin: newUnifiedUser.pin
      }
    });

  } catch (error) {
    console.error('❌ Claim unified account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error claiming account'
    });
  }
};

export const updateUnifiedProfile = async (req, res) => {
  try {
    const { userId, profile, preferences } = req.body;

    console.log('🔍 Updating unified profile for user ID:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Find the user
    const user = await UnifiedUser.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile fields if provided
    if (profile) {
      const allowedFields = [
        'firstName', 
        'lastName', 
        'phone', 
        'emergencyContactName', 
        'emergencyContactPhone'
      ];

      for (const field of allowedFields) {
        if (profile[field] !== undefined) {
          user[field] = profile[field];
        }
      }
    }

    // Update preferences if provided
    if (preferences) {
      if (!user.preferences) {
        user.preferences = {};
      }
      
      if (preferences.googleCalendarIntegration !== undefined) {
        user.preferences.googleCalendarIntegration = preferences.googleCalendarIntegration;
      }
      
      if (preferences.emailNotifications !== undefined) {
        user.preferences.emailNotifications = preferences.emailNotifications;
      }
    }

    // Save the updated user
    await user.save();

    console.log('✅ Unified profile updated for:', `${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        emergencyContactName: user.emergencyContactName,
        emergencyContactPhone: user.emergencyContactPhone,
        preferences: user.preferences,
        isActive: user.isActive,
        isApproved: user.isApproved,
        role: user.role,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('❌ Update unified profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error updating profile'
    });
  }
};

export const changeUnifiedPin = async (req, res) => {
  try {
    const { userId, currentPin, newPin } = req.body;

    console.log('🔍 Changing unified PIN for user ID:', userId);

    if (!userId || !currentPin || !newPin) {
      return res.status(400).json({
        success: false,
        message: 'User ID, current PIN, and new PIN are required'
      });
    }

    if (newPin.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New PIN must be at least 4 characters long'
      });
    }

    // Find the user
    const user = await UnifiedUser.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current PIN
    let isCurrentPinValid = false;

    if (user.pin) {
      // If PIN looks like a hash (starts with $2a$), use bcrypt.compare
      if (user.pin.startsWith('$2a$')) {
        isCurrentPinValid = await bcrypt.compare(currentPin, user.pin);
      } else {
        // If PIN is plain text, compare directly
        isCurrentPinValid = (user.pin === currentPin);
      }
    }

    if (!isCurrentPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Current PIN is incorrect'
      });
    }

    // Hash the new PIN
    const hashedNewPin = await bcrypt.hash(newPin, 10);

    // Update the PIN
    user.pin = hashedNewPin;
    await user.save();

    console.log('✅ Unified PIN changed for:', `${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      message: 'PIN changed successfully'
    });

  } catch (error) {
    console.error('❌ Change unified PIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error changing PIN'
    });
  }
};

// ============================================================================
// ADMIN ENDPOINTS FOR UNIFIED USER MANAGEMENT
// ============================================================================

// Get all unified users for admin management
export const getAllUnifiedUsers = async (req, res) => {
  try {
    console.log('🔍 Admin: Getting all unified users');

    const users = await UnifiedUser.find({})
      .select('-pin') // Don't return PINs for security
      .sort({ firstName: 1, lastName: 1 });

    console.log(`✅ Admin: Found ${users.length} unified users`);

    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('❌ Admin: Get all unified users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting users'
    });
  }
};

// Search unified users
export const searchUnifiedUsers = async (req, res) => {
  try {
    const { q } = req.query;

    console.log('🔍 Admin: Searching unified users with query:', q);

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await UnifiedUser.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ]
    })
    .select('-pin') // Don't return PINs for security
    .sort({ firstName: 1, lastName: 1 });

    console.log(`✅ Admin: Found ${users.length} users matching "${q}"`);

    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('❌ Admin: Search unified users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error searching users'
    });
  }
};

// Get unified user profile with league and ladder data
export const getUnifiedUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 Admin: Getting unified user profile for ID:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await UnifiedUser.findById(userId).select('-pin');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get league and ladder profiles
    const leagueProfile = await LeagueProfile.findOne({ userId: user._id });
    const ladderProfile = await LadderProfile.findOne({ userId: user._id });

    console.log('✅ Admin: Retrieved user profile for:', `${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      user: user,
      leagueProfile: leagueProfile,
      ladderProfile: ladderProfile
    });

  } catch (error) {
    console.error('❌ Admin: Get unified user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting user profile'
    });
  }
};

// Add new unified user (admin only)
export const addUnifiedUser = async (req, res) => {
  try {
    const userData = req.body;

    console.log('🔍 Admin: Adding new unified user:', userData.email);

    if (!userData.email || !userData.firstName || !userData.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, and last name are required'
      });
    }

    // Check if user already exists
    const existingUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${userData.email}$`, 'i') }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = new UnifiedUser({
      ...userData,
      isActive: true,
      isApproved: true,
      registrationDate: new Date(),
      lastLogin: new Date()
    });

    await newUser.save();

    console.log('✅ Admin: Added new unified user:', `${newUser.firstName} ${newUser.lastName}`);

    res.json({
      success: true,
      user: newUser,
      message: 'User added successfully'
    });

  } catch (error) {
    console.error('❌ Admin: Add unified user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error adding user'
    });
  }
};

// Update unified user (admin only)
export const updateUnifiedUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    console.log('🔍 Admin: Updating unified user ID:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await UnifiedUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'emergencyContactName', 
      'emergencyContactPhone', 'isActive', 'isApproved', 'role', 'notes'
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        user[field] = updateData[field];
      }
    }

    await user.save();

    console.log('✅ Admin: Updated unified user:', `${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      user: user,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ Admin: Update unified user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error updating user'
    });
  }
};

// Delete unified user (admin only)
export const deleteUnifiedUser = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 Admin: Deleting unified user ID:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const user = await UnifiedUser.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete associated profiles
    await LeagueProfile.deleteMany({ userId: user._id });
    await LadderProfile.deleteMany({ userId: user._id });

    // Delete the user
    await UnifiedUser.findByIdAndDelete(userId);

    console.log('✅ Admin: Deleted unified user:', `${user.firstName} ${user.lastName}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Admin: Delete unified user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error deleting user'
    });
  }
};

// Get unified system statistics
export const getUnifiedSystemStats = async (req, res) => {
  try {
    console.log('🔍 Admin: Getting unified system statistics');

    const [
      totalUsers,
      activeUsers,
      approvedUsers,
      leagueProfiles,
      ladderProfiles
    ] = await Promise.all([
      UnifiedUser.countDocuments(),
      UnifiedUser.countDocuments({ isActive: true }),
      UnifiedUser.countDocuments({ isApproved: true }),
      LeagueProfile.countDocuments(),
      LadderProfile.countDocuments()
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      approvedUsers,
      pendingApprovals: totalUsers - approvedUsers,
      leagueProfiles,
      ladderProfiles,
      bothProfiles: Math.min(leagueProfiles, ladderProfiles) // Rough estimate
    };

    console.log('✅ Admin: Retrieved system statistics');

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Admin: Get unified system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting system stats'
    });
  }
};
