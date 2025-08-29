import User from '../models/User.js';
import LadderPlayer from '../models/LadderPlayer.js';

class PlayerRecognitionService {
  /**
   * Recognize a player by email across both league and ladder systems
   * @param {string} email - Player's email address
   * @returns {Object} Player recognition status and info
   */
  async recognizePlayer(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check league database (existing, untouched)
      const leaguePlayer = await User.findOne({ 
        email: normalizedEmail,
        isActive: true 
      });
      
      // Check ladder database (separate, untouched)
      const ladderPlayer = await LadderPlayer.findOne({ 
        email: normalizedEmail,
        isActive: true 
      });
      
      const recognition = {
        email: normalizedEmail,
        isLeaguePlayer: !!leaguePlayer,
        isLadderPlayer: !!ladderPlayer,
        isBothPlayer: !!(leaguePlayer && ladderPlayer),
        leagueInfo: null,
        ladderInfo: null,
        unifiedInfo: null
      };
      
      // Add league info if player exists in league
      if (leaguePlayer) {
        recognition.leagueInfo = {
          firstName: leaguePlayer.firstName,
          lastName: leaguePlayer.lastName,
          email: leaguePlayer.email,
          phone: leaguePlayer.phone,
          divisions: leaguePlayer.divisions || [],
          isApproved: leaguePlayer.isApproved,
          isActive: leaguePlayer.isActive,
          isAdmin: leaguePlayer.isAdmin,
          isSuperAdmin: leaguePlayer.isSuperAdmin,
          pin: leaguePlayer.pin
        };
      }
      
      // Add ladder info if player exists in ladder
      if (ladderPlayer) {
        recognition.ladderInfo = {
          firstName: ladderPlayer.firstName,
          lastName: ladderPlayer.lastName,
          email: ladderPlayer.email,
          phone: ladderPlayer.phone,
          ladderName: ladderPlayer.ladderName,
          position: ladderPlayer.position,
          fargoRate: ladderPlayer.fargoRate,
          isActive: ladderPlayer.isActive,
          immunityUntil: ladderPlayer.immunityUntil,
          stats: {
            wins: ladderPlayer.wins || 0,
            losses: ladderPlayer.losses || 0,
            totalMatches: ladderPlayer.totalMatches || 0
          }
        };
      }
      
      // Create unified info for login/display
      if (recognition.isBothPlayer) {
        recognition.unifiedInfo = {
          firstName: leaguePlayer.firstName || ladderPlayer.firstName,
          lastName: leaguePlayer.lastName || ladderPlayer.lastName,
          email: normalizedEmail,
          phone: leaguePlayer.phone || ladderPlayer.phone,
          isAdmin: leaguePlayer.isAdmin || false,
          isSuperAdmin: leaguePlayer.isSuperAdmin || false,
          pin: leaguePlayer.pin || ladderPlayer.pin
        };
      } else if (recognition.isLeaguePlayer) {
        recognition.unifiedInfo = {
          firstName: leaguePlayer.firstName,
          lastName: leaguePlayer.lastName,
          email: normalizedEmail,
          phone: leaguePlayer.phone,
          isAdmin: leaguePlayer.isAdmin || false,
          isSuperAdmin: leaguePlayer.isSuperAdmin || false,
          pin: leaguePlayer.pin
        };
      } else if (recognition.isLadderPlayer) {
        recognition.unifiedInfo = {
          firstName: ladderPlayer.firstName,
          lastName: ladderPlayer.lastName,
          email: normalizedEmail,
          phone: ladderPlayer.phone,
          isAdmin: false,
          isSuperAdmin: false,
          pin: ladderPlayer.pin
        };
      }
      
      return recognition;
      
    } catch (error) {
      console.error('Error in player recognition:', error);
      throw new Error('Failed to recognize player');
    }
  }
  
  /**
   * Get all players across both systems for admin purposes
   * @returns {Object} All players organized by system
   */
  async getAllPlayers() {
    try {
      // Get all league players
      const leaguePlayers = await User.find({ isActive: true })
        .select('firstName lastName email phone divisions isApproved isAdmin isSuperAdmin')
        .sort({ firstName: 1, lastName: 1 });
      
      // Get all ladder players
      const ladderPlayers = await LadderPlayer.find({ isActive: true })
        .select('firstName lastName email phone ladderName position fargoRate')
        .sort({ ladderName: 1, position: 1 });
      
      // Find players who are in both systems (filter out players without emails)
      const leaguePlayersWithEmails = leaguePlayers.filter(p => p.email && p.email.trim());
      const ladderPlayersWithEmails = ladderPlayers.filter(p => p.email && p.email.trim());
      
      const leagueEmails = new Set(leaguePlayersWithEmails.map(p => p.email.toLowerCase()));
      const ladderEmails = new Set(ladderPlayersWithEmails.map(p => p.email.toLowerCase()));
      
      const bothPlayers = leaguePlayersWithEmails.filter(player => 
        ladderEmails.has(player.email.toLowerCase())
      );
      
      const leagueOnlyPlayers = leaguePlayersWithEmails.filter(player => 
        !ladderEmails.has(player.email.toLowerCase())
      );
      
      const ladderOnlyPlayers = ladderPlayersWithEmails.filter(player => 
        !leagueEmails.has(player.email.toLowerCase())
      );
      
      return {
        leaguePlayers: leagueOnlyPlayers,
        ladderPlayers: ladderOnlyPlayers,
        bothPlayers: bothPlayers,
        totalLeaguePlayers: leaguePlayers.length,
        totalLadderPlayers: ladderPlayers.length,
        totalBothPlayers: bothPlayers.length,
        totalUniquePlayers: leagueEmails.size + ladderEmails.size - bothPlayers.length,
        // Also include players without emails for reference
        leaguePlayersWithoutEmails: leaguePlayers.filter(p => !p.email || !p.email.trim()).length,
        ladderPlayersWithoutEmails: ladderPlayers.filter(p => !p.email || !p.email.trim()).length
      };
      
    } catch (error) {
      console.error('Error getting all players:', error);
      throw new Error('Failed to get all players');
    }
  }
  
  /**
   * Validate player login across both systems
   * @param {string} email - Player's email
   * @param {string} pin - Player's PIN
   * @returns {Object} Login validation result
   */
  async validateLogin(email, pin) {
    try {
      const recognition = await this.recognizePlayer(email);
      
      if (!recognition.isLeaguePlayer && !recognition.isLadderPlayer) {
        return {
          success: false,
          error: 'Player not found in any system'
        };
      }
      
      // Check league player PIN
      if (recognition.isLeaguePlayer) {
        const leaguePlayer = await User.findOne({ email: email.toLowerCase() });
        if (leaguePlayer && leaguePlayer.pin === pin) {
          return {
            success: true,
            playerType: 'league',
            playerInfo: recognition.leagueInfo,
            unifiedInfo: recognition.unifiedInfo
          };
        }
      }
      
      // Check ladder player PIN
      if (recognition.isLadderPlayer) {
        const ladderPlayer = await LadderPlayer.findOne({ email: email.toLowerCase() });
        if (ladderPlayer && ladderPlayer.pin === pin) {
          return {
            success: true,
            playerType: 'ladder',
            playerInfo: recognition.ladderInfo,
            unifiedInfo: recognition.unifiedInfo
          };
        }
      }
      
      return {
        success: false,
        error: 'Invalid PIN'
      };
      
    } catch (error) {
      console.error('Error validating login:', error);
      throw new Error('Failed to validate login');
    }
  }
}

export default new PlayerRecognitionService();
