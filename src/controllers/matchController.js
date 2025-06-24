const Proposal = require('../models/Proposal');
const Match = require('../models/Match');

exports.getAllMatches = async (req, res) => {
  const { player, division } = req.query;
  if (!player) return res.status(400).json({ error: 'Missing player' });

  const trimmedPlayer = player.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const playerRegex = new RegExp(`^${trimmedPlayer}$`, 'i');

  // FIX: Only return proposals that are confirmed and NOT completed (counterProposal.completed !== true)
  const filter = {
    status: "confirmed",
    "counterProposal.completed": { $ne: true },
    $or: [
      { senderName: playerRegex },
      { receiverName: playerRegex }
    ]
  };
  if (division) {
    filter.division = { $in: [division] };
  }

  try {
    const proposals = await Proposal.find(filter).lean();
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching all matches:', err);
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
    "counterProposal.completed": true,
    $or: [
      { senderName: playerRegex },
      { receiverName: playerRegex }
    ]
  };
  if (division) {
    filter.division = { $in: [division] };
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