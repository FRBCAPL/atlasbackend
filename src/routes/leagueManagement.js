import express from 'express';
import databaseService from '../services/databaseService.js';
import { leagueAdminMiddleware, subscriptionMiddleware } from '../middleware/leagueMiddleware.js';
import { validateLeagueCreation } from '../middleware/security.js';

const router = express.Router();

/**
 * Create a new league
 * POST /api/leagues
 */
router.post('/', validateLeagueCreation, async (req, res) => {
  try {
    const {
      leagueId,
      name,
      description,
      website,
      adminEmail,
      adminName,
      adminPhone,
      settings,
      contactInfo
    } = req.body;

    // Check if league ID already exists
    try {
      await databaseService.getLeagueConfig(leagueId);
      return res.status(409).json({
        error: 'League already exists',
        message: `A league with ID "${leagueId}" already exists`
      });
    } catch (error) {
      // League doesn't exist, continue with creation
    }

    // Create new league
    const leagueData = {
      leagueId,
      name,
      description,
      website,
      adminEmail,
      adminName,
      adminPhone,
      settings: {
        requireApproval: true,
        allowSelfRegistration: true,
        registrationFee: 0,
        defaultMatchDuration: 60,
        allowChallenges: true,
        maxPlayersPerDivision: 20,
        ...settings
      },
      contactInfo,
      subscription: {
        plan: 'free',
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        maxPlayers: 50,
        maxDivisions: 3
      }
    };

    const league = await databaseService.createLeague(leagueData);

    res.status(201).json({
      success: true,
      message: 'League created successfully',
      league: {
        leagueId: league.leagueId,
        name: league.name,
        adminEmail: league.adminEmail,
        trialEndsAt: league.subscription.trialEndsAt,
        leagueUrl: league.leagueUrl
      }
    });

  } catch (error) {
    console.error('Error creating league:', error);
    res.status(500).json({
      error: 'Failed to create league',
      message: error.message
    });
  }
});

/**
 * Get league information
 * GET /api/leagues/:leagueId
 */
router.get('/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const league = await databaseService.getLeagueConfig(leagueId);

    // Return public league information
    res.json({
      success: true,
      league: {
        leagueId: league.leagueId,
        name: league.name,
        description: league.description,
        website: league.website,
        contactInfo: league.contactInfo,
        isPublic: league.isPublic,
        createdAt: league.createdAt
      }
    });

  } catch (error) {
    console.error('Error getting league:', error);
    res.status(404).json({
      error: 'League not found',
      message: 'The specified league does not exist'
    });
  }
});

/**
 * Update league configuration (admin only)
 * PUT /api/leagues/:leagueId
 */
router.put('/:leagueId', leagueAdminMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;
    const {
      name,
      description,
      website,
      settings,
      contactInfo,
      isPublic
    } = req.body;

    const registryConnection = await databaseService.connectToRegistry();
    const LeagueModel = registryConnection.model('League');

    const updatedLeague = await LeagueModel.findOneAndUpdate(
      { leagueId },
      {
        name,
        description,
        website,
        settings,
        contactInfo,
        isPublic,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedLeague) {
      return res.status(404).json({
        error: 'League not found',
        message: 'The specified league does not exist'
      });
    }

    res.json({
      success: true,
      message: 'League updated successfully',
      league: {
        leagueId: updatedLeague.leagueId,
        name: updatedLeague.name,
        description: updatedLeague.description,
        website: updatedLeague.website,
        settings: updatedLeague.settings,
        contactInfo: updatedLeague.contactInfo,
        isPublic: updatedLeague.isPublic
      }
    });

  } catch (error) {
    console.error('Error updating league:', error);
    res.status(500).json({
      error: 'Failed to update league',
      message: error.message
    });
  }
});

/**
 * Get league statistics
 * GET /api/leagues/:leagueId/stats
 */
router.get('/:leagueId/stats', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const connectionData = await databaseService.getLeagueConnection(leagueId);
    const { connection: db } = connectionData;

    // Get model references
    const User = db.model('User');
    const Proposal = db.model('Proposal');
    const Match = db.model('Match');
    const Division = db.model('Division');

    // Get statistics
    const [
      totalPlayers,
      approvedPlayers,
      pendingPlayers,
      totalProposals,
      confirmedProposals,
      totalMatches,
      completedMatches,
      totalDivisions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isApproved: true }),
      User.countDocuments({ isApproved: false }),
      Proposal.countDocuments(),
      Proposal.countDocuments({ status: 'confirmed' }),
      Match.countDocuments(),
      Match.countDocuments({ completed: true }),
      Division.countDocuments()
    ]);

    res.json({
      success: true,
      stats: {
        players: {
          total: totalPlayers,
          approved: approvedPlayers,
          pending: pendingPlayers
        },
        proposals: {
          total: totalProposals,
          confirmed: confirmedProposals
        },
        matches: {
          total: totalMatches,
          completed: completedMatches
        },
        divisions: totalDivisions,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Error getting league stats:', error);
    res.status(500).json({
      error: 'Failed to get league statistics',
      message: error.message
    });
  }
});

/**
 * List all public leagues
 * GET /api/leagues
 */
router.get('/', async (req, res) => {
  try {
    const registryConnection = await databaseService.connectToRegistry();
    const LeagueModel = registryConnection.model('League');

    const publicLeagues = await LeagueModel.find({
      isPublic: true,
      isActive: true
    }).select('leagueId name description website createdAt');

    res.json({
      success: true,
      leagues: publicLeagues
    });

  } catch (error) {
    console.error('Error listing leagues:', error);
    res.status(500).json({
      error: 'Failed to list leagues',
      message: error.message
    });
  }
});

/**
 * Delete league (admin only)
 * DELETE /api/leagues/:leagueId
 */
router.delete('/:leagueId', leagueAdminMiddleware, async (req, res) => {
  try {
    const { leagueId } = req.params;

    // Mark league as inactive instead of deleting
    const registryConnection = await databaseService.connectToRegistry();
    const LeagueModel = registryConnection.model('League');

    const updatedLeague = await LeagueModel.findOneAndUpdate(
      { leagueId },
      {
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedLeague) {
      return res.status(404).json({
        error: 'League not found',
        message: 'The specified league does not exist'
      });
    }

    // Close database connection
    await databaseService.closeLeagueConnection(leagueId);

    res.json({
      success: true,
      message: 'League deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating league:', error);
    res.status(500).json({
      error: 'Failed to deactivate league',
      message: error.message
    });
  }
});

/**
 * Get database connection status
 * GET /api/leagues/:leagueId/status
 */
router.get('/:leagueId/status', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const connectionData = await databaseService.getLeagueConnection(leagueId);
    const stats = databaseService.getConnectionStats();

    res.json({
      success: true,
      status: {
        leagueId,
        connected: true,
        lastUsed: connectionData.lastUsed,
        connectionStats: stats
      }
    });

  } catch (error) {
    console.error('Error getting league status:', error);
    res.status(500).json({
      error: 'Failed to get league status',
      message: error.message
    });
  }
});

export default router;
