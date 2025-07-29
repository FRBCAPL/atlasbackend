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
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
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
    
    if (!playerName || !division) {
      return res.status(400).json({ 
        error: 'Missing required parameters: playerName, division' 
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
        totalDefenses: stats.totalDefenses
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
      isEligibleForDefense: updateData.isEligibleForDefense
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

    const challengeService = new ChallengeValidationService();
    const result = await challengeService.getCurrentPhaseAndWeek(division);
    
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