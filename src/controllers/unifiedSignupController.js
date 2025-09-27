import UnifiedUser from '../models/UnifiedUser.js';
import LadderPlayer from '../models/LadderPlayer.js';
import User from '../models/User.js';
import LeagueProfile from '../models/LeagueProfile.js';
import LadderProfile from '../models/LadderProfile.js';
import LadderSignupApplication from '../models/LadderSignupApplication.js';

// Check for existing players by name or email
export const checkExistingPlayer = async (req, res) => {
  console.log('🔍 checkExistingPlayer function called with:', req.body);
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    const results = {
      foundPlayers: [],
      hasExistingPlayers: false,
      recommendations: []
    };

    // Search by name in league system
    const leaguePlayerByName = await User.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    // Search by email in league system
    const leaguePlayerByEmail = await User.findOne({
      email: { $regex: new RegExp(`^${email.toLowerCase().trim()}$`, 'i') }
    });

    // Check for exact match (both name and email)
    if (leaguePlayerByName && leaguePlayerByEmail && 
        leaguePlayerByName._id.toString() === leaguePlayerByEmail._id.toString()) {
      results.foundPlayers.push({
        system: 'league',
        player: {
          firstName: leaguePlayerByName.firstName,
          lastName: leaguePlayerByName.lastName,
          email: leaguePlayerByName.email,
          phone: leaguePlayerByName.phone,
          isApproved: leaguePlayerByName.isApproved,
          isActive: leaguePlayerByName.isActive,
          divisions: leaguePlayerByName.divisions || []
        }
      });
      results.hasExistingPlayers = true;
    } else if (leaguePlayerByName || leaguePlayerByEmail) {
      // Partial match found - determine specific mismatch
      results.hasPartialMatch = true;
      
      if (leaguePlayerByEmail && !leaguePlayerByName) {
        // Email found but name doesn't match
        results.partialMatchWarning = `Email found in system, but name doesn't match. Please use the name that matches this email on record or contact admin for assistance.`;
        results.emailFound = true;
        results.emailMatchPlayer = {
          firstName: leaguePlayerByEmail.firstName,
          lastName: leaguePlayerByEmail.lastName,
          email: leaguePlayerByEmail.email
        };
      } else if (leaguePlayerByName && !leaguePlayerByEmail) {
        // Name found but email doesn't match
        results.partialMatchWarning = `Name found in system, but email doesn't match. Please use the correct email or contact admin for assistance.`;
        results.nameFound = true;
        results.nameMatchPlayer = {
          firstName: leaguePlayerByName.firstName,
          lastName: leaguePlayerByName.lastName,
          email: leaguePlayerByName.email
        };
      } else {
        // Both found but different players
        results.partialMatchWarning = 'We found accounts with similar information, but the name and email don\'t match exactly. Please verify your information or contact support.';
      }
    }

    // Search by name in ladder system
    const ladderPlayerByName = await LadderPlayer.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    // Search by email in ladder system
    const ladderPlayerByEmail = await LadderPlayer.findOne({
      email: { $regex: new RegExp(`^${email.toLowerCase().trim()}$`, 'i') }
    });

    // Check for exact match (both name and email)
    if (ladderPlayerByName && ladderPlayerByEmail && 
        ladderPlayerByName._id.toString() === ladderPlayerByEmail._id.toString()) {
      results.foundPlayers.push({
        system: 'ladder',
        player: {
          firstName: ladderPlayerByName.firstName,
          lastName: ladderPlayerByName.lastName,
          email: ladderPlayerByName.email,
          phone: ladderPlayerByName.phone,
          position: ladderPlayerByName.position,
          ladderName: ladderPlayerByName.ladderName,
          fargoRate: ladderPlayerByName.fargoRate,
          isActive: ladderPlayerByName.isActive
        }
      });
      results.hasExistingPlayers = true;
    } else if (ladderPlayerByName || ladderPlayerByEmail) {
      // Partial match found - determine specific mismatch
      results.hasPartialMatch = true;
      
      if (ladderPlayerByEmail && !ladderPlayerByName) {
        // Email found but name doesn't match
        if (!results.partialMatchWarning) {
          results.partialMatchWarning = `Email found in system, but name doesn't match. Please use the name that matches this email on record or contact admin for assistance.`;
        } else {
          results.partialMatchWarning += ` Also found in ladder system with this email.`;
        }
        results.emailFound = true;
        results.emailMatchPlayer = {
          firstName: ladderPlayerByEmail.firstName,
          lastName: ladderPlayerByEmail.lastName,
          email: ladderPlayerByEmail.email
        };
      } else if (ladderPlayerByName && !ladderPlayerByEmail) {
        // Name found but email doesn't match
        if (!results.partialMatchWarning) {
          results.partialMatchWarning = `Name found in system, but email doesn't match. Please use the correct email or contact admin for assistance.`;
        } else {
          results.partialMatchWarning += ` Also found in ladder system with different email.`;
        }
        results.nameFound = true;
        results.nameMatchPlayer = {
          firstName: ladderPlayerByName.firstName,
          lastName: ladderPlayerByName.lastName,
          email: ladderPlayerByName.email
        };
      } else if (!results.partialMatchWarning) {
        // Both found but different players
        results.partialMatchWarning = 'We found accounts with similar information, but the name and email don\'t match exactly. Please verify your information or contact support.';
      }
    }


    // Check if unified account already exists - but only if we haven't found partial matches
    if (!results.hasPartialMatch) {
      const existingUnifiedUser = await UnifiedUser.findOne({
        $or: [
          { 
            firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
            lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
          },
          ...(email ? [{ email: { $regex: new RegExp(`^${email.toLowerCase().trim()}$`, 'i') } }] : [])
        ]
      });

      if (existingUnifiedUser) {
        // Check if this is an exact match (both name and email match)
        const isExactMatch = existingUnifiedUser.firstName.toLowerCase() === firstName.toLowerCase() &&
                            existingUnifiedUser.lastName.toLowerCase() === lastName.toLowerCase() &&
                            existingUnifiedUser.email.toLowerCase() === email.toLowerCase().trim();
        
        if (isExactMatch) {
          results.hasUnifiedAccount = true;
          results.unifiedAccount = {
            firstName: existingUnifiedUser.firstName,
            lastName: existingUnifiedUser.lastName,
            email: existingUnifiedUser.email,
            isApproved: existingUnifiedUser.isApproved,
            isActive: existingUnifiedUser.isActive
          };
          results.recommendations.push({
            type: 'existing_unified',
            message: 'You already have a unified account! Please use your existing login credentials instead of creating a new account.',
            action: 'use_existing_login'
          });
        } else {
          // Partial match with unified account - treat as partial match
          results.hasPartialMatch = true;
          if (existingUnifiedUser.email.toLowerCase() === email.toLowerCase().trim()) {
            results.partialMatchWarning = 'Email found in system, but name doesn\'t match. Please use the name that matches this email on record or contact admin for assistance.';
            results.emailFound = true;
            results.emailMatchPlayer = {
              firstName: existingUnifiedUser.firstName,
              lastName: existingUnifiedUser.lastName,
              email: existingUnifiedUser.email
            };
          } else {
            results.partialMatchWarning = 'Name found in system, but email doesn\'t match. Please use the correct email or contact admin for assistance.';
            results.nameFound = true;
            results.nameMatchPlayer = {
              firstName: existingUnifiedUser.firstName,
              lastName: existingUnifiedUser.lastName,
              email: existingUnifiedUser.email
            };
          }
        }
      }
    }

    if (results.hasExistingPlayers) {
      // Generate recommendations based on findings only if no unified account exists
      const hasLeaguePlayer = results.foundPlayers.some(p => p.system === 'league');
      const hasLadderPlayer = results.foundPlayers.some(p => p.system === 'ladder');

      if (hasLeaguePlayer && hasLadderPlayer) {
        results.recommendations.push({
          type: 'claim_existing',
          message: 'You already have accounts in both league and ladder systems. You can claim your existing accounts instead of creating new ones.',
          action: 'claim_accounts'
        });
      } else if (hasLeaguePlayer) {
        results.recommendations.push({
          type: 'claim_league',
          message: 'You already have a league account. You can claim it and add ladder access.',
          action: 'claim_league_add_ladder'
        });
      } else if (hasLadderPlayer) {
        results.recommendations.push({
          type: 'claim_ladder',
          message: 'You already have a ladder account. You can claim it and add league access.',
          action: 'claim_ladder_add_league'
        });
      }
    }

    console.log('🔍 Existing player check results:', results);

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Error checking existing player:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Claim existing accounts and create unified account
export const claimExistingAccounts = async (req, res) => {
  console.log('🔍 claimExistingAccounts function called with:', req.body);
  try {
    const { firstName, lastName, email, phone } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if unified account already exists
    const existingUnifiedUser = await UnifiedUser.findOne({
      $or: [
        { email: normalizedEmail },
        { 
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
        }
      ]
    });

    if (existingUnifiedUser) {
      return res.status(400).json({
        success: false,
        message: 'A unified account already exists for this person'
      });
    }

    // Find existing league and ladder accounts
    const leaguePlayer = await User.findOne({
      $or: [
        { 
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
        },
        { email: normalizedEmail }
      ]
    });

    const ladderPlayer = await LadderPlayer.findOne({
      $or: [
        { 
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
        },
        { email: normalizedEmail }
      ]
    });

    if (!leaguePlayer && !ladderPlayer) {
      return res.status(404).json({
        success: false,
        message: 'No existing accounts found to claim'
      });
    }

    // Create unified account
    const unifiedUser = new UnifiedUser({
      firstName,
      lastName,
      email: normalizedEmail,
      phone: phone || '',
      isApproved: true,
      isActive: true,
      role: 'player'
    });

    await unifiedUser.save();

    // Create league profile if league player exists
    if (leaguePlayer) {
      const leagueProfile = new LeagueProfile({
        userId: unifiedUser._id,
        divisions: leaguePlayer.divisions || [],
        isActive: leaguePlayer.isActive
      });
      await leagueProfile.save();

      // Update league player with unified user reference
      leaguePlayer.unifiedUserId = unifiedUser._id;
      await leaguePlayer.save();
    }

    // Create ladder profile if ladder player exists
    if (ladderPlayer) {
      const ladderProfile = new LadderProfile({
        userId: unifiedUser._id,
        ladderName: ladderPlayer.ladderName,
        position: ladderPlayer.position,
        fargoRate: ladderPlayer.fargoRate,
        isActive: ladderPlayer.isActive
      });
      await ladderProfile.save();

      // Update ladder player with unified user reference
      ladderPlayer.unifiedUserId = unifiedUser._id;
      await ladderPlayer.save();
    }

    console.log(`✅ Unified account created for ${firstName} ${lastName} (${email})`);

    res.json({
      success: true,
      message: 'Accounts successfully claimed and unified!',
      user: {
        _id: unifiedUser._id,
        firstName: unifiedUser.firstName,
        lastName: unifiedUser.lastName,
        email: unifiedUser.email,
        pin: unifiedUser.pin,
        hasLeagueProfile: !!leaguePlayer,
        hasLadderProfile: !!ladderPlayer,
        leagueInfo: leaguePlayer ? {
          divisions: leaguePlayer.divisions,
          isActive: leaguePlayer.isActive
        } : null,
        ladderInfo: ladderPlayer ? {
          position: ladderPlayer.position,
          ladderName: ladderPlayer.ladderName,
          fargoRate: ladderPlayer.fargoRate
        } : null
      }
    });

  } catch (error) {
    console.error('Error claiming existing accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Search for existing ladder player
export const searchLadderPlayer = async (req, res) => {
  console.log('🔍 searchLadderPlayer function called with:', req.body);
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

    // Check if this specific person already has a unified account
    const existingUnifiedUser = await UnifiedUser.findOne({
      $or: [
        { email: { $regex: new RegExp(`^${ladderPlayer.email}$`, 'i') } },
        { 
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
        }
      ]
    });

    console.log('🔍 Existing unified user check:', {
      searchingFor: `${firstName} ${lastName}`,
      ladderPlayerEmail: ladderPlayer.email,
      existingUnifiedUser: existingUnifiedUser ? {
        id: existingUnifiedUser._id,
        email: existingUnifiedUser.email,
        firstName: existingUnifiedUser.firstName,
        lastName: existingUnifiedUser.lastName
      } : null
    });

    // Check if this specific position is already claimed
    const existingLadderProfile = await LadderProfile.findOne({
      ladderName: ladderPlayer.ladderName,
      position: ladderPlayer.position
    }).populate('userId');

    console.log('🔍 Search Debug:', {
      searchingFor: `${firstName} ${lastName}`,
      ladderName: ladderPlayer.ladderName,
      position: ladderPlayer.position,
      existingLadderProfile: existingLadderProfile ? {
        userId: existingLadderProfile.userId,
        hasUserId: !!existingLadderProfile.userId
      } : null
    });

    let isClaimed = false;
    let isClaimedBySamePerson = false;

    if (existingLadderProfile) {
      isClaimed = true;
      // Check if it's claimed by the same person
      const existingUser = existingLadderProfile.userId;
      if (existingUser && 
          existingUser.firstName.toLowerCase() === firstName.toLowerCase() && 
          existingUser.lastName.toLowerCase() === lastName.toLowerCase()) {
        isClaimedBySamePerson = true;
        console.log('🔍 Same person detected:', {
          existingUser: `${existingUser.firstName} ${existingUser.lastName}`,
          searchingFor: `${firstName} ${lastName}`
        });
      }
    }

    // If user already has a unified account, they shouldn't be able to claim again
    if (existingUnifiedUser) {
      // Mask the email for privacy (show first 3 chars + *** + domain)
      const email = existingUnifiedUser.email;
      const [localPart, domain] = email.split('@');
      const maskedEmail = localPart.length > 3 
        ? `${localPart.substring(0, 3)}***@${domain}`
        : `${localPart.substring(0, 1)}***@${domain}`;
      
      return res.status(400).json({
        success: false,
        message: `You already have an account with email ${maskedEmail}. Please log in to the Hub with your existing account instead of claiming the position again.`
      });
    }

    res.json({
      success: true,
      player: {
        _id: ladderPlayer._id,
        firstName: ladderPlayer.firstName,
        lastName: ladderPlayer.lastName,
        ladderName: ladderPlayer.ladderName,
        position: ladderPlayer.position,
        fargoRate: ladderPlayer.fargoRate,
        email: ladderPlayer.email,
        isClaimed: isClaimed,
        isClaimedBySamePerson: isClaimedBySamePerson,
        hasExistingAccount: !!existingUnifiedUser
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

    // Check if this specific person (by name) has already claimed their position
    const existingLadderProfile = await LadderProfile.findOne({
      ladderName: ladderPlayer.ladderName,
      position: ladderPlayer.position
    }).populate('userId');

    console.log('🔍 Claim Debug:', {
      claimingFor: `${ladderPlayer.firstName} ${ladderPlayer.lastName}`,
      ladderName: ladderPlayer.ladderName,
      position: ladderPlayer.position,
      existingLadderProfile: existingLadderProfile ? {
        userId: existingLadderProfile.userId,
        hasUserId: !!existingLadderProfile.userId
      } : null
    });

    if (existingLadderProfile) {
      // Check if it's the same person trying to claim again
      const existingUser = existingLadderProfile.userId;
      if (existingUser && 
          existingUser.firstName.toLowerCase() === ladderPlayer.firstName.toLowerCase() && 
          existingUser.lastName.toLowerCase() === ladderPlayer.lastName.toLowerCase()) {
        console.log('🔍 Same person trying to claim again:', {
          existingUser: `${existingUser.firstName} ${existingUser.lastName}`,
          claimingFor: `${ladderPlayer.firstName} ${ladderPlayer.lastName}`
        });
        return res.status(400).json({
          success: false,
          message: `You have already claimed this position. Position #${ladderPlayer.position} in ${ladderPlayer.ladderName} is already yours.`
        });
      } else {
        console.log('🔍 Different person trying to claim:', {
          existingUser: existingUser ? `${existingUser.firstName} ${existingUser.lastName}` : 'No user found',
          claimingFor: `${ladderPlayer.firstName} ${ladderPlayer.lastName}`
        });
        return res.status(400).json({
          success: false,
          message: `This ladder position has already been claimed by another player. Position #${ladderPlayer.position} in ${ladderPlayer.ladderName} is no longer available.`
        });
      }
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

    // Check if email is already taken in any system
    const existingUnifiedUser = await UnifiedUser.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    const existingLeagueUser = await User.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    const existingLadderUser = await LadderPlayer.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });

    if (existingUnifiedUser || existingLeagueUser || existingLadderUser) {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use. Please use a different email or contact admin if you believe this is an error.'
      });
    }

    // Check if name is already taken in any system
    const existingUnifiedByName = await UnifiedUser.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    const existingLeagueByName = await User.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    const existingLadderByName = await LadderPlayer.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    if (existingUnifiedByName || existingLeagueByName || existingLadderByName) {
      return res.status(400).json({
        success: false,
        message: 'Name is already in use. Please use a different name or contact admin if you believe this is an error.'
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
