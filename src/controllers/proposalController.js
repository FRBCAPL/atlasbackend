const Proposal = require('../models/Proposal');

exports.getByReceiver = async (req, res) => {
  try {
    const { receiverName, division } = req.query;
    const filter = { receiverName };
    if (division) filter.divisions = { $in: [division] };
    
    const proposals = await Proposal.find(filter).lean();
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching proposals by receiver:', err);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
};

exports.getBySender = async (req, res) => {
  try {
    const { senderName, division } = req.query;
    const filter = { senderName };
    if (division) filter.divisions = { $in: [division] };
    
    const proposals = await Proposal.find(filter).lean();
    res.json(proposals);
  } catch (err) {
    console.error('Error fetching proposals by sender:', err);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
};

exports.create = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.counterProposal) data.counterProposal = {};
    data.counterProposal.completed = false;
    const proposal = new Proposal(data);
    await proposal.save();
    res.status(201).json({ success: true, proposalId: proposal._id });
  } catch (err) {
    console.error('Error creating proposal:', err);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    
    await Proposal.findByIdAndUpdate(id, { status, note });
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating proposal status:', err);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
};

exports.counter = async (req, res) => {
  try {
    const { id } = req.params;
    const counterData = req.body;
    
    await Proposal.findByIdAndUpdate(id, { 
      counterProposal: counterData,
      status: 'countered'
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error countering proposal:', err);
    res.status(500).json({ error: 'Failed to counter proposal' });
  }
};

exports.debugList = async (req, res) => {
  try {
    const proposals = await Proposal.find({}, { _id: 1, senderName: 1, receiverName: 1 });
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
}; 