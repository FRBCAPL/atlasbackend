import mongoose from 'mongoose';

// Create a schema for match scheduling requests
const matchSchedulingSchema = new mongoose.Schema({
  challengerName: {
    type: String,
    required: true
  },
  challengerEmail: {
    type: String,
    required: true
  },
  challengerPhone: {
    type: String,
    default: ''
  },
  defenderName: {
    type: String,
    required: true
  },
  defenderEmail: {
    type: String,
    required: true
  },
  defenderPhone: {
    type: String,
    default: ''
  },
  preferredDate: {
    type: Date,
    required: true
  },
  preferredTime: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  matchType: {
    type: String,
    enum: ['challenge', 'smackdown', 'smackback'],
    default: 'challenge'
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'completed'],
    default: 'pending_approval'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  adminNotes: {
    type: String,
    default: ''
  }
});

// Create the model
const MatchSchedulingRequest = mongoose.model('MatchSchedulingRequest', matchSchedulingSchema);

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
    console.log(`🔍 Looking up player: "${playerName}"`);
    
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
    
    console.log(`🔍 Found ${players.length} players matching "${playerName}":`);
    players.forEach(p => {
      console.log(`  - ${p.firstName} ${p.lastName}: ladderId=${p.ladderId?._id}, ladderName=${p.ladderId?.name}, fargo=${p.fargoRate}, position=${p.position}`);
    });

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

    res.json({
      success: true,
      message: 'Match scheduling request approved successfully',
      request
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

export default {
  lookupPlayerAndMatches,
  lookupPlayerByIdAndMatches,
  submitMatchSchedulingRequest,
  getPendingMatchRequests,
  getAllMatchRequests,
  approveMatchRequest,
  rejectMatchRequest
};
