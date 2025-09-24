import express from 'express';
import mongoose from 'mongoose';
import Ladder from '../models/Ladder.js';
import LadderPlayer from '../models/LadderPlayer.js';
import LadderChallenge from '../models/LadderChallenge.js';
import LadderMatch from '../models/LadderMatch.js';
import LadderSignupApplication from '../models/LadderSignupApplication.js';
import User from '../models/User.js'; // Added import for User
import UnifiedUser from '../models/UnifiedUser.js'; // Added import for UnifiedUser
import bcrypt from 'bcryptjs'; // Added import for bcrypt
import PlayerRecognitionService from '../services/PlayerRecognitionService.js';
import { sanitizeDateInput, dateStringToDate, getCurrentISODate } from '../utils/dateUtils.js';

// Helper function to get maximum position for a ladder
const getMaxPosition = async (ladderId) => {
  const maxPlayer = await LadderPlayer.findOne({ ladderName: ladderId })
    .sort({ position: -1 })
    .limit(1);
  return maxPlayer ? maxPlayer.position : 1;
};
import { publicLadderEmbedHeaders } from '../middleware/iframeMiddleware.js';
// Note: EmailJS is client-side only, so we'll handle email sending in the frontend
// For now, we'll just return the credentials and let the frontend handle the email

const router = express.Router();

// Helper function to check unified account status for a ladder player
const checkUnifiedAccountStatus = async (firstName, lastName) => {
  try {
    const unifiedUser = await UnifiedUser.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
      lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
    });
    
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
    const players = await LadderPlayer.getAllPlayers();
    
    // Enhance players with unified account status
    const enhancedPlayers = await Promise.all(players.map(async (player) => {
      const unifiedStatus = await checkUnifiedAccountStatus(player.firstName, player.lastName);
      
      return {
        ...player.toObject(),
        unifiedAccount: unifiedStatus
      };
    }));
    
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
    
    const players = await LadderPlayer.getPlayersByLadder(ladderName);
    
    // Enhance players with unified account status and calculate actual wins/losses
    const enhancedPlayers = await Promise.all(players.map(async (player) => {
      const unifiedStatus = await checkUnifiedAccountStatus(player.firstName, player.lastName);
      
      // Calculate actual wins and losses from match history
      const matches = await LadderMatch.getMatchesForPlayer(player._id, 1000); // Get all matches
      let actualWins = 0;
      let actualLosses = 0;
      
      matches.forEach(match => {
        if (match.winner && match.winner._id.toString() === player._id.toString()) {
          actualWins++;
        } else if (match.winner && match.winner._id.toString() !== player._id.toString()) {
          actualLosses++;
        }
      });
      
      // Get the most recent match for last match details (using same logic as last-match endpoint)
      let lastMatch = null;
      const recentMatch = await LadderMatch.findOne({
        $or: [{ player1: player._id }, { player2: player._id }],
        status: 'completed' // Only show completed matches
      })
      .populate('player1 player2 winner loser', 'firstName lastName email ladderName position')
      .sort({ completedDate: -1 });
      
      if (recentMatch) {
        const isPlayer1 = recentMatch.player1._id.toString() === player._id.toString();
        const opponent = isPlayer1 ? recentMatch.player2 : recentMatch.player1;
        const isWinner = recentMatch.winner && recentMatch.winner._id.toString() === player._id.toString();
        
        lastMatch = {
          result: isWinner ? 'W' : 'L',
          opponent: `${opponent.firstName} ${opponent.lastName}`,
          date: recentMatch.scheduledDate || recentMatch.completedDate,
          venue: recentMatch.venue,
          matchType: recentMatch.matchType,
          score: recentMatch.score,
          playerRole: isPlayer1 ? 'challenger' : 'defender'
        };
      }
      
      // Get recent matches for match history (limit to 10 most recent)
      const recentMatches = matches.slice(0, 10).map(match => {
        const isPlayer1 = match.player1._id.toString() === player._id.toString();
        const opponent = isPlayer1 ? match.player2 : match.player1;
        const isWinner = match.winner && match.winner._id.toString() === player._id.toString();
        
        return {
          result: isWinner ? 'W' : 'L',
          opponent: `${opponent.firstName} ${opponent.lastName}`,
          date: match.completedDate || match.createdAt,
          venue: match.venue,
          matchType: match.matchType,
          score: match.score,
          playerRole: isPlayer1 ? 'player1' : 'player2'
        };
      });

      return {
        ...player.toObject(),
        wins: actualWins,
        losses: actualLosses,
        totalMatches: matches.length,
        lastMatch: lastMatch,
        recentMatches: recentMatches,
        unifiedAccount: unifiedStatus
      };
    }));
    
    res.json(enhancedPlayers);
  } catch (error) {
    console.error('Error fetching ladder players:', error);
    res.status(500).json({ error: 'Failed to fetch ladder players', details: error.message });
  }
});

// Get player by email or ID
router.get('/player/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let player = null;
    
    // Try to find by email first
    if (identifier.includes('@')) {
      player = await LadderPlayer.getPlayerByEmail(identifier);
    } else {
      // Try to find by ID
      try {
        player = await LadderPlayer.findById(identifier);
      } catch (error) {
        // If ID is invalid, try as email anyway
        player = await LadderPlayer.getPlayerByEmail(identifier);
      }
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Calculate actual wins and losses from match history
    const matches = await LadderMatch.getMatchesForPlayer(player._id, 1000); // Get all matches
    let actualWins = 0;
    let actualLosses = 0;
    
    matches.forEach(match => {
      if (match.winner && match.winner._id.toString() === player._id.toString()) {
        actualWins++;
      } else if (match.winner && match.winner._id.toString() !== player._id.toString()) {
        actualLosses++;
      }
    });
    
    // Enhance player with unified account status
    const unifiedStatus = await checkUnifiedAccountStatus(player.firstName, player.lastName);
    
    const enhancedPlayer = {
      ...player.toObject(),
      wins: actualWins,
      losses: actualLosses,
      totalMatches: matches.length,
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
    
    // Find the player by ID
    const player = await LadderPlayer.findById(id);
    if (!player) {
      return res.status(404).json({ error: 'Ladder player not found' });
    }
    
    // Only allow updating specific fields for security
    const allowedUpdates = ['email', 'firstName', 'lastName', 'fargoRate', 'isActive', 'ladderName'];
    const filteredUpdates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    });

    // Handle ladder assignment - convert ladderName to ladderId
    if (updateData.ladderName) {
      console.log(`🔄 Admin trying to move player ${player.firstName} ${player.lastName} to ${updateData.ladderName} ladder`);
      console.log(`🔄 Current ladder: ${player.ladderName} (ID: ${player.ladderId})`);
      
      const Ladder = mongoose.model('Ladder');
      const ladder = await Ladder.findOne({ name: updateData.ladderName });
      if (ladder) {
        filteredUpdates.ladderId = ladder._id;
        console.log(`🔄 Moving player ${player.firstName} ${player.lastName} to ${updateData.ladderName} ladder (ID: ${ladder._id})`);
        console.log(`🔄 Update data:`, filteredUpdates);
      } else {
        console.warn(`⚠️  Ladder "${updateData.ladderName}" not found`);
      }
    }
    
    // Update the player
    console.log(`🔄 Updating player with data:`, filteredUpdates);
    const updatedPlayer = await LadderPlayer.findByIdAndUpdate(
      id,
      filteredUpdates,
      { new: true, runValidators: true }
    );
    
    if (updatedPlayer) {
      console.log(`✅ Player updated successfully: ${updatedPlayer.firstName} ${updatedPlayer.lastName}`);
      console.log(`✅ New ladder: ${updatedPlayer.ladderName} (ID: ${updatedPlayer.ladderId})`);
    } else {
      console.error(`❌ Failed to update player`);
    }
    
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
    const { firstName, lastName, email, phone, fargoRate, experience, currentLeague, currentRanking, payNow, paymentMethod } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate fargoRate if provided
    if (fargoRate !== undefined && fargoRate !== null) {
      if (typeof fargoRate !== 'number' || fargoRate < 0 || fargoRate > 850) {
        return res.status(400).json({ error: 'FargoRate must be a number between 0 and 850' });
      }
    }
    
    // Check if player already exists
    const existingPlayer = await LadderPlayer.findOne({ email });
    if (existingPlayer) {
      return res.status(400).json({ error: 'A player with this email already exists' });
    }
    
    // Check if signup application already exists
    const existingApplication = await LadderSignupApplication.findOne({ email });
    if (existingApplication) {
      return res.status(400).json({ error: 'A signup application with this email already exists' });
    }
    
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
      payNow: payNow || false,
      paymentMethod: paymentMethod || '',
      status: 'pending',
      submittedAt: new Date()
    });
    
    await signupApplication.save();
    
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
      preferredTimes,
      postContent 
    } = req.body;
    
    // Get players - try by email first, then by name if email lookup fails
    let challenger = await LadderPlayer.getPlayerByEmail(challengerEmail);
    let defender = await LadderPlayer.getPlayerByEmail(defenderEmail);
    
    // If not found by email, try to find by name (for players without email addresses)
    if (!challenger) {
      // Try to find by name if email lookup failed
      const [firstName, lastName] = challengerEmail.split('@')[0].split('.');
      if (firstName && lastName) {
        challenger = await LadderPlayer.findOne({
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
          isActive: true
        });
      }
    }
    
    if (!defender) {
      // Try to find by name if email lookup failed
      const [firstName, lastName] = defenderEmail.split('@')[0].split('.');
      if (firstName && lastName) {
        defender = await LadderPlayer.findOne({
          firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
          lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
          isActive: true
        });
      }
    }
    
    if (!challenger || !defender) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Ensure players have email addresses for challenge creation
    if (!challenger.email && challenger.unifiedAccount?.email) {
      challenger.email = challenger.unifiedAccount.email;
    }
    if (!defender.email && defender.unifiedAccount?.email) {
      defender.email = defender.unifiedAccount.email;
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
        preferredDates,
        preferredTimes: preferredTimes || {}
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
    
    // Send notification email to defender (optional - don't fail if email service is down)
    if (defender.email) {
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
          preferred_dates: preferredDates ? preferredDates.map(date => {
            const dateStr = new Date(date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            const time = preferredTimes && preferredTimes[date] ? 
              new Date(`2000-01-01T${preferredTimes[date]}`).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              }) : '';
            return time ? `${dateStr} at ${time}` : dateStr;
          }).join(', ') : 'To be discussed',
          challenge_message: postContent,
          challenger_position: challenger.position,
          defender_position: defender.position,
          ladder_name: challenger.ladderName,
          app_url: 'https://newapp-1-ic1v.onrender.com'
        };
        
        await sendChallengeNotificationEmail(emailData);
      } catch (emailError) {
        console.error('Error sending challenge notification email:', emailError);
        // Don't fail the challenge creation if email fails
      }
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
router.get('/challenges/pending/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    let player = null;
    
    // Try to find by ID first (if it's a valid ObjectId)
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      player = await LadderPlayer.findById(identifier);
    }
    
    // If not found by ID or not a valid ObjectId, try by email
    if (!player) {
      player = await LadderPlayer.getPlayerByEmail(identifier);
    }
    
    // If still not found, try by unifiedAccount.email directly
    if (!player) {
      player = await LadderPlayer.findOne({
        'unifiedAccount.email': identifier.toLowerCase(),
        isActive: true
      });
    }
    
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

// Decline a challenge
router.post('/challenge/:challengeId/decline', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { note } = req.body;
    
    const challenge = await LadderChallenge.findById(challengeId)
      .populate('challenger defender');
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: 'Challenge cannot be declined' });
    }
    
    challenge.status = 'declined';
    challenge.declinedAt = new Date();
    challenge.declineNote = note;
    
    await challenge.save();
    
    res.json({ success: true, message: 'Challenge declined successfully', challenge });
  } catch (error) {
    console.error('Error declining challenge:', error);
    res.status(500).json({ error: 'Failed to decline challenge' });
  }
});

// Submit a counter-proposal
router.post('/challenge/:challengeId/counter-proposal', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { counterProposal } = req.body;
    
    const challenge = await LadderChallenge.findById(challengeId)
      .populate('challenger defender');
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: 'Challenge cannot be counter-proposed' });
    }
    
    // Store the counter-proposal
    challenge.counterProposal = {
      entryFee: counterProposal.entryFee,
      raceLength: counterProposal.raceLength,
      gameType: counterProposal.gameType,
      tableSize: counterProposal.tableSize,
      location: counterProposal.location,
      preferredDates: counterProposal.preferredDates,
      note: counterProposal.note,
      submittedAt: new Date(),
      submittedBy: challenge.defender._id
    };
    
    challenge.status = 'counter-proposed';
    
    await challenge.save();
    
    res.json({ success: true, message: 'Counter-proposal submitted successfully', challenge });
  } catch (error) {
    console.error('Error submitting counter-proposal:', error);
    res.status(500).json({ error: 'Failed to submit counter-proposal' });
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

// Complete a ladder match
router.patch('/matches/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId, score, notes, venue, completedAt } = req.body;
    
    if (!winnerId || !score) {
      return res.status(400).json({ error: 'winnerId and score are required' });
    }
    
    const match = await LadderMatch.findById(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match is already completed' });
    }
    
    // Validate that winnerId is one of the players
    const isPlayer1 = match.player1 && match.player1.toString() === winnerId.toString();
    const isPlayer2 = match.player2 && match.player2.toString() === winnerId.toString();
    
    if (!isPlayer1 && !isPlayer2) {
      return res.status(400).json({ error: 'Winner must be one of the match players' });
    }
    
    // Set the reportedBy field (required for completed matches)
    match.reportedBy = winnerId; // The winner is reporting the match result
    match.reportedAt = new Date();
    
    await match.complete(winnerId, score, notes, venue, completedAt);
    
    // Update ladder positions after match completion
    const winner = await LadderPlayer.findById(winnerId);
    const loser = await LadderPlayer.findById(match.loser);
    
    if (winner && loser && winner.ladderName === loser.ladderName) {
      // Update win/loss records
      winner.wins = (winner.wins || 0) + 1;
      winner.totalMatches = (winner.totalMatches || 0) + 1;
      loser.losses = (loser.losses || 0) + 1;
      loser.totalMatches = (loser.totalMatches || 0) + 1;
      
      // Only swap positions if the winner was the challenger (lower ranked player with higher position number)
      // In ladder challenges, only the challenger can move up by winning
      if (match.matchType === 'challenge' && winner.position > loser.position) {
        // Swap positions - winner takes loser's better position
        const tempPosition = winner.position;
        winner.position = loser.position;
        loser.position = tempPosition;
        
        console.log(`🔄 Ladder positions updated: ${winner.firstName} ${winner.lastName} (challenger) moved from #${tempPosition} to #${winner.position}, ${loser.firstName} ${loser.lastName} (defender) moved from #${winner.position} to #${loser.position}`);
      }
      
      await winner.save();
      await loser.save();
      
      console.log(`📊 Records updated: ${winner.firstName} ${winner.lastName} now ${winner.wins}W-${loser.losses}L, ${loser.firstName} ${loser.lastName} now ${loser.wins}W-${loser.losses}L`);
    }
    
    res.json({ 
      success: true, 
      message: 'Match completed successfully and ladder positions updated',
      match 
    });
    
  } catch (error) {
    console.error('❌ Error completing match:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to complete match', details: error.message });
  }
});

// Get matches for a player by ID
router.get('/player/:identifier/matches', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { limit = 10 } = req.query;
    
    let player = null;
    
    // Try to find by email first
    if (identifier.includes('@')) {
      player = await LadderPlayer.getPlayerByEmail(identifier);
      
      // If not found by email, try to find by name (for players without email in ladder system)
      if (!player) {
        // Check if there's a league player with this email
        const leaguePlayer = await User.findOne({ email: identifier.toLowerCase() });
        if (leaguePlayer) {
          // Try to find ladder player by name
          player = await LadderPlayer.findOne({
            firstName: { $regex: new RegExp(`^${leaguePlayer.firstName}$`, 'i') },
            lastName: { $regex: new RegExp(`^${leaguePlayer.lastName}$`, 'i') },
            isActive: true
          });
        }
      }
    } else {
      // Try to find by ID
      try {
        player = await LadderPlayer.findById(identifier);
      } catch (error) {
        // If ID is invalid, try as email anyway
        player = await LadderPlayer.getPlayerByEmail(identifier);
      }
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const matches = await LadderMatch.getMatchesForPlayer(player._id, parseInt(limit));
    
    // Transform matches to match frontend expectations
    const transformedMatches = matches.map(match => {
      const isPlayer1 = match.player1._id.toString() === player._id.toString();
      const opponent = isPlayer1 ? match.player2 : match.player1;
      const isWinner = match.winner && match.winner._id.toString() === player._id.toString();
      
      return {
        opponentName: `${opponent.firstName} ${opponent.lastName}`,
        result: isWinner ? 'W' : 'L',
        score: match.score || 'N/A',
        matchType: match.matchType,
        playerRole: isPlayer1 ? 'challenger' : 'defender',
        matchDate: match.scheduledDate || match.completedDate,
        location: match.venue || null,
        positionBefore: isPlayer1 ? match.player1OldPosition : match.player2OldPosition,
        positionAfter: isPlayer1 ? match.player1NewPosition : match.player2NewPosition
      };
    });
    
    res.json(transformedMatches);
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
    
    // Transform the match data to match frontend expectations
    const isPlayer1 = lastMatch.player1._id.toString() === player._id.toString();
    const opponent = isPlayer1 ? lastMatch.player2 : lastMatch.player1;
    const isWinner = lastMatch.winner && lastMatch.winner._id.toString() === player._id.toString();
    
    const transformedMatch = {
      opponentName: `${opponent.firstName} ${opponent.lastName}`,
      result: isWinner ? 'W' : 'L',
      score: lastMatch.score || 'N/A',
      matchType: lastMatch.matchType,
      playerRole: isPlayer1 ? 'challenger' : 'defender',
      matchDate: lastMatch.scheduledDate || lastMatch.completedDate,
      location: lastMatch.venue || null,
      positionBefore: isPlayer1 ? lastMatch.player1OldPosition : lastMatch.player2OldPosition,
      positionAfter: isPlayer1 ? lastMatch.player1NewPosition : lastMatch.player2NewPosition
    };
    
    res.json(transformedMatch);
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
      scheduledDate: sanitizeDateInput(proposedDate),
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

// Update match (Admin only) - comprehensive edit
router.put('/:leagueId/ladders/:ladderId/matches/:matchId', async (req, res) => {
  try {
    const { leagueId, ladderId, matchId } = req.params;
    const { 
      winner, 
      score, 
      notes, 
      adminNotes,
      completedDate, 
      scheduledDate,
      venue,
      entryFee,
      raceLength,
      gameType,
      tableSize,
      status,
      reportedBy,
      lmsStatus,
      lmsScheduledAt,
      lmsCompletedAt,
      lmsNotes
    } = req.body;

    // Validate required fields only if winner is provided (for completed matches)
    if (winner && !score) {
      return res.status(400).json({
        success: false,
        message: 'Score is required when setting a winner'
      });
    }

    // Find the match
    const match = await LadderMatch.findById(matchId)
      .populate('player1 player2', 'firstName lastName position ladderName');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Validate match is on the correct ladder
    if (match.player1Ladder !== ladderId && match.player2Ladder !== ladderId) {
      return res.status(400).json({
        success: false,
        message: 'Match is not on the specified ladder'
      });
    }

    // Update match with all provided fields
    if (winner) {
      // Get winner and loser only when winner is provided
      const winnerPlayer = match.player1._id.toString() === winner ? match.player1 : match.player2;
      const loserPlayer = match.player1._id.toString() === winner ? match.player2 : match.player1;
      
      match.winner = winner;
      match.loser = loserPlayer._id;
    }
    if (score) match.score = score;
    if (notes !== undefined) match.notes = notes;
    if (adminNotes !== undefined) match.adminNotes = adminNotes;
    if (completedDate) match.completedDate = sanitizeDateInput(completedDate);
    if (scheduledDate) match.scheduledDate = sanitizeDateInput(scheduledDate);
    if (venue) match.venue = venue;
    if (entryFee !== undefined) match.entryFee = entryFee;
    if (raceLength !== undefined) match.raceLength = raceLength;
    if (gameType) match.gameType = gameType;
    if (tableSize) match.tableSize = tableSize;
    if (status) match.status = status;
    if (reportedBy) match.reportedBy = reportedBy;
    if (lmsStatus) match.lmsStatus = lmsStatus;
    if (lmsScheduledAt) match.lmsScheduledAt = new Date(lmsScheduledAt);
    if (lmsCompletedAt) match.lmsCompletedAt = new Date(lmsCompletedAt);
    if (lmsNotes !== undefined) match.lmsNotes = lmsNotes;
    
    // If winner is provided, mark as completed
    if (winner && !completedDate) {
      match.completedDate = getCurrentISODate();
    }
    if (winner) {
      match.status = 'completed';
    }
    if (winner) {
      match.reportedAt = getCurrentISODate();
    }

    // Only calculate position changes if winner is being set
    if (winner) {
      // Calculate new positions based on match type
      let newWinnerPosition, newLoserPosition;
    
    if (match.matchType === 'smackdown') {
      // SmackDown rules: If challenger wins, defender moves 3 spots down, challenger moves 2 spots up
      // If defender wins, they switch positions
      const isChallengerWinner = winnerPlayer._id.toString() === match.player1._id.toString();
      
      if (isChallengerWinner) {
        // Challenger won: defender moves 3 down, challenger moves 2 up
        newLoserPosition = Math.min(loserPlayer.position + 3, await getMaxPosition(ladderId));
        newWinnerPosition = Math.max(winnerPlayer.position - 2, 1);
      } else {
        // Defender won: simple position swap
        newWinnerPosition = loserPlayer.position;
        newLoserPosition = winnerPlayer.position;
      }
    } else if (match.matchType === 'smackback') {
      // SmackBack rules: If challenger wins, they get 1st place, all others move down one
      // If 1st place player wins, positions remain unchanged
      if (winnerPlayer._id.toString() === match.player1._id.toString()) {
        // Challenger won: they get 1st place, everyone else moves down one
        newWinnerPosition = 1;
        newLoserPosition = loserPlayer.position + 1;
        
        // Move all other players down one position
        await LadderPlayer.updateMany(
          { 
            ladderName: ladderId, 
            position: { $lt: winnerPlayer.position },
            _id: { $nin: [winnerPlayer._id, loserPlayer._id] }
          },
          { $inc: { position: 1 } }
        );
      } else {
        // 1st place player won: positions remain unchanged
        newWinnerPosition = winnerPlayer.position;
        newLoserPosition = loserPlayer.position;
      }
    } else {
      // Standard challenge: simple swap if winner was lower ranked
      if (winnerPlayer.position > loserPlayer.position) {
        newWinnerPosition = loserPlayer.position;
        newLoserPosition = winnerPlayer.position;
      } else {
        newWinnerPosition = winnerPlayer.position;
        newLoserPosition = loserPlayer.position;
      }
    }

    // Update match position changes
    match.player1NewPosition = winnerPlayer._id.toString() === match.player1._id.toString() 
      ? newWinnerPosition 
      : newLoserPosition;
    match.player2NewPosition = winnerPlayer._id.toString() === match.player2._id.toString() 
      ? newWinnerPosition 
      : newLoserPosition;

    await match.save();

    // Update player positions
    winnerPlayer.position = newWinnerPosition;
    loserPlayer.position = newLoserPosition;
    
    await winnerPlayer.save();
    await loserPlayer.save();

    // Update player stats
    winnerPlayer.wins = (winnerPlayer.wins || 0) + 1;
    winnerPlayer.totalMatches = (winnerPlayer.totalMatches || 0) + 1;
    loserPlayer.losses = (loserPlayer.losses || 0) + 1;
    loserPlayer.totalMatches = (loserPlayer.totalMatches || 0) + 1;

      await winnerPlayer.save();
      await loserPlayer.save();
    }

    // Save the match regardless of whether winner was set
    await match.save();

    res.json({
      success: true,
      message: winner ? 'Match result updated successfully' : 'Match updated successfully',
      match: {
        id: match._id,
        winner: winner ? `${match.player1.firstName} ${match.player1.lastName}` : null,
        loser: winner ? `${match.player2.firstName} ${match.player2.lastName}` : null,
        score: match.score,
        completedDate: match.completedDate,
        status: match.status,
        notes: match.notes,
        adminNotes: match.adminNotes,
        venue: match.venue
      }
    });

  } catch (error) {
    console.error('Error updating match result:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update match result',
      error: error.message
    });
  }
});

// Delete match (Admin only)
router.delete('/:leagueId/ladders/:ladderId/matches/:matchId', async (req, res) => {
  try {
    const { leagueId, ladderId, matchId } = req.params;

    // Find the match
    const match = await LadderMatch.findById(matchId)
      .populate('player1 player2', 'firstName lastName position ladderName');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Validate match is on the correct ladder
    if (match.player1Ladder !== ladderId && match.player2Ladder !== ladderId) {
      return res.status(400).json({
        success: false,
        message: 'Match is not on the specified ladder'
      });
    }

    // If match is completed, we need to reverse position changes
    if (match.status === 'completed' && match.winner && match.loser) {
      const winnerPlayer = await LadderPlayer.findById(match.winner);
      const loserPlayer = await LadderPlayer.findById(match.loser);

      if (winnerPlayer && loserPlayer) {
        // Reverse position changes
        winnerPlayer.position = match.player1OldPosition;
        loserPlayer.position = match.player2OldPosition;

        // Reverse stats
        winnerPlayer.wins = Math.max((winnerPlayer.wins || 0) - 1, 0);
        winnerPlayer.totalMatches = Math.max((winnerPlayer.totalMatches || 0) - 1, 0);
        loserPlayer.losses = Math.max((loserPlayer.losses || 0) - 1, 0);
        loserPlayer.totalMatches = Math.max((loserPlayer.totalMatches || 0) - 1, 0);

        await winnerPlayer.save();
        await loserPlayer.save();
      }
    }

    // Delete the match
    await LadderMatch.findByIdAndDelete(matchId);

    res.json({
      success: true,
      message: 'Match deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete match',
      error: error.message
    });
  }
});

// Get match details for editing (Admin only)
router.get('/:leagueId/ladders/:ladderId/matches/:matchId', async (req, res) => {
  try {
    const { leagueId, ladderId, matchId } = req.params;

    const match = await LadderMatch.findById(matchId)
      .populate('player1 player2 winner loser', 'firstName lastName position ladderName email phone')
      .populate('challengeId', 'challengeType status');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Validate match is on the correct ladder
    if (match.player1Ladder !== ladderId && match.player2Ladder !== ladderId) {
      return res.status(400).json({
        success: false,
        message: 'Match is not on the specified ladder'
      });
    }

    res.json({
      success: true,
      match: {
        id: match._id,
        matchType: match.matchType,
        player1: {
          id: match.player1._id,
          name: `${match.player1.firstName} ${match.player1.lastName}`,
          position: match.player1.position,
          email: match.player1.email,
          phone: match.player1.phone
        },
        player2: {
          id: match.player2._id,
          name: `${match.player2.firstName} ${match.player2.lastName}`,
          position: match.player2.position,
          email: match.player2.email,
          phone: match.player2.phone
        },
        winner: match.winner ? {
          id: match.winner._id,
          name: `${match.winner.firstName} ${match.winner.lastName}`
        } : null,
        loser: match.loser ? {
          id: match.loser._id,
          name: `${match.loser.firstName} ${match.loser.lastName}`
        } : null,
        score: match.score,
        status: match.status,
        scheduledDate: match.scheduledDate,
        completedDate: match.completedDate,
        venue: match.venue,
        notes: match.notes,
        adminNotes: match.adminNotes,
        entryFee: match.entryFee,
        raceLength: match.raceLength,
        gameType: match.gameType,
        tableSize: match.tableSize,
        challengeId: match.challengeId,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching match details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch match details',
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
    
    // Check if player exists in unified user database first
    const unifiedUser = await UnifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    });
    
    // Check if player exists in ladder database
    let ladderPlayer = null;
    
    // If we have a unified user, try to find ladder player by name
    if (unifiedUser) {
      ladderPlayer = await LadderPlayer.findOne({
        firstName: { $regex: new RegExp(`^${unifiedUser.firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${unifiedUser.lastName}$`, 'i') }
      });
    }
    
    // If no ladder player found by unified user name but league player exists, try to find by league player name
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
    
    // Approve the ladder application
    await application.approve(reviewedBy, notes);
    
    // If this is linked to a UnifiedUser, also approve the unified account
    if (application.unifiedUserId) {
      const UnifiedUser = mongoose.model('UnifiedUser');
      const unifiedUser = await UnifiedUser.findById(application.unifiedUserId);
      
      if (unifiedUser) {
        // Approve the unified user account
        unifiedUser.isActive = true;
        unifiedUser.isApproved = true;
        unifiedUser.isPendingApproval = false;
        unifiedUser.notes = `${unifiedUser.notes}\nLadder application approved by ladder admin.`;
        await unifiedUser.save();
        
        console.log(`✅ Unified user account approved: ${unifiedUser.firstName} ${unifiedUser.lastName} (${unifiedUser.email})`);
      }
    }
    
    res.json({ 
      message: 'Application approved successfully', 
      application,
      unifiedUserApproved: !!application.unifiedUserId
    });
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
    
    // Reject the ladder application
    await application.reject(reviewedBy, notes);
    
    // If this is linked to a UnifiedUser, add a note but don't reject the unified account
    // (They might still want league access)
    if (application.unifiedUserId) {
      const UnifiedUser = mongoose.model('UnifiedUser');
      const unifiedUser = await UnifiedUser.findById(application.unifiedUserId);
      
      if (unifiedUser) {
        unifiedUser.notes = `${unifiedUser.notes}\nLadder application rejected by ladder admin: ${notes || 'No reason provided'}`;
        await unifiedUser.save();
        
        console.log(`📝 Unified user account updated with ladder rejection: ${unifiedUser.firstName} ${unifiedUser.lastName} (${unifiedUser.email})`);
      }
    }
    
    res.json({ 
      message: 'Application rejected successfully', 
      application,
      unifiedUserUpdated: !!application.unifiedUserId
    });
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

// Public ladder embed route - allows iframe embedding
router.get('/embed/:ladderName?', publicLadderEmbedHeaders, async (req, res) => {
  try {
    const { ladderName = '499-under' } = req.params;
    
    // Validate ladder name
    const validLadders = ['499-under', '500-549', '550-plus'];
    if (!validLadders.includes(ladderName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ladder name. Valid options: 499-under, 500-549, 550-plus'
      });
    }

    // Get players for the specified ladder
    const players = await LadderPlayer.find({ 
      ladderName: ladderName,
      isActive: true 
    })
    .sort({ position: 1 })
    .select('firstName lastName position fargoRate wins losses isActive immunityUntil')
    .lean();

    // Return public ladder data (no sensitive information)
    res.json({
      success: true,
      ladderName: ladderName,
      players: players.map(player => ({
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        fargoRate: player.fargoRate,
        wins: player.wins || 0,
        losses: player.losses || 0,
        isActive: player.isActive,
        immunityUntil: player.immunityUntil
      })),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching public ladder data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ladder data',
      error: error.message
    });
  }
});

// Get all confirmed matches for calendar display
router.get('/matches/confirmed', async (req, res) => {
  try {
    // Get all matches that are scheduled or completed
    const matches = await LadderMatch.find({
      status: { $in: ['scheduled', 'completed'] }
    })
    .populate('player1', 'firstName lastName')
    .populate('player2', 'firstName lastName')
    .populate('winner', 'firstName lastName')
    .sort({ scheduledDate: 1, completedDate: 1 })
    .lean();

    // Transform matches for calendar display
    const transformedMatches = matches.map(match => ({
      _id: match._id,
      player1: {
        firstName: match.player1?.firstName,
        lastName: match.player1?.lastName
      },
      player2: {
        firstName: match.player2?.firstName,
        lastName: match.player2?.lastName
      },
      winner: match.winner ? {
        firstName: match.winner.firstName,
        lastName: match.winner.lastName
      } : null,
      matchType: match.matchType,
      status: match.status,
      scheduledDate: match.scheduledDate,
      completedDate: match.completedDate,
      venue: match.venue,
      scheduledTime: match.scheduledTime,
      score: match.score,
      challengeType: match.challengeType
    }));

    res.json({
      success: true,
      matches: transformedMatches
    });
  } catch (error) {
    console.error('Error fetching confirmed matches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch confirmed matches'
    });
  }
});

// ADMIN ENDPOINTS FOR LADDER MANAGEMENT

// Update player position (admin only)
router.put('/admin/players/:playerId/position', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { newPosition, ladderName } = req.body;
    
    if (!newPosition || !ladderName) {
      return res.status(400).json({ error: 'newPosition and ladderName are required' });
    }
    
    const player = await LadderPlayer.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const oldPosition = player.position;
    player.position = parseInt(newPosition);
    
    // If moving to a position that's already taken, shift other players down
    const existingPlayer = await LadderPlayer.findOne({ 
      ladderName, 
      position: newPosition,
      _id: { $ne: playerId }
    });
    
    if (existingPlayer) {
      // Find the next available position
      let nextPosition = parseInt(newPosition) + 1;
      let nextPlayer = await LadderPlayer.findOne({ ladderName, position: nextPosition });
      
      while (nextPlayer) {
        nextPlayer.position += 1;
        await nextPlayer.save();
        nextPosition += 1;
        nextPlayer = await LadderPlayer.findOne({ ladderName, position: nextPosition });
      }
    }
    
    await player.save();
    
    res.json({
      success: true,
      message: `Player position updated from #${oldPosition} to #${newPosition}`,
      player: {
        id: player._id,
        name: `${player.firstName} ${player.lastName}`,
        oldPosition,
        newPosition: player.position
      }
    });
    
  } catch (error) {
    console.error('Error updating player position:', error);
    res.status(500).json({ error: 'Failed to update player position' });
  }
});

// Update player win/loss records (admin only)
router.put('/admin/players/:playerId/records', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { wins, losses, totalMatches } = req.body;
    
    const player = await LadderPlayer.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (wins !== undefined) player.wins = parseInt(wins);
    if (losses !== undefined) player.losses = parseInt(losses);
    if (totalMatches !== undefined) player.totalMatches = parseInt(totalMatches);
    
    await player.save();
    
    res.json({
      success: true,
      message: 'Player records updated successfully',
      player: {
        id: player._id,
        name: `${player.firstName} ${player.lastName}`,
        wins: player.wins,
        losses: player.losses,
        totalMatches: player.totalMatches
      }
    });
    
  } catch (error) {
    console.error('Error updating player records:', error);
    res.status(500).json({ error: 'Failed to update player records' });
  }
});

// Recalculate ladder positions based on wins/losses (admin only)
router.post('/admin/ladders/:ladderName/recalculate', async (req, res) => {
  try {
    const { ladderName } = req.params;
    
    // Get all players in the ladder, sorted by current position
    const players = await LadderPlayer.find({ ladderName })
      .sort({ position: 1 });
    
    // Sort by win percentage (wins / total matches), then by total wins
    players.sort((a, b) => {
      const aWinRate = a.totalMatches > 0 ? (a.wins || 0) / a.totalMatches : 0;
      const bWinRate = b.totalMatches > 0 ? (b.wins || 0) / b.totalMatches : 0;
      
      if (aWinRate !== bWinRate) {
        return bWinRate - aWinRate; // Higher win rate first
      }
      
      // If win rates are equal, sort by total wins
      return (b.wins || 0) - (a.wins || 0);
    });
    
    // Update positions based on new ranking
    for (let i = 0; i < players.length; i++) {
      players[i].position = i + 1;
      await players[i].save();
    }
    
    res.json({
      success: true,
      message: `Ladder positions recalculated for ${ladderName}`,
      players: players.map(p => ({
        id: p._id,
        name: `${p.firstName} ${p.lastName}`,
        position: p.position,
        wins: p.wins || 0,
        losses: p.losses || 0,
        totalMatches: p.totalMatches || 0
      }))
    });
    
  } catch (error) {
    console.error('Error recalculating ladder:', error);
    res.status(500).json({ error: 'Failed to recalculate ladder positions' });
  }
});

// Fix all positions - assign sequential positions (admin only)
router.post('/admin/ladders/:ladderName/fix-positions', async (req, res) => {
  try {
    const { ladderName } = req.params;
    console.log(`🔧 Fixing positions for ladder: ${ladderName}`);
    
    // Get all players in the ladder, sorted by current position
    const players = await LadderPlayer.find({ ladderName })
      .sort({ position: 1 });
    
    console.log(`📊 Found ${players.length} players to renumber`);
    console.log(`📋 Current positions:`, players.map(p => `${p.firstName} ${p.lastName}: ${p.position}`));
    
    // Assign sequential positions starting from 1 for ALL players
    let currentPosition = 1;
    const changes = [];
    
    for (const player of players) {
      const oldPosition = player.position;
      player.position = currentPosition;
      await player.save();
      
      if (oldPosition !== currentPosition) {
        console.log(`✅ ${player.firstName} ${player.lastName}: position ${oldPosition} → ${currentPosition}`);
        changes.push(`${player.firstName} ${player.lastName}: ${oldPosition} → ${currentPosition}`);
      }
      currentPosition++;
    }
    
    console.log(`🎯 Final positions:`, players.map(p => `${p.firstName} ${p.lastName}: ${p.position}`));
    
    res.json({
      success: true,
      message: `Fixed ${players.length} player positions for ${ladderName}. ${changes.length} changes made.`,
      changes: changes,
      players: players.map(p => ({
        id: p._id,
        name: `${p.firstName} ${p.lastName}`,
        position: p.position
      }))
    });
    
  } catch (error) {
    console.error('Error fixing positions:', error);
    res.status(500).json({ error: 'Failed to fix ladder positions' });
  }
});

// Simple renumber active players only - direct database update
router.post('/admin/ladders/:ladderName/renumber', async (req, res) => {
  try {
    const { ladderName } = req.params;
    console.log(`🔢 SIMPLE RENUMBER for ${ladderName} (active players only)`);
    
    // Get only ACTIVE players and renumber them 1, 2, 3, 4...
    const players = await LadderPlayer.find({ ladderName, isActive: true }).sort({ _id: 1 });
    
    console.log(`Found ${players.length} ACTIVE players to renumber`);
    
    // Update each active player with sequential position
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const newPosition = i + 1;
      console.log(`Setting ${player.firstName} ${player.lastName} to position ${newPosition}`);
      
      await LadderPlayer.updateOne(
        { _id: player._id },
        { $set: { position: newPosition } }
      );
    }
    
    console.log(`✅ Renumbered ${players.length} active players`);
    
    res.json({
      success: true,
      message: `Renumbered ${players.length} active players sequentially`,
      count: players.length
    });
    
  } catch (error) {
    console.error('Error renumbering:', error);
    res.status(500).json({ error: 'Failed to renumber players' });
  }
});

// Swap two player positions (admin only)
router.post('/admin/players/swap-positions', async (req, res) => {
  try {
    const { player1Id, player2Id } = req.body;
    
    if (!player1Id || !player2Id) {
      return res.status(400).json({ error: 'Both player IDs are required' });
    }
    
    if (player1Id === player2Id) {
      return res.status(400).json({ error: 'Cannot swap a player with themselves' });
    }
    
    console.log(`🔄 Swapping positions for players: ${player1Id} and ${player2Id}`);
    
    // Get both players
    const player1 = await LadderPlayer.findById(player1Id);
    const player2 = await LadderPlayer.findById(player2Id);
    
    if (!player1 || !player2) {
      return res.status(404).json({ error: 'One or both players not found' });
    }
    
    // Store the positions
    const player1Position = player1.position;
    const player2Position = player2.position;
    
    // Swap the positions
    player1.position = player2Position;
    player2.position = player1Position;
    
    // Save both players
    await player1.save();
    await player2.save();
    
    console.log(`✅ Swapped positions: ${player1.firstName} ${player1.lastName} (#${player1Position} → #${player2Position}) and ${player2.firstName} ${player2.lastName} (#${player2Position} → #${player1Position})`);
    
    res.json({
      success: true,
      message: `Successfully swapped positions between ${player1.firstName} ${player1.lastName} and ${player2.firstName} ${player2.lastName}`,
      swap: {
        player1: {
          id: player1._id,
          name: `${player1.firstName} ${player1.lastName}`,
          oldPosition: player1Position,
          newPosition: player2Position
        },
        player2: {
          id: player2._id,
          name: `${player2.firstName} ${player2.lastName}`,
          oldPosition: player2Position,
          newPosition: player1Position
        }
      }
    });
    
  } catch (error) {
    console.error('Error swapping player positions:', error);
    res.status(500).json({ error: 'Failed to swap player positions' });
  }
});

export default router;
