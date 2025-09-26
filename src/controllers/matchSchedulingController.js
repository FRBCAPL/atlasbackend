import mongoose from 'mongoose';
import MatchSchedulingRequest from '../models/MatchSchedulingRequest.js';
import { sendMatchSchedulingApprovalEmail, sendMatchSchedulingRejectionEmail, sendMatchSchedulingDefenderNotificationEmail, sendMatchSchedulingPartnerNotificationEmail, sendMatchSchedulingTestEmails, sendTestMatchSchedulingEmails } from '../services/nodemailerService.js';
import { createMatchSchedulingApprovalNotification, createMatchSchedulingRejectionNotification, createMatchSchedulingDefenderNotification } from '../services/notificationService.js';

// Helper function to check if player recently won a SmackDown as defender
const checkRecentSmackDownWin = async (playerId, ladderId) => {
  try {
    const LadderMatch = mongoose.model('LadderMatch');
    
    // Look for recent completed SmackDown match where this player was defender and won
    const recentMatch = await LadderMatch.findOne({
      ladderId: ladderId,
      matchType: 'smackdown',
      status: 'completed',
      player2: playerId, // defender
      winner: playerId,
      completedDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Within last 7 days
    });

    return !!recentMatch;
  } catch (error) {
    console.error('Error checking recent SmackDown win:', error);
    return false;
  }
};

// Lookup player and get available matches
// Lookup player by ID and get available matches (for when multiple players found)
export const lookupPlayerByIdAndMatches = async (req, res) => {
  try {
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID is required'
      });
    }

    // Import LadderPlayer model
    const LadderPlayer = mongoose.model('LadderPlayer');
    const Ladder = mongoose.model('Ladder');

    // Find the specific player by ID
    const player = await LadderPlayer.findOne({
      _id: playerId,
      isActive: true
    }).populate('ladderId');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found.'
      });
    }

    // Continue with the same match calculation logic as lookupPlayerAndMatches
    return await calculatePlayerMatches(player, res);

  } catch (error) {
    console.error('Error in lookupPlayerByIdAndMatches:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Extract match calculation logic into a reusable function
const calculatePlayerMatches = async (player, res) => {
  try {
    // Import models
    const LadderPlayer = mongoose.model('LadderPlayer');
    const Ladder = mongoose.model('Ladder');

    // Get the specific ladder the player is on
    let playerLadder = player.ladderId;
    if (!playerLadder) {
      return res.status(404).json({
        success: false,
        message: 'Player is not assigned to any ladder'
      });
    }

    // Validate player is on correct ladder based on Fargo rate
    const fargo = player.fargoRate || 0;
    const expectedLadder = fargo <= 499 ? '499-under' : 
                          fargo <= 549 ? '500-549' : '550-plus';
    
    if (playerLadder.name !== expectedLadder) {
      console.warn(`⚠️  Player ${player.firstName} ${player.lastName} (Fargo: ${fargo}) is on ${playerLadder.name} but should be on ${expectedLadder} - Admin should move via ladder admin interface`);
    }

    // Get all players in the player's ladder, sorted by position
    const ladderPlayers = await LadderPlayer.find({ 
      ladderId: playerLadder._id,
      isActive: true 
    }).sort({ position: 1 });


    // Calculate available matches
    const availableMatches = [];

    // Standard challenges (up to 4 positions above - players with LOWER position numbers)
    const validChallenges = ladderPlayers.filter(p => 
      p.position < player.position && 
      p.position >= player.position - 4
    );

    validChallenges.forEach(opponent => {
      availableMatches.push({
        matchType: 'challenge',
        defenderName: `${opponent.firstName} ${opponent.lastName}`,
        defenderEmail: opponent.email,
        defenderPhone: opponent.phone,
        defenderPosition: opponent.position,
        ladderName: playerLadder.name,
        reason: `Challenge #${opponent.position} (Challenge up to 4 positions above)`,
        icon: '⚔️',
        color: '#4CAF50'
      });
    });

    // SmackDown matches (up to 5 positions below - players with HIGHER position numbers)
    const validSmackDowns = ladderPlayers.filter(p => 
      p.position > player.position && 
      p.position <= player.position + 5
    );

    validSmackDowns.forEach(opponent => {
      availableMatches.push({
        matchType: 'smackdown',
        defenderName: `${opponent.firstName} ${opponent.lastName}`,
        defenderEmail: opponent.email,
        defenderPhone: opponent.phone,
        defenderPosition: opponent.position,
        ladderName: playerLadder.name,
        reason: `SmackDown #${opponent.position} (SmackDown up to 5 positions below)`,
        icon: '💥',
        color: '#FF9800'
      });
    });

    // SmackBack matches (only for #1 if player recently won a SmackDown as defender)
    if (player.position === 1) {
      const recentSmackDownWin = await checkRecentSmackDownWin(player._id, playerLadder._id);
      if (recentSmackDownWin) {
        const firstPlacePlayer = ladderPlayers.find(p => p.position === 1);
        if (firstPlacePlayer && firstPlacePlayer._id.toString() !== player._id.toString()) {
          availableMatches.push({
            matchType: 'smackback',
            defenderName: `${firstPlacePlayer.firstName} ${firstPlacePlayer.lastName}`,
            defenderEmail: firstPlacePlayer.email,
            defenderPhone: firstPlacePlayer.phone,
            defenderPosition: firstPlacePlayer.position,
            ladderName: playerLadder.name,
            reason: 'SmackBack to #1',
            icon: '🎯',
            color: '#9C27B0'
          });
        }
      }
    }

    return res.json({
      success: true,
      player: {
        name: `${player.firstName} ${player.lastName}`,
        email: player.email,
        phone: player.phone,
        position: player.position,
        ladderName: playerLadder.name,
        fargoRate: player.fargoRate || 0
      },
      availableMatches
    });

  } catch (error) {
    console.error('Error in calculatePlayerMatches:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const lookupPlayerAndMatches = async (req, res) => {
  try {
    const { playerName } = req.body;

    if (!playerName) {
      return res.status(400).json({
        success: false,
        message: 'Player name is required'
      });
    }

    // Import LadderPlayer model
    const LadderPlayer = mongoose.model('LadderPlayer');
    const Ladder = mongoose.model('Ladder');

    // Find all players matching the name (case insensitive)
    const players = await LadderPlayer.find({
      $or: [
        { firstName: { $regex: new RegExp(playerName, 'i') } },
        { lastName: { $regex: new RegExp(playerName, 'i') } },
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: new RegExp(playerName, 'i')
            }
          }
        }
      ],
      isActive: true
    }).populate('ladderId');

    if (!players || players.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Player not found. Please check your name and try again.'
      });
    }

    // If multiple players found, return them for selection
    if (players.length > 1) {
      const playerOptions = players.map(p => ({
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        fullName: `${p.firstName} ${p.lastName}`,
        position: p.position,
        ladderName: p.ladderId?.name || 'Unknown',
        fargoRate: p.fargoRate || 0
      }));

      return res.json({
        success: true,
        multipleMatches: true,
        message: `Found ${players.length} players with similar names. Please select the correct player:`,
        playerOptions
      });
    }

    // Single player found, proceed with match calculation
    const player = players[0];
    return await calculatePlayerMatches(player, res);

  } catch (error) {
    console.error('Error looking up player and matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup player and matches'
    });
  }
};

// Submit a new match scheduling request
export const submitMatchSchedulingRequest = async (req, res) => {
  try {
    const { 
      challengerName, 
      challengerEmail, 
      challengerPhone, 
      defenderName, 
      defenderEmail, 
      defenderPhone, 
      preferredDate, 
      preferredTime, 
      location, 
      notes, 
      matchType 
    } = req.body;

    // Validate required fields
    if (!challengerName || !defenderName || !preferredDate || !preferredTime || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Handle timezone - combine date and time with Mountain Time offset
    const dateTimeString = `${preferredDate}T${preferredTime}:00-06:00`;
    const scheduledDateTime = new Date(dateTimeString);

    // Create new match scheduling request
    const matchRequest = new MatchSchedulingRequest({
      challengerName,
      challengerEmail,
      challengerPhone,
      defenderName,
      defenderEmail,
      defenderPhone,
      preferredDate: scheduledDateTime,
      preferredTime,
      location,
      notes,
      matchType: matchType || 'challenge',
      status: 'pending_approval'
    });

    await matchRequest.save();

    res.json({
      success: true,
      message: 'Match scheduling request submitted successfully. It will be reviewed by an admin.',
      requestId: matchRequest._id
    });

  } catch (error) {
    console.error('Error submitting match scheduling request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit match scheduling request'
    });
  }
};


// Get all pending match scheduling requests (for admin)
export const getPendingMatchRequests = async (req, res) => {
  try {
    const requests = await MatchSchedulingRequest.find({ status: 'pending_approval' })
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching pending match requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending match requests'
    });
  }
};

// Get all match scheduling requests (for admin)
export const getAllMatchRequests = async (req, res) => {
  try {
    const requests = await MatchSchedulingRequest.find()
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching all match requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch match requests'
    });
  }
};

// Approve a match scheduling request
export const approveMatchRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, adminNotes } = req.body;

    const request = await MatchSchedulingRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Match scheduling request not found'
      });
    }

    request.status = 'approved';
    request.reviewedBy = reviewedBy || 'Admin';
    request.reviewedAt = new Date();
    request.adminNotes = adminNotes || '';

    await request.save();

    console.log(`✅ Match scheduling request approved: ${request.challengerName} vs ${request.defenderName}`);

    // Create LadderMatch record for calendar display
    try {
      const LadderMatch = mongoose.model('LadderMatch');
      const LadderPlayer = mongoose.model('LadderPlayer');
      
      // Find the challenger and defender players
      const challenger = await LadderPlayer.findOne({ 
        $or: [
          { email: request.challengerEmail },
          { 
            $expr: {
              $regexMatch: {
                input: { $concat: ['$firstName', ' ', '$lastName'] },
                regex: new RegExp(request.challengerName, 'i')
              }
            }
          }
        ]
      });
      
      const defender = await LadderPlayer.findOne({ 
        $or: [
          { email: request.defenderEmail },
          { 
            $expr: {
              $regexMatch: {
                input: { $concat: ['$firstName', ' ', '$lastName'] },
                regex: new RegExp(request.defenderName, 'i')
              }
            }
          }
        ]
      });

      if (challenger && defender) {
        // Create a dummy challenge ID for scheduled matches
        const dummyChallengeId = new mongoose.Types.ObjectId();
        
        // Create the LadderMatch record
        const ladderMatch = new LadderMatch({
          challengeId: dummyChallengeId, // Required field - using dummy ID for scheduled matches
          matchType: request.matchType || 'challenge',
          player1: challenger._id,
          player2: defender._id,
          entryFee: 5, // Default $5 entry fee
          raceLength: request.raceLength || 7, // Use requested race length
          gameType: request.gameType || '9-ball', // Use requested game type
          tableSize: '9-foot', // Default table size
          player1OldPosition: challenger.position || 0,
          player1NewPosition: challenger.position || 0,
          player2OldPosition: defender.position || 0,
          player2NewPosition: defender.position || 0,
          player1Ladder: challenger.ladderName || '499-under',
          player2Ladder: defender.ladderName || '499-under',
          scheduledDate: request.preferredDate,
          venue: request.location || 'Legends Brews & Cues',
          status: 'scheduled',
          notes: request.notes || ''
        });

        await ladderMatch.save();
        console.log(`📅 Created LadderMatch record for calendar: ${challenger.firstName} ${challenger.lastName} vs ${defender.firstName} ${defender.lastName}`);
        
        // Store the created match ID for the response
        request.createdMatchId = ladderMatch._id;
      } else {
        console.log('⚠️ Could not find challenger or defender players to create LadderMatch record');
        if (!challenger) console.log('⚠️ Challenger not found:', request.challengerName, request.challengerEmail);
        if (!defender) console.log('⚠️ Defender not found:', request.defenderName, request.defenderEmail);
      }
    } catch (matchError) {
      console.error('❌ Error creating LadderMatch record:', matchError);
      // Don't fail the approval if match creation fails
    }

    // Send approval email
    try {
      const emailData = {
        challengerName: request.challengerName,
        challengerEmail: request.challengerEmail,
        defenderName: request.defenderName,
        matchType: request.matchType,
        gameType: request.gameType,
        raceLength: request.raceLength,
        preferredDate: request.preferredDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        preferredTime: request.preferredTime,
        location: request.location,
        notes: request.notes,
        app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };

      const emailResult = await sendMatchSchedulingApprovalEmail(emailData);
      if (emailResult.success) {
        console.log('📧 Approval email sent successfully');
      } else {
        console.error('📧 Failed to send approval email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('📧 Error sending approval email:', emailError);
    }

    // Send notification email to defender (if they have an email)
    if (request.defenderEmail) {
      try {
        const defenderEmailData = {
          challengerName: request.challengerName,
          challengerEmail: request.challengerEmail,
          defenderName: request.defenderName,
          defenderEmail: request.defenderEmail,
          matchType: request.matchType,
          gameType: request.gameType,
          raceLength: request.raceLength,
          preferredDate: request.preferredDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          preferredTime: request.preferredTime,
          location: request.location,
          notes: request.notes,
          app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
        };

        const defenderEmailResult = await sendMatchSchedulingDefenderNotificationEmail(defenderEmailData);
        if (defenderEmailResult.success) {
          console.log('📧 Defender notification email sent successfully');
        } else {
          console.error('📧 Failed to send defender notification email:', defenderEmailResult.error);
        }
      } catch (defenderEmailError) {
        console.error('📧 Error sending defender notification email:', defenderEmailError);
      }
    } else {
      console.log('📧 No defender email available, skipping defender notification');
    }

    // Create in-app notification
    try {
      const notificationResult = await createMatchSchedulingApprovalNotification(request);
      if (notificationResult.success) {
        console.log('📱 Approval notification created successfully');
      } else {
        console.error('📱 Failed to create approval notification:', notificationResult.error);
      }
    } catch (notificationError) {
      console.error('📱 Error creating approval notification:', notificationError);
    }

    // Create in-app notification for defender (if they have an email)
    if (request.defenderEmail) {
      try {
        const defenderNotificationResult = await createMatchSchedulingDefenderNotification(request);
        if (defenderNotificationResult.success) {
          console.log('📱 Defender notification created successfully');
        } else {
          console.error('📱 Failed to create defender notification:', defenderNotificationResult.error);
        }
      } catch (defenderNotificationError) {
        console.error('📱 Error creating defender notification:', defenderNotificationError);
      }
    } else {
      console.log('📱 No defender email available, skipping defender notification');
    }

    // Send match notification email to Don (Cueless partner)
    try {
      const partnerEmail = 'sacodo752@gmail.com';
      
      const partnerEmailData = {
        partnerEmail: partnerEmail,
        challengerName: request.challengerName,
        defenderName: request.defenderName,
        matchType: request.matchType,
        preferredDate: request.preferredDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        preferredTime: request.preferredTime,
        location: request.location,
        notes: request.notes
      };

      const partnerEmailResult = await sendMatchSchedulingPartnerNotificationEmail(partnerEmailData);
      if (partnerEmailResult.success) {
        console.log('📧 Match notification email sent to Don (Cueless partner) successfully');
      } else {
        console.error('📧 Failed to send match notification email to Don:', partnerEmailResult.error);
      }
    } catch (partnerEmailError) {
      console.error('📧 Error sending match notification email to Don:', partnerEmailError);
    }

    // Send test email to sslampro@gmail.com showing all emails that were sent
    try {
      const testEmailResult = await sendMatchSchedulingTestEmails(
        {
          challengerEmail: request.challengerEmail,
          defenderName: request.defenderName
        },
        {
          defenderEmail: request.defenderEmail,
          challengerName: request.challengerName
        },
        {
          challengerName: request.challengerName,
          defenderName: request.defenderName
        }
      );
      
      if (testEmailResult.success) {
        console.log('📧 Test email sent to sslampro@gmail.com successfully');
      } else {
        console.error('📧 Failed to send test email to sslampro@gmail.com:', testEmailResult.error);
      }
    } catch (testEmailError) {
      console.error('📧 Error sending test email to sslampro@gmail.com:', testEmailError);
    }

    res.json({
      success: true,
      message: 'Match scheduling request approved successfully',
      request,
      createdMatchId: request.createdMatchId || null
    });

  } catch (error) {
    console.error('Error approving match request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve match request'
    });
  }
};

// Reject a match scheduling request
export const rejectMatchRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewedBy, adminNotes } = req.body;

    const request = await MatchSchedulingRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Match scheduling request not found'
      });
    }

    request.status = 'rejected';
    request.reviewedBy = reviewedBy || 'Admin';
    request.reviewedAt = new Date();
    request.adminNotes = adminNotes || '';

    await request.save();

    console.log(`❌ Match scheduling request rejected: ${request.challengerName} vs ${request.defenderName}`);

    // Send rejection email
    try {
      const emailData = {
        challengerName: request.challengerName,
        challengerEmail: request.challengerEmail,
        defenderName: request.defenderName,
        matchType: request.matchType,
        preferredDate: request.preferredDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        preferredTime: request.preferredTime,
        location: request.location,
        adminNotes: request.adminNotes,
        app_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      };

      const emailResult = await sendMatchSchedulingRejectionEmail(emailData);
      if (emailResult.success) {
        console.log('📧 Rejection email sent successfully');
      } else {
        console.error('📧 Failed to send rejection email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('📧 Error sending rejection email:', emailError);
    }

    // Create in-app notification
    try {
      const notificationResult = await createMatchSchedulingRejectionNotification(request);
      if (notificationResult.success) {
        console.log('📱 Rejection notification created successfully');
      } else {
        console.error('📱 Failed to create rejection notification:', notificationResult.error);
      }
    } catch (notificationError) {
      console.error('📱 Error creating rejection notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Match scheduling request rejected',
      request
    });

  } catch (error) {
    console.error('Error rejecting match request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject match request'
    });
  }
};

// Test endpoint to send sample emails for review
export const sendTestEmails = async (req, res) => {
  try {
    const { testEmail } = req.body;
    const targetEmail = testEmail || 'sslampro@gmail.com';

    // Sample data for testing
    const testData = {
      challengerName: 'John Smith',
      challengerEmail: 'john@example.com',
      defenderName: 'Jane Doe',
      defenderEmail: 'jane@example.com',
      matchType: 'Challenge',
      preferredDate: new Date('2024-01-15'),
      preferredTime: '7:00 PM',
      location: 'Main Street Pool Hall',
      notes: 'This is a test match for email review purposes.',
      testEmail: targetEmail
    };

    // Send test emails
    const result = await sendTestMatchSchedulingEmails(testData);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Test emails sent successfully to ${targetEmail}`,
        emailsSent: result.emailsSent
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test emails',
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error sending test emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test emails',
      error: error.message
    });
  }
};

export default {
  lookupPlayerAndMatches,
  lookupPlayerByIdAndMatches,
  submitMatchSchedulingRequest,
  getPendingMatchRequests,
  getAllMatchRequests,
  approveMatchRequest,
  rejectMatchRequest,
  sendTestEmails
};
