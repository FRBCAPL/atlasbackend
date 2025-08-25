import databaseService from '../services/databaseService.js';

/**
 * Middleware to authenticate platform admin via request body (for POST requests)
 */
export const authenticatePlatformAdmin = async (req, res, next) => {
  try {
    console.log('🔍 Platform admin auth - Request body:', JSON.stringify(req.body, null, 2));
    
    const { adminEmail, email, password, adminPin, pin } = req.body;
    
    // Use adminEmail/adminPin if provided, otherwise fall back to email/pin
    const authEmail = adminEmail || email;
    const authPin = adminPin || pin;
    
    console.log('🔍 Auth email:', authEmail, 'Auth PIN:', authPin ? '***' : 'none');
    
    if (!authEmail) {
      console.log('❌ No auth email found');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Admin email is required'
      });
    }

    // Connect to registry database
    const registryConnection = await databaseService.connectToRegistry();
    
    // Import the PlatformAdmin model
    const PlatformAdmin = (await import('../models/PlatformAdmin.js')).default;

    // Find admin by email (primary or secondary)
    console.log('🔍 Looking for admin with email:', authEmail);
    const admin = await PlatformAdmin.findByEmail(authEmail);
    
    if (!admin) {
      console.log('❌ Admin not found');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }
    
    if (!admin.isActive) {
      console.log('❌ Admin is not active');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Account is not active'
      });
    }
    
    console.log('✅ Admin found:', admin.email);

    // Verify password or PIN
    let isValid = false;
    if (password) {
      console.log('🔍 Verifying password...');
      isValid = await admin.comparePassword(password);
    } else if (authPin) {
      console.log('🔍 Verifying PIN...');
      isValid = await admin.comparePin(authPin);
    }

    console.log('🔍 Authentication result:', isValid);
    
    if (!isValid) {
      console.log('❌ Authentication failed');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }
    
    console.log('✅ Authentication successful');

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Attach admin to request (without password)
    req.platformAdmin = {
      id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions,
      fullName: admin.fullName,
      isSuperAdmin: admin.isSuperAdmin,
      metadata: admin.metadata
    };

    next();
  } catch (error) {
    console.error('Platform admin authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Unable to authenticate platform admin'
    });
  }
};

/**
 * Middleware to authenticate platform admin via headers (for GET requests)
 */
export const authenticatePlatformAdminHeader = async (req, res, next) => {
  try {
    const adminEmail = req.headers['x-admin-email'];
    const adminPin = req.headers['x-admin-pin'];
    
    console.log('🔍 Platform admin header auth - Email:', adminEmail, 'PIN:', adminPin ? '***' : 'none');
    
    if (!adminEmail) {
      console.log('❌ No admin email provided');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Admin email header is required'
      });
    }

    // Connect to registry database
    console.log('🔍 Connecting to registry database...');
    const registryConnection = await databaseService.connectToRegistry();
    
    // Import the PlatformAdmin model
    const PlatformAdmin = (await import('../models/PlatformAdmin.js')).default;

    // Find admin by email (primary or secondary)
    console.log('🔍 Looking for admin with email:', adminEmail);
    const admin = await PlatformAdmin.findByEmail(adminEmail);
    
    if (!admin) {
      console.log('❌ Admin not found');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      console.log('❌ Admin is not active');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Account is not active'
      });
    }

    console.log('✅ Admin found:', admin.email, 'Role:', admin.role);

    // Verify PIN
    if (adminPin) {
      console.log('🔍 Verifying PIN...');
      const isValid = await admin.comparePin(adminPin);
      if (!isValid) {
        console.log('❌ Invalid PIN');
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      }
      console.log('✅ PIN verified successfully');
    }

    // Attach admin to request (without password)
    req.platformAdmin = {
      id: admin._id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions,
      fullName: admin.fullName,
      isSuperAdmin: admin.isSuperAdmin,
      metadata: admin.metadata
    };

    console.log('✅ Authentication successful for:', admin.email);
    next();
  } catch (error) {
    console.error('❌ Platform admin header authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Unable to authenticate platform admin'
    });
  }
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.platformAdmin) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Platform admin authentication required'
      });
    }

    // Super admins have all permissions
    if (req.platformAdmin.isSuperAdmin) {
      return next();
    }

    // Check specific permission
    if (!req.platformAdmin.permissions[permission]) {
      return res.status(403).json({
        error: 'Permission denied',
        message: `Permission '${permission}' is required for this operation`
      });
    }

    next();
  };
};

/**
 * Middleware to require super admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.platformAdmin) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Platform admin authentication required'
    });
  }

  if (!req.platformAdmin.isSuperAdmin) {
    return res.status(403).json({
      error: 'Permission denied',
      message: 'Super admin role is required for this operation'
    });
  }

  next();
};

/**
 * Middleware to authenticate league operator
 */
export const authenticateLeagueOperator = async (req, res, next) => {
  try {
    const { email, password, pin, leagueId } = req.body;
    
    if (!email) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Email is required'
      });
    }

    // Connect to registry database
    const registryConnection = await databaseService.connectToRegistry();
    const LeagueOperator = (await import('../models/LeagueOperator.js')).default;

    // Find operator by email
    const operator = await LeagueOperator.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!operator) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Verify password or PIN
    let isValid = false;
    if (password) {
      isValid = await operator.comparePassword(password);
    } else if (pin) {
      isValid = await operator.comparePin(pin);
    }

    if (!isValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Check league access if leagueId is provided
    if (leagueId && !operator.hasLeagueAccess(leagueId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Operator does not have access to this league'
      });
    }

    // Update last login
    operator.lastLoginAt = new Date();
    await operator.save();

    // Attach operator to request (without password)
    req.leagueOperator = {
      id: operator._id,
      email: operator.email,
      firstName: operator.firstName,
      lastName: operator.lastName,
      assignedLeagues: operator.getAccessibleLeagues(),
      fullName: operator.fullName
    };

    next();
  } catch (error) {
    console.error('League operator authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'Unable to authenticate league operator'
    });
  }
};

/**
 * Middleware to require league operator permission
 */
export const requireLeagueOperatorPermission = (permission) => {
  return (req, res, next) => {
    if (!req.leagueOperator) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'League operator authentication required'
      });
    }

    const leagueId = req.params.leagueId || req.body.leagueId;
    
    if (!leagueId) {
      return res.status(400).json({
        error: 'League ID required',
        message: 'League ID is required for permission check'
      });
    }

    // Get operator from registry to check permissions
    databaseService.connectToRegistry().then(async registryConnection => {
      const LeagueOperator = (await import('../models/LeagueOperator.js')).default;
      return LeagueOperator.findById(req.leagueOperator.id);
    }).then(operator => {
      if (!operator.hasLeaguePermission(leagueId, permission)) {
        return res.status(403).json({
          error: 'Permission denied',
          message: `Permission '${permission}' is required for this league`
        });
      }
      next();
    }).catch(error => {
      console.error('Permission check error:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        message: 'Unable to verify permissions'
      });
    });
  };
};

/**
 * Middleware to log admin actions
 */
export const logAdminAction = (action) => {
  return async (req, res, next) => {
    try {
      const adminId = req.platformAdmin?.id || req.leagueOperator?.id;
      const adminType = req.platformAdmin ? 'platform_admin' : 'league_operator';
      
      // Log the action (you can implement your own logging system)
      console.log(`[${new Date().toISOString()}] ${adminType} ${adminId} performed action: ${action}`, {
        adminId,
        adminType,
        action,
        method: req.method,
        path: req.path,
        body: req.body,
        params: req.params,
        query: req.query
      });

      next();
    } catch (error) {
      console.error('Error logging admin action:', error);
      next(); // Continue even if logging fails
    }
  };
};
