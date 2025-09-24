import UnifiedUser from '../models/UnifiedUser.js';
import LadderPlayer from '../models/LadderPlayer.js';
import User from '../models/User.js';
import LeagueProfile from '../models/LeagueProfile.js';
import LadderProfile from '../models/LadderProfile.js';
import LadderSignupApplication from '../models/LadderSignupApplication.js';

// Search for existing ladder player
export const searchLadderPlayer = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    // Search for ladder player by name
    const ladderPlayer = await LadderPlayer.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
      isActive: true
    });

    if (!ladderPlayer) {
      return res.status(404).json({
        success: false,
        message: 'No ladder player found with that name'
      });
    }

    // Check if position is already claimed
    const existingUnifiedUser = await UnifiedUser.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${ladderPlayer.email}$`, 'i') } },
        { 
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
        }
      ]
    });

    // Allow existing users to claim their ladder positions
    // This is the intended behavior for the "Existing Ladder Player" flow

    res.json({
      success: true,
      player: {
        _id: ladderPlayer._id,
        firstName: ladderPlayer.firstName,
        lastName: ladderPlayer.lastName,
        ladderName: ladderPlayer.ladderName,
        position: ladderPlayer.position,
        fargoRate: ladderPlayer.fargoRate,
        email: ladderPlayer.email
      }
    });

  } catch (error) {
    console.error('Search ladder player error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Claim existing ladder position
export const claimLadderPosition = async (req, res) => {
  try {
    const { playerId, email, phone, pin } = req.body;

    if (!playerId || !email || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Player ID, email, and PIN are required'
      });
    }

    // Get the ladder player
    const ladderPlayer = await LadderPlayer.findById(playerId);
    if (!ladderPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Ladder player not found'
      });
    }

    // Check if email is already taken
    const existingUser = await UnifiedUser.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use'
      });
    }

    // Create unified user
    const unifiedUser = new UnifiedUser({
      firstName: ladderPlayer.firstName,
      lastName: ladderPlayer.lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      pin: pin,
      isActive: true,
      isApproved: true, // Auto-approve existing ladder players
      isPendingApproval: false,
      role: 'player'
    });

    await unifiedUser.save();

    // Create ladder profile
    const ladderProfile = new LadderProfile({
      userId: unifiedUser._id,
      ladderName: ladderPlayer.ladderName,
      position: ladderPlayer.position,
      fargoRate: ladderPlayer.fargoRate,
      isActive: true
    });

    await ladderProfile.save();

    // Update ladder player with unified user info
    ladderPlayer.unifiedUserId = unifiedUser._id;
    ladderPlayer.email = email.toLowerCase();
    ladderPlayer.phone = phone || '';
    await ladderPlayer.save();

    console.log(`✅ Ladder position claimed: ${ladderPlayer.firstName} ${ladderPlayer.lastName} (${email})`);

    res.json({
      success: true,
      message: 'Account created successfully',
      user: {
        _id: unifiedUser._id,
        firstName: unifiedUser.firstName,
        lastName: unifiedUser.lastName,
        email: unifiedUser.email,
        pin: unifiedUser.pin,
        ladderName: ladderPlayer.ladderName,
        position: ladderPlayer.position
      }
    });

  } catch (error) {
    console.error('Claim ladder position error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Register new user
export const registerNewUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, fargoRate, experience, currentLeague, joinLeague, joinLadder } = req.body;

    if (!firstName || !lastName || !email || !experience) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and experience level are required'
      });
    }

    if (!joinLeague && !joinLadder) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one option (League or Ladder)'
      });
    }

    // Check if email is already taken
    const existingUser = await UnifiedUser.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use'
      });
    }

    // Generate default PIN
    const defaultPin = `${firstName}${lastName}`.toLowerCase().replace(/\s/g, '');

    // Create unified user
    const unifiedUser = new UnifiedUser({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: phone || '',
      pin: defaultPin,
      isActive: false, // Requires admin approval
      isApproved: false,
      isPendingApproval: true,
      role: 'player',
      notes: `New user registration. Experience: ${experience}. Current League: ${currentLeague || 'None'}. Wants to join: ${joinLeague ? 'League' : ''}${joinLeague && joinLadder ? ', ' : ''}${joinLadder ? 'Ladder' : ''}`
    });

    await unifiedUser.save();

    // Create league profile if they have league experience
    if (currentLeague) {
      const leagueProfile = new LeagueProfile({
        userId: unifiedUser._id,
        divisions: [currentLeague],
        notes: `Experience: ${experience || 'Not specified'}`
      });
      await leagueProfile.save();
    }

    // Create ladder profile with default FargoRate
    const ladderProfile = new LadderProfile({
      userId: unifiedUser._id,
      fargoRate: fargoRate || 400,
      isActive: false // Will be activated when admin approves
    });
    await ladderProfile.save();

    // Create ladder application if they want to join the ladder
    if (joinLadder) {
      const ladderApplication = new LadderSignupApplication({
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: phone || '',
        fargoRate: fargoRate || 400,
        experience: experience.toLowerCase(),
        currentLeague: currentLeague || '',
        status: 'pending',
        notes: `Unified signup - wants to join ladder. Experience: ${experience}. Current League: ${currentLeague || 'None'}`,
        unifiedUserId: unifiedUser._id // Link to the unified user
      });
      await ladderApplication.save();
      console.log(`✅ Ladder application created for: ${firstName} ${lastName} (${email})`);
    }

    console.log(`✅ New user registered: ${firstName} ${lastName} (${email}) - Pending approval`);

    let message = 'Account created successfully. Admin approval required.';
    if (joinLadder) {
      message += ' Your ladder application has been submitted and will be reviewed by the ladder admin.';
    }

    res.json({
      success: true,
      message: message,
      user: {
        _id: unifiedUser._id,
        firstName: unifiedUser.firstName,
        lastName: unifiedUser.lastName,
        email: unifiedUser.email,
        pin: unifiedUser.pin,
        status: 'pending_approval',
        ladderApplicationCreated: joinLadder
      }
    });

  } catch (error) {
    console.error('Register new user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add ladder access to existing league player
export const addLadderAccess = async (req, res) => {
  try {
    const { email, fargoRate, experience } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find existing unified user
    const unifiedUser = await UnifiedUser.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (!unifiedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please create a new account first.'
      });
    }

    // Check if they already have ladder access
    const existingLadderProfile = await LadderProfile.findOne({ userId: unifiedUser._id });
    if (existingLadderProfile) {
      return res.status(400).json({
        success: false,
        message: 'User already has ladder access'
      });
    }

    // Create ladder profile
    const ladderProfile = new LadderProfile({
      userId: unifiedUser._id,
      fargoRate: fargoRate || 400,
      isActive: false // Requires admin approval
    });

    await ladderProfile.save();

    // Update user notes
    unifiedUser.notes = `${unifiedUser.notes || ''}\nLadder access requested. Experience: ${experience || 'Not specified'}`;
    await unifiedUser.save();

    console.log(`✅ Ladder access requested: ${unifiedUser.firstName} ${unifiedUser.lastName} (${email})`);

    res.json({
      success: true,
      message: 'Ladder access requested. Admin approval required.',
      user: {
        _id: unifiedUser._id,
        firstName: unifiedUser.firstName,
        lastName: unifiedUser.lastName,
        email: unifiedUser.email
      }
    });

  } catch (error) {
    console.error('Add ladder access error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
