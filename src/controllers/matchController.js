const Proposal = require('../models/Proposal');
const Match = require('../models/Match');
const fs = require('fs');
const path = require('path');

exports.getAllMatches = async (req, res) => {
  const { player, division, phase } = req.query;
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
    const scheduled = await Proposal.find(scheduledFilter).lean();
    const completed = await Proposal.find(completedFilter).lean();
    
    // Return all matches with proper completed field
    const allMatches = [
      ...scheduled.map(p => ({ ...p, completed: false })),
      ...completed.map(p => ({ ...p, completed: true }))
    ];
    
    res.json(allMatches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

exports.getCompletedMatches = async (req, res) => {
  const { player, division } = req.query;
  if (!player) return res.status(400).json({ error: 'Missing player' });

  const trimmedPlayer = player.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  const playerRegex = new RegExp(`^${trimmedPlayer}$`, 'i');

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

  try {
    const proposals = await Proposal.find(filter).lean();
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completed matches' });
  }
};

exports.create = async (req, res) => {
  try {
    const match = new Match(req.body);
    await match.save();
    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save match' });
  }
};

exports.markMatchCompleted = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing proposal ID' });
  try {
    // Fetch the proposal first
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    // Set top-level completed to true when marking as completed
    proposal.completed = true;
    await proposal.save();
    
    res.json({ success: true, proposal });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark match as completed' });
  }
}; 