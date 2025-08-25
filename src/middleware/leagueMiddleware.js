import databaseService from '../services/databaseService.js';

/**
 * Middleware to extract league ID from request and set up database connection
 */
export const leagueMiddleware = async (req, res, next) => {
  try {
    // Extract league ID from various possible sources
    const leagueId = extractLeagueId(req);
    
    if (!leagueId) {
      return res.status(400).json({
        error: 'League ID is required',
        message: 'Please provide a league ID in the URL path, query parameter, or request body'
      });
    }

    // Get league configuration
    const league = await databaseService.getLeagueConfig(leagueId);
    
    // Get or create database connection for this league
    const connectionData = await databaseService.getLeagueConnection(leagueId);
    
    // Attach league info and database connection to request
    req.league = league;
    req.leagueId = leagueId;
    req.db = connectionData.connection;
    req.leagueConnection = connectionData;
    
    // Update last used timestamp
    connectionData.lastUsed = new Date();
    
    next();
  } catch (error) {
    console.error('League middleware error:', error);
    
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return res.status(404).json({
        error: 'League not found',
        message: 'The specified league does not exist or is not active'
      });
    }
    
    if (error.message.includes('subscription')) {
      return res.status(402).json({
        error: 'Subscription required',
        message: 'This league requires an active subscription'
      });
    }
    
    return res.status(500).json({
      error: 'Database connection error',
      message: 'Unable to connect to league database'
    });
  }
};

/**
 * Extract league ID from request
 */
function extractLeagueId(req) {
  // 1. From URL path (e.g., /api/league/front-range-pool/users)
  const pathMatch = req.path.match(/^\/api\/league\/([^\/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }
  
  // 2. From subdomain (e.g., front-range-pool.frusapl.com)
  const hostname = req.get('host');
  if (hostname && hostname.includes('.')) {
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }
  }
  
  // 3. From query parameter
  if (req.query.leagueId) {
    return req.query.leagueId;
  }
  
  // 4. From request body
  if (req.body && req.body.leagueId) {
    return req.body.leagueId;
  }
  
  // 5. From headers (for API clients)
  if (req.headers['x-league-id']) {
    return req.headers['x-league-id'];
  }
  
  return null;
}

/**
 * Optional league middleware - doesn't fail if league ID is missing
 */
export const optionalLeagueMiddleware = async (req, res, next) => {
  try {
    const leagueId = extractLeagueId(req);
    
    if (leagueId) {
      const league = await databaseService.getLeagueConfig(leagueId);
      const connectionData = await databaseService.getLeagueConnection(leagueId);
      
      req.league = league;
      req.leagueId = leagueId;
      req.db = connectionData.connection;
      req.leagueConnection = connectionData;
      
      connectionData.lastUsed = new Date();
    }
    
    next();
  } catch (error) {
    console.error('Optional league middleware error:', error);
    // Continue without league context
    next();
  }
};

/**
 * Admin-only middleware for league management
 */
export const leagueAdminMiddleware = async (req, res, next) => {
  try {
    if (!req.league) {
      return res.status(400).json({
        error: 'League context required',
        message: 'League middleware must be applied before admin middleware'
      });
    }
    
    // Check if user is admin for this specific league
    const userEmail = req.user?.email || req.body?.adminEmail;
    
    if (!userEmail) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Admin email is required for league management'
      });
    }
    
    if (userEmail.toLowerCase() !== req.league.adminEmail.toLowerCase()) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only the league admin can perform this action'
      });
    }
    
    next();
  } catch (error) {
    console.error('League admin middleware error:', error);
    return res.status(500).json({
      error: 'Authorization error',
      message: 'Unable to verify admin permissions'
    });
  }
};

/**
 * Subscription check middleware
 */
export const subscriptionMiddleware = async (req, res, next) => {
  try {
    if (!req.league) {
      return res.status(400).json({
        error: 'League context required',
        message: 'League middleware must be applied before subscription middleware'
      });
    }
    
    const { subscription } = req.league;
    
    // Check subscription status
    if (subscription.status === 'expired' || subscription.status === 'cancelled') {
      return res.status(402).json({
        error: 'Subscription required',
        message: 'This league requires an active subscription',
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
          expiresAt: subscription.expiresAt
        }
      });
    }
    
    // Check trial status
    if (subscription.status === 'trial' && subscription.trialEndsAt) {
      const now = new Date();
      if (now > subscription.trialEndsAt) {
        return res.status(402).json({
          error: 'Trial expired',
          message: 'League trial period has expired. Please upgrade to continue.',
          subscription: {
            status: subscription.status,
            trialEndsAt: subscription.trialEndsAt
          }
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({
      error: 'Subscription check failed',
      message: 'Unable to verify subscription status'
    });
  }
};

/**
 * Usage limits middleware
 */
export const usageLimitsMiddleware = async (req, res, next) => {
  try {
    if (!req.league || !req.db) {
      return res.status(400).json({
        error: 'League context required',
        message: 'League middleware must be applied before usage limits middleware'
      });
    }
    
    const { subscription } = req.league;
    
    // Check player count limit
    if (req.path.includes('/users') && req.method === 'POST') {
      const User = req.db.model('User');
      const playerCount = await User.countDocuments({ isApproved: true });
      
      if (playerCount >= subscription.maxPlayers) {
        return res.status(429).json({
          error: 'Player limit reached',
          message: `Maximum ${subscription.maxPlayers} players allowed for this plan`,
          current: playerCount,
          limit: subscription.maxPlayers
        });
      }
    }
    
    // Check division count limit
    if (req.path.includes('/divisions') && req.method === 'POST') {
      const Division = req.db.model('Division');
      const divisionCount = await Division.countDocuments();
      
      if (divisionCount >= subscription.maxDivisions) {
        return res.status(429).json({
          error: 'Division limit reached',
          message: `Maximum ${subscription.maxDivisions} divisions allowed for this plan`,
          current: divisionCount,
          limit: subscription.maxDivisions
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Usage limits middleware error:', error);
    return res.status(500).json({
      error: 'Usage check failed',
      message: 'Unable to verify usage limits'
    });
  }
};
