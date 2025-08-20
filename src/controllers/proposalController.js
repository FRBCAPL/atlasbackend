import Proposal from '../models/Proposal.js';
import CanceledProposal from '../models/CanceledProposal.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import challengeValidationService from '../services/challengeValidationService.js';
import { addMatchToCalendars } from '../services/calendarService.js';

export const getByReceiver = async (req, res) => {
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

export const getBySender = async (req, res) => {
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

export const create = async (req, res) => {
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

export const updateStatus = async (req, res) => {
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
      
      // Create a match from the confirmed proposal
      try {
        // Check if match already exists for this proposal
        const existingMatch = await Match.findOne({ proposalId: proposal._id });
        
        if (!existingMatch) {
          const match = new Match({
            proposalId: proposal._id,
            player1Id: proposal.senderName,
            player2Id: proposal.receiverName,
            division: proposal.divisions[0], // Assuming single division
            type: proposal.type || (proposal.phase === 'schedule' ? 'schedule' : 'challenge'),
            status: 'scheduled',
            scheduledDate: proposal.date || new Date(),
            location: proposal.location || 'TBD',
            notes: proposal.notes || ''
          });
          
          await match.save();
          console.log('[updateStatus] Created match from proposal:', match._id);
          
          // Add match to calendars (app calendar always, Google Calendar optional)
          try {
            // Check user preferences for Google Calendar integration
            const senderUser = await User.findOne({ $or: [{ id: proposal.senderName }, { email: proposal.senderEmail }] });
            const receiverUser = await User.findOne({ $or: [{ id: proposal.receiverName }, { email: proposal.receiverEmail }] });
            
            // Use preferences if available, otherwise default to false
            const senderPrefersGoogleCalendar = senderUser?.preferences?.googleCalendarIntegration ?? false;
            const receiverPrefersGoogleCalendar = receiverUser?.preferences?.googleCalendarIntegration ?? false;
            
            // Add to calendars - app calendar always, Google Calendar based on user preferences
            await addMatchToCalendars(proposal, senderPrefersGoogleCalendar || receiverPrefersGoogleCalendar);
          } catch (calendarError) {
            console.error('[updateStatus] Error adding match to calendars:', calendarError);
            // Don't fail the proposal update if calendar integration fails
          }
        } else {
          console.log('[updateStatus] Match already exists for proposal:', proposal._id);
        }
      } catch (matchError) {
        console.error('[updateStatus] Error creating match from proposal:', matchError);
        // Don't fail the proposal update if match creation fails
      }
    }
    await proposal.save();
    console.log('[updateStatus] Proposal after save:', proposal);
    res.json({ success: true });
  } catch (err) {
    console.error('[updateStatus] Error updating proposal:', err);
    res.status(500).json({ error: 'Failed to update proposal' });
  }
};

export const counter = async (req, res) => {
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

export const update = async (req, res) => {
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

export const debugList = async (req, res) => {
  try {
    const proposals = await Proposal.find({}, { _id: 1, senderName: 1, receiverName: 1 });
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
};

export const cancel = async (req, res) => {
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

// --- Admin utilities ---
export const adminList = async (req, res) => {
  try {
    const { division, status, completed, phase, limit } = req.query;
    const filter = {};
    if (division) {
      filter.divisions = { $elemMatch: { $regex: `^${division}$`, $options: 'i' } };
    }
    if (status) {
      filter.status = status;
    }
    if (typeof completed !== 'undefined') {
      if (completed === 'true' || completed === true) filter.completed = true;
      if (completed === 'false' || completed === false) filter.completed = false;
    }
    if (phase) {
      filter.phase = phase;
    }

    const max = Math.min(parseInt(limit || '500', 10) || 500, 2000);
    const results = await Proposal.find(filter)
      .sort({ createdAt: -1 })
      .limit(max)
      .lean();
    res.json({ success: true, count: results.length, proposals: results });
  } catch (err) {
    console.error('Error in adminList:', err);
    res.status(500).json({ error: 'Failed to list proposals' });
  }
};

export const adminSetCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, winner } = req.body;
    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    const isCompleted = completed === true || completed === 'true';
    proposal.completed = isCompleted;
    if (isCompleted) {
      if (typeof winner !== 'undefined') {
        proposal.winner = winner || null;
      }
      proposal.winnerChangedAt = new Date();
    } else {
      // Clearing completion-related fields when un-completing
      proposal.winner = null;
      proposal.validated = false;
      proposal.validationData = null;
      proposal.rejectionData = null;
      proposal.winnerChangedAt = new Date();
    }

    await proposal.save();
    res.json({ success: true, proposal });
  } catch (err) {
    console.error('Error in adminSetCompleted:', err);
    res.status(500).json({ error: 'Failed to update completion status' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Proposal.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting proposal:', err);
    res.status(500).json({ error: 'Failed to delete proposal' });
  }
};