const Proposal = require('../models/Proposal');
const Match = require('../models/Match');
const fs = require('fs');
const path = require('path');

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
    // 1. Get confirmed proposals (as before)
    const proposals = await Proposal.find(filter).lean();

    // 2. Load static schedule for the division
    let scheduledMatches = [];
    if (division) {
      const safeDivision = division.replace(/[^A-Za-z0-9]/g, '_');
      const schedulePath = path.join(__dirname, '../../public', `schedule_${safeDivision}.json`);
      if (fs.existsSync(schedulePath)) {
        const raw = fs.readFileSync(schedulePath, 'utf8');
        const allScheduled = JSON.parse(raw);
        // Only matches for this player
        scheduledMatches = allScheduled.filter(m =>
          m.division === division &&
          ((m.player1 && m.player1.trim().toLowerCase() === player.trim().toLowerCase()) ||
           (m.player2 && m.player2.trim().toLowerCase() === player.trim().toLowerCase()))
        );
      }
    }

    // 3. Remove scheduled matches that already have a confirmed or completed proposal
    //    (for this player/opponent pair, any direction)
    const allProposals = await Proposal.find({
      division,
      $or: [
        { senderName: playerRegex },
        { receiverName: playerRegex }
      ]
    }).lean();
    const completedPairs = new Set();
    allProposals.forEach(p => {
      if (p.status === 'confirmed' && p.counterProposal && p.counterProposal.completed === true) {
        // completed
        const key1 = `${p.senderName?.trim().toLowerCase()}|${p.receiverName?.trim().toLowerCase()}`;
        const key2 = `${p.receiverName?.trim().toLowerCase()}|${p.senderName?.trim().toLowerCase()}`;
        completedPairs.add(key1);
        completedPairs.add(key2);
      }
      if (p.status === 'confirmed' && p.counterProposal && p.counterProposal.completed !== true) {
        // confirmed but not completed
        const key1 = `${p.senderName?.trim().toLowerCase()}|${p.receiverName?.trim().toLowerCase()}`;
        const key2 = `${p.receiverName?.trim().toLowerCase()}|${p.senderName?.trim().toLowerCase()}`;
        completedPairs.add(key1);
        completedPairs.add(key2);
      }
    });
    // Only keep scheduled matches that do NOT have a proposal (confirmed or completed)
    const filteredScheduled = scheduledMatches.filter(m => {
      const p1 = m.player1?.trim().toLowerCase();
      const p2 = m.player2?.trim().toLowerCase();
      const key1 = `${p1}|${p2}`;
      const key2 = `${p2}|${p1}`;
      return !completedPairs.has(key1) && !completedPairs.has(key2);
    });

    // 4. Merge: proposals (confirmed, not completed) + filtered scheduled matches
    //    For consistency, add a type field
    const merged = [
      ...proposals.map(p => ({ ...p, type: 'proposal' })),
      ...filteredScheduled.map(m => ({ ...m, type: 'scheduled' }))
    ];

    res.json(merged);
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