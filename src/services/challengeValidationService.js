import Proposal from '../models/Proposal.js';
import ChallengeStats from '../models/ChallengeStats.js';
import Season from '../models/Season.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChallengeValidationService {
  constructor() {
    this.standingsCache = new Map();
    this.standingsCacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Load standings for a division from JSON file
   */
  async loadStandings(division) {
    const cacheKey = division;
    const now = Date.now();
    
    // Check cache first
    if (this.standingsCache.has(cacheKey) && 
        this.standingsCacheExpiry.has(cacheKey) && 
        now < this.standingsCacheExpiry.get(cacheKey)) {
      return this.standingsCache.get(cacheKey);
    }

    try {
      // Add debug logging to see what division is being requested
      console.log(`Loading standings for division: "${division}"`);
      
      const standingsPath = path.join(__dirname, '../../public', `standings_${division.replace(/\s+/g, '_')}.json`);
      console.log(`Standings file path: ${standingsPath}`);
      
      const standingsData = JSON.parse(fs.readFileSync(standingsPath, 'utf8'));
      
      // Cache the standings
      this.standingsCache.set(cacheKey, standingsData);
      this.standingsCacheExpiry.set(cacheKey, now + this.CACHE_DURATION);
      
      return standingsData;
    } catch (error) {
      console.error(`Error loading standings for division "${division}":`, error);
      console.error(`This suggests the division parameter might be incorrect. Expected: "FRBCAPL TEST", Got: "${division}"`);
      return [];
    }
  }

  /**
   * Get player position in standings
   */
  async getPlayerPosition(playerName, division) {
    const standings = await this.loadStandings(division);
    const player = standings.find(p => 
      p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
    );
    return player ? parseInt(player.rank) : null;
  }

  /**
   * Get or create challenge stats for a player
   */
  async getOrCreateChallengeStats(playerName, division) {
    let stats = await ChallengeStats.findOne({ playerName, division });
    
    if (!stats) {
      // Create new stats record
      const currentStanding = await this.getPlayerPosition(playerName, division);
      stats = new ChallengeStats({
        playerName,
        division,
        currentStanding
      });
      await stats.save();
    } else {
      // Update standings if needed (could be stale)
      const currentStanding = await this.getPlayerPosition(playerName, division);
      if (currentStanding !== stats.currentStanding) {
        stats.currentStanding = currentStanding;
        await stats.save();
      }
    }
    
    return stats;
  }

  /**
   * Calculate current week number within Phase 2 (weeks 7-10)
   * TODO: Replace with database-driven approach for real seasons
   */
  getCurrentChallengeWeek() {
    const now = new Date();
    const sessionStart = new Date('2025-07-13'); // Week 7 start date
    const weekDiff = Math.floor((now - sessionStart) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(7, Math.min(10, 7 + weekDiff)); // Clamp between 7-10
  }

  /**
   * Get current phase and week for a division
   * This should be the main method used for real-time operation
   */
  async getCurrentPhaseAndWeek(division) {
    try {
      // Use the Season model to get current phase and week
      const result = await Season.getCurrentPhaseAndWeek(division);
      
      if (!result.isActive) {
        return {
          currentWeek: null,
          phase: 'offseason',
          isActive: false,
          season: null
        };
      }
      
      return result;
      
    } catch (error) {
      console.error('Error getting current phase and week:', error);
      // Fallback to hardcoded values for backward compatibility
      return {
        currentWeek: this.getCurrentChallengeWeek(),
        phase: 'challenge',
        isActive: true,
        season: null
      };
    }
  }

  /**
   * Validate if a challenge is allowed according to bylaws
   */
  async validateChallenge(senderName, receiverName, division, isRematch = false, originalChallengeId = null) {
    const errors = [];
    const warnings = [];
    
    try {
      // NEW: Basic validation checks
      if (!senderName || !receiverName || !division) {
        return {
          isValid: false,
          errors: ['Missing required parameters: senderName, receiverName, division'],
          warnings: [],
          currentWeek: this.getCurrentChallengeWeek()
        };
      }
      
      // NEW: Check if Phase 2 is active
      const season = await Season.findOne({ division });
      if (!season) {
        return {
          isValid: false,
          errors: ['Season not found for this division'],
          warnings: [],
          currentWeek: this.getCurrentChallengeWeek()
        };
      }
      
      const now = new Date();
      if (now < season.phase1End || now > season.phase2End) {
        return {
          isValid: false,
          errors: ['Phase 2 is not currently active'],
          warnings: [],
          currentWeek: this.getCurrentChallengeWeek()
        };
      }
      
      // NEW: Validate that both players exist in standings
      const standings = await this.loadStandings(division);
      const senderExists = standings.some(p => p.name.toLowerCase().trim() === senderName.toLowerCase().trim());
      const receiverExists = standings.some(p => p.name.toLowerCase().trim() === receiverName.toLowerCase().trim());
      
      if (!senderExists) {
        return {
          isValid: false,
          errors: [`Player "${senderName}" not found in ${division} standings`],
          warnings: [],
          currentWeek: this.getCurrentChallengeWeek()
        };
      }
      
      if (!receiverExists) {
        return {
          isValid: false,
          errors: [`Player "${receiverName}" not found in ${division} standings`],
          warnings: [],
          currentWeek: this.getCurrentChallengeWeek()
        };
      }
      
      // Get current week
      const currentWeek = this.getCurrentChallengeWeek();
      
      // Get challenge stats for both players
      const senderStats = await this.getOrCreateChallengeStats(senderName, division);
      const receiverStats = await this.getOrCreateChallengeStats(receiverName, division);
      
      // 1. Check if sender has reached dynamic challenge limit
      if (senderStats.remainingChallenges <= 0) {
        const breakdown = senderStats.getChallengeLimitBreakdown();
        errors.push(`You have reached your challenge limit. ${breakdown.explanation}`);
      }
      
      // 2. Check if receiver has reached defense limit
      if (receiverStats.requiredDefenses >= 2) {
        errors.push(`${receiverName} has already defended ${receiverStats.requiredDefenses} challenges (maximum required is 2)`);
      }
      
      // 3. Check standings eligibility (only for non-rematches)
      if (!isRematch) {
        const senderPosition = await this.getPlayerPosition(senderName, division);
        const receiverPosition = await this.getPlayerPosition(receiverName, division);
        
        if (senderPosition && receiverPosition) {
          const positionDifference = receiverPosition - senderPosition;
          if (positionDifference >= 0 || positionDifference < -4) {
            errors.push(`You can only challenge players up to 4 spots above you in the standings. ${receiverName} is ${Math.abs(positionDifference)} spots ${positionDifference >= 0 ? 'below' : 'above'} you.`);
          }
        }
      }
      
      // 4. Check if sender has already challenged this opponent (only for non-rematches)
      if (!isRematch && senderStats.challengedOpponents.includes(receiverName)) {
        errors.push(`You have already challenged ${receiverName} once during this phase`);
      }
      
      // 5. Check weekly limits for both players
      const senderHasMatchThisWeek = senderStats.challengesByWeek.includes(currentWeek) || 
                                    senderStats.defendedByWeek.includes(currentWeek);
      if (senderHasMatchThisWeek) {
        errors.push(`You already have a challenge match scheduled for week ${currentWeek}`);
      }
      
      // Check if receiver has matches scheduled this week
      const receiverHasMatchThisWeek = receiverStats.challengesByWeek.includes(currentWeek) || 
                                      receiverStats.defendedByWeek.includes(currentWeek);
      
      if (receiverHasMatchThisWeek) {
        errors.push(`${receiverName} already has a challenge match scheduled for week ${currentWeek}`);
      } else {
        // They have no matches scheduled - they MUST accept this defense challenge
        warnings.push(`${receiverName} has no matches scheduled for week ${currentWeek} and MUST accept this defense challenge according to league bylaws.`);
      }
      
      // 6. Check if receiver has reached total match limit (challenges + defenses)
      const receiverTotalMatches = receiverStats.totalChallengeMatches + receiverStats.requiredDefenses;
      if (receiverTotalMatches >= 4) {
        errors.push(`${receiverName} has already played ${receiverTotalMatches} total matches (${receiverStats.totalChallengeMatches} challenges + ${receiverStats.requiredDefenses} defenses, maximum is 4)`);
      }
      
      // 7. Rematch-specific validations
      if (isRematch) {
        if (!originalChallengeId) {
          errors.push('Rematch challenges require the original challenge ID');
        } else {
          // NEW: Enhanced rematch validation with match result tracking
          try {
            const Proposal = (await import('../models/Proposal.js')).default;
            const originalChallenge = await Proposal.findById(originalChallengeId);
            
            if (!originalChallenge) {
              errors.push('Original challenge not found');
            } else if (!originalChallenge.matchResult || !originalChallenge.matchResult.completed) {
              errors.push('Original challenge must be completed before requesting a rematch');
            } else {
              // Check if the sender (defender in original match) lost the original match
              const wasDefenderInOriginal = originalChallenge.receiverName === senderName;
              const originalWinner = originalChallenge.matchResult.winner;
              const originalLoser = originalChallenge.matchResult.loser;
              
              if (wasDefenderInOriginal && originalLoser === senderName) {
                // Defender lost original match - eligible for rematch
                if (!senderStats.canRematchOpponent(receiverName, originalChallengeId)) {
                  errors.push('You are not eligible for a rematch against this opponent');
                }
              } else {
                errors.push('Only the defender who lost the original match can request a rematch');
              }
            }
          } catch (error) {
            console.error('Error validating rematch:', error);
            errors.push('Error validating rematch eligibility');
          }
        }
      }
      
      // 8. Check if receiver is eligible for defense
      if (!receiverStats.isEligibleForDefense) {
        errors.push(`${receiverName} is not eligible to defend challenges at this time`);
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        currentWeek,
        senderStats,
        receiverStats
      };
      
    } catch (error) {
      console.error('Error validating challenge:', error);
      return {
        isValid: false,
        errors: ['System error during validation'],
        warnings: [],
        currentWeek: this.getCurrentChallengeWeek()
      };
    }
  }

  /**
   * Validate if a defense acceptance is allowed
   */
  async validateDefenseAcceptance(defenderName, challengerName, division) {
    const errors = [];
    const warnings = [];
    
    try {
      const currentWeek = this.getCurrentChallengeWeek();
      const defenderStats = await this.getOrCreateChallengeStats(defenderName, division);
      const challengerStats = await this.getOrCreateChallengeStats(challengerName, division);
      
      // 1. Check if defender has reached total match limit (challenges + defenses)
      const defenderTotalMatches = defenderStats.totalChallengeMatches + defenderStats.requiredDefenses;
      if (defenderTotalMatches >= 4) {
        errors.push(`You have already played ${defenderTotalMatches} total matches (${defenderStats.totalChallengeMatches} challenges + ${defenderStats.requiredDefenses} defenses, maximum is 4)`);
      }
      
      // 2. Check if defender has reached defense limit
      if (defenderStats.requiredDefenses >= 2) {
        warnings.push(`You have already defended ${defenderStats.requiredDefenses} challenges. This would be a voluntary defense.`);
      }
      
      // 3. Check weekly limits - NEW BYLAW ENFORCEMENT
      if (!defenderStats.canDefendThisWeek(currentWeek)) {
        // Check if they have any matches scheduled for this week
        const hasAnyMatchThisWeek = defenderStats.challengesByWeek.includes(currentWeek) || 
                                   defenderStats.defendedByWeek.includes(currentWeek);
        
        if (hasAnyMatchThisWeek) {
          errors.push(`You already have a challenge match scheduled for week ${currentWeek}`);
        } else {
          // They have no matches scheduled - they MUST accept this defense challenge
          warnings.push(`You have no matches scheduled for week ${currentWeek}. According to league bylaws, you MUST accept this defense challenge.`);
        }
      }
      
      if (!challengerStats.canChallengeThisWeek(currentWeek)) {
        errors.push(`${challengerName} already has a challenge match scheduled for week ${currentWeek}`);
      }
      
      // 4. Check if challenger has reached total match limit (challenges + defenses)
      const challengerTotalMatches = challengerStats.totalChallengeMatches + challengerStats.requiredDefenses;
      if (challengerTotalMatches >= 4) {
        errors.push(`${challengerName} has already played ${challengerTotalMatches} total matches (${challengerStats.totalChallengeMatches} challenges + ${challengerStats.requiredDefenses} defenses, maximum is 4)`);
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        currentWeek,
        defenderStats,
        challengerStats
      };
      
    } catch (error) {
      console.error('Error validating defense acceptance:', error);
      return {
        isValid: false,
        errors: ['System error during validation'],
        warnings: [],
        currentWeek: this.getCurrentChallengeWeek()
      };
    }
  }

  /**
   * Get eligible opponents for a player
   */
  async getEligibleOpponents(playerName, division) {
    try {
      const playerStats = await this.getOrCreateChallengeStats(playerName, division);
      const standings = await this.loadStandings(division);
      const playerPosition = await this.getPlayerPosition(playerName, division);
      
      if (!playerPosition) {
        return [];
      }
      
      const eligibleOpponents = [];
      
      for (const player of standings) {
        const opponentName = player.name;
        const opponentPosition = parseInt(player.rank);
        
        // Skip self
        if (opponentName.toLowerCase().trim() === playerName.toLowerCase().trim()) {
          continue;
        }
        
        // Check standings eligibility (up to 4 spots above)
        const positionDifference = opponentPosition - playerPosition;
        if (positionDifference >= 0 || positionDifference < -4) {
          continue;
        }
        
        // Check if already challenged (unless rematch eligible)
        if (playerStats.challengedOpponents.includes(opponentName)) {
          // TODO: Check rematch eligibility when match results are tracked
          // For now, skip players already challenged
          continue;
        }
        
        // Get opponent stats to check their availability
        const opponentStats = await this.getOrCreateChallengeStats(opponentName, division);
        
        // Check if opponent has reached defense limit
        if (opponentStats.requiredDefenses >= 2) {
          continue;
        }
        
        // Check if opponent has reached total match limit (challenges + defenses)
        const opponentTotalMatches = opponentStats.totalChallengeMatches + opponentStats.requiredDefenses;
        if (opponentTotalMatches >= 4) {
          continue;
        }
        
        // NEW BYLAW: Check if opponent must defend (no matches scheduled this week)
        const currentWeek = this.getCurrentChallengeWeek();
        const hasAnyMatchThisWeek = opponentStats.challengesByWeek.includes(currentWeek) || 
                                   opponentStats.defendedByWeek.includes(currentWeek);
        const mustDefend = !hasAnyMatchThisWeek;
        
        eligibleOpponents.push({
          name: opponentName,
          position: opponentPosition,
          positionDifference: Math.abs(positionDifference),
          stats: opponentStats,
          mustDefend: mustDefend,
          canDefendThisWeek: opponentStats.canDefendThisWeek(currentWeek)
        });
      }
      
      // Sort by position (better ranked first)
      eligibleOpponents.sort((a, b) => a.position - b.position);
      
      return eligibleOpponents;
      
    } catch (error) {
      console.error('Error getting eligible opponents:', error);
      return [];
    }
  }

  /**
   * Update challenge statistics when a proposal is created
   */
  async updateStatsOnProposalCreated(proposal) {
    try {
      const currentWeek = this.getCurrentChallengeWeek();
      
      // Update sender stats
      const senderStats = await this.getOrCreateChallengeStats(proposal.senderName, proposal.divisions[0]);
      senderStats.matchesAsChallenger += 1;
      senderStats.totalChallengeMatches += 1;
      senderStats.challengesByWeek.push(currentWeek);
      senderStats.challengedOpponents.push(proposal.receiverName);
      senderStats.lastChallengeWeek = currentWeek;
      
      const senderTotalMatches = senderStats.totalChallengeMatches + senderStats.requiredDefenses;
      if (senderTotalMatches >= 4) {
        senderStats.hasReachedChallengeLimit = true;
        senderStats.isEligibleForChallenges = false;
      }
      
      await senderStats.save();
      
      // Update receiver stats
      const receiverStats = await this.getOrCreateChallengeStats(proposal.receiverName, proposal.divisions[0]);
      receiverStats.matchesAsDefender += 1;
      receiverStats.totalChallengeMatches += 1;
      receiverStats.defendedByWeek.push(currentWeek);
      
      // NEW: Increment times challenged for the receiver
      receiverStats.timesChallenged += 1;
      
      // Determine if this is a required or voluntary defense
      if (receiverStats.requiredDefenses < 2) {
        receiverStats.requiredDefenses += 1;
      } else {
        receiverStats.voluntaryDefenses += 1;
      }
      
      if (receiverStats.requiredDefenses >= 2) {
        receiverStats.hasReachedDefenseLimit = true;
      }
      
      const receiverTotalMatches = receiverStats.totalChallengeMatches + receiverStats.requiredDefenses;
      if (receiverTotalMatches >= 4) {
        receiverStats.isEligibleForChallenges = false;
        receiverStats.isEligibleForDefense = false;
      }
      
      await receiverStats.save();
      
    } catch (error) {
      console.error('Error updating stats on proposal creation:', error);
    }
  }

  /**
   * Update challenge statistics when a proposal is confirmed
   */
  async updateStatsOnProposalConfirmed(proposal) {
    // This method will be called when a proposal is confirmed
    // For now, we'll just log it - the actual stats are updated on creation
    console.log('Proposal confirmed:', proposal._id);
  }

  /**
   * Update challenge statistics when a proposal is canceled
   */
  async updateStatsOnProposalCanceled(proposal) {
    try {
      const currentWeek = proposal.challengeWeek || this.getCurrentChallengeWeek();
      
      // Revert sender stats
      const senderStats = await this.getOrCreateChallengeStats(proposal.senderName, proposal.divisions[0]);
      senderStats.matchesAsChallenger = Math.max(0, senderStats.matchesAsChallenger - 1);
      senderStats.totalChallengeMatches = Math.max(0, senderStats.totalChallengeMatches - 1);
      senderStats.challengesByWeek = senderStats.challengesByWeek.filter(w => w !== currentWeek);
      senderStats.challengedOpponents = senderStats.challengedOpponents.filter(name => name !== proposal.receiverName);
      
      const senderTotalMatches = senderStats.totalChallengeMatches + senderStats.requiredDefenses;
      if (senderTotalMatches < 4) {
        senderStats.hasReachedChallengeLimit = false;
        senderStats.isEligibleForChallenges = true;
      }
      
      await senderStats.save();
      
      // Revert receiver stats
      const receiverStats = await this.getOrCreateChallengeStats(proposal.receiverName, proposal.divisions[0]);
      receiverStats.matchesAsDefender = Math.max(0, receiverStats.matchesAsDefender - 1);
      receiverStats.totalChallengeMatches = Math.max(0, receiverStats.totalChallengeMatches - 1);
      receiverStats.defendedByWeek = receiverStats.defendedByWeek.filter(w => w !== currentWeek);
      
      // NEW: Decrement times challenged for the receiver
      receiverStats.timesChallenged = Math.max(0, receiverStats.timesChallenged - 1);
      
      // Revert defense counts
      if (receiverStats.voluntaryDefenses > 0) {
        receiverStats.voluntaryDefenses = Math.max(0, receiverStats.voluntaryDefenses - 1);
      } else if (receiverStats.requiredDefenses > 0) {
        receiverStats.requiredDefenses = Math.max(0, receiverStats.requiredDefenses - 1);
      }
      
      if (receiverStats.requiredDefenses < 2) {
        receiverStats.hasReachedDefenseLimit = false;
      }
      
      const receiverTotalMatches = receiverStats.totalChallengeMatches + receiverStats.requiredDefenses;
      if (receiverTotalMatches < 4) {
        receiverStats.isEligibleForChallenges = true;
        receiverStats.isEligibleForDefense = true;
      }
      
      await receiverStats.save();
      
    } catch (error) {
      console.error('Error updating stats on proposal cancellation:', error);
    }
  }
}

export default new ChallengeValidationService(); 