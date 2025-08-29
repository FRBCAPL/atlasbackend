import User from '../models/User.js';
import LadderPlayer from '../models/LadderPlayer.js';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or PIN

    console.log('🔍 Login attempt with identifier:', identifier);

    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or PIN is required'
      });
    }

    // Search both league and ladder databases
    let foundUser = null;
    let userType = null;
    let foundInBoth = false;
    let leagueUser = null;
    let ladderPlayer = null;

    // 1. Try to find in league database by email first
    leagueUser = await User.findOne({ 
      email: { $regex: new RegExp(`^${identifier}$`, 'i') }
    });

    if (leagueUser) {
      foundUser = leagueUser;
      userType = 'league';
      console.log('🔍 Found league user by email:', `${leagueUser.firstName} ${leagueUser.lastName}`);
    }

    // 2. If not found by email, try to find by PIN in league database
    if (!foundUser) {
      console.log('🔍 Checking PIN for all league users...');
      const allLeagueUsers = await User.find({});
      
      for (const potentialUser of allLeagueUsers) {
        try {
          if (potentialUser.pin && potentialUser.pin.length > 0) {
            const isPinMatch = await potentialUser.comparePin(identifier);
            if (isPinMatch) {
              foundUser = potentialUser;
              userType = 'league';
              leagueUser = potentialUser;
              console.log(`🔍 Found league user by PIN: ${foundUser.firstName} ${foundUser.lastName}`);
              break;
            }
          }
        } catch (error) {
          console.log(`🔍 Error checking PIN for ${potentialUser.firstName}: ${error.message}`);
          continue;
        }
      }
    }

    // 3. Also check ladder database by email (even if we found league user)
    ladderPlayer = await LadderPlayer.findOne({ 
      email: { $regex: new RegExp(`^${identifier}$`, 'i') }
    });

    if (ladderPlayer) {
      console.log('🔍 Found ladder player by email:', `${ladderPlayer.firstName} ${ladderPlayer.lastName}`);
      console.log('🔍 Debug - leagueUser exists:', !!leagueUser);
      console.log('🔍 Debug - foundUser exists:', !!foundUser);
      
      // If we already found a league user, mark as found in both
      if (leagueUser) {
        foundInBoth = true;
        console.log('🔍 User found in BOTH league and ladder systems!');
      } else if (!foundUser) {
        foundUser = ladderPlayer;
        userType = 'ladder';
      }
    }

    // 3.5. If we found a league user but no ladder player by email, check by name
    if (leagueUser && !ladderPlayer) {
      console.log('🔍 Checking ladder database by name for:', `${leagueUser.firstName} ${leagueUser.lastName}`);
      ladderPlayer = await LadderPlayer.findOne({
        firstName: { $regex: new RegExp(`^${leagueUser.firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${leagueUser.lastName}$`, 'i') }
      });

      if (ladderPlayer) {
        console.log('🔍 Found ladder player by name:', `${ladderPlayer.firstName} ${ladderPlayer.lastName}`);
        foundInBoth = true;
        console.log('🔍 User found in BOTH league and ladder systems!');
      }
    }

    // 4. If still not found, try PIN in ladder database
    if (!foundUser) {
      console.log('🔍 Checking PIN for all ladder players...');
      const allLadderPlayers = await LadderPlayer.find({});
      
      for (const potentialPlayer of allLadderPlayers) {
        try {
          if (potentialPlayer.pin && potentialPlayer.pin.length > 0) {
            const isPinMatch = await bcrypt.compare(identifier, potentialPlayer.pin);
            if (isPinMatch) {
              ladderPlayer = potentialPlayer;
              console.log(`🔍 Found ladder player by PIN: ${potentialPlayer.firstName} ${potentialPlayer.lastName}`);
              
              // If we already found a league user, mark as found in both
              if (leagueUser) {
                foundInBoth = true;
                console.log('🔍 User found in BOTH league and ladder systems!');
              } else if (!foundUser) {
                foundUser = potentialPlayer;
                userType = 'ladder';
              }
              break;
            }
          }
        } catch (error) {
          console.log(`🔍 Error checking PIN for ${potentialPlayer.firstName}: ${error.message}`);
          continue;
        }
      }
    }

    // 4.5. If we found a ladder player but no league user by email, check by name
    if (ladderPlayer && !leagueUser) {
      console.log('🔍 Checking league database by name for:', `${ladderPlayer.firstName} ${ladderPlayer.lastName}`);
      leagueUser = await User.findOne({
        firstName: { $regex: new RegExp(`^${ladderPlayer.firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${ladderPlayer.lastName}$`, 'i') }
      });

      if (leagueUser) {
        console.log('🔍 Found league user by name:', `${leagueUser.firstName} ${leagueUser.lastName}`);
        foundInBoth = true;
        console.log('🔍 User found in BOTH league and ladder systems!');
      }
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        message: 'No user found with that email or PIN. You may need to claim your account.'
      });
    }

    // Handle users found in both systems
    if (foundInBoth) {
      console.log('🔍 Returning combined user data for player in both systems');
      console.log('🔍 Debug - foundInBoth:', foundInBoth);
      console.log('🔍 Debug - leagueUser:', leagueUser ? `${leagueUser.firstName} ${leagueUser.lastName}` : 'null');
      console.log('🔍 Debug - ladderPlayer:', ladderPlayer ? `${ladderPlayer.firstName} ${ladderPlayer.lastName}` : 'null');
      
      // Check if league user is approved and active
      if (!leagueUser.isApproved) {
        return res.status(401).json({
          success: false,
          message: 'Your league account is pending approval. Please contact an administrator.'
        });
      }

      if (!leagueUser.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your league account has been deactivated. Please contact an administrator.'
        });
      }

      // Check if ladder player is active
      if (!ladderPlayer.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your ladder account has been deactivated. Please contact an administrator.'
        });
      }

      // Update last login for both
      await User.updateOne(
        { _id: leagueUser._id },
        { $set: { lastLogin: new Date() } }
      );
      await LadderPlayer.updateOne(
        { _id: ladderPlayer._id },
        { $set: { lastLogin: new Date() } }
      );

      // Return combined user data
      res.json({
        success: true,
        userType: 'both',
        user: {
          firstName: leagueUser.firstName,
          lastName: leagueUser.lastName,
          email: leagueUser.email,
          pin: identifier,
          // League data
          division: leagueUser.division,
          divisions: leagueUser.divisions,
          isAdmin: leagueUser.isAdmin,
          phone: leagueUser.phone,
          locations: leagueUser.locations,
          availability: leagueUser.availability,
          // Ladder data
          fargoRate: ladderPlayer.fargoRate,
          ladderName: ladderPlayer.ladderName,
          position: ladderPlayer.position,
          wins: ladderPlayer.wins || 0,
          losses: ladderPlayer.losses || 0
        }
      });
      return;
    }

    // Handle league users only
    if (userType === 'league') {
      // Check if user is approved
      if (!foundUser.isApproved) {
        return res.status(401).json({
          success: false,
          message: 'Your account is pending approval. Please contact an administrator.'
        });
      }

      // Check if user is active
      if (!foundUser.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated. Please contact an administrator.'
        });
      }

      // Update last login
      await User.updateOne(
        { _id: foundUser._id },
        { $set: { lastLogin: new Date() } }
      );

      // Return league user data
      res.json({
        success: true,
        userType: 'league',
        user: {
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          email: foundUser.email,
          pin: identifier,
          division: foundUser.division,
          divisions: foundUser.divisions,
          isAdmin: foundUser.isAdmin,
          phone: foundUser.phone,
          locations: foundUser.locations,
          availability: foundUser.availability
        }
      });
    }

    // Handle ladder players
    if (userType === 'ladder') {
      // Check if player is active
      if (!foundUser.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your ladder account has been deactivated. Please contact an administrator.'
        });
      }

      // Update last login
      await LadderPlayer.updateOne(
        { _id: foundUser._id },
        { $set: { lastLogin: new Date() } }
      );

      // Return ladder player data
      res.json({
        success: true,
        userType: 'ladder',
        user: {
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          email: foundUser.email,
          pin: identifier,
          fargoRate: foundUser.fargoRate,
          ladderName: foundUser.ladderName,
          position: foundUser.position,
          wins: foundUser.wins || 0,
          losses: foundUser.losses || 0
        }
      });
    }

  } catch (error) {
    console.error('Login error:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Internal server error during login';
    
    if (error.name === 'ValidationError') {
      errorMessage = 'Invalid input data provided';
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid user data format';
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate user entry detected';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
};

export const validatePin = async (req, res) => {
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
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValidPin = await user.comparePin(pin);

    res.json({
      success: true,
      isValid: isValidPin
    });

  } catch (error) {
    console.error('PIN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during PIN validation'
    });
  }
};

// Account claiming functions for ladder players
export const searchLadderPlayer = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Search for ladder player by name (case-insensitive)
    const ladderPlayer = await LadderPlayer.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    if (!ladderPlayer) {
      return res.status(404).json({
        success: false,
        message: 'No ladder player found with that name'
      });
    }

    // Check if they already have a user account
    const existingUser = await User.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This player already has an account. Please log in instead.'
      });
    }

    // Return ladder player info (without sensitive data)
    res.json({
      success: true,
      player: {
        firstName: ladderPlayer.firstName,
        lastName: ladderPlayer.lastName,
        position: ladderPlayer.position,
        fargoRate: ladderPlayer.fargoRate,
        wins: ladderPlayer.wins,
        losses: ladderPlayer.losses
      }
    });

  } catch (error) {
    console.error('Search ladder player error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during search'
    });
  }
};

export const submitAccountClaim = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Verify the ladder player exists
    const ladderPlayer = await LadderPlayer.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    if (!ladderPlayer) {
      return res.status(404).json({
        success: false,
        message: 'No ladder player found with that name'
      });
    }

    // Check if claim already exists
    const existingClaim = await User.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
      isPendingApproval: true
    });

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'An account claim is already pending for this player'
      });
    }

    // Create pending user account
    const pendingUser = new User({
      firstName: ladderPlayer.firstName,
      lastName: ladderPlayer.lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      isPendingApproval: true,
      isApproved: false,
      isActive: false,
      isAdmin: false,
      role: 'player',
      claimMessage: message || '',
      ladderPlayerId: ladderPlayer._id
    });

    await pendingUser.save();

    res.json({
      success: true,
      message: 'Account claim submitted successfully. An admin will review your request.'
    });

  } catch (error) {
    console.error('Submit account claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during claim submission'
    });
  }
};

export const getPendingClaims = async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      isPendingApproval: true 
    }).populate('ladderPlayerId');

    const claims = pendingUsers.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      claimMessage: user.claimMessage,
      ladderInfo: user.ladderPlayerId ? {
        position: user.ladderPlayerId.position,
        fargoRate: user.ladderPlayerId.fargoRate,
        wins: user.ladderPlayerId.wins,
        losses: user.ladderPlayerId.losses
      } : null,
      submittedAt: user.createdAt
    }));

    res.json({
      success: true,
      claims: claims
    });

  } catch (error) {
    console.error('Get pending claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting pending claims'
    });
  }
};

export const approveAccountClaim = async (req, res) => {
  try {
    const { claimId, pin } = req.body;

    if (!claimId || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Claim ID and PIN are required'
      });
    }

    const pendingUser = await User.findById(claimId);

    if (!pendingUser) {
      return res.status(404).json({
        success: false,
        message: 'Pending claim not found'
      });
    }

    if (!pendingUser.isPendingApproval) {
      return res.status(400).json({
        success: false,
        message: 'This claim has already been processed'
      });
    }

    // Hash the PIN and activate the account
    const hashedPin = await bcrypt.hash(pin, 10);
    
    await User.findByIdAndUpdate(claimId, {
      pin: hashedPin,
      isPendingApproval: false,
      isApproved: true,
      isActive: true,
      approvedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Account claim approved successfully'
    });

  } catch (error) {
    console.error('Approve account claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during approval'
    });
  }
};

export const rejectAccountClaim = async (req, res) => {
  try {
    const { claimId, reason } = req.body;

    if (!claimId) {
      return res.status(400).json({
        success: false,
        message: 'Claim ID is required'
      });
    }

    const pendingUser = await User.findById(claimId);

    if (!pendingUser) {
      return res.status(404).json({
        success: false,
        message: 'Pending claim not found'
      });
    }

    if (!pendingUser.isPendingApproval) {
      return res.status(400).json({
        success: false,
        message: 'This claim has already been processed'
      });
    }

    // Delete the pending user
    await User.findByIdAndDelete(claimId);

    res.json({
      success: true,
      message: 'Account claim rejected successfully'
    });

  } catch (error) {
    console.error('Reject account claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during rejection'
    });
  }
};
