import express from 'express';
import databaseService from '../services/databaseService.js';
import { 
  authenticatePlatformAdmin, 
  authenticatePlatformAdminHeader,
  requirePermission, 
  requireSuperAdmin,
  logAdminAction 
} from '../middleware/platformAuthMiddleware.js';

const router = express.Router();

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Platform admin login
 * POST /api/platform/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, pin } = req.body;
    
    if (!email) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Email is required'
      });
    }

    // Connect to registry database
    const registryConnection = await databaseService.connectToRegistry();
    
    // Import the PlatformAdmin model
    const PlatformAdmin = (await import('../models/PlatformAdmin.js')).default;

    // Find admin by email (primary or secondary)
    const admin = await PlatformAdmin.findByEmail(email);
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Verify password or PIN
    let isValid = false;
    if (password) {
      isValid = await admin.comparePassword(password);
    } else if (pin) {
      isValid = await admin.comparePin(pin);
    }

    if (!isValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Return admin info (without password)
    res.json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        permissions: admin.permissions,
        fullName: admin.fullName,
        isSuperAdmin: admin.isSuperAdmin,
        metadata: admin.metadata
      }
    });

  } catch (error) {
    console.error('Platform admin login error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Unable to authenticate platform admin'
    });
  }
});

// ============================================================================
// LEAGUE MANAGEMENT
// ============================================================================

/**
 * Create a new league (SUPER ADMIN ONLY)
 * POST /api/platform/leagues
 */
router.post('/leagues', 
  authenticatePlatformAdmin, 
  requireSuperAdmin,
  logAdminAction('create_league'),
  async (req, res) => {
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
        contactInfo,
        operatorEmail // Optional: assign operator immediately
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

      // Assign operator if provided
      if (operatorEmail) {
        const registryConnection = await databaseService.connectToRegistry();
        const LeagueOperator = (await import('../models/LeagueOperator.js')).default;
        
        const operator = await LeagueOperator.findOne({ email: operatorEmail.toLowerCase() });
        if (operator) {
          operator.assignedLeagues.push({
            leagueId: league.leagueId,
            leagueName: league.name,
            assignedBy: req.platformAdmin.id,
            permissions: {
              canManagePlayers: true,
              canManageMatches: true,
              canManageDivisions: true,
              canViewReports: true,
              canManageSettings: false,
              canManageBilling: false
            }
          });
          await operator.save();
        }
      }

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
  }
);

/**
 * List all leagues
 * GET /api/platform/leagues
 */
router.get('/leagues', 
  authenticatePlatformAdminHeader, 
  requirePermission('canViewAllLeagueData'),
  async (req, res) => {
    try {
      const registryConnection = await databaseService.connectToRegistry();
      const League = (await import('../models/League.js')).default;

      const leagues = await League.find({ isActive: true })
        .select('leagueId name description adminEmail subscription createdAt lastActiveAt')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        leagues
      });

    } catch (error) {
      console.error('Error listing leagues:', error);
      res.status(500).json({
        error: 'Failed to list leagues',
        message: error.message
      });
    }
  }
);

/**
 * Get league details
 * GET /api/platform/leagues/:leagueId
 */
router.get('/leagues/:leagueId', 
  authenticatePlatformAdminHeader, 
  requirePermission('canViewAllLeagueData'),
  async (req, res) => {
    try {
      const { leagueId } = req.params;
      const league = await databaseService.getLeagueConfig(leagueId);

      // Get league statistics
      const connectionData = await databaseService.getLeagueConnection(leagueId);
      const { connection: db } = connectionData;

      const User = db.model('User');
      const Proposal = db.model('Proposal');
      const Match = db.model('Match');

      const [totalPlayers, totalProposals, totalMatches] = await Promise.all([
        User.countDocuments(),
        Proposal.countDocuments(),
        Match.countDocuments()
      ]);

      res.json({
        success: true,
        league: {
          ...league.toObject(),
          stats: {
            totalPlayers,
            totalProposals,
            totalMatches
          }
        }
      });

    } catch (error) {
      console.error('Error getting league details:', error);
      res.status(404).json({
        error: 'League not found',
        message: 'The specified league does not exist'
      });
    }
  }
);

/**
 * Update league subscription
 * PUT /api/platform/leagues/:leagueId/subscription
 */
router.put('/leagues/:leagueId/subscription', 
  authenticatePlatformAdmin, 
  requirePermission('canManageBilling'),
  logAdminAction('update_league_subscription'),
  async (req, res) => {
    try {
      const { leagueId } = req.params;
      const { plan, status, maxPlayers, maxDivisions, expiresAt } = req.body;

      const registryConnection = await databaseService.connectToRegistry();
      const League = (await import('../models/League.js')).default;

      const updatedLeague = await League.findOneAndUpdate(
        { leagueId },
        {
          'subscription.plan': plan,
          'subscription.status': status,
          'subscription.maxPlayers': maxPlayers,
          'subscription.maxDivisions': maxDivisions,
          'subscription.expiresAt': expiresAt,
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
        message: 'League subscription updated successfully',
        league: {
          leagueId: updatedLeague.leagueId,
          name: updatedLeague.name,
          subscription: updatedLeague.subscription
        }
      });

    } catch (error) {
      console.error('Error updating league subscription:', error);
      res.status(500).json({
        error: 'Failed to update league subscription',
        message: error.message
      });
    }
  }
);

// ============================================================================
// LEAGUE OPERATOR MANAGEMENT
// ============================================================================

/**
 * Create a new league operator
 * POST /api/platform/operators
 */
router.post('/operators', 
  authenticatePlatformAdmin, 
  requirePermission('canManageLeagueOperators'),
  logAdminAction('create_league_operator'),
  async (req, res) => {
    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        password,
        pin,
        assignedLeagues
      } = req.body;

      const registryConnection = await databaseService.connectToRegistry();
      const LeagueOperator = (await import('../models/LeagueOperator.js')).default;

      // Check if operator already exists
      const existingOperator = await LeagueOperator.findOne({ email: email.toLowerCase() });
      if (existingOperator) {
        return res.status(409).json({
          error: 'Operator already exists',
          message: `An operator with email "${email}" already exists`
        });
      }

      // Create operator
      const operator = new LeagueOperator({
        email,
        firstName,
        lastName,
        phone,
        password,
        pin,
        assignedLeagues: assignedLeagues || [],
        createdBy: req.platformAdmin.id
      });

      await operator.save();

      res.status(201).json({
        success: true,
        message: 'League operator created successfully',
        operator: {
          id: operator._id,
          email: operator.email,
          firstName: operator.firstName,
          lastName: operator.lastName,
          assignedLeagues: operator.assignedLeagues
        }
      });

    } catch (error) {
      console.error('Error creating league operator:', error);
      res.status(500).json({
        error: 'Failed to create league operator',
        message: error.message
      });
    }
  }
);

/**
 * List all league operators
 * GET /api/platform/operators
 */
router.get('/operators', 
  authenticatePlatformAdminHeader, 
  requirePermission('canManageLeagueOperators'),
  async (req, res) => {
    try {
      const registryConnection = await databaseService.connectToRegistry();
      const LeagueOperator = (await import('../models/LeagueOperator.js')).default;

      const operators = await LeagueOperator.find({ isActive: true })
        .select('email firstName lastName assignedLeagues lastLoginAt createdAt')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        operators
      });

    } catch (error) {
      console.error('Error listing operators:', error);
      res.status(500).json({
        error: 'Failed to list operators',
        message: error.message
      });
    }
  }
);

/**
 * Assign league to operator
 * POST /api/platform/operators/:operatorId/assign-league
 */
router.post('/operators/:operatorId/assign-league', 
  authenticatePlatformAdmin, 
  requirePermission('canManageLeagueOperators'),
  logAdminAction('assign_league_to_operator'),
  async (req, res) => {
    try {
      const { operatorId } = req.params;
      const { leagueId, permissions } = req.body;

      const registryConnection = await databaseService.connectToRegistry();
      const LeagueOperator = (await import('../models/LeagueOperator.js')).default;
      const League = (await import('../models/League.js')).default;

      // Get operator and league
      const operator = await LeagueOperator.findById(operatorId);
      const league = await League.findOne({ leagueId });

      if (!operator) {
        return res.status(404).json({
          error: 'Operator not found',
          message: 'The specified operator does not exist'
        });
      }

      if (!league) {
        return res.status(404).json({
          error: 'League not found',
          message: 'The specified league does not exist'
        });
      }

      // Check if already assigned
      const alreadyAssigned = operator.assignedLeagues.find(l => l.leagueId === leagueId);
      if (alreadyAssigned) {
        return res.status(409).json({
          error: 'League already assigned',
          message: 'This league is already assigned to this operator'
        });
      }

      // Assign league
      operator.assignedLeagues.push({
        leagueId: league.leagueId,
        leagueName: league.name,
        assignedBy: req.platformAdmin.id,
        permissions: {
          canManagePlayers: true,
          canManageMatches: true,
          canManageDivisions: true,
          canViewReports: true,
          canManageSettings: false,
          canManageBilling: false,
          ...permissions
        }
      });

      await operator.save();

      res.json({
        success: true,
        message: 'League assigned to operator successfully',
        assignment: {
          operatorId: operator._id,
          operatorName: operator.fullName,
          leagueId: league.leagueId,
          leagueName: league.name
        }
      });

    } catch (error) {
      console.error('Error assigning league to operator:', error);
      res.status(500).json({
        error: 'Failed to assign league to operator',
        message: error.message
      });
    }
  }
);

/**
 * Remove league assignment from operator
 * DELETE /api/platform/operators/:operatorId/assign-league/:leagueId
 */
router.delete('/operators/:operatorId/assign-league/:leagueId', 
  authenticatePlatformAdmin, 
  requirePermission('canManageLeagueOperators'),
  logAdminAction('remove_league_from_operator'),
  async (req, res) => {
    try {
      const { operatorId, leagueId } = req.params;

      const registryConnection = await databaseService.connectToRegistry();
      const LeagueOperator = (await import('../models/LeagueOperator.js')).default;

      const operator = await LeagueOperator.findById(operatorId);
      if (!operator) {
        return res.status(404).json({
          error: 'Operator not found',
          message: 'The specified operator does not exist'
        });
      }

      // Remove league assignment
      operator.assignedLeagues = operator.assignedLeagues.filter(
        league => league.leagueId !== leagueId
      );

      await operator.save();

      res.json({
        success: true,
        message: 'League assignment removed successfully'
      });

    } catch (error) {
      console.error('Error removing league assignment:', error);
      res.status(500).json({
        error: 'Failed to remove league assignment',
        message: error.message
      });
    }
  }
);

// ============================================================================
// PLATFORM ADMIN MANAGEMENT (SUPER ADMIN ONLY)
// ============================================================================

/**
 * Create a new platform admin
 * POST /api/platform/admins
 */
router.post('/admins', 
  authenticatePlatformAdmin, 
  requireSuperAdmin,
  logAdminAction('create_platform_admin'),
  async (req, res) => {
    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        password,
        pin,
        role,
        permissions
      } = req.body;

      const registryConnection = await databaseService.connectToRegistry();
      const PlatformAdmin = (await import('../models/PlatformAdmin.js')).default;

      // Check if admin already exists
      const existingAdmin = await PlatformAdmin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        return res.status(409).json({
          error: 'Admin already exists',
          message: `An admin with email "${email}" already exists`
        });
      }

      // Create admin
      const admin = new PlatformAdmin({
        email,
        firstName,
        lastName,
        phone,
        password,
        pin,
        role: role || 'admin',
        permissions: permissions || {},
        createdBy: req.platformAdmin.id
      });

      await admin.save();

      res.status(201).json({
        success: true,
        message: 'Platform admin created successfully',
        admin: {
          id: admin._id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          permissions: admin.permissions
        }
      });

    } catch (error) {
      console.error('Error creating platform admin:', error);
      res.status(500).json({
        error: 'Failed to create platform admin',
        message: error.message
      });
    }
  }
);

/**
 * List all platform admins
 * GET /api/platform/admins
 */
router.get('/admins', 
  authenticatePlatformAdminHeader, 
  requireSuperAdmin,
  async (req, res) => {
    try {
      const registryConnection = await databaseService.connectToRegistry();
      const PlatformAdmin = (await import('../models/PlatformAdmin.js')).default;

      const admins = await PlatformAdmin.find({ isActive: true })
        .select('email firstName lastName role lastLoginAt createdAt')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        admins
      });

    } catch (error) {
      console.error('Error listing platform admins:', error);
      res.status(500).json({
        error: 'Failed to list platform admins',
        message: error.message
      });
    }
  }
);

// ============================================================================
// SYSTEM STATISTICS
// ============================================================================

/**
 * Get platform statistics
 * GET /api/platform/stats
 */
router.get('/stats', 
  authenticatePlatformAdminHeader, 
  requirePermission('canViewSystemLogs'),
  async (req, res) => {
    try {
      const registryConnection = await databaseService.connectToRegistry();
      const League = (await import('../models/League.js')).default;
      const LeagueOperator = (await import('../models/LeagueOperator.js')).default;
      const PlatformAdmin = (await import('../models/PlatformAdmin.js')).default;

      const [totalLeagues, activeLeagues, totalOperators, totalAdmins] = await Promise.all([
        League.countDocuments(),
        League.countDocuments({ isActive: true }),
        LeagueOperator.countDocuments({ isActive: true }),
        PlatformAdmin.countDocuments({ isActive: true })
      ]);

      // Get subscription statistics
      const subscriptionStats = await League.aggregate([
        { $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }}
      ]);

      res.json({
        success: true,
        stats: {
          leagues: {
            total: totalLeagues,
            active: activeLeagues
          },
          operators: totalOperators,
          admins: totalAdmins,
          subscriptions: subscriptionStats,
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('Error getting platform stats:', error);
      res.status(500).json({
        error: 'Failed to get platform statistics',
        message: error.message
      });
    }
  }
);

export default router;
