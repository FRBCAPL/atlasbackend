import Match from '../models/Match.js';
import Proposal from '../models/Proposal.js';
import LadderMatch from '../models/LadderMatch.js';

// Get all matches for a division
export const getMatches = async (req, res) => {
  try {
    const { division, status } = req.query;
    const filter = {};
    
    if (division) filter.division = division;
    if (status) filter.status = status;
    
    const matches = await Match.find(filter)
      .populate('proposalId', 'senderName receiverName')
      .sort({ scheduledDate: -1 });
    
    res.json(matches);
  } catch (err) {
    console.error('Error fetching matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

// Get matches by status
export const getMatchesByStatus = async (req, res) => {
  try {
    const { division, status } = req.params;
    const matches = await Match.getByStatus(division, status);
    
    res.json(matches);
  } catch (err) {
    console.error('Error fetching matches by status:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

// Get player's matches
export const getPlayerMatches = async (req, res) => {
  try {
    const { playerId, division } = req.params;
    const matches = await Match.getPlayerMatches(playerId, division);
    
    res.json(matches);
  } catch (err) {
    console.error('Error fetching player matches:', err);
    res.status(500).json({ error: 'Failed to fetch player matches' });
  }
};

// Create a match from a proposal
export const createMatchFromProposal = async (req, res) => {
  try {
    const { proposalId } = req.body;
    
    // Find the proposal
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    // Check if match already exists for this proposal
    const existingMatch = await Match.findOne({ proposalId });
    if (existingMatch) {
      return res.status(400).json({ error: 'Match already exists for this proposal' });
    }
    
    // Create new match
    const match = new Match({
      proposalId: proposal._id,
      player1Id: proposal.senderName,
      player2Id: proposal.receiverName,
      division: proposal.divisions[0], // Assuming single division for now
      type: proposal.type || 'schedule',
      scheduledDate: proposal.date || new Date(),
      location: proposal.location || 'TBD'
    });
    
    await match.save();
    
    // Update proposal status to accepted
    proposal.status = 'confirmed';
    await proposal.save();
    
    res.status(201).json({ 
      success: true, 
      matchId: match._id,
      message: 'Match created successfully' 
    });
    
  } catch (err) {
    console.error('Error creating match from proposal:', err);
    res.status(500).json({ error: 'Failed to create match' });
  }
};

// Complete a match
export const completeMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { winner, score, notes } = req.body;
    
    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match is already completed' });
    }
    
    // Complete the match
    await match.complete(winner, score, notes);
    
    // Update the original proposal as well
    await Proposal.findByIdAndUpdate(match.proposalId, {
      completed: true,
      winner: winner,
      loser: match.player1Id === winner ? match.player2Id : match.player1Id
    });
    
    res.json({ 
      success: true, 
      message: 'Match completed successfully',
      match 
    });
    
  } catch (err) {
    console.error('Error completing match:', err);
    res.status(500).json({ error: 'Failed to complete match' });
  }
};

// Cancel a match
export const cancelMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed match' });
    }
    
    await match.cancel(reason);
    
    res.json({ 
      success: true, 
      message: 'Match cancelled successfully',
      match 
    });
    
  } catch (err) {
    console.error('Error cancelling match:', err);
    res.status(500).json({ error: 'Failed to cancel match' });
  }
};

// Get match statistics
export const getMatchStats = async (req, res) => {
  try {
    const { division } = req.params;
    
    const stats = await Match.aggregate([
      { $match: { division } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalMatches = await Match.countDocuments({ division });
    const completedMatches = await Match.countDocuments({ division, status: 'completed' });
    const scheduledMatches = await Match.countDocuments({ division, status: 'scheduled' });
    
    res.json({
      total: totalMatches,
      completed: completedMatches,
      scheduled: scheduledMatches,
      breakdown: stats
    });
    
  } catch (err) {
    console.error('Error fetching match stats:', err);
    res.status(500).json({ error: 'Failed to fetch match statistics' });
  }
};

// Get head-to-head record between two players
export const getHeadToHeadRecord = async (req, res) => {
  try {
    const { player1Id, player2Id } = req.params;
    
    if (!player1Id || !player2Id) {
      return res.status(400).json({ error: 'Both player IDs are required' });
    }
    
    // Query all match collections for head-to-head records
    const [generalMatches, ladderMatches, proposalMatches] = await Promise.all([
      // General matches
      Match.find({
        status: 'completed',
        $or: [
          { player1Id: player1Id, player2Id: player2Id },
          { player1Id: player2Id, player2Id: player1Id }
        ]
      }).sort({ completedDate: -1 }),
      
      // Ladder matches
      LadderMatch.find({
        status: 'completed',
        $or: [
          { player1: player1Id, player2: player2Id },
          { player1: player2Id, player2: player1Id }
        ]
      }).populate('player1 player2', 'firstName lastName email').sort({ completedDate: -1 }),
      
      // Proposal matches with results
      Proposal.find({
        'matchResult.completed': true,
        $or: [
          { sender: player1Id, receiver: player2Id },
          { sender: player2Id, receiver: player1Id }
        ]
      }).sort({ 'matchResult.completedAt': -1 })
    ]);
    
    // Combine all matches
    const allMatches = [
      ...generalMatches.map(match => ({
        id: match._id,
        date: match.completedDate,
        winner: match.winner,
        loser: match.loser,
        score: match.score,
        type: 'general'
      })),
      ...ladderMatches.map(match => ({
        id: match._id,
        date: match.completedDate,
        winner: match.winner?.email || match.winner,
        loser: match.loser?.email || match.loser,
        score: match.score,
        type: 'ladder'
      })),
      ...proposalMatches.map(proposal => ({
        id: proposal._id,
        date: proposal.matchResult.completedAt,
        winner: proposal.matchResult.winner,
        loser: proposal.matchResult.loser,
        score: proposal.matchResult.score,
        type: 'proposal'
      }))
    ];
    
    // Sort by date (most recent first)
    allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Calculate head-to-head record
    let player1Wins = 0;
    let player2Wins = 0;
    let lastMatch = null;
    
    allMatches.forEach(match => {
      if (match.winner === player1Id || match.winner === player1Id) {
        player1Wins++;
      } else if (match.winner === player2Id || match.winner === player2Id) {
        player2Wins++;
      }
      
      // Track the most recent match
      if (!lastMatch || new Date(match.date) > new Date(lastMatch.date)) {
        lastMatch = match;
      }
    });
    
    const totalMatches = player1Wins + player2Wins;
    
    res.json({
      player1Id,
      player2Id,
      record: {
        player1Wins,
        player2Wins,
        totalMatches,
        player1WinRate: totalMatches > 0 ? Math.round((player1Wins / totalMatches) * 100) : 0,
        player2WinRate: totalMatches > 0 ? Math.round((player2Wins / totalMatches) * 100) : 0
      },
      lastMatch: lastMatch ? {
        date: lastMatch.date,
        winner: lastMatch.winner,
        loser: lastMatch.loser,
        score: lastMatch.score,
        type: lastMatch.type
      } : null,
      allMatches: allMatches.slice(0, 10) // Return last 10 matches for context
    });
    
  } catch (err) {
    console.error('Error fetching head-to-head record:', err);
    res.status(500).json({ error: 'Failed to fetch head-to-head record' });
  }
}; 