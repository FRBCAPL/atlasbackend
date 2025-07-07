const Proposal = require('../models/Proposal');
const Match = require('../models/Match');
const fs = require('fs');
const path = require('path');

exports.getAllMatches = async (req, res) => {
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

exports.getCompletedMatches = async (req, res) => {
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

exports.create = async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    res.json({ success: true, match });
  } catch (err) {
    console.error('Error saving match:', err);
    res.status(500).json({ error: 'Failed to save match' });
  }
};

exports.markMatchCompleted = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing proposal ID' });
  try {
    console.log('[markMatchCompleted] Marking proposal as completed, id:', id);
    // Fetch the proposal first
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      console.log('[markMatchCompleted] Proposal not found for id:', id);
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    console.log('[markMatchCompleted] Found proposal:', proposal._id, 'current completed:', proposal.completed);
    
    // Set top-level completed to true when marking as completed
    proposal.completed = true;
    await proposal.save();
    
    console.log('[markMatchCompleted] Proposal marked as completed. New completed value:', proposal.completed);
    res.json({ success: true, proposal });
  } catch (err) {
    console.error('[markMatchCompleted] Error marking match as completed:', err);
    res.status(500).json({ error: 'Failed to mark match as completed' });
  }
}; 