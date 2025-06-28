const Proposal = require('../models/Proposal');
const Match = require('../models/Match');
const fs = require('fs');
const path = require('path');

exports.getAllMatches = async (req, res) => {
  const { player, division } = req.query;
  console.log('getAllMatches called with:', { player, division }); // Debug log
  if (!player) return res.status(400).json({ error: 'Missing player' });

  // Add more detailed logging
  console.log('Raw player name:', player);
  console.log('Player name type:', typeof player);
  console.log('Player name length:', player.length);

  const trimmedPlayer = player.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  console.log('Trimmed and escaped player name:', trimmedPlayer);
  
  const playerRegex = new RegExp(`^${trimmedPlayer}$`, 'i');
  console.log('Created regex:', playerRegex);

  const filter = {
    status: "confirmed",
    "counterProposal.completed": { $ne: true },
    $or: [
      { senderName: playerRegex },
      { receiverName: playerRegex }
    ]
  };
  if (division) {
    filter.divisions = { $in: [division] };
  }

  console.log('MongoDB filter:', JSON.stringify(filter, null, 2)); // Log the filter

  try {
    const proposals = await Proposal.find(filter).lean();
    console.log('Proposals found:', proposals); // Log the proposals found
    const merged = proposals.map(p => ({ ...p, type: 'proposal' }));
    res.json(merged);
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
    "counterProposal.completed": true,
    $or: [
      { senderName: playerRegex },
      { receiverName: playerRegex }
    ]
  };
  if (division) {
    // Use $in to match division in divisions array
    filter.divisions = { $in: [division] };
  }

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
    console.log('Marking proposal as completed, id:', id);
    // Fetch the proposal first
    const proposal = await Proposal.findById(id);
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (!proposal.counterProposal) {
      proposal.counterProposal = { completed: true };
    } else {
      proposal.counterProposal.completed = true;
    }
    await proposal.save();
    console.log('Update result:', proposal);
    res.json({ success: true, proposal });
  } catch (err) {
    console.error('Error marking match as completed:', err);
    res.status(500).json({ error: 'Failed to mark match as completed' });
  }
}; 