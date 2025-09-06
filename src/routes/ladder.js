import express from 'express';
import Ladder from '../models/Ladder.js';
import LadderPlayer from '../models/LadderPlayer.js';
import LadderChallenge from '../models/LadderChallenge.js';
import LadderMatch from '../models/LadderMatch.js';
import LadderSignupApplication from '../models/LadderSignupApplication.js';
import User from '../models/User.js'; // Added import for User
import UnifiedUser from '../models/UnifiedUser.js'; // Added import for UnifiedUser
import bcrypt from 'bcryptjs'; // Added import for bcrypt
import PlayerRecognitionService from '../services/PlayerRecognitionService.js';
// Note: EmailJS is client-side only, so we'll handle email sending in the frontend
// For now, we'll just return the credentials and let the frontend handle the email

const router = express.Router();

// Helper function to check unified account status for a ladder player
const checkUnifiedAccountStatus = async (firstName, lastName) => {
  try {
    console.log(`🔍 Checking unified account status for: ${firstName} ${lastName}`);
    
    const unifiedUser = await UnifiedUser.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });
    
    if (unifiedUser) {
      console.log(`   ✅ Found unified user: ${unifiedUser.firstName} ${unifiedUser.lastName}`);
      console.log(`   📊 Status: Approved=${unifiedUser.isApproved}, Active=${unifiedUser.isActive}`);
      console.log(`   📧 Email: "${unifiedUser.email}" (length: ${unifiedUser.email?.length || 0})`);
      console.log(`   🎭 Role: ${unifiedUser.role}`);
    } else {
      console.log(`   ❌ No unified user found`);
    }
    
    // Only consider it a valid unified account if:
    // 1. User exists
    // 2. User is approved
    // 3. User is active
    // 4. User has a real email (not empty/null)
    // 5. User has a proper role (not just a placeholder)
    // 6. Email is NOT a fake/test email
    const isFakeEmail = /@(ladder\.local|ladder\.temp|test|temp|local|fake|example|dummy)/i.test(unifiedUser.email);
    
    if (unifiedUser && 
        unifiedUser.isApproved && 
        unifiedUser.isActive && 
        unifiedUser.email && 
        unifiedUser.email.trim() !== '' &&
        unifiedUser.role === 'player' &&
        !isFakeEmail) {
      console.log(`   🎯 VALID unified account - returning hasUnifiedAccount: true`);
      return {
        hasUnifiedAccount: true,
        isApproved: unifiedUser.isApproved,
        isActive: unifiedUser.isActive,
        email: unifiedUser.email,
        unifiedUserId: unifiedUser._id
      };
    }
    
    // Log why the account is considered invalid
    if (unifiedUser) {
      const reasons = [];
      if (!unifiedUser.isApproved) reasons.push('not approved');
      if (!unifiedUser.isActive) reasons.push('not active');
      if (!unifiedUser.email || unifiedUser.email.trim() === '') reasons.push('no email');
      if (unifiedUser.role !== 'player') reasons.push('wrong role');
      
      // Check for fake emails
      const isFakeEmail = /@(ladder\.local|ladder\.temp|test|temp|local|fake|example|dummy)/i.test(unifiedUser.email);
      if (isFakeEmail) reasons.push('fake email');
      
      console.log(`   ❌ INVALID unified account - reasons: ${reasons.join(', ')}`);
    } else {
      console.log(`   ❌ No unified user found`);
    }
    
    return {
      hasUnifiedAccount: false,
      isApproved: unifiedUser?.isApproved || false,
      isActive: unifiedUser?.isActive || false,
      email: unifiedUser?.email || null,
      unifiedUserId: unifiedUser?._id || null
    };
  } catch (error) {
    console.error('Error checking unified account status:', error);
    return {
      hasUnifiedAccount: false,
      isApproved: false,
      isActive: false,
      email: null,
      unifiedUserId: null
    };
  }
};

// Test route to check if ladder routes are working
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Ladder API is working!',
    timestamp: new Date().toISOString()
  });
});

// Basic challenges endpoint for testing
router.get('/challenges', (req, res) => {
  res.json({ 
    message: 'Ladder Challenges API is working!',
    endpoints: [
      '/player/:email/challenges',
      '/create',
      '/accept/:challengeId',
      '/decline/:challengeId'
    ]
  });
});

// Get all ladders
router.get('/ladders', async (req, res) => {
  try {
    const ladders = await Ladder.getActiveLadders();
    res.json(ladders);
  } catch (error) {
    console.error('Error fetching ladders:', error);
    res.status(500).json({ error: 'Failed to fetch ladders' });
  }
});

// Get all players across all ladders
router.get('/players', async (req, res) => {
  try {
    console.log('Fetching all ladder players across all ladders');
    
    const players = await LadderPlayer.getAllPlayers();
    console.log(`Found ${players.length} total players across all ladders`);
    
    // Enhance players with unified account status
    const enhancedPlayers = await Promise.all(players.map(async (player) => {
      const unifiedStatus = await checkUnifiedAccountStatus(player.firstName, player.lastName);
      
      return {
        ...player.toObject(),
        unifiedAccount: unifiedStatus
      };
    }));
    
    console.log(`Enhanced ${enhancedPlayers.length} players with unified account status`);
    
    res.json(enhancedPlayers);
  } catch (error) {
    console.error('Error fetching all ladder players:', error);
    res.status(500).json({ error: 'Failed to fetch all ladder players', details: error.message });
  }
});

// Get players by ladder
router.get('/ladders/:ladderName/players', async (req, res) => {
  try {
    const { ladderName } = req.params;
    console.log('Fetching players for ladder:', ladderName);
    
    const players = await LadderPlayer.getPlayersByLadder(ladderName);
    console.log(`Found ${players.length} players for ladder ${ladderName}`);
    
    // Enhance players with unified account status
    const enhancedPlayers = await Promise.all(players.map(async (player) => {
      const unifiedStatus = await checkUnifiedAccountStatus(player.firstName, player.lastName);
      
      return {
        ...player.toObject(),
        unifiedAccount: unifiedStatus
      };
    }));
    
    console.log(`Enhanced ${enhancedPlayers.length} players with unified account status`);
    
    res.json(enhancedPlayers);
  } catch (error) {
    console.error('Error fetching ladder players:', error);
    res.status(500).json({ error: 'Failed to fetch ladder players', details: error.message });
  }
});

// Get player by email
router.get('/player/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const player = await LadderPlayer.getPlayerByEmail(email);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Enhance player with unified account status
    const unifiedStatus = await checkUnifiedAccountStatus(player.firstName, player.lastName);
    
    const enhancedPlayer = {
      ...player.toObject(),
      unifiedAccount: unifiedStatus
    };
    
    res.json(enhancedPlayer);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Update ladder player by ID
router.put('/player/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Updating ladder player:', id, 'with data:', updateData);
    
    // Find the player by ID
    const player = await LadderPlayer.findById(id);
    if (!player) {
      return res.status(404).json({ error: 'Ladder player not found' });
    }
    
    // Only allow updating specific fields for security
    const allowedUpdates = ['email', 'firstName', 'lastName', 'fargoRate', 'isActive'];
    const filteredUpdates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    });
    
    // Update the player
    const updatedPlayer = await LadderPlayer.findByIdAndUpdate(
      id,
      filteredUpdates,
      { new: true, runValidators: true }
    );
    
    console.log('Successfully updated ladder player:', updatedPlayer.firstName, updatedPlayer.lastName);
    
    // Enhance updated player with unified account status
    const unifiedStatus = await checkUnifiedAccountStatus(updatedPlayer.firstName, updatedPlayer.lastName);
    
    const enhancedPlayer = {
      ...updatedPlayer.toObject(),
      unifiedAccount: unifiedStatus
    };
    
    res.json({
      success: true,
      message: 'Ladder player updated successfully',
      player: enhancedPlayer
    });
    
  } catch (error) {
    console.error('Error updating ladder player:', error);
    res.status(500).json({ error: 'Failed to update ladder player', details: error.message });
  }
});

// Signup for ladder (new application)
router.post('/signup', async (req, res) => {
  try {
    console.log('📝 Signup request received:', req.body);
    
    const { firstName, lastName, email, phone, fargoRate, experience, currentLeague, currentRanking } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate fargoRate if provided
    if (fargoRate !== undefined && fargoRate !== null) {
      if (typeof fargoRate !== 'number' || fargoRate < 0 || fargoRate > 850) {
        console.log('❌ Invalid fargoRate:', fargoRate);
        return res.status(400).json({ error: 'FargoRate must be a number between 0 and 850' });
      }
    }
    
    console.log('✅ Validation passed, checking for existing players...');
    
    // Check if player already exists
    const existingPlayer = await LadderPlayer.findOne({ email });
    if (existingPlayer) {
      console.log('❌ Player already exists with email:', email);
      return res.status(400).json({ error: 'A player with this email already exists' });
    }
    
    console.log('✅ No existing player found, checking for existing applications...');
    
    // Check if signup application already exists
    const existingApplication = await LadderSignupApplication.findOne({ email });
    if (existingApplication) {
      console.log('❌ Application already exists with email:', email);
      return res.status(400).json({ error: 'A signup application with this email already exists' });
    }
    
    console.log('✅ No existing application found, creating new application...');
    
    // Create a new ladder signup application
    const signupApplication = new LadderSignupApplication({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone: phone || '',
      fargoRate: fargoRate || null,
      experience: experience || 'beginner',
      currentLeague: currentLeague || '',
      currentRanking: currentRanking || '',
      status: 'pending',
      submittedAt: new Date()
    });
    
    console.log('📝 Signup application object created:', signupApplication);
    
    await signupApplication.save();
    
    console.log('✅ Signup application saved successfully');
    
    // Send notification email (you can implement this later)
    // await sendSignupNotification(signupApplication);
    
    res.status(201).json({ 
      message: 'Signup application submitted successfully',
      applicationId: signupApplication._id
    });
  } catch (error) {
    console.error('Error submitting signup application:', error);
    res.status(500).json({ 
      error: 'Failed to submit signup application', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Register new player
router.post('/player/register', async (req, res) => {
  try {
    const { firstName, lastName, email, pin, fargoRate } = req.body;
    
    // Check if player already exists
    const existingPlayer = await LadderPlayer.getPlayerByEmail(email);
    if (existingPlayer) {
      return res.status(400).json({ error: 'Player already exists' });
    }
    
    // Determine ladder based on FargoRate
    let ladderName;
    if (fargoRate <= 499) {
      ladderName = '499-under';
    } else if (fargoRate >= 500 && fargoRate <= 549) {
      ladderName = '500-549';
    } else if (fargoRate >= 550) {
      ladderName = '550-plus';
    } else {
      return res.status(400).json({ error: 'Invalid FargoRate' });
    }
    
    // Get ladder
    const ladder = await Ladder.getLadderByRating(fargoRate);
    if (!ladder) {
      return res.status(400).json({ error: 'Invalid FargoRate' });
    }
    
    // Find next available position
    const playersInLadder = await LadderPlayer.getPlayersByLadder(ladderName);
    const nextPosition = playersInLadder.length + 1;
    
    // Create player
    const player = new LadderPlayer({
      firstName,
      lastName,
      email,
      pin,
      fargoRate,
      ladderId: ladder._id,
      ladderName,
      position: nextPosition
    });
    
    await player.save();
    
    res.status(201).json(player);
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ error: 'Failed to register player' });
  }
});

// Get eligible challenge targets for a player
router.get('/player/:email/challenge-targets', async (req, res) => {
  try {
    const { email } = req.params;
    const player = await LadderPlayer.getPlayerByEmail(email);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const challengeTargets = await player.getEligibleChallengeTargets();
    res.json(challengeTargets);
  } catch (error) {
    console.error('Error fetching challenge targets:', error);
    res.status(500).json({ error: 'Failed to fetch challenge targets' });
  }
});

// Get eligible smackdown targets for a player
router.get('/player/:email/smackdown-targets', async (req, res) => {
  try {
    const { email } = req.params;
    const player = await LadderPlayer.getPlayerByEmail(email);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const smackdownTargets = await player.getEligibleSmackdownTargets();
    res.json(smackdownTargets);
  } catch (error) {
    console.error('Error fetching smackdown targets:', error);
    res.status(500).json({ error: 'Failed to fetch smackdown targets' });
  }
});

// Get eligible ladder jump targets for a player
router.get('/player/:email/ladder-jump-targets', async (req, res) => {
  try {
    const { email } = req.params;
    const player = await LadderPlayer.getPlayerByEmail(email);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (!player.isEligibleForLadderJump()) {
      return res.status(400).json({ error: 'Player not eligible for ladder jump' });
    }
    
    const ladderJumpTargets = await player.getEligibleLadderJumpTargets();
    res.json(ladderJumpTargets);
  } catch (error) {
    console.error('Error fetching ladder jump targets:', error);
    res.status(500).json({ error: 'Failed to fetch ladder jump targets' });
  }
});

// Create a challenge
router.post('/challenge', async (req, res) => {
  try {
    const { 
      challengerEmail, 
      defenderEmail, 
      challengeType, 
      entryFee, 
      raceLength, 
      gameType, 
      tableSize, 
      preferredDates,
      postContent 
    } = req.body;
    
    // Get players
    const challenger = await LadderPlayer.getPlayerByEmail(challengerEmail);
    const defender = await LadderPlayer.getPlayerByEmail(defenderEmail);
    
    if (!challenger || !defender) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Validate challenge eligibility
    if (!challenger.canMakeChallenges()) {
      return res.status(400).json({ error: 'Challenger cannot make challenges' });
    }
    
    if (!defender.canBeChallenged()) {
      return res.status(400).json({ error: 'Defender cannot be challenged' });
    }
    
    // Set deadline (3 days from now)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3);
    
    // Create challenge
    const challenge = new LadderChallenge({
      challengeType,
      challenger: challenger._id,
      defender: defender._id,
      status: 'pending',
      matchDetails: {
        entryFee,
        raceLength,
        gameType,
        tableSize,
        preferredDates
      },
      challengePost: {
        postContent
      },
      deadline
    });
    
    await challenge.save();
    
    // Add challenge to players' active challenges
    challenger.activeChallenges.push({
      challengeId: challenge._id,
      type: challengeType,
      status: 'pending'
    });
    
    defender.activeChallenges.push({
      challengeId: challenge._id,
      type: challengeType,
      status: 'pending'
    });
    
    await challenger.save();
    await defender.save();
    
    // Send notification email to defender
    try {
      const { sendChallengeNotificationEmail } = await import('../services/nodemailerService.js');
      
      const emailData = {
        to_email: defender.email,
        to_name: `${defender.firstName} ${defender.lastName}`,
        from_name: `${challenger.firstName} ${challenger.lastName}`,
        challenge_type: challengeType,
        entry_fee: entryFee,
        race_length: raceLength,
        game_type: gameType,
        table_size: tableSize,
        location: 'Legends Brews & Cues', // Default location
        preferred_dates: preferredDates ? preferredDates.map(date => new Date(date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })).join(', ') : 'To be discussed',
        challenge_message: postContent,
        challenger_position: challenger.position,
        defender_position: defender.position,
        ladder_name: challenger.ladderName,
        app_url: 'https://newapp-1-ic1v.onrender.com'
      };
      
      await sendChallengeNotificationEmail(emailData);
      console.log('📧 Challenge notification email sent to defender');
    } catch (emailError) {
      console.error('Error sending challenge notification email:', emailError);
      // Don't fail the challenge creation if email fails
    }
    
    res.status(201).json(challenge);
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

// Get active challenges for a player
router.get('/player/:email/challenges', async (req, res) => {
  try {
    const { email } = req.params;
    const player = await LadderPlayer.getPlayerByEmail(email);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const challenges = await LadderChallenge.getActiveChallengesForPlayer(player._id);
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// Get challenges sent by a player
router.get('/challenges/sent/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const player = await LadderPlayer.getPlayerByEmail(email);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const sentChallenges = await LadderChallenge.find({
      challenger: player._id,
      status: { $in: ['pending', 'accepted', 'scheduled'] },
      isAdminCreated: { $ne: true } // Exclude admin-created challenges
    }).populate('defender', 'firstName lastName email ladderName position');
    
    res.json(sentChallenges);
  } catch (error) {
    console.error('Error fetching sent challenges:', error);
    res.status(500).json({ error: 'Failed to fetch sent challenges' });
  }
});

// Get challenges pending for a player
router.get('/challenges/pending/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const player = await LadderPlayer.getPlayerByEmail(email);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const pendingChallenges = await LadderChallenge.find({
      defender: player._id,
      status: 'pending',
      isAdminCreated: { $ne: true } // Exclude admin-created challenges
    }).populate('challenger', 'firstName lastName email ladderName position');
    
    res.json(pendingChallenges);
  } catch (error) {
    console.error('Error fetching pending challenges:', error);
    res.status(500).json({ error: 'Failed to fetch pending challenges' });
  }
});

// Accept a challenge
router.post('/challenge/:challengeId/accept', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { responseContent, selectedDate } = req.body;
    
    const challenge = await LadderChallenge.findById(challengeId)
      .populate('challenger defender');
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (!challenge.canBeAccepted()) {
      return res.status(400).json({ error: 'Challenge cannot be accepted' });
    }
    
    challenge.status = 'accepted';
    challenge.acceptance = {
      acceptedAt: new Date(),
      acceptedBy: challenge.defender._id,
      responseContent
    };
    
    // Set the agreed date if one was selected
    if (selectedDate) {
      challenge.matchDetails.agreedDate = new Date(selectedDate);
      challenge.status = 'scheduled'; // Update status to scheduled since we have a date
    }
    
    await challenge.save();
    
    res.json(challenge);
  } catch (error) {
    console.error('Error accepting challenge:', error);
    res.status(500).json({ error: 'Failed to accept challenge' });
  }
});

// Get recent matches
router.get('/matches/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const matches = await LadderMatch.getRecentMatches(parseInt(limit));
    res.json(matches);
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    res.status(500).json({ error: 'Failed to fetch recent matches' });
  }
});

// Get matches for a player
router.get('/player/:email/matches', async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 10 } = req.query;
    
    // First try to find player by email
    let player = await LadderPlayer.getPlayerByEmail(email);
    
    // If not found by email, try to find by name (for players without email in ladder system)
    if (!player) {
      // Check if there's a league player with this email
      const leaguePlayer = await User.findOne({ email: email.toLowerCase() });
      if (leaguePlayer) {
        // Try to find ladder player by name
        player = await LadderPlayer.findOne({
          firstName: { $regex: new RegExp(`^${leaguePlayer.firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${leaguePlayer.lastName}$`, 'i') },
          isActive: true
        });
      }
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const matches = await LadderMatch.getMatchesForPlayer(player._id, parseInt(limit));
    res.json(matches);
  } catch (error) {
    console.error('Error fetching player matches:', error);
    res.status(500).json({ error: 'Failed to fetch player matches' });
  }
});

// Get last match for a player (for ladder dashboard)
router.get('/matches/last-match/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const player = await LadderPlayer.getPlayerByEmail(email);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Get the most recent match for this player (completed or scheduled)
    const lastMatch = await LadderMatch.findOne({
      $or: [{ player1: player._id }, { player2: player._id }]
    })
    .populate('player1 player2 winner loser', 'firstName lastName email ladderName position')
    .sort({ scheduledDate: -1 });
    
    if (!lastMatch) {
      return res.json(null); // No matches found
    }
    
    res.json(lastMatch);
  } catch (error) {
    console.error('Error fetching last match:', error);
    res.status(500).json({ error: 'Failed to fetch last match' });
  }
});

// Import ladder data from CSV/JSON
router.post('/import', async (req, res) => {
  try {
    const { ladderData, ladderName } = req.body;
    
    if (!ladderData || !Array.isArray(ladderData)) {
      return res.status(400).json({ error: 'Invalid ladder data format' });
    }
    
    if (!ladderName || !['499-under', '500-549', '550-plus'].includes(ladderName)) {
      return res.status(400).json({ error: 'Invalid ladder name' });
    }
    
    // Get the ladder
    const ladder = await Ladder.findOne({ name: ladderName });
    if (!ladder) {
      return res.status(400).json({ error: 'Ladder not found' });
    }
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    // Process each player
    for (let i = 0; i < ladderData.length; i++) {
      const playerData = ladderData[i];
      
      try {
        // Check if player already exists
        const existingPlayer = await LadderPlayer.getPlayerByEmail(playerData.email);
        if (existingPlayer) {
          results.skipped++;
          continue;
        }
        
                 // Determine ladder based on FargoRate
         let playerLadderName;
         const playerFargoRate = playerData.fargoRate || 450;
         
         if (playerFargoRate <= 499) {
           playerLadderName = '499-under';
         } else if (playerFargoRate >= 500 && playerFargoRate <= 549) {
           playerLadderName = '500-549';
         } else if (playerFargoRate >= 550) {
           playerLadderName = '550-plus';
         } else {
           playerLadderName = ladderName; // Fallback to selected ladder
         }
         
         // Get the correct ladder for this player
         const playerLadder = await Ladder.findOne({ name: playerLadderName });
         if (!playerLadder) {
           results.errors.push({
             row: i + 1,
             data: playerData,
             error: `Ladder ${playerLadderName} not found`
           });
           continue;
         }
         
         // Create new player
         const player = new LadderPlayer({
           firstName: playerData.firstName || playerData.name?.split(' ')[0] || 'Unknown',
           lastName: playerData.lastName || playerData.name?.split(' ').slice(1).join(' ') || 'Player',
           email: playerData.email,
           pin: playerData.pin || '1234', // Default pin
           fargoRate: playerFargoRate,
           ladderId: playerLadder._id,
           ladderName: playerLadderName,
           position: playerData.position || (i + 1)
         });
        
        await player.save();
        results.imported++;
        
      } catch (error) {
        results.errors.push({
          row: i + 1,
          data: playerData,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Import completed',
      results
    });
    
  } catch (error) {
    console.error('Error importing ladder data:', error);
    res.status(500).json({ error: 'Failed to import ladder data' });
  }
});

// Bulk update ladder positions
router.post('/update-positions', async (req, res) => {
  try {
    const { ladderName, positions } = req.body;
    
    if (!ladderName || !positions || !Array.isArray(positions)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    
    const results = {
      updated: 0,
      errors: []
    };
    
    for (const posData of positions) {
      try {
        const player = await LadderPlayer.findOne({
          email: posData.email,
          ladderName: ladderName
        });
        
        if (player) {
          player.position = posData.position;
          await player.save();
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          email: posData.email,
          error: error.message
        });
      }
    }
    
    res.json({
      message: 'Positions updated',
      results
    });
    
  } catch (error) {
    console.error('Error updating positions:', error);
    res.status(500).json({ error: 'Failed to update positions' });
  }
});

// Get ladder admin data
router.get('/admin/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    const players = await LadderPlayer.find({ ladderName })
      .sort({ position: 1 })
      .select('firstName lastName email fargoRate position isActive immunityUntil');
    
    res.json(players);
    
  } catch (error) {
    console.error('Error fetching ladder admin data:', error);
    res.status(500).json({ error: 'Failed to fetch ladder admin data' });
  }
});

// Player Recognition and Account Claiming Routes
router.post('/recognize-player', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if player exists in league database
    const leaguePlayer = await User.findOne({ email: email.toLowerCase() });
    
    // Check if player exists in ladder database
    const ladderPlayer = await LadderPlayer.findOne({ email: email.toLowerCase() });
    
    const response = {
      isLeaguePlayer: !!leaguePlayer,
      isLadderPlayer: !!ladderPlayer,
      needsAccountClaim: !ladderPlayer && leaguePlayer, // League player but no ladder account
      playerInfo: null
    };

    if (leaguePlayer) {
      response.playerInfo = {
        firstName: leaguePlayer.firstName,
        lastName: leaguePlayer.lastName,
        email: leaguePlayer.email,
        phone: leaguePlayer.phone,
        divisions: leaguePlayer.divisions || []
      };
    }

    if (ladderPlayer) {
      response.ladderInfo = {
        position: ladderPlayer.position,
        fargoRate: ladderPlayer.fargoRate,
        ladderName: ladderPlayer.ladderName,
        isActive: ladderPlayer.isActive,
        stats: {
          wins: ladderPlayer.stats?.wins || 0,
          losses: ladderPlayer.stats?.losses || 0
        }
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error recognizing player:', error);
    res.status(500).json({ error: 'Failed to recognize player' });
  }
});

// DEPRECATED: This endpoint has been consolidated into the unified auth system
// Use /api/unified-auth/claim-account instead for all account claiming functionality
// This endpoint is kept for backward compatibility but will be removed in future versions
router.post('/claim-account', async (req, res) => {
  try {
    const { firstName, lastName, email, pin } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    
    let leaguePlayer = null;
    let ladderPlayer = null;
    let playerEmail = null;

    // Validate that at least one field is provided (email, PIN, or name-only for ladder players)
    if (!email && !pin) {
      // Check if this is a name-only ladder player
      const nameOnlyLadderPlayer = await LadderPlayer.findOne({
        firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
      });
      
      if (!nameOnlyLadderPlayer) {
        return res.status(400).json({ error: 'Either email OR PIN is required, or player not found in ladder system' });
      }
      
      // Found a ladder player with just name - require admin approval
      return res.status(403).json({ 
        error: 'Admin approval required',
        requiresApproval: true,
        playerFound: true,
        playerInfo: {
          firstName: nameOnlyLadderPlayer.firstName,
          lastName: nameOnlyLadderPlayer.lastName,
          position: nameOnlyLadderPlayer.position,
          ladderName: nameOnlyLadderPlayer.ladderName,
          fargoRate: nameOnlyLadderPlayer.fargoRate
        },
        message: 'Player found in ladder system but requires admin approval. Please submit an application with your email and phone number.'
      });
    }

    // Search by email if provided
    if (email) {
      playerEmail = email.toLowerCase();
      leaguePlayer = await User.findOne({ email: playerEmail });
      ladderPlayer = await LadderPlayer.findOne({ email: playerEmail });
    }

    // Search by PIN if email not found or not provided
    if (!leaguePlayer && !ladderPlayer && pin) {
      // Search league players by PIN
      const allLeaguePlayers = await User.find({});
      for (const player of allLeaguePlayers) {
        const isPinValid = await player.comparePin(pin);
        if (isPinValid) {
          leaguePlayer = player;
          playerEmail = player.email;
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
            playerEmail = player.email;
            break;
          }
        }
      }
    }

    // Verify name matches for any found player
    const verifyNameMatch = (player) => {
      if (!player) return false;
      const playerFirstName = player.firstName?.toLowerCase().trim();
      const playerLastName = player.lastName?.toLowerCase().trim();
      const inputFirstName = firstName.toLowerCase().trim();
      const inputLastName = lastName.toLowerCase().trim();
      
      return playerFirstName === inputFirstName && playerLastName === inputLastName;
    };

    // Check if found players match the provided name
    if (leaguePlayer && !verifyNameMatch(leaguePlayer)) {
      leaguePlayer = null;
    }
    
    if (ladderPlayer && !verifyNameMatch(ladderPlayer)) {
      ladderPlayer = null;
    }

    // If no player found, return error
    if (!leaguePlayer && !ladderPlayer) {
      return res.status(404).json({ error: 'No player found with the provided name and email/PIN combination. Please verify your information and try again.' });
    }

    // Determine player type and return unified response
    const response = {
      success: true,
      playerType: 'unknown',
      playerInfo: null,
      leagueInfo: null,
      ladderInfo: null,
      accessGranted: true // Grant immediate access
    };

    // Set player info from whichever system found the player
    if (leaguePlayer) {
      response.playerInfo = {
        firstName: leaguePlayer.firstName,
        lastName: leaguePlayer.lastName,
        email: leaguePlayer.email,
        phone: leaguePlayer.phone
      };
      response.leagueInfo = {
        firstName: leaguePlayer.firstName,
        lastName: leaguePlayer.lastName,
        email: leaguePlayer.email,
        phone: leaguePlayer.phone,
        divisions: leaguePlayer.divisions || []
      };
    }

    if (ladderPlayer) {
      response.playerInfo = {
        firstName: ladderPlayer.firstName,
        lastName: ladderPlayer.lastName,
        email: ladderPlayer.email
      };
      response.ladderInfo = {
        firstName: ladderPlayer.firstName,
        lastName: ladderPlayer.lastName,
        position: ladderPlayer.position,
        fargoRate: ladderPlayer.fargoRate,
        ladderName: ladderPlayer.ladderName,
        isActive: ladderPlayer.isActive,
        immunityUntil: ladderPlayer.immunityUntil,
        stats: {
          wins: ladderPlayer.wins || 0,
          losses: ladderPlayer.losses || 0
        }
      };
    }

    // Determine player type and set appropriate message
    if (leaguePlayer && ladderPlayer) {
      response.playerType = 'both';
      response.message = 'League & Ladder Player - Access Granted';
    } else if (leaguePlayer) {
      response.playerType = 'league';
      response.message = 'League Player - Access Granted';
    } else if (ladderPlayer) {
      response.playerType = 'ladder';
      response.message = 'Ladder Player - Access Granted';
    }

    res.json(response);
  } catch (error) {
    console.error('Error accessing account:', error);
    res.status(500).json({ error: 'Failed to access account' });
  }
});

// Apply for ladder account (for non-league players)
router.post('/apply-for-ladder', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, fargoRate, experience, currentLeague, currentRanking } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Check if player already exists in ladder
    const existingLadderPlayer = await LadderPlayer.findOne({ email: email.toLowerCase() });
    if (existingLadderPlayer) {
      return res.status(400).json({ error: 'A player with this email already exists in the ladder' });
    }

    // Check if player already has a pending application
    const existingApplication = await LadderSignupApplication.findOne({ email: email.toLowerCase() });
    if (existingApplication) {
      return res.status(400).json({ error: 'You already have a pending application' });
    }

    // Create a new ladder signup application
    const signupApplication = new LadderSignupApplication({
      firstName,
      lastName,
      email,
      phone: phone || '',
      fargoRate: fargoRate || null,
      experience: experience || 'beginner',
      currentLeague: currentLeague || '',
      currentRanking: currentRanking || '',
      status: 'pending',
      submittedAt: new Date()
    });
    
    await signupApplication.save();
    
    res.json({
      success: true,
      message: 'Application submitted successfully. An admin will review your application and contact you.',
      applicationId: signupApplication._id
    });
  } catch (error) {
    console.error('Error submitting ladder application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get matches for a ladder (with optional status filter)
router.get('/:leagueId/ladders/:ladderId/matches', async (req, res) => {
  try {
    const { leagueId, ladderId } = req.params;
    const { status } = req.query;

    // Build query filter
    const filter = {};
    if (status) {
      filter.status = status;
    }

    // Get matches for this ladder
    const matches = await LadderMatch.find({
      $or: [
        { player1Ladder: ladderId },
        { player2Ladder: ladderId }
      ],
      ...filter
    })
    .populate('player1 player2 winner loser reportedBy', 'firstName lastName email ladderName position')
    .populate('challengeId')
    .sort({ scheduledDate: -1 });

    res.json({
      success: true,
      matches: matches,
      count: matches.length
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches',
      error: error.message
    });
  }
});

// Create a match (Admin only)
router.post('/:leagueId/ladders/:ladderId/matches', async (req, res) => {
  try {
    const { leagueId, ladderId } = req.params;
    const {
      challengerId,
      defenderId,
      matchType,
      matchFormat, // Frontend sends this instead of raceLength
      raceLength,
      gameType,
      tableSize,
      proposedDate,
      location,
      notes
    } = req.body;

    // Validate required fields
    if (!challengerId || !defenderId || !matchType || !proposedDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: challengerId, defenderId, matchType, proposedDate'
      });
    }

    // Set default values for missing fields
    const finalRaceLength = raceLength || (matchFormat ? parseInt(matchFormat.split('-')[2]) : 5);
    const finalGameType = gameType || '8-ball';
    const finalTableSize = tableSize || '7-foot';

    // Get players
    const challenger = await LadderPlayer.findById(challengerId);
    const defender = await LadderPlayer.findById(defenderId);

    if (!challenger || !defender) {
      return res.status(404).json({
        success: false,
        message: 'One or both players not found'
      });
    }

    // Validate players are on the same ladder
    if (challenger.ladderName !== defender.ladderName) {
      return res.status(400).json({
        success: false,
        message: 'Players must be on the same ladder'
      });
    }

    // Create a challenge first (since matches are created from challenges)
    const challenge = new LadderChallenge({
      challengeType: matchType,
      challenger: challenger._id,
      defender: defender._id,
      status: 'accepted', // Auto-accept admin-created matches
      isAdminCreated: true, // Mark as admin-created
      matchDetails: {
        entryFee: 0, // Default for admin-created matches
        raceLength: finalRaceLength,
        gameType: finalGameType,
        tableSize: finalTableSize,
        preferredDates: [new Date(proposedDate)]
      },
      challengePost: {
        postContent: notes || 'Admin-created match'
      },
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    await challenge.save();

    // Create the match from the challenge
    const match = new LadderMatch({
      challengeId: challenge._id,
      matchType: matchType,
      player1: challenger._id,
      player2: defender._id,
      entryFee: 0,
      raceLength: finalRaceLength,
      gameType: finalGameType,
      tableSize: finalTableSize,
      winner: null, // Will be set when match is completed
      loser: null,
      score: '', // Will be set when match is completed
      player1OldPosition: challenger.position,
      player1NewPosition: challenger.position, // Will be updated when match is completed
      player2OldPosition: defender.position,
      player2NewPosition: defender.position, // Will be updated when match is completed
      player1Ladder: challenger.ladderName,
      player2Ladder: defender.ladderName,
      scheduledDate: new Date(proposedDate),
      completedDate: null, // Will be set when match is completed
      venue: location || 'Legends Brews & Cues',
      status: 'scheduled'
    });

    await match.save();

    // Add challenge to players' active challenges
    challenger.activeChallenges.push({
      challengeId: challenge._id,
      type: matchType,
      status: 'accepted'
    });

    defender.activeChallenges.push({
      challengeId: challenge._id,
      type: matchType,
      status: 'accepted'
    });

    await challenger.save();
    await defender.save();

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      match: {
        id: match._id,
        challenger: `${challenger.firstName} ${challenger.lastName}`,
        defender: `${defender.firstName} ${defender.lastName}`,
        matchType: matchType,
        raceLength: finalRaceLength,
        gameType: finalGameType,
        tableSize: finalTableSize,
        scheduledDate: proposedDate,
        location: location || 'Legends Brews & Cues',
        status: 'scheduled'
      }
    });

  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create match',
      error: error.message
    });
  }
});

// Apply for existing ladder player account (for players without email/PIN)
router.post('/apply-for-existing-ladder-account', async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    // Check if player exists in ladder system
    const existingLadderPlayer = await LadderPlayer.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });

    if (!existingLadderPlayer) {
      return res.status(404).json({ error: 'Player not found in ladder system. Please verify your name or contact an admin.' });
    }

    // Check if player already has an email (they shouldn't need approval)
    if (existingLadderPlayer.email) {
      return res.status(400).json({ error: 'This player already has an email address. Please use the regular login process.' });
    }

    // Check if player already has a pending application
    const existingApplication = await LadderSignupApplication.findOne({ 
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });
    
    if (existingApplication) {
      return res.status(400).json({ error: 'You already have a pending application for this account.' });
    }

         // Create a new application for existing ladder player
     const signupApplication = new LadderSignupApplication({
       firstName,
       lastName,
       email,
       phone: phone || '',
       fargoRate: existingLadderPlayer.fargoRate,
       experience: 'expert', // Use 'expert' for existing players
       currentLeague: '',
       currentRanking: '',
       status: 'pending',
       submittedAt: new Date(),
       notes: `Existing ladder player - Position ${existingLadderPlayer.position} in ${existingLadderPlayer.ladderName} ladder`
     });
    
    await signupApplication.save();
    
    res.json({
      success: true,
      message: 'Application submitted successfully for your existing ladder account. An admin will review and approve your access.',
      applicationId: signupApplication._id,
      playerInfo: {
        position: existingLadderPlayer.position,
        ladderName: existingLadderPlayer.ladderName,
        fargoRate: existingLadderPlayer.fargoRate
      }
    });
  } catch (error) {
    console.error('Error submitting existing ladder player application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get player's unified status across both systems
router.get('/player-status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // Check if player exists in league database
    const leaguePlayer = await User.findOne({ email: email.toLowerCase() });
    
    // Check if player exists in ladder database (by email OR by name if league player exists)
    let ladderPlayer = await LadderPlayer.findOne({ email: email.toLowerCase() });
    
    // If no ladder player found by email but league player exists, try to find by name
    if (!ladderPlayer && leaguePlayer) {
      ladderPlayer = await LadderPlayer.findOne({
        firstName: { $regex: new RegExp(`^${leaguePlayer.firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${leaguePlayer.lastName}$`, 'i') }
      });
    }
    
    // Check unified account status
    let unifiedAccount = null;
    if (ladderPlayer) {
      unifiedAccount = await checkUnifiedAccountStatus(ladderPlayer.firstName, ladderPlayer.lastName);
    } else if (leaguePlayer) {
      unifiedAccount = await checkUnifiedAccountStatus(leaguePlayer.firstName, leaguePlayer.lastName);
    }
    
    const response = {
      isLeaguePlayer: !!leaguePlayer,
      isLadderPlayer: !!ladderPlayer,
      needsAccountClaim: !ladderPlayer && leaguePlayer, // League player but no ladder account
      playerInfo: null,
      leagueInfo: null,
      ladderInfo: null,
      unifiedAccount: unifiedAccount
    };

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
        isActive: ladderPlayer.isActive,
        immunityUntil: ladderPlayer.immunityUntil,
        stats: {
          wins: ladderPlayer.wins || 0,
          losses: ladderPlayer.losses || 0
        }
      };
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error getting player status:', error);
    res.status(500).json({ error: 'Failed to get player status' });
  }
});



// Get all players across both systems (admin only)
router.get('/all-players', async (req, res) => {
  try {
    const allPlayers = await PlayerRecognitionService.getAllPlayers();
    res.json(allPlayers);
  } catch (error) {
    console.error('Error getting all players:', error);
    res.status(500).json({ error: 'Failed to get all players' });
  }
});

// Validate login across both systems
router.post('/validate-login', async (req, res) => {
  try {
    const { email, pin } = req.body;
    
    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and PIN are required' });
    }
    
    const validation = await PlayerRecognitionService.validateLogin(email, pin);
    res.json(validation);
  } catch (error) {
    console.error('Error validating login:', error);
    res.status(500).json({ error: 'Failed to validate login' });
  }
});

// Admin routes for managing signup applications
// Get all signup applications
router.get('/admin/signup-applications', async (req, res) => {
  try {
    const applications = await LadderSignupApplication.getAllApplications();
    res.json(applications);
  } catch (error) {
    console.error('Error fetching signup applications:', error);
    res.status(500).json({ error: 'Failed to fetch signup applications' });
  }
});

// Get pending signup applications
router.get('/admin/signup-applications/pending', async (req, res) => {
  try {
    const applications = await LadderSignupApplication.getPendingApplications();
    res.json(applications);
  } catch (error) {
    console.error('Error fetching pending applications:', error);
    res.status(500).json({ error: 'Failed to fetch pending applications' });
  }
});

// Approve a signup application
router.post('/admin/signup-applications/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, notes } = req.body;
    
    const application = await LadderSignupApplication.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.approve(reviewedBy, notes);
    res.json({ message: 'Application approved successfully', application });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// Reject a signup application
router.post('/admin/signup-applications/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, notes } = req.body;
    
    const application = await LadderSignupApplication.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.reject(reviewedBy, notes);
    res.json({ message: 'Application rejected successfully', application });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Mark application as contacted
router.post('/admin/signup-applications/:id/contact', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, notes } = req.body;
    
    const application = await LadderSignupApplication.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    await application.markAsContacted(reviewedBy, notes);
    res.json({ message: 'Application marked as contacted successfully', application });
  } catch (error) {
    console.error('Error marking application as contacted:', error);
    res.status(500).json({ error: 'Failed to mark application as contacted' });
  }
});

// Simplified routes for the frontend applications manager
// Get all applications
router.get('/applications', async (req, res) => {
  try {
    const applications = await LadderSignupApplication.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Approve application
router.post('/applications/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = await LadderSignupApplication.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Check if player already exists
    const existingPlayer = await LadderPlayer.findOne({ email: application.email });
    if (existingPlayer) {
      return res.status(400).json({ error: 'A player with this email already exists' });
    }
    
    // Determine ladder based on FargoRate (default to 499-under for now)
    let ladderName = '499-under';
    if (application.fargoRate) {
      if (application.fargoRate >= 500 && application.fargoRate <= 549) {
        ladderName = '500-549';
      } else if (application.fargoRate >= 550) {
        ladderName = '550-plus';
      }
    }
    
    // Get the ladder
    const ladder = await Ladder.findOne({ name: ladderName });
    if (!ladder) {
      // Fallback to 499-under if ladder doesn't exist
      ladderName = '499-under';
      const fallbackLadder = await Ladder.findOne({ name: '499-under' });
      if (!fallbackLadder) {
        console.error('No ladder found in database');
        return res.status(500).json({ error: 'No ladder found in database. Please run the createLadderData script first.' });
      }
    }
    
    // Find the lowest position in the ladder
    const lowestPosition = await LadderPlayer.findOne({ ladderName })
      .sort({ position: -1 })
      .limit(1);
    
    const newPosition = (lowestPosition?.position || 0) + 1;
    
    // Generate a random PIN (4 digits)
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedPin = await bcrypt.hash(pin, 10);
    
    // Create the ladder player
    const newLadderPlayer = new LadderPlayer({
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      pin: hashedPin,
      fargoRate: application.fargoRate || 450,
      ladderId: ladder._id,
      ladderName: ladderName,
      position: newPosition,
      isActive: true,
      stats: {
        wins: 0,
        losses: 0
      }
    });
    
    await newLadderPlayer.save();
    
    // Update application status
    application.status = 'approved';
    application.reviewedAt = new Date();
    application.notes = `Approved and added to ${ladderName} ladder at position ${newPosition}`;
    await application.save();
    
    // Return credentials for frontend to handle email sending
    const playerData = {
      email: application.email,
      pin: pin,
      ladderName: ladderName,
      position: newPosition,
      firstName: application.firstName,
      lastName: application.lastName
    };
    
    res.json({ 
      message: 'Application approved successfully', 
      application,
      playerCreated: playerData,
      emailSent: false, // Frontend will handle email sending
      emailDetails: { message: 'Email will be sent from frontend' }
    });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// Reject application
router.post('/applications/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const application = await LadderSignupApplication.findById(id);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    application.status = 'rejected';
    application.rejectionReason = reason;
    application.reviewedAt = new Date();
    await application.save();
    
    res.json({ message: 'Application rejected successfully', application });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Prize Pool API Routes
router.get('/prize-pool/:ladderName', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    // Get current period start and end dates
    const currentDate = new Date();
    const startOfPeriod = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 2) * 2, 1);
    const endOfPeriod = new Date(startOfPeriod);
    endOfPeriod.setMonth(endOfPeriod.getMonth() + 2);
    
    // Get all matches for this ladder in the current period
    const matches = await LadderMatch.find({
      ladderName: ladderName,
      matchDate: { $gte: startOfPeriod, $lte: endOfPeriod },
      status: 'completed'
    });
    
    // Calculate prize pool ($3 per match)
    const totalMatches = matches.length;
    const currentPrizePool = totalMatches * 3;
    
    // Calculate next distribution date
    const nextDistribution = new Date(endOfPeriod);
    nextDistribution.setDate(nextDistribution.getDate() + 1);
    
    res.json({
      currentPrizePool: currentPrizePool,
      totalMatches: totalMatches,
      nextDistribution: nextDistribution.toISOString(),
      periodStart: startOfPeriod.toISOString(),
      periodEnd: endOfPeriod.toISOString(),
      isEstimated: false
    });
  } catch (error) {
    console.error('Error fetching prize pool data:', error);
    res.status(500).json({ error: 'Failed to fetch prize pool data' });
  }
});

router.get('/prize-pool/:ladderName/history', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    // Get historical prize pool data for the last 6 periods (1 year)
    const historicalData = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 6; i++) {
      const periodStart = new Date(currentDate.getFullYear(), Math.floor((currentDate.getMonth() - (i * 2)) / 2) * 2, 1);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 2);
      
      // Get matches for this period
      const matches = await LadderMatch.find({
        ladderName: ladderName,
        matchDate: { $gte: periodStart, $lt: periodEnd },
        status: 'completed'
      });
      
      const prizePool = matches.length * 3;
      const periodName = `${periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
      
      historicalData.push({
        period: periodName,
        matches: matches.length,
        prizePool: prizePool,
        startDate: periodStart.toISOString(),
        endDate: periodEnd.toISOString()
      });
    }
    
    res.json(historicalData);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

router.get('/prize-pool/:ladderName/winners', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    // Get winners from the last 3 periods
    const winners = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 3; i++) {
      const periodStart = new Date(currentDate.getFullYear(), Math.floor((currentDate.getMonth() - (i * 2)) / 2) * 2, 1);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 2);
      
      // Get 1st place winner for this period
      const firstPlaceWinner = await LadderPlayer.findOne({
        ladderName: ladderName,
        position: 1
      }).sort({ updatedAt: -1 });
      
      if (firstPlaceWinner) {
        winners.push({
          playerName: `${firstPlaceWinner.firstName} ${firstPlaceWinner.lastName}`,
          category: '1st Place',
          amount: 150, // 50% of estimated $300 prize pool
          date: periodEnd.toISOString(),
          period: `${periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        });
      }
      
      // Get most improved player for this period
      // This would need to be calculated based on position changes
      // For now, we'll use a placeholder
      const mostImprovedWinner = await LadderPlayer.findOne({
        ladderName: ladderName,
        position: { $gt: 1 }
      }).sort({ updatedAt: -1 });
      
      if (mostImprovedWinner) {
        winners.push({
          playerName: `${mostImprovedWinner.firstName} ${mostImprovedWinner.lastName}`,
          category: 'Most Improved',
          amount: 150, // 50% of estimated $300 prize pool
          date: periodEnd.toISOString(),
          period: `${periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        });
      }
    }
    
    res.json(winners);
  } catch (error) {
    console.error('Error fetching winners:', error);
    res.status(500).json({ error: 'Failed to fetch winners data' });
  }
});

export default router;
