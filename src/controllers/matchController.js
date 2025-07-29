import Proposal from '../models/Proposal.js';
import Match from '../models/Match.js';
import fs from 'fs';
import path from 'path';

export const getAllMatches = async (req, res) => {
  const { player, division, phase } = req.query;
  console.log('getAllMatches called with:', { player, division, phase }); // Debug log
  if (!player) return res.status(400).json({ error: 'Missing player' });

  const trimmedPlayer = player.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const playerRegex = new RegExp(`^${trimmedPlayer}$`, 'i');

  // --- New Filter logic using top-level 'completed' field ---
  // Scheduled: status confirmed, completed false
  // Completed: status confirmed, completed true
  const baseFilter = {
    status: 'confirmed',
    $or: [
      { senderName: playerRegex },
      { receiverName: playerRegex }
    ]
  };
  if (division) {
    // Use case-insensitive regex for division matching
    baseFilter.divisions = { $elemMatch: { $regex: `^${division}$`, $options: "i" } };
  }
  if (phase) {
    baseFilter.phase = phase;
  }

  // Scheduled (not completed) - handle both false and undefined
  const scheduledFilter = {
    $and: [
      {
        $or: [
          { senderName: playerRegex },
          { receiverName: playerRegex }
        ]
      },
      {
        $or: [
          { completed: false },
          { completed: { $exists: false } }
        ]
      }
    ]
  };
  if (division) {
    scheduledFilter.divisions = { $elemMatch: { $regex: `^${division}$`, $options: "i" } };
  }
  if (phase) {
    scheduledFilter.phase = phase;
  }
  // Completed
  const completedFilter = {
    ...baseFilter,
    completed: true
  };
  if (phase) {
    completedFilter.phase = phase;
  }

  try {
    console.log('Backend filter for scheduled:', JSON.stringify(scheduledFilter, null, 2));
    console.log('Backend filter for completed:', JSON.stringify(completedFilter, null, 2));
    
    const scheduled = await Proposal.find(scheduledFilter).lean();
    const completed = await Proposal.find(completedFilter).lean();
    
    console.log('Backend found scheduled matches:', scheduled.length);
    console.log('Backend found completed matches:', completed.length);
    
    // Return all matches with proper completed field
    const allMatches = [
      ...scheduled.map(p => ({ ...p, completed: false })),
      ...completed.map(p => ({ ...p, completed: true }))
    ];
    
    console.log('Backend returning total matches:', allMatches.length);
    res.json(allMatches);
  } catch (err) {
    console.error('Error fetching all matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

export const getCompletedMatches = async (req, res) => {
  const { player, division } = req.query;
  console.log('getCompletedMatches called with:', { player, division }); // Debug log
  if (!player) return res.status(400).json({ error: 'Missing player' });

  // Add more detailed logging
  console.log('Raw player name (completed):', player);
  console.log('Player name type (completed):', typeof player);
  console.log('Player name length (completed):', player.length);

  const trimmedPlayer = player.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  console.log('Trimmed and escaped player name (completed):', trimmedPlayer);
  
  const playerRegex = new RegExp(`^${trimmedPlayer}$`, 'i');
  console.log('Created regex (completed):', playerRegex);

  // Only return proposals that are confirmed and completed
  const filter = {
    status: "confirmed",
    completed: true,
    $or: [
      { senderName: playerRegex },
      { receiverName: playerRegex }
    ]
  };
  if (division) {
    // Use case-insensitive regex for division matching
    filter.divisions = { $elemMatch: { $regex: `^${division}$`, $options: "i" } };
  }

  // Log the filter in a way that shows the regex properly
  console.log('MongoDB filter (completed, stringified):', JSON.stringify(filter, (key, value) => {
    if (value instanceof RegExp) {
      return value.toString();
    }
    return value;
  }, 2));

  try {
    const proposals = await Proposal.find(filter).lean();
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching completed matches:', err);
    res.status(500).json({ error: 'Failed to fetch completed matches' });
  }
};

export const create = async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    res.json({ success: true, match });
  } catch (err) {
    console.error('Error saving match:', err);
    res.status(500).json({ error: 'Failed to save match' });
  }
};

export const markMatchCompleted = async (req, res) => {
  const { id } = req.params;
  const { winner, markedByName, markedByEmail } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing proposal ID' });
  try {
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    proposal.completed = true;
    if (typeof winner !== 'undefined') {
      proposal.winner = winner;
    }
    proposal.winnerChangedByName = markedByName || null;
    proposal.winnerChangedByEmail = markedByEmail || null;
    proposal.winnerChangedAt = new Date();
    await proposal.save();
    res.json({ success: true, proposal });
  } catch (err) {
    console.error("Error in markMatchCompleted:", err);
    res.status(500).json({ error: 'Failed to mark match as completed' });
  }
};

// New match validation controller
export const validateMatch = async (req, res) => {
  const { id } = req.params;
  const { 
    actualDate, 
    actualTime, 
    actualLocation, 
    winner, 
    score, 
    notes, 
    witnesses,
    validatedBy 
  } = req.body;

  if (!id) return res.status(400).json({ error: 'Missing proposal ID' });
  if (!actualDate || !winner || !score) {
    return res.status(400).json({ error: 'Missing required fields: actualDate, winner, score' });
  }

  try {
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Add validation data
    proposal.validationData = {
      actualDate: new Date(actualDate),
      actualTime: actualTime || null,
      actualLocation: actualLocation || proposal.location,
      winner,
      score,
      notes: notes || null,
      witnesses: witnesses || null,
      validatedBy: validatedBy || null,
      validatedAt: new Date()
    };

    // Mark as validated
    proposal.validated = true;
    proposal.completed = true;
    proposal.winner = winner;

    await proposal.save();
    res.json({ success: true, proposal });
  } catch (err) {
    console.error("Error in validateMatch:", err);
    res.status(500).json({ error: 'Failed to validate match' });
  }
};

// New match rejection controller
export const rejectMatch = async (req, res) => {
  const { id } = req.params;
  const { rejectedBy, reason } = req.body;

  if (!id) return res.status(400).json({ error: 'Missing proposal ID' });

  try {
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Reset completion status
    proposal.completed = false;
    proposal.winner = null;
    proposal.winnerChangedByName = null;
    proposal.winnerChangedByEmail = null;
    proposal.winnerChangedAt = null;

    // Add rejection data
    proposal.rejectionData = {
      rejectedBy: rejectedBy || null,
      reason: reason || 'Match validation failed',
      rejectedAt: new Date()
    };

    // Clear validation data if it exists
    if (proposal.validationData) {
      proposal.validationData = null;
    }
    proposal.validated = false;

    await proposal.save();
    res.json({ success: true, proposal });
  } catch (err) {
    console.error("Error in rejectMatch:", err);
    res.status(500).json({ error: 'Failed to reject match' });
  }
};

// New match statistics controller for standings impact
export const getMatchStats = async (req, res) => {
  const { player, division } = req.params;
  
  if (!player || !division) {
    return res.status(400).json({ error: 'Missing player or division' });
  }

  try {
    const playerRegex = new RegExp(`^${player.trim()}$`, 'i');
    
    // Get all matches for the player in the division
    const allMatches = await Proposal.find({
      divisions: { $elemMatch: { $regex: `^${division}$`, $options: "i" } },
      $or: [
        { senderName: playerRegex },
        { receiverName: playerRegex }
      ]
    }).lean();

    // Calculate statistics
    const stats = {
      totalMatches: allMatches.length,
      completedMatches: allMatches.filter(m => m.completed).length,
      validatedMatches: allMatches.filter(m => m.validated).length,
      wins: allMatches.filter(m => m.completed && m.winner === player).length,
      losses: allMatches.filter(m => m.completed && m.winner && m.winner !== player).length,
      pendingValidation: allMatches.filter(m => m.completed && !m.validated).length,
      phase1Matches: allMatches.filter(m => m.phase === 1 || m.phase === 'scheduled').length,
      phase2Matches: allMatches.filter(m => m.phase === 2 || m.phase === 'challenge').length
    };

    // Calculate potential standings impact
    const remainingMatches = stats.totalMatches - stats.completedMatches;
    const potentialPoints = remainingMatches * 2; // Assuming 2 points per match
    
    stats.remainingMatches = remainingMatches;
    stats.potentialPoints = potentialPoints;
    stats.completionPercentage = stats.totalMatches > 0 ? Math.round((stats.completedMatches / stats.totalMatches) * 100) : 0;

    res.json({ success: true, stats });
  } catch (err) {
    console.error("Error in getMatchStats:", err);
    res.status(500).json({ error: 'Failed to get match statistics' });
  }
}; 