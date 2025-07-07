const Proposal = require('../models/Proposal');
const CanceledProposal = require('../models/CanceledProposal');
const challengeValidationService = require('../services/challengeValidationService');

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
    
    // Challenge phase validation
    if (data.phase === 'challenge') {
      console.log('Validating challenge phase proposal...');
      
      // Set challenge-specific fields
      data.challengeType = 'challenger';
      data.challengeWeek = challengeValidationService.getCurrentChallengeWeek();
      data.isRematch = data.isRematch || false;
      data.originalChallengeId = data.originalChallengeId || null;
      
      // Validate the challenge
      const validation = await challengeValidationService.validateChallenge(
        data.senderName,
        data.receiverName,
        data.divisions[0], // Assuming single division for now
        data.isRematch,
        data.originalChallengeId
      );
      
      // Store validation results
      data.challengeValidation = {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      };
      
      // If validation failed, return error
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Challenge validation failed',
          validation: validation
        });
      }
      
      // If there are warnings, log them but allow the proposal
      if (validation.warnings.length > 0) {
        console.log('Challenge warnings:', validation.warnings);
      }
      
      console.log('Challenge validation passed');
    }
    
    const proposal = new Proposal(data);
    await proposal.save();
    
    // Update challenge statistics if this is a challenge phase proposal
    if (data.phase === 'challenge') {
      await challengeValidationService.updateStatsOnProposalCreated(proposal);
    }
    
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
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      console.log('[updateStatus] Proposal not found for id:', id);
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    // Challenge phase validation for defense acceptance
    if (proposal.phase === 'challenge' && status === 'confirmed') {
      console.log('Validating challenge phase defense acceptance...');
      
      const validation = await challengeValidationService.validateDefenseAcceptance(
        proposal.receiverName,
        proposal.senderName,
        proposal.divisions[0]
      );
      
      // Store validation results
      proposal.challengeValidation = {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      };
      
      // If validation failed, return error
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Defense validation failed',
          validation: validation
        });
      }
      
      // If there are warnings, log them but allow the acceptance
      if (validation.warnings.length > 0) {
        console.log('Defense warnings:', validation.warnings);
      }
      
      console.log('Defense validation passed');
    }
    
    proposal.status = status;
    proposal.note = note;
    if (status === "confirmed") {
      proposal.completed = false;
      console.log('[updateStatus] Setting completed=false for proposal:', proposal._id);
    }
    await proposal.save();
    console.log('[updateStatus] Proposal after save:', proposal);
    res.json({ success: true });
  } catch (err) {
    console.error('[updateStatus] Error updating proposal:', err);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
};

exports.counter = async (req, res) => {
  try {
    const { id } = req.params;
    const counterData = req.body;
    await Proposal.findByIdAndUpdate(id, {
      counterProposal: counterData,
      status: 'countered',
      isCounter: true,
      counteredBy: counterData.senderName || counterData.senderEmail || '',
      counteredAt: new Date()
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error countering proposal:', err);
    res.status(500).json({ error: 'Failed to counter proposal' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Only allow updating certain fields for security
    const allowedUpdates = {
      date: updateData.date,
      time: updateData.time,
      location: updateData.location,
      message: updateData.message,
      gameType: updateData.gameType,
      raceLength: updateData.raceLength,
      phase: updateData.phase,
      divisions: updateData.divisions
    };
    
    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );
    
    const updatedProposal = await Proposal.findByIdAndUpdate(
      id, 
      allowedUpdates,
      { new: true }
    );
    
    if (!updatedProposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    res.json({ success: true, proposal: updatedProposal });
  } catch (err) {
    console.error('Error updating proposal:', err);
    res.status(500).json({ error: 'Failed to update proposal' });
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

exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;
    // Find the proposal
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending proposals can be canceled' });
    }
    
    // Update challenge statistics if this is a challenge phase proposal
    if (proposal.phase === 'challenge') {
      await challengeValidationService.updateStatsOnProposalCanceled(proposal);
    }
    
    // Set status to canceled
    proposal.status = 'canceled';
    await proposal.save();
    // Copy to canceled proposals collection
    const canceled = new CanceledProposal({ ...proposal.toObject(), canceledAt: new Date() });
    await canceled.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Error canceling proposal:', err);
    res.status(500).json({ error: 'Failed to cancel proposal' });
  }
}; 