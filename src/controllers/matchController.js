import Match from '../models/Match.js';
import Proposal from '../models/Proposal.js';

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