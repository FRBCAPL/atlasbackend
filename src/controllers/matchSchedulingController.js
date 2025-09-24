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

    // Find the player by name (case insensitive)
    const player = await LadderPlayer.findOne({
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

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found. Please check your name and try again.'
      });
    }

    // Get all ladders to find available matches
    const ladders = await Ladder.find({ isActive: true });
    const availableMatches = [];

    for (const ladder of ladders) {
      // Get all players in this ladder, sorted by position
      const ladderPlayers = await LadderPlayer.find({ 
        ladderId: ladder._id, 
        isActive: true 
      }).sort({ position: 1 });

      // Find current player's position in this ladder
      const currentPlayerInLadder = ladderPlayers.find(p => 
        p._id.toString() === player._id.toString()
      );

      if (!currentPlayerInLadder) continue;

      const currentPosition = currentPlayerInLadder.position;

      // Find valid challenges (players above current position)
      // Ladder rules: can challenge up to 4 positions above
      const maxChallengePosition = Math.max(1, currentPosition - 4);
      
      const validChallenges = ladderPlayers.filter(p => 
        p.position >= maxChallengePosition && 
        p.position < currentPosition &&
        p._id.toString() !== player._id.toString()
      );

      // Find valid smackdown targets (players below current position)
      // SmackDown rules: can challenge up to 5 positions below
      const maxSmackDownPosition = Math.min(ladderPlayers.length, currentPosition + 5);
      
      const validSmackDowns = ladderPlayers.filter(p => 
        p.position > currentPosition && 
        p.position <= maxSmackDownPosition &&
        p._id.toString() !== player._id.toString()
      );

      // Check for SmackBack eligibility (can challenge #1 if just won a SmackDown as defender)
      let validSmackBacks = [];
      if (currentPosition > 1) {
        // Check if player recently won a SmackDown as defender
        const recentSmackDownWin = await checkRecentSmackDownWin(player._id, ladder._id);
        if (recentSmackDownWin) {
          const firstPlacePlayer = ladderPlayers.find(p => p.position === 1);
          if (firstPlacePlayer) {
            validSmackBacks.push(firstPlacePlayer);
          }
        }
      }

      // Add standard challenges to available matches
      validChallenges.forEach(challenge => {
        availableMatches.push({
          matchType: 'challenge',
          defenderName: `${challenge.firstName} ${challenge.lastName}`,
          defenderEmail: challenge.email || '',
          defenderPhone: challenge.phone || '',
          defenderPosition: challenge.position,
          ladderName: ladder.name,
          reason: `⚔️ Standard Challenge - Can challenge up to 4 positions above (you're #${currentPosition})`,
          icon: '⚔️',
          color: '#2196F3'
        });
      });

      // Add smackdown matches to available matches
      validSmackDowns.forEach(smackdown => {
        availableMatches.push({
          matchType: 'smackdown',
          defenderName: `${smackdown.firstName} ${smackdown.lastName}`,
          defenderEmail: smackdown.email || '',
          defenderPhone: smackdown.phone || '',
          defenderPosition: smackdown.position,
          ladderName: ladder.name,
          reason: `💥 SmackDown - Can challenge up to 5 positions below (you're #${currentPosition})`,
          icon: '💥',
          color: '#f59e0b'
        });
      });

      // Add smackback matches to available matches
      validSmackBacks.forEach(smackback => {
        availableMatches.push({
          matchType: 'smackback',
          defenderName: `${smackback.firstName} ${smackback.lastName}`,
          defenderEmail: smackback.email || '',
          defenderPhone: smackback.phone || '',
          defenderPosition: smackback.position,
          ladderName: ladder.name,
          reason: `🚀 SmackBack - Challenge #1 after winning a SmackDown as defender`,
          icon: '🚀',
          color: '#10b981'
        });
      });
    }

    console.log(`✅ Found ${availableMatches.length} available matches for ${player.firstName} ${player.lastName}`);

    res.json({
      success: true,
      player: {
        name: `${player.firstName} ${player.lastName}`,
        email: player.email || '',
        phone: player.phone || '',
        position: player.position,
        ladderName: player.ladderId?.name || 'Unknown',
        fargoRate: player.fargoRate || 0
      },
      availableMatches
    });

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
      matchType,
      status
    } = req.body;

    // Validate required fields
    if (!challengerName || !challengerEmail || !defenderName || !defenderEmail || !preferredDate || !preferredTime || !location) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Create new match scheduling request with proper timezone handling
    // Combine date and time, then convert to Mountain Time (UTC-6)
    const dateTimeString = `${preferredDate}T${preferredTime}:00-06:00`;
    const scheduledDateTime = new Date(dateTimeString);
    
    const matchRequest = new MatchSchedulingRequest({
      challengerName,
      challengerEmail,
      challengerPhone: challengerPhone || '',
      defenderName,
      defenderEmail,
      defenderPhone: defenderPhone || '',
      preferredDate: scheduledDateTime,
      preferredTime,
      location,
      notes: notes || '',
      matchType: matchType || 'challenge',
      status: status || 'pending_approval'
    });

    await matchRequest.save();

    console.log(`✅ Match scheduling request submitted: ${challengerName} vs ${defenderName} on ${preferredDate}`);

    res.json({
      success: true,
      message: 'Match scheduling request submitted successfully. Admin approval required.',
      request: {
        _id: matchRequest._id,
        challengerName: matchRequest.challengerName,
        defenderName: matchRequest.defenderName,
        preferredDate: matchRequest.preferredDate,
        status: matchRequest.status
      }
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
  submitMatchSchedulingRequest,
  getPendingMatchRequests,
  getAllMatchRequests,
  approveMatchRequest,
  rejectMatchRequest
};
