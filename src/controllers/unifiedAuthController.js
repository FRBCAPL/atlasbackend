import UnifiedUser from '../models/UnifiedUser.js';
import LeagueProfile from '../models/LeagueProfile.js';
import LadderPlayer from '../models/LadderPlayer.js';
import User from '../models/User.js';
import SimpleProfile from '../models/SimpleProfile.js';
import Location from '../models/Location.js';
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
      console.log(`📍 Location "${trimmedName}" already exists in database`);
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
    console.log(`✅ Added custom location "${trimmedName}" to database`);
    return true;

  } catch (error) {
    console.error(`❌ Error adding custom location "${locationName}" to database:`, error);
    return false;
  }
};

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

    // 1. Try to find by email first
    foundUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${identifier}$`, 'i') }
    });

    if (foundUser) {
      console.log('🔍 Found unified user by email:', `${foundUser.firstName} ${foundUser.lastName}`);
    }

    // 2. If not found by email, try to find by PIN
    if (!foundUser) {
      console.log('🔍 Checking PIN...');
      foundUser = await UnifiedUser.findOne({ pin: identifier });
      
      if (foundUser) {
        console.log('🔍 Found user by PIN:', `${foundUser.firstName} ${foundUser.lastName}`);
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

    console.log('✅ Unified login successful for:', `${foundUser.firstName} ${foundUser.lastName}`);

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
     const ladderPlayer = await LadderPlayer.findOne({ 
       firstName: unifiedUser.firstName, 
       lastName: unifiedUser.lastName
     });

    const response = {
      success: true,
      isUnifiedUser: true,
      isLeaguePlayer: !!leagueProfile,
       isLadderPlayer: !!ladderPlayer,
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
     if (ladderPlayer) {
      response.ladderData = {
         ladderName: ladderPlayer.ladderName,
         position: ladderPlayer.position,
         fargoRate: ladderPlayer.fargoRate,
         totalMatches: ladderPlayer.totalMatches,
         wins: ladderPlayer.wins,
         losses: ladderPlayer.losses
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
    const { email, firstName, lastName, pin, phone } = req.body;

    console.log('🔍 Consolidated claiming attempt for:', `${firstName} ${lastName} (${email || 'no email'})`);

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
      console.log('🔍 Searching by PIN...');
      
      // Search league players by PIN
      const allLeaguePlayers = await User.find({});
      for (const player of allLeaguePlayers) {
        const isPinValid = await player.comparePin(pin);
        if (isPinValid) {
          leaguePlayer = player;
          foundEmail = player.email;
          console.log('✅ Found league player by PIN:', player.firstName, player.lastName);
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
            console.log('✅ Found ladder player by PIN:', player.firstName, player.lastName);
            break;
          }
        }
      }
    }

    // Search by name if no players found yet
    if (!leaguePlayer && !ladderPlayer) {
      console.log('🔍 Searching by name...');
      
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
        foundEmail = leaguePlayer.email;
        console.log('✅ Found league player by name:', leaguePlayer.firstName, leaguePlayer.lastName);
      }
      if (ladderPlayer) {
        foundEmail = ladderPlayer.email || foundEmail;
        console.log('✅ Found ladder player by name:', ladderPlayer.firstName, ladderPlayer.lastName);
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
      console.log('❌ League player name mismatch');
      leaguePlayer = null;
    }
    
    if (ladderPlayer && !verifyNameMatch(ladderPlayer)) {
      console.log('❌ Ladder player name mismatch');
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
      console.log('🎯 SCENARIO 1: Existing player found - Auto-approving');
      
      const finalEmail = foundEmail || email;
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
      console.log('✅ Created unified account for existing player:', `${firstName} ${lastName}`);

      response.scenario = 'existing_player_auto_approved';
      response.message = 'Existing player account automatically approved and unified!';
      response.accessGranted = true;
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
      }

    } else if (email) {
      // SCENARIO 2: New user with email - Create pending account requiring admin approval
      console.log('🎯 SCENARIO 2: New user with email - Requires admin approval');
      
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
      console.log('✅ Created pending unified account for new user:', `${firstName} ${lastName}`);

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
      console.log('🎯 SCENARIO 3: No email and no existing player - Cannot proceed');
      
      return res.status(400).json({
        success: false,
        message: 'Email address is required for new users. Please provide your email address.'
      });
    }

    console.log('✅ Claiming process completed successfully');
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

    console.log('🔍 Updating profile:', { userId, email, appType, updates });

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

    console.log('🔍 Found user for update:', {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });

         // Check if user has both profiles for dual player handling
     const leagueProfile = await LeagueProfile.findOne({ userId: user._id });
     const ladderPlayer = await LadderPlayer.findOne({ 
       firstName: user.firstName, 
       lastName: user.lastName
     });
     const hasBothProfiles = leagueProfile && ladderPlayer;
    
         console.log('🔍 Profile update status:', {
       hasLeagueProfile: !!leagueProfile,
       hasLadderProfile: !!ladderPlayer,
       isDualPlayer: hasBothProfiles,
       appType
     });

    // Update the appropriate profile collection based on app type
    let profileUpdated = false;
    let updatedProfile = null;

    if (appType === 'league') {
      // Update LeagueProfile collection
      let leagueProfileToUpdate = leagueProfile;
      if (!leagueProfileToUpdate) {
        console.log('🔧 Creating new league profile for user');
        leagueProfileToUpdate = new LeagueProfile({
          userId: user._id,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
        });
      }

      // Update profile fields
      for (const [field, value] of Object.entries(updates)) {
        if (field === 'locations' || field === 'ladderLocations' || field === 'leagueLocations') {
          leagueProfileToUpdate.locations = value;
          
          // Handle custom locations - add them to the database
          if (value && typeof value === 'string') {
            const locationArray = value.split('\n').filter(Boolean);
            console.log(`🔍 Processing ${locationArray.length} locations for custom location check:`, locationArray);
            for (const location of locationArray) {
              const added = await addCustomLocationToDatabase(location);
              if (added) {
                console.log(`✅ Location "${location}" processed successfully`);
              } else {
                console.log(`⚠️ Location "${location}" could not be added to database`);
              }
            }
          }
        } else if (field === 'availability' || field === 'ladderAvailability' || field === 'leagueAvailability') {
          leagueProfileToUpdate.availability = value;
        } else if (field === 'basic') {
          // Handle basic info updates
          if (value.firstName) leagueProfileToUpdate.user.firstName = value.firstName;
          if (value.lastName) leagueProfileToUpdate.user.lastName = value.lastName;
          // Also update main user fields
          if (value.firstName) user.firstName = value.firstName;
          if (value.lastName) user.lastName = value.lastName;
          if (value.phone) user.phone = value.phone;
        }
        console.log(`Updated league profile ${field}:`, value);
      }

      await leagueProfileToUpdate.save();
      profileUpdated = true;
      updatedProfile = leagueProfileToUpdate;
      console.log('✅ League profile updated successfully');

             // If this is a dual player, also sync the ladder player for shared data
       if (hasBothProfiles && (updates.locations || updates.availability)) {
         console.log('🔄 Syncing ladder player for dual player');
         if (updates.locations) {
           ladderPlayer.locations = updates.locations;
         }
         if (updates.availability) {
           ladderPlayer.availability = updates.availability;
         }
         await ladderPlayer.save();
         console.log('✅ Ladder player synced for dual player');
       }

         } else if (appType === 'ladder') {
       // Update LadderPlayer collection
       let ladderPlayerToUpdate = ladderPlayer;
       if (!ladderPlayerToUpdate) {
         console.log('🔧 Creating new ladder player for user');
         ladderPlayerToUpdate = new LadderPlayer({
           firstName: user.firstName,
           lastName: user.lastName,
           email: user.email
         });
       }

             // Update profile fields
       for (const [field, value] of Object.entries(updates)) {
         if (field === 'locations' || field === 'ladderLocations' || field === 'leagueLocations') {
           ladderPlayerToUpdate.locations = value;
           
           // Handle custom locations - add them to the database
           if (value && typeof value === 'string') {
             const locationArray = value.split('\n').filter(Boolean);
             console.log(`🔍 Processing ${locationArray.length} locations for custom location check:`, locationArray);
             for (const location of locationArray) {
               const added = await addCustomLocationToDatabase(location);
               if (added) {
                 console.log(`✅ Location "${location}" processed successfully`);
               } else {
                 console.log(`⚠️ Location "${location}" could not be added to database`);
               }
             }
           }
         } else if (field === 'availability' || field === 'ladderAvailability' || field === 'leagueAvailability') {
           ladderPlayerToUpdate.availability = value;
         } else if (field === 'basic') {
           // Handle basic info updates
           if (value.firstName) ladderPlayerToUpdate.firstName = value.firstName;
           if (value.lastName) ladderPlayerToUpdate.lastName = value.lastName;
           // Also update main user fields
           if (value.firstName) user.firstName = value.firstName;
           if (value.lastName) user.lastName = value.lastName;
           if (value.phone) user.phone = value.phone;
         }
         console.log(`Updated ladder player ${field}:`, value);
       }

       await ladderPlayerToUpdate.save();
       profileUpdated = true;
       updatedProfile = ladderPlayerToUpdate;
       console.log('✅ Ladder player updated successfully');

      // If this is a dual player, also sync the league profile for shared data
      if (hasBothProfiles && (updates.locations || updates.availability)) {
        console.log('🔄 Syncing league profile for dual player');
        if (updates.locations) {
          leagueProfile.locations = updates.locations;
        }
        if (updates.availability) {
          leagueProfile.availability = updates.availability;
        }
        await leagueProfile.save();
        console.log('✅ League profile synced for dual player');
      }
    }

    // Save main user updates if any
    if (updates.basic) {
    await user.save();
      console.log('✅ Main user info updated');
    }

    if (!profileUpdated) {
      return res.status(400).json({
        success: false,
        message: 'Invalid app type or no updates made'
      });
    }

    // Return success response
    res.json({
      success: true,
      message: `${appType} profile updated for: ${user.firstName} ${user.lastName}`,
      profile: {
        availability: updatedProfile.availability || {},
        locations: updatedProfile.locations || '',
        phone: user.phone || ''
      }
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
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
     const ladderPlayer = await LadderPlayer.findOne({ 
       firstName: user.firstName, 
       lastName: user.lastName
     });

    console.log('✅ Admin: Retrieved user profile for:', `${user.firstName} ${user.lastName}`);

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
     await LadderPlayer.deleteMany({ 
       firstName: user.firstName, 
       lastName: user.lastName
     });

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
export const copyProfileData = async (req, res) => {
  try {
    const { userId, fromApp, toApp, email } = req.body;

    console.log(`🔍 Copying profile data from ${fromApp} to ${toApp}`);
    console.log('Request body:', req.body);
    console.log('User ID:', userId);
    console.log('Email:', email);

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
    console.log('Source profile found:', !!sourceProfile);
    console.log('Target profile found:', !!targetProfile);

    // If source profile doesn't exist, create it
    if (!sourceProfile) {
      console.log('Creating new source profile...');
      sourceProfile = new SimpleProfile({
        userId,
        appType: fromApp,
        availability: {},
        locations: ''
      });
      try {
        await sourceProfile.save();
        console.log('Created source profile:', sourceProfile);
      } catch (error) {
        console.error('Error creating source profile:', error);
        return res.status(500).json({
          success: false,
          message: 'Error creating source profile'
        });
      }
    }

    // Both profiles should exist now since we create them if they don't exist
    console.log('Final source profile:', sourceProfile);
    console.log('Final target profile:', targetProfile);

    // Copy shared fields
    const fieldsToCopy = ['availability', 'locations'];
    let changesMade = false;
    
    console.log('Source profile before copy:', sourceProfile);
    console.log('Target profile before copy:', targetProfile);
    
    for (const field of fieldsToCopy) {
      console.log(`Checking field: ${field}`);
      console.log(`Source ${field}:`, sourceProfile[field]);
      
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
      console.log(`Copied ${field}:`, targetProfile[field]);
    }

    console.log('Target profile after copy:', targetProfile);
    await targetProfile.save();

    console.log(`✅ Successfully copied profile data from ${fromApp} to ${toApp}`);

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

    console.log(`🔍 Checking ${appType} profile completeness for:`, email);
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);

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

    console.log(`✅ Profile completeness check for ${email}:`, {
      isComplete,
      missingFields
    });

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
    console.log('🔍 Admin: Getting unified system statistics');

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

// Get profile data from existing profile collections (safe approach)
export const getProfileData = async (req, res) => {
  try {
    const { userId, appType, email } = req.query;

    console.log('🔍 Getting profile data:', { userId, appType, email });

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

    console.log('🔍 Found unified user:', {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone
    });

    // Get profile data from BOTH collections for smart merging
    let profileData = {
      availability: {},
      locations: '',
      phone: user.phone || '',
      divisions: [],
      ladderInfo: null
    };

         // Check if user has both profiles
     console.log('🔍 Searching for league profile with userId:', user._id);
     const leagueProfile = await LeagueProfile.findOne({ userId: user._id });
     console.log('🔍 LeagueProfile search result:', leagueProfile);
     
     console.log('🔍 Searching for ladder player by name only...');
     const ladderPlayer = await LadderPlayer.findOne({ 
       firstName: user.firstName, 
       lastName: user.lastName
     });
     console.log('🔍 LadderPlayer search result:', ladderPlayer);
    
         const hasLeagueProfile = !!leagueProfile;
     const hasLadderProfile = !!ladderPlayer;
     
     console.log('🔍 Profile status:', {
       hasLeagueProfile,
       hasLadderProfile,
       isDualPlayer: hasLeagueProfile && hasLadderProfile
     });

         if (hasLeagueProfile && hasLadderProfile) {
       // DUAL PLAYER: Smart merge data from both collections
       console.log('🔄 Smart merging data for dual player');
       
               // Merge availability: prefer non-empty values, combine if both have data
        const leagueAvailability = leagueProfile.availability || {};
        const ladderAvailability = ladderPlayer.availability || {};
        
        if (Object.keys(leagueAvailability).length > 0 && Object.keys(ladderAvailability).length > 0) {
          // Both have availability data - merge them intelligently
          profileData.availability = { ...ladderAvailability, ...leagueAvailability };
          console.log('✅ Merged availability from both profiles');
        } else if (Object.keys(leagueAvailability).length > 0) {
          // Only league has availability
          profileData.availability = leagueAvailability;
          console.log('📅 Using league availability');
        } else if (Object.keys(ladderAvailability).length > 0) {
          // Only ladder has availability
          profileData.availability = ladderAvailability;
          console.log('📅 Using ladder availability');
        }
        
        // Merge locations: prefer non-empty values
        if (leagueProfile.locations && ladderPlayer.locations) {
          // Both have locations - combine them (remove duplicates)
          const leagueLocations = leagueProfile.locations.split(',').map(l => l.trim()).filter(l => l);
          const ladderLocations = ladderPlayer.locations.split(',').map(l => l.trim()).filter(l => l);
          const combinedLocations = [...new Set([...leagueLocations, ...ladderLocations])];
          profileData.locations = combinedLocations.join(', ');
          console.log('📍 Merged locations from both profiles');
        } else if (leagueProfile.locations) {
          profileData.locations = leagueProfile.locations;
          console.log('📍 Using league locations');
        } else if (ladderPlayer.locations) {
          profileData.locations = ladderPlayer.locations;
          console.log('📍 Using ladder locations');
        }
       
       // Get league divisions
       if (leagueProfile.divisions && leagueProfile.divisions.length > 0) {
         profileData.divisions = leagueProfile.divisions;
         console.log('🏆 Found league divisions:', leagueProfile.divisions);
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
           console.log('🏆 Found ladder info:', profileData.ladderInfo);
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
         console.log('🏆 Found league divisions:', leagueProfile.divisions);
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
           console.log('🏆 Found ladder info:', profileData.ladderInfo);
         } else {
           console.log('⚠️ No ladder info found in player (ladder-only)');
         }
       
     } else {
       // NEW USER: Create basic profile in league collection only
       console.log('🔧 Creating new league profile for new user');
       
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
       
       console.log('✅ Created new league profile only');
     }

    console.log('✅ Retrieved profile data for:', `${user.firstName} ${user.lastName}`);
    console.log('📤 Sending profile data:', profileData);

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
