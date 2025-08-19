import challengeValidationService from '../services/challengeValidationService.js';
import ChallengeStats from '../models/ChallengeStats.js';
import Proposal from '../models/Proposal.js';

/**
 * Validate a challenge proposal
 */
export const validateChallenge = async (req, res) => {
  try {
    const { senderName, receiverName, division, isRematch, originalChallengeId } = req.body;
    
    if (!senderName || !receiverName || !division) {
      return res.status(400).json({ 
        error: 'Missing required fields: senderName, receiverName, division' 
      });
    }
    
    const validation = await challengeValidationService.validateChallenge(
      senderName, 
      receiverName, 
      division, 
      isRematch || false, 
      originalChallengeId
    );
    
    res.json(validation);
    
  } catch (error) {
    console.error('Error validating challenge:', error);
    res.status(500).json({ error: 'Failed to validate challenge' });
  }
};

/**
 * Validate defense acceptance for a challenge
 */
export const validateDefenseAcceptance = async (req, res) => {
  try {
    const { defenderName, challengerName, division } = req.body;
    
    if (!defenderName || !challengerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required fields: defenderName, challengerName, division' 
      });
    }
    
    const validation = await challengeValidationService.validateDefenseAcceptance(
      defenderName, 
      challengerName, 
      division
    );
    
    res.json(validation);
    
  } catch (error) {
    console.error('Error validating defense acceptance:', error);
    res.status(500).json({ error: 'Failed to validate defense acceptance' });
  }
};

/**
 * Get challenge statistics for a player
 */
export const getChallengeStats = async (req, res) => {
  try {
    const { playerName, division } = req.params;
    
    // Debug logging to see what parameters we're getting
    console.log('getChallengeStats called with:', { playerName, division });
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
      });
    }
    
    // Validate that division is actually a division name, not a player name
    if (division === playerName) {
      console.error('Parameter swap detected! Division and playerName are the same:', division);
      return res.status(400).json({ 
        error: 'Invalid parameters: division and playerName cannot be the same' 
      });
    }
    
    const stats = await challengeValidationService.getOrCreateChallengeStats(playerName, division);
    
    // Get current standings position
    const currentPosition = await challengeValidationService.getPlayerPosition(playerName, division);
    
    // Get current week
    const currentWeek = challengeValidationService.getCurrentChallengeWeek();
    
    // Get eligible opponents count
    const eligibleOpponents = await challengeValidationService.getEligibleOpponents(playerName, division);
    
    const response = {
      playerName: stats.playerName,
      division: stats.division,
      currentStanding: currentPosition,
      currentWeek,
      totalChallengeMatches: stats.totalChallengeMatches,
      matchesAsChallenger: stats.matchesAsChallenger,
      matchesAsDefender: stats.matchesAsDefender,
      requiredDefenses: stats.requiredDefenses,
      voluntaryDefenses: stats.voluntaryDefenses,
      remainingChallenges: stats.remainingChallenges,
      remainingDefenses: stats.remainingDefenses,
      hasReachedChallengeLimit: stats.hasReachedChallengeLimit,
      hasReachedDefenseLimit: stats.hasReachedDefenseLimit,
      isEligibleForChallenges: stats.isEligibleForChallenges,
      isEligibleForDefense: stats.isEligibleForDefense,
      canChallengeThisWeek: stats.canChallengeThisWeek(currentWeek),
      canDefendThisWeek: stats.canDefendThisWeek(currentWeek),
      eligibleOpponentsCount: eligibleOpponents.length,
      challengedOpponents: stats.challengedOpponents,
      challengesByWeek: stats.challengesByWeek,
      defendedByWeek: stats.defendedByWeek,
      timesChallenged: stats.timesChallenged,
      lastUpdated: stats.updatedAt
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error getting challenge stats:', error);
    res.status(500).json({ error: 'Failed to get challenge statistics' });
  }
};

/**
 * Get eligible opponents for a player
 */
export const getEligibleOpponents = async (req, res) => {
  try {
    const { playerName, division } = req.params;
    
    // Debug logging to see what parameters we're getting
    console.log('getEligibleOpponents called with:', { playerName, division });
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
      });
    }
    
    // Validate that division is actually a division name, not a player name
    if (division === playerName) {
      console.error('Parameter swap detected! Division and playerName are the same:', division);
      return res.status(400).json({ 
        error: 'Invalid parameters: division and playerName cannot be the same' 
      });
    }
    
    const eligibleOpponents = await challengeValidationService.getEligibleOpponents(playerName, division);
    
    res.json({
      playerName,
      division,
      eligibleOpponents,
      count: eligibleOpponents.length
    });
    
  } catch (error) {
    console.error('Error getting eligible opponents:', error);
    res.status(500).json({ error: 'Failed to get eligible opponents' });
  }
};

/**
 * Get challenge limits and usage for a player
 */
export const getChallengeLimits = async (req, res) => {
  try {
    const { playerName, division } = req.params;
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
      });
    }
    
    const stats = await challengeValidationService.getOrCreateChallengeStats(playerName, division);
    const currentWeek = challengeValidationService.getCurrentChallengeWeek();
    
    // Get the challenge limit breakdown
    const breakdown = stats.getChallengeLimitBreakdown();
    
    const response = {
      playerName: stats.playerName,
      division: stats.division,
      currentWeek,
      limits: {
        maxChallengeMatches: 4,
        maxRequiredDefenses: 2,
        maxTotalDefenses: 4,
        maxMatchesPerWeek: 1
      },
      usage: {
        totalChallengeMatches: stats.totalChallengeMatches,
        matchesAsChallenger: stats.matchesAsChallenger,
        matchesAsDefender: stats.matchesAsDefender,
        requiredDefenses: stats.requiredDefenses,
        voluntaryDefenses: stats.voluntaryDefenses,
        totalDefenses: stats.totalDefenses,
        timesChallenged: stats.timesChallenged
      },
      remaining: {
        challenges: stats.remainingChallenges,
        defenses: stats.remainingDefenses,
        totalDefenses: Math.max(0, 4 - stats.totalDefenses)
      },
      weeklyStatus: {
        canChallengeThisWeek: stats.canChallengeThisWeek(currentWeek),
        canDefendThisWeek: stats.canDefendThisWeek(currentWeek),
        challengesThisWeek: stats.challengesByWeek.filter(w => w === currentWeek).length,
        defensesThisWeek: stats.defendedByWeek.filter(w => w === currentWeek).length
      },
      status: {
        hasReachedChallengeLimit: stats.hasReachedChallengeLimit,
        hasReachedDefenseLimit: stats.hasReachedDefenseLimit,
        isEligibleForChallenges: stats.isEligibleForChallenges,
        isEligibleForDefense: stats.isEligibleForDefense
      },
      // NEW: Dynamic challenge limit breakdown
      dynamicLimits: {
        timesChallenged: breakdown.timesChallenged,
        baseChallengesAllowed: breakdown.baseChallengesAllowed,
        challengesIssued: breakdown.challengesIssued,
        remainingChallenges: breakdown.remainingChallenges,
        explanation: breakdown.explanation
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error getting challenge limits:', error);
    res.status(500).json({ error: 'Failed to get challenge limits' });
  }
};

/**
 * Get all challenge statistics for a division (admin use)
 */
export const getDivisionChallengeStats = async (req, res) => {
  try {
    const { division } = req.params;
    
    if (!division) {
      return res.status(400).json({ 
        error: 'Missing required parameter: division' 
      });
    }
    
    const stats = await ChallengeStats.find({ division }).sort({ currentStanding: 1 });
    
    const response = {
      division,
      totalPlayers: stats.length,
      players: stats.map(stat => ({
        playerName: stat.playerName,
        currentStanding: stat.currentStanding,
        totalChallengeMatches: stat.totalChallengeMatches,
        matchesAsChallenger: stat.matchesAsChallenger,
        matchesAsDefender: stat.matchesAsDefender,
        requiredDefenses: stat.requiredDefenses,
        voluntaryDefenses: stat.voluntaryDefenses,
        remainingChallenges: stat.remainingChallenges,
        remainingDefenses: stat.remainingDefenses,
        hasReachedChallengeLimit: stat.hasReachedChallengeLimit,
        hasReachedDefenseLimit: stat.hasReachedDefenseLimit,
        isEligibleForChallenges: stat.isEligibleForChallenges,
        isEligibleForDefense: stat.isEligibleForDefense,
        lastUpdated: stat.updatedAt
      })),
      summary: {
        playersAtChallengeLimit: stats.filter(s => s.hasReachedChallengeLimit).length,
        playersAtDefenseLimit: stats.filter(s => s.hasReachedDefenseLimit).length,
        playersEligibleForChallenges: stats.filter(s => s.isEligibleForChallenges).length,
        playersEligibleForDefense: stats.filter(s => s.isEligibleForDefense).length,
        totalChallengeMatches: stats.reduce((sum, s) => sum + s.totalChallengeMatches, 0),
        totalDefenses: stats.reduce((sum, s) => sum + s.totalDefenses, 0)
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error getting division challenge stats:', error);
    res.status(500).json({ error: 'Failed to get division challenge statistics' });
  }
};

/**
 * Update challenge statistics manually (admin use)
 */
export const updateChallengeStats = async (req, res) => {
  try {
    const { playerName, division } = req.params;
    const updateData = req.body;
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
      });
    }
    
    // Only allow updating certain fields for security
    const allowedUpdates = {
      totalChallengeMatches: updateData.totalChallengeMatches,
      matchesAsChallenger: updateData.matchesAsChallenger,
      matchesAsDefender: updateData.matchesAsDefender,
      requiredDefenses: updateData.requiredDefenses,
      voluntaryDefenses: updateData.voluntaryDefenses,
      currentStanding: updateData.currentStanding,
      hasReachedChallengeLimit: updateData.hasReachedChallengeLimit,
      hasReachedDefenseLimit: updateData.hasReachedDefenseLimit,
      isEligibleForChallenges: updateData.isEligibleForChallenges,
      isEligibleForDefense: updateData.isEligibleForDefense,
      timesChallenged: updateData.timesChallenged,
      challengedOpponents: updateData.challengedOpponents,
      challengesByWeek: updateData.challengesByWeek,
      defendedByWeek: updateData.defendedByWeek
    };
    
    // Remove undefined values
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );
    
    const updatedStats = await ChallengeStats.findOneAndUpdate(
      { playerName, division },
      allowedUpdates,
      { new: true, upsert: true }
    );
    
    if (!updatedStats) {
      return res.status(404).json({ error: 'Challenge stats not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Challenge statistics updated successfully',
      stats: updatedStats 
    });
    
  } catch (error) {
    console.error('Error updating challenge stats:', error);
    res.status(500).json({ error: 'Failed to update challenge statistics' });
  }
};

/**
 * Reset challenge statistics for a division (admin use)
 */
export const resetDivisionChallengeStats = async (req, res) => {
  try {
    const { division } = req.params;
    
    if (!division) {
      return res.status(400).json({ 
        error: 'Missing required parameter: division' 
      });
    }
    
    // Delete all challenge stats for the division
    const result = await ChallengeStats.deleteMany({ division });
    
    res.json({ 
      success: true, 
      message: `Reset challenge statistics for division: ${division}`,
      deletedCount: result.deletedCount 
    });
    
  } catch (error) {
    console.error('Error resetting division challenge stats:', error);
    res.status(500).json({ error: 'Failed to reset division challenge statistics' });
  }
};

/**
 * Reset challenge statistics for a specific player (admin use)
 */
export const resetPlayerChallengeStats = async (req, res) => {
  try {
    const { playerName, division } = req.params;
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
      });
    }
    
    // Delete challenge stats for the specific player
    const result = await ChallengeStats.findOneAndDelete({ playerName, division });
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Challenge stats not found for this player' 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Reset challenge statistics for player: ${playerName}`,
      deletedStats: result 
    });
    
  } catch (error) {
    console.error('Error resetting player challenge stats:', error);
    res.status(500).json({ error: 'Failed to reset player challenge statistics' });
  }
}; 

/**
 * Get current phase and week information for a division
 */
export const getCurrentPhaseAndWeek = async (req, res) => {
  try {
    const { division } = req.params;
    
    if (!division) {
      return res.status(400).json({ 
        error: 'Division parameter is required' 
      });
    }

    const result = await challengeValidationService.getCurrentPhaseAndWeek(division);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error getting current phase and week:', error);
    res.status(500).json({ 
      error: 'Failed to get current phase and week information' 
    });
  }
}; 

/**
 * Report match result for a challenge
 */
export const reportMatchResult = async (req, res) => {
  try {
    const { challengeId, winner, loser, score, notes, reportedBy } = req.body;
    
    if (!challengeId || !winner || !loser || !reportedBy) {
      return res.status(400).json({ 
        error: 'Missing required parameters: challengeId, winner, loser, reportedBy' 
      });
    }
    
    const Proposal = (await import('../models/Proposal.js')).default;
    const challenge = await Proposal.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    
    // Update match result
    challenge.matchResult = {
      completed: true,
      completedAt: new Date(),
      winner,
      loser,
      score: score || '',
      notes: notes || '',
      reportedBy,
      reportedAt: new Date()
    };
    
    // Update rematch eligibility for the loser (defender)
    if (challenge.receiverName === loser) {
      // Defender lost - they are eligible for rematch
      challenge.rematchEligibility = {
        canRematch: true,
        eligibleForRematch: winner, // Can rematch against the winner
        reason: 'Defender lost the original match',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
      };
    }
    
    await challenge.save();
    
    // Update challenge stats for both players
    const senderStats = await ChallengeStats.findOne({ 
      playerName: challenge.senderName, 
      division: challenge.divisions[0] 
    });
    const receiverStats = await ChallengeStats.findOne({ 
      playerName: challenge.receiverName, 
      division: challenge.divisions[0] 
    });
    
    if (senderStats) {
      await senderStats.addMatchResult(
        challengeId, 
        challenge.receiverName, 
        senderStats.playerName === winner ? 'win' : 'loss',
        challenge.challengeWeek
      );
      
      // Update rematch eligibility for sender
      if (senderStats.playerName === loser) {
        await senderStats.updateRematchEligibility(
          winner,
          challengeId,
          true,
          'Lost the original match as challenger'
        );
      }
    }
    
    if (receiverStats) {
      await receiverStats.addMatchResult(
        challengeId, 
        challenge.senderName, 
        receiverStats.playerName === winner ? 'win' : 'loss',
        challenge.challengeWeek
      );
      
      // Update rematch eligibility for receiver
      if (receiverStats.playerName === loser) {
        await receiverStats.updateRematchEligibility(
          winner,
          challengeId,
          true,
          'Lost the original match as defender'
        );
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Match result reported successfully',
      challenge: challenge
    });
    
  } catch (error) {
    console.error('Error reporting match result:', error);
    res.status(500).json({ error: 'Failed to report match result' });
  }
};

/**
 * Get rematch eligibility for a player
 */
export const getRematchEligibility = async (req, res) => {
  try {
    const { playerName, division } = req.params;
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
      });
    }
    
    const stats = await ChallengeStats.findOne({ playerName, division });
    
    if (!stats) {
      return res.status(404).json({ 
        error: 'Challenge stats not found for this player' 
      });
    }
    
    res.json({
      success: true,
      rematchEligibility: stats.rematchEligibility,
      matchResults: stats.matchResults
    });
    
  } catch (error) {
    console.error('Error getting rematch eligibility:', error);
    res.status(500).json({ error: 'Failed to get rematch eligibility' });
  }
};

/**
 * Validate rematch request
 */
export const validateRematch = async (req, res) => {
  try {
    const { senderName, receiverName, division, originalChallengeId } = req.body;
    
    if (!senderName || !receiverName || !division || !originalChallengeId) {
      return res.status(400).json({ 
        error: 'Missing required parameters: senderName, receiverName, division, originalChallengeId' 
      });
    }
    
    const challengeValidationService = (await import('../services/challengeValidationService.js')).default;
    const validation = await challengeValidationService.validateChallenge(
      senderName, 
      receiverName, 
      division, 
      true, // isRematch
      originalChallengeId
    );
    
    res.json(validation);
    
  } catch (error) {
    console.error('Error validating rematch:', error);
    res.status(500).json({ error: 'Failed to validate rematch' });
  }
}; 