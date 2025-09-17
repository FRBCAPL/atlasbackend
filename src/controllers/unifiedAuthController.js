import mongoose from 'mongoose';
import UnifiedUser from '../models/UnifiedUser.js';
import LeagueProfile from '../models/LeagueProfile.js';
import LadderPlayer from '../models/LadderPlayer.js';
import Ladder from '../models/Ladder.js';
import User from '../models/User.js';
import SimpleProfile from '../models/SimpleProfile.js';
import Location from '../models/Location.js';
import LadderPositionClaim from '../models/LadderPositionClaim.js';
import PromotionalConfig from '../models/PromotionalConfig.js';
import bcrypt from 'bcryptjs';

// Helper function to add custom locations to the database
const addCustomLocationToDatabase = async (locationName) => {
  try {
    if (!locationName || !locationName.trim()) {
      return false;
    }

    const trimmedName = locationName.trim();
    
    // Check if location already exists (case-insensitive)
    const existingLocation = await Location.findOne({ 
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existingLocation) {
      return true; // Location exists, consider it successful
    }

    // Create new location
    const newLocation = new Location({
      name: trimmedName,
      address: '', // Will need to be filled in manually by admin
      notes: `Added automatically by user through profile editing`,
      isActive: true
    });

    await newLocation.save();
    return true;

  } catch (error) {
    console.error(`❌ Error adding custom location "${locationName}" to database:`, error);
    return false;
  }
};

export const unifiedSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, appType } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Check if user already exists
    const existingUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate a random 4-digit PIN
    const generateRandomPin = () => {
      return Math.floor(1000 + Math.random() * 9000).toString();
    };

    // Ensure PIN is unique
    let pin;
    let isPinUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isPinUnique && attempts < maxAttempts) {
      pin = generateRandomPin();
      const existingPinUser = await UnifiedUser.findOne({ pin });
      if (!existingPinUser) {
        isPinUnique = true;
      }
      attempts++;
    }

    // If we couldn't generate a unique PIN after max attempts, use a timestamp-based PIN
    if (!isPinUnique) {
      pin = Date.now().toString().slice(-4);
    }

    // Create new unified user
    const newUser = new UnifiedUser({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      pin: pin, // Random 4-digit PIN
      password: password || null, // Optional password
      isActive: true,
      isApproved: true,
      isPendingApproval: false,
      role: 'player',
      registrationDate: new Date(),
      lastLogin: new Date(),
      preferences: {
        googleCalendarIntegration: false,
        emailNotifications: true
      }
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      userId: newUser._id,
      user: {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        pin: newUser.pin
      }
    });

  } catch (error) {
    console.error('❌ Unified signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during signup'
    });
  }
};

export const unifiedLogin = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or PIN

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or PIN is required'
      });
    }

    // Search in unified user database
    let foundUser = null;

    // 1. Try to find by email first
    foundUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${identifier}$`, 'i') }
    });

    if (foundUser) {

    }

    // 2. If not found by email, try to find by PIN
    if (!foundUser) {

      foundUser = await UnifiedUser.findOne({ pin: identifier });
      
      if (foundUser) {

      }
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        message: 'No user found with that email or PIN. Please use the first-time user form.'
      });
    }

    // Update last login
    await UnifiedUser.updateOne(
      { _id: foundUser._id },
      { $set: { lastLogin: new Date() } }
    );

    // Build response data - always give access to both apps
    const responseData = {
      success: true,
      userType: 'both', // Always give access to both apps
      user: {
        _id: foundUser._id,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        email: foundUser.email,
        pin: identifier,
        isAdmin: foundUser.isAdmin || false,
        isSuperAdmin: foundUser.isSuperAdmin || false,
        isPlatformAdmin: foundUser.isPlatformAdmin || false,
        role: foundUser.role || 'player',
        phone: foundUser.phone,
        isActive: true,
        registrationDate: foundUser.registrationDate,
        lastLogin: foundUser.lastLogin,
        preferences: foundUser.preferences || {}
      }
    };

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
    
    // Try to find ladder player by multiple methods
    let ladderPlayer = await LadderPlayer.findOne({ 
      firstName: unifiedUser.firstName, 
      lastName: unifiedUser.lastName
    });
    
    // If not found by name, try by email (some ladder players might have email stored)
    if (!ladderPlayer) {
      ladderPlayer = await LadderPlayer.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
    }
    
    // If still not found, try by unified user ID (if there's a reference)
    if (!ladderPlayer) {
      ladderPlayer = await LadderPlayer.findOne({ 
        userId: unifiedUser._id
      });
    }
    
    // Special case: If this is the guest user and we can't find a ladder player,
    // we'll return a generic response that allows the frontend to handle position claiming
    if (!ladderPlayer && email === 'guest@frontrangepool.com') {
      // For guest user, we'll let the frontend handle the position claiming process
      // and not try to force a ladder player match
    }

    const response = {
      success: true,
      isUnifiedUser: true,
      isLeaguePlayer: !!leagueProfile,
      isLadderPlayer: !!ladderPlayer,
      existingUser: true,
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
      response.leagueInfo = {
        firstName: unifiedUser.firstName,
        lastName: unifiedUser.lastName,
        division: leagueProfile.division,
        divisions: leagueProfile.divisions,
        totalMatches: leagueProfile.totalMatches,
        wins: leagueProfile.wins,
        losses: leagueProfile.losses,
        paymentStatus: leagueProfile.paymentStatus
      };
    }

    // Add ladder data if available
    if (ladderPlayer) {
      response.ladderInfo = {
        firstName: ladderPlayer.firstName,
        lastName: ladderPlayer.lastName,
        ladderName: ladderPlayer.ladderName,
        position: ladderPlayer.position,
        fargoRate: ladderPlayer.fargoRate,
        totalMatches: ladderPlayer.totalMatches,
        wins: ladderPlayer.wins,
        losses: ladderPlayer.losses
      };
    } else if (email === 'guest@frontrangepool.com') {
      // Special handling for guest user - they might be claiming a position
      // We'll return a flag to indicate they can claim positions
      response.canClaimPosition = true;
      response.guestUser = true;
    }

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
    const { email, firstName, lastName, pin, phone, ladderName, position, fargoRate } = req.body;

    console.log('🔍 Consolidated claiming attempt for:', `${firstName} ${lastName} (${email || 'no email'})`);

    // Check if we're in promotional period
    const promotionalConfig = await PromotionalConfig.getCurrentConfig();
    const isPromotionalPeriod = promotionalConfig.isPromotionalPeriod;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Check if user already exists in unified system (only if email provided)
    if (email) {
      const existingUnifiedUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

      if (existingUnifiedUser) {
      return res.status(400).json({
        success: false,
          message: 'User already exists with this email in the unified system'
        });
      }
    }

    // Search for existing profiles across all systems
    let leaguePlayer = null;
    let ladderPlayer = null;
    let foundEmail = null;

    // Search by email if provided
    if (email) {
      foundEmail = email.toLowerCase();
      
      // Check league system
      leaguePlayer = await User.findOne({ email: foundEmail });
      
      // Check ladder system
      ladderPlayer = await LadderPlayer.findOne({ email: foundEmail });
    }

    // Search by PIN if email not found or not provided
    if (!leaguePlayer && !ladderPlayer && pin) {

      // Search league players by PIN
      const allLeaguePlayers = await User.find({});
      for (const player of allLeaguePlayers) {
        const isPinValid = await player.comparePin(pin);
        if (isPinValid) {
          leaguePlayer = player;
          foundEmail = player.email;

          break;
        }
      }

      // Search ladder players by PIN
      if (!ladderPlayer) {
        const allLadderPlayers = await LadderPlayer.find({});
        for (const player of allLadderPlayers) {
          const isPinValid = await player.comparePin(pin);
          if (isPinValid) {
            ladderPlayer = player;
            foundEmail = player.email;

            break;
          }
        }
      }
    }

    // Search by name if no players found yet
    if (!leaguePlayer && !ladderPlayer) {

      // Check league system by name
      leaguePlayer = await User.findOne({
        firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
      });

      // Check ladder system by name
      ladderPlayer = await LadderPlayer.findOne({
        firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
      });

      if (leaguePlayer) {
        // Only use stored email if no email was provided by user
        foundEmail = email || leaguePlayer.email;

      }
      if (ladderPlayer) {
        // Only use stored email if no email was provided by user
        foundEmail = email || ladderPlayer.email || foundEmail;

      }
    }

    // If we found a ladder player, check if this position has already been claimed
    if (ladderPlayer) {
      const existingClaim = await LadderPositionClaim.findActiveClaim(
        ladderPlayer.ladderName, 
        ladderPlayer.position
      );
      
      if (existingClaim) {
        // Check if this is the same person trying to claim again
        if (existingClaim.claimerEmail === (foundEmail || email)) {
          return res.status(400).json({
            success: false,
            message: 'You have already claimed this position. Your claim is being processed.'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `This ladder position has already been claimed by another user. Position #${ladderPlayer.position} in ${ladderPlayer.ladderName} is no longer available.`
          });
        }
      }
    }

    // Verify name matches for any found players
    const verifyNameMatch = (player) => {
      if (!player) return false;
      const playerFirstName = player.firstName?.toLowerCase().trim();
      const playerLastName = player.lastName?.toLowerCase().trim();
      const inputFirstName = firstName.toLowerCase().trim();
      const inputLastName = lastName.toLowerCase().trim();
      
      return playerFirstName === inputFirstName && playerLastName === inputLastName;
    };

    // Validate name matches
    if (leaguePlayer && !verifyNameMatch(leaguePlayer)) {

      leaguePlayer = null;
    }
    
    if (ladderPlayer && !verifyNameMatch(ladderPlayer)) {

      ladderPlayer = null;
    }

    // Determine the claiming scenario and handle accordingly
    let response = {
      success: true,
      scenario: 'unknown',
      message: '',
      requiresApproval: false,
      user: null,
      accessGranted: false
    };

    if (leaguePlayer || ladderPlayer) {
      // SCENARIO 1: Existing player found - Auto-approve and create unified account

      // Always use the email provided by the user, not the stored email
      const finalEmail = email || foundEmail;
      if (!finalEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required for existing players'
        });
      }

      // Create unified account for existing player
    const newUnifiedUser = new UnifiedUser({
      firstName: firstName,
      lastName: lastName,
        email: finalEmail.toLowerCase(),
      pin: `${firstName}${lastName}`, // Default PIN
        phone: phone || leaguePlayer?.phone || '',
      isActive: true,
        isApproved: true, // Auto-approve existing players
      role: 'player',
      registrationDate: new Date(),
      preferences: {
        googleCalendarIntegration: false,
        emailNotifications: true
      }
    });

    await newUnifiedUser.save();

      // Use promotional period status from earlier check
      
      if (isPromotionalPeriod) {
        response.scenario = 'existing_player_pending_approval';
        response.message = 'Your claim has been submitted and is pending admin approval. You will be notified once approved.';
        response.accessGranted = false;
        response.requiresApproval = true;
      } else {
        response.scenario = 'existing_player_auto_approved';
        response.message = 'Existing player account automatically approved and unified!';
        response.accessGranted = true;
        response.requiresApproval = false;
      }
      response.user = {
        _id: newUnifiedUser._id,
        firstName: newUnifiedUser.firstName,
        lastName: newUnifiedUser.lastName,
        email: newUnifiedUser.email,
        pin: newUnifiedUser.pin
      };

      // Add profile information
      if (leaguePlayer) {
        response.leagueInfo = {
          firstName: leaguePlayer.firstName,
          lastName: leaguePlayer.lastName,
          email: leaguePlayer.email,
          phone: leaguePlayer.phone,
          divisions: leaguePlayer.divisions || []
        };
      }

      if (ladderPlayer) {
        response.ladderInfo = {
          firstName: ladderPlayer.firstName,
          lastName: ladderPlayer.lastName,
          position: ladderPlayer.position,
          fargoRate: ladderPlayer.fargoRate,
          ladderName: ladderPlayer.ladderName,
          isActive: ladderPlayer.isActive
        };

        // Use promotional period status from earlier check
        
        // Create a claim record to prevent duplicate claims
        const claimRecord = new LadderPositionClaim({
          ladderName: ladderPlayer.ladderName,
          position: ladderPlayer.position,
          playerName: `${ladderPlayer.firstName} ${ladderPlayer.lastName}`,
          claimerEmail: finalEmail,
          claimerName: `${firstName} ${lastName}`,
          status: isPromotionalPeriod ? 'pending' : 'completed', // Require approval during promo period
          claimData: {
            fargoRate: ladderPlayer.fargoRate?.toString() || '',
            phone: phone || '',
            message: isPromotionalPeriod ? 'Claim requires admin approval during promotional period' : 'Existing player auto-approved'
          },
          approvedBy: isPromotionalPeriod ? null : 'system',
          approvedAt: isPromotionalPeriod ? null : new Date()
        });

        await claimRecord.save();
        console.log(`📝 Created ${isPromotionalPeriod ? 'pending' : 'completed'} claim record for ${firstName} ${lastName} claiming position #${ladderPlayer.position} in ${ladderPlayer.ladderName}`);

        // CRITICAL FIX: Update the ladder player's email to match the unified account
        const oldEmail = ladderPlayer.email;
        if (oldEmail !== finalEmail) {
          ladderPlayer.email = finalEmail;
          await ladderPlayer.save();
          console.log(`✅ Updated ladder player email from ${oldEmail} to ${finalEmail}`);
        }
      }

    } else if (email) {
      // SCENARIO 2: New user with email - Create pending account requiring admin approval

      // If they're claiming a specific ladder position, check if this person has already claimed it
      if (ladderName && position) {
        const existingClaim = await LadderPositionClaim.findOne({
          ladderName,
          position,
          claimerEmail: email,
          status: { $in: ['pending', 'approved'] }
        });
        
        if (existingClaim) {
          return res.status(400).json({
            success: false,
            message: 'You have already claimed this position. Your claim is being processed.'
          });
        }

        // Create a pending claim record (multiple people can claim the same position)
        const claimRecord = new LadderPositionClaim({
          ladderName,
          position,
          playerName: `${firstName} ${lastName}`,
          claimerEmail: email,
          claimerName: `${firstName} ${lastName}`,
          status: 'pending',
          claimData: {
            fargoRate: fargoRate || '',
            phone: phone || '',
            message: 'New user claiming ladder position - requires admin approval'
          }
        });

        await claimRecord.save();
        console.log(`📝 Created pending claim record for ${firstName} ${lastName} claiming position #${position} in ${ladderName}`);
      }

      const newUnifiedUser = new UnifiedUser({
        firstName: firstName,
        lastName: lastName,
        email: email.toLowerCase(),
        pin: `${firstName}${lastName}`, // Default PIN
        phone: phone || '',
        isActive: false,
        isApproved: false,
        isPendingApproval: true,
        role: 'player',
        registrationDate: new Date(),
        preferences: {
          googleCalendarIntegration: false,
          emailNotifications: true
        }
      });

      await newUnifiedUser.save();

      response.scenario = 'new_user_pending_approval';
      response.message = 'Account created successfully! Please wait for admin approval.';
      response.requiresApproval = true;
      response.accessGranted = false;
      response.user = {
        _id: newUnifiedUser._id,
        firstName: newUnifiedUser.firstName,
        lastName: newUnifiedUser.lastName,
        email: newUnifiedUser.email
      };

    } else {
      // SCENARIO 3: No email provided and no existing player found

      return res.status(400).json({
        success: false,
        message: 'Email address is required for new users. Please provide your email address.'
      });
    }

    res.json(response);

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
    const { userId, email, appType, updates } = req.body;

    if (!userId || !appType || !updates) {
      return res.status(400).json({
        success: false,
        message: 'User ID, app type, and updates are required'
      });
    }

    // Find the user by ID or email
    let user = await UnifiedUser.findById(userId);
    if (!user && email) {
      user = await UnifiedUser.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
    }
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // For now, let's just update the main user record and return success
    // This is a simplified approach to get profile updates working
    if (updates.phone) {
      user.phone = updates.phone;
    }
    if (updates.basic && updates.basic.phone) {
      user.phone = updates.basic.phone;
    }
    
    await user.save();

    res.json({
      success: true,
      message: `${appType} profile updated for: ${user.firstName} ${user.lastName}`,
      profile: {
        phone: user.phone || '',
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error updating profile',
      error: error.message
    });
  }
};

export const changeUnifiedPin = async (req, res) => {
  try {
    const { userId, currentPin, newPin } = req.body;

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

    const users = await UnifiedUser.find({})
      .select('-pin') // Don't return PINs for security
      .sort({ firstName: 1, lastName: 1 });

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
     const ladderPlayer = await LadderPlayer.findOne({ 
       firstName: user.firstName, 
       lastName: user.lastName
     });

    res.json({
      success: true,
      user: user,
      leagueProfile: leagueProfile,
       ladderPlayer: ladderPlayer
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

    // Generate a random 4-digit PIN if not provided or if it looks like a name
    const generateRandomPin = () => {
      return Math.floor(1000 + Math.random() * 9000).toString();
    };

    let pin = userData.pin;
    
    // Check if PIN is provided and doesn't look like a name (contains only digits)
    if (!pin || !/^\d+$/.test(pin) || pin.length !== 4) {
      // Generate a unique random PIN
      let isPinUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isPinUnique && attempts < maxAttempts) {
        pin = generateRandomPin();
        const existingPinUser = await UnifiedUser.findOne({ pin });
        if (!existingPinUser) {
          isPinUnique = true;
        }
        attempts++;
      }

      // If we couldn't generate a unique PIN after max attempts, use a timestamp-based PIN
      if (!isPinUnique) {
        pin = Date.now().toString().slice(-4);
      }
    }

    // Create new user
    const newUser = new UnifiedUser({
      ...userData,
      pin: pin, // Ensure we use the proper PIN
      isActive: true,
      isApproved: true,
      registrationDate: new Date(),
      lastLogin: new Date()
    });

    await newUser.save();

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
     await LadderPlayer.deleteMany({ 
       firstName: user.firstName, 
       lastName: user.lastName
     });

    // Delete the user
    await UnifiedUser.findByIdAndDelete(userId);

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

// Soft delete unified user (move to deleted_users collection)
export const softDeleteUnifiedUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { deletedAt, deletedBy } = req.body;

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

    // Create a copy of the user data for the deleted_users collection
    const deletedUserData = {
      ...user.toObject(),
      originalId: user._id,
      deletedAt: deletedAt || new Date(),
      deletedBy: deletedBy || 'admin',
      deletedReason: 'Admin soft delete'
    };

    // Remove the _id field to let MongoDB generate a new one
    delete deletedUserData._id;

    // Insert into deleted_users collection
    const DeletedUser = mongoose.model('DeletedUser', UnifiedUser.schema, 'deletedusers');
    await DeletedUser.create(deletedUserData);

    // Also soft delete associated profiles by marking them as inactive
    await LeagueProfile.updateMany(
      { userId: user._id },
      { 
        isActive: false,
        deletedAt: new Date(),
        deletedBy: deletedBy || 'admin'
      }
    );

    await LadderPlayer.updateMany(
      { 
        firstName: user.firstName, 
        lastName: user.lastName 
      },
      { 
        isActive: false,
        deletedAt: new Date(),
        deletedBy: deletedBy || 'admin'
      }
    );

    // Remove the user from the main collection
    await UnifiedUser.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User moved to deleted users collection successfully'
    });

  } catch (error) {
    console.error('❌ Admin: Soft delete unified user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error soft deleting user'
    });
  }
};

// Get unified system statistics
export const copyProfileData = async (req, res) => {
  try {
    const { userId, fromApp, toApp, email } = req.body;

    if (!userId || !fromApp || !toApp) {
      return res.status(400).json({
        success: false,
        message: 'User ID, source app, and target app are required'
      });
    }

    // First find the unified user if we don't have userId
    let unifiedUser;
    if (!userId && email) {
      unifiedUser = await UnifiedUser.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
      if (unifiedUser) {
        userId = unifiedUser._id;
      }
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Could not find user'
      });
    }

    // Use the new SimpleProfile model for copying data
    let sourceProfile = await SimpleProfile.findOne({ userId, appType: fromApp });
    let targetProfile = await SimpleProfile.findOne({ userId, appType: toApp });

    // If target profile doesn't exist, create it
    if (!targetProfile) {
      targetProfile = new SimpleProfile({
        userId,
        appType: toApp,
        availability: {},
        locations: ''
      });
      await targetProfile.save();
    }

    // Log what we found

    // If source profile doesn't exist, create it
    if (!sourceProfile) {

      sourceProfile = new SimpleProfile({
        userId,
        appType: fromApp,
        availability: {},
        locations: ''
      });
      try {
        await sourceProfile.save();

      } catch (error) {
        console.error('Error creating source profile:', error);
        return res.status(500).json({
          success: false,
          message: 'Error creating source profile'
        });
      }
    }

    // Both profiles should exist now since we create them if they don't exist

    // Copy shared fields
    const fieldsToCopy = ['availability', 'locations'];
    let changesMade = false;

    for (const field of fieldsToCopy) {

      // Initialize empty values if they don't exist
      if (!sourceProfile[field]) {
        sourceProfile[field] = field === 'locations' ? '' : {};
      }
      if (!targetProfile[field]) {
        targetProfile[field] = field === 'locations' ? '' : {};
      }
      
      // Always copy the field, even if empty
      targetProfile[field] = JSON.parse(JSON.stringify(sourceProfile[field])); // Deep copy
      changesMade = true;

    }

    await targetProfile.save();

    res.json({
      success: true,
      message: 'Profile data copied successfully',
      targetProfile: {
        availability: targetProfile.availability,
        locations: targetProfile.locations
      }
    });

  } catch (error) {
    console.error('❌ Copy profile data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error copying profile data'
    });
  }
};

export const checkProfileCompleteness = async (req, res) => {
  try {
    const { appType } = req.params;
    const { email } = req.query;

    if (!appType || !email) {
      return res.status(400).json({
        success: false,
        message: 'App type and email are required'
      });
    }

    // First find the unified user
    const unifiedUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!unifiedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

         // Get the appropriate profile based on app type
     const Profile = appType === 'league' ? LeagueProfile : LadderPlayer;
     const profile = appType === 'league' 
       ? await LeagueProfile.findOne({ userId: unifiedUser._id })
       : await LadderPlayer.findOne({ 
           firstName: unifiedUser.firstName, 
           lastName: unifiedUser.lastName
         });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `No ${appType} profile found`
      });
    }

    // Define required fields for each app type
    const requiredFields = {
      league: ['availability', 'locations'],
      ladder: ['availability', 'locations']
    };

    // Check which required fields are missing
    const missingFields = requiredFields[appType].filter(field => {
      if (field === 'availability') {
        return !profile.availability || Object.keys(profile.availability).length === 0;
      }
      if (field === 'locations') {
        return !profile.locations || profile.locations.length === 0;
      }
      return !profile[field];
    });

    const isComplete = missingFields.length === 0;

    res.json({
      success: true,
      isComplete,
      missingFields,
      message: isComplete ? 'Profile is complete' : 'Profile is incomplete'
    });

  } catch (error) {
    console.error('❌ Check profile completeness error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error checking profile completeness'
    });
  }
};

export const getUnifiedSystemStats = async (req, res) => {
  try {

    const [
      totalUsers,
      activeUsers,
      approvedUsers,
      leagueProfiles,
       ladderPlayers
    ] = await Promise.all([
      UnifiedUser.countDocuments(),
      UnifiedUser.countDocuments({ isActive: true }),
      UnifiedUser.countDocuments({ isApproved: true }),
      LeagueProfile.countDocuments(),
       LadderPlayer.countDocuments()
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      approvedUsers,
      pendingApprovals: totalUsers - approvedUsers,
      leagueProfiles,
       ladderPlayers,
       bothProfiles: Math.min(leagueProfiles, ladderPlayers) // Rough estimate
    };

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

// Get profile data from existing profile collections (safe approach)
export const getProfileData = async (req, res) => {
  try {
    const { userId, appType, email } = req.query;

    if (!appType) {
      return res.status(400).json({
        success: false,
        message: 'App type is required'
      });
    }

    // Find the user by ID or email
    let user;
    if (userId) {
      user = await UnifiedUser.findById(userId);
    } else if (email) {
      user = await UnifiedUser.findOne({ 
        email: { $regex: new RegExp(`^${email}$`, 'i') }
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get profile data from BOTH collections for smart merging
    let profileData = {
      availability: {},
      locations: '',
      phone: user.phone || '',
      divisions: [],
      ladderInfo: null
    };

         // Check if user has both profiles

     const leagueProfile = await LeagueProfile.findOne({ userId: user._id });

     const ladderPlayer = await LadderPlayer.findOne({ 
       firstName: user.firstName, 
       lastName: user.lastName
     });

         const hasLeagueProfile = !!leagueProfile;
     const hasLadderProfile = !!ladderPlayer;

         if (hasLeagueProfile && hasLadderProfile) {
       // DUAL PLAYER: Smart merge data from both collections

               // Merge availability: prefer non-empty values, combine if both have data
        const leagueAvailability = leagueProfile.availability || {};
        const ladderAvailability = ladderPlayer.availability || {};
        
        if (Object.keys(leagueAvailability).length > 0 && Object.keys(ladderAvailability).length > 0) {
          // Both have availability data - merge them intelligently
          profileData.availability = { ...ladderAvailability, ...leagueAvailability };

        } else if (Object.keys(leagueAvailability).length > 0) {
          // Only league has availability
          profileData.availability = leagueAvailability;

        } else if (Object.keys(ladderAvailability).length > 0) {
          // Only ladder has availability
          profileData.availability = ladderAvailability;

        }
        
        // Merge locations: prefer non-empty values
        if (leagueProfile.locations && ladderPlayer.locations) {
          // Both have locations - combine them (remove duplicates)
          const leagueLocations = leagueProfile.locations.split(',').map(l => l.trim()).filter(l => l);
          const ladderLocations = ladderPlayer.locations.split(',').map(l => l.trim()).filter(l => l);
          const combinedLocations = [...new Set([...leagueLocations, ...ladderLocations])];
          profileData.locations = combinedLocations.join(', ');

        } else if (leagueProfile.locations) {
          profileData.locations = leagueProfile.locations;

        } else if (ladderPlayer.locations) {
          profileData.locations = ladderPlayer.locations;

        }
       
       // Get league divisions
       if (leagueProfile.divisions && leagueProfile.divisions.length > 0) {
         profileData.divisions = leagueProfile.divisions;

       }
       
               // Get ladder info
        console.log('🔍 Raw ladder player data (dual player):', {
          ladderName: ladderPlayer.ladderName,
          position: ladderPlayer.position,
          fargoRate: ladderPlayer.fargoRate,
          hasLadderName: !!ladderPlayer.ladderName,
          hasPosition: !!ladderPlayer.position,
          hasFargoRate: !!ladderPlayer.fargoRate
        });
        
                 if (ladderPlayer.ladderName || ladderPlayer.position) {
           profileData.ladderInfo = {
             ladderName: ladderPlayer.ladderName || 'Unnamed Ladder',
             position: ladderPlayer.position || 'Unranked'
           };

         } else {
           console.log('⚠️ No ladder info found in player (dual player)');
         }
       
     } else if (hasLeagueProfile) {
       // LEAGUE-ONLY PLAYER
       console.log('🔍 Found existing league profile:', {
         hasAvailability: !!leagueProfile.availability,
         hasLocations: !!leagueProfile.locations,
         availabilityKeys: leagueProfile.availability ? Object.keys(leagueProfile.availability) : 'none'
       });
       
       profileData.availability = leagueProfile.availability || {};
       profileData.locations = leagueProfile.locations || '';
       
       // Get league divisions
       if (leagueProfile.divisions && leagueProfile.divisions.length > 0) {
         profileData.divisions = leagueProfile.divisions;

       }
       
           } else if (hasLadderProfile) {
        // LADDER-ONLY PLAYER
        console.log('🔍 Found existing ladder player:', {
          hasAvailability: !!ladderPlayer.availability,
          hasLocations: !!ladderPlayer.locations,
          availabilityKeys: ladderPlayer.availability ? Object.keys(ladderPlayer.availability) : 'none'
        });
        
        profileData.availability = ladderPlayer.availability || {};
        profileData.locations = ladderPlayer.locations || '';
        
        // Get ladder info
        console.log('🔍 Raw ladder player data (ladder-only):', {
          ladderName: ladderPlayer.ladderName,
          position: ladderPlayer.position,
          fargoRate: ladderPlayer.fargoRate,
          hasLadderName: !!ladderPlayer.ladderName,
          hasPosition: !!ladderPlayer.position,
          hasFargoRate: !!ladderPlayer.fargoRate
        });
        
                 if (ladderPlayer.ladderName || ladderPlayer.position) {
           profileData.ladderInfo = {
             ladderName: ladderPlayer.ladderName || 'Unnamed Ladder',
             position: ladderPlayer.position || 'Unranked'
           };

         } else {
           console.log('⚠️ No ladder info found in player (ladder-only)');
         }
       
     } else {
       // NEW USER: Create basic profile in league collection only

       const basicProfile = {
         userId: user._id,
         user: {
           firstName: user.firstName,
           lastName: user.lastName,
           email: user.email
         },
         availability: {},
         locations: ''
       };
       
       // Only create league profile - don't assume they're a ladder player
       await new LeagueProfile(basicProfile).save();

     }

    res.json({
      success: true,
      profile: profileData
    });

  } catch (error) {
    console.error('❌ Get profile data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting profile data'
    });
  }
};
