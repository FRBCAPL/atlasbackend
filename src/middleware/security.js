import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limit for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for proposal creation
export const proposalRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 proposals per 5 minutes
  message: {
    error: 'Too many proposals created, please slow down.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Production-ready rate limit for admin endpoints
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 admin requests per windowMs
  message: {
    error: 'Too many admin requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
export const validateProposal = [
  body('senderName').trim().isLength({ min: 1, max: 100 }).withMessage('Sender name is required and must be less than 100 characters'),
  body('receiverName').trim().isLength({ min: 1, max: 100 }).withMessage('Receiver name is required and must be less than 100 characters'),
  body('divisions').isArray().withMessage('Divisions must be an array'),
  body('type').isIn(['schedule', 'challenge']).withMessage('Type must be either schedule or challenge'),
  body('phase').isIn(['schedule', 'challenge']).withMessage('Phase must be either schedule or challenge'),
  body('date').isISO8601().withMessage('Date must be a valid ISO date'),
  body('location').trim().isLength({ min: 1, max: 200 }).withMessage('Location is required and must be less than 200 characters'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
];

export const validateUser = [
  body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required and must be less than 50 characters'),
  body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required and must be less than 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().isLength({ min: 10, max: 20 }).withMessage('Valid phone number is required'),
  body('textNumber').optional().trim().isLength({ max: 20 }).withMessage('Text number must be less than 20 characters'),
  body('emergencyContactName').optional().trim().isLength({ max: 100 }).withMessage('Emergency contact name must be less than 100 characters'),
  body('emergencyContactPhone').optional().trim().isLength({ max: 20 }).withMessage('Emergency contact phone must be less than 20 characters'),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
];

export const validateChallenge = [
  body('senderName').trim().isLength({ min: 1, max: 100 }).withMessage('Sender name is required and must be less than 100 characters'),
  body('receiverName').trim().isLength({ min: 1, max: 100 }).withMessage('Receiver name is required and must be less than 100 characters'),
  body('division').trim().isLength({ min: 1, max: 100 }).withMessage('Division is required and must be less than 100 characters'),
  body('isRematch').optional().isBoolean().withMessage('isRematch must be a boolean'),
];

// Enhanced validation for admin operations
export const validateAdminAction = [
  body('action').isIn(['create', 'update', 'delete', 'approve', 'reject']).withMessage('Invalid admin action'),
  body('resource').isIn(['user', 'proposal', 'match', 'division', 'season']).withMessage('Invalid resource type'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
];

// Validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Request size limit middleware
export const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 1024 * 1024; // 1MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request entity too large',
      message: 'Request body must be less than 1MB'
    });
  }
  
  next();
};

// Basic input sanitization
export const sanitizeInput = (req, res, next) => {
  // Sanitize string fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

// Enhanced security headers middleware
export const securityHeaders = (req, res, next) => {
  // Additional security headers beyond helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// Request logging for security monitoring
export const securityLogging = (req, res, next) => {
  const startTime = Date.now();
  
  // Log suspicious requests
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS attempts
    /union\s+select/i, // SQL injection
    /eval\s*\(/i, // Code injection
  ];
  
  const requestBody = JSON.stringify(req.body);
  const requestUrl = req.url;
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(requestBody) || pattern.test(requestUrl)
  );
  
  if (isSuspicious) {
    console.warn(`🚨 SUSPICIOUS REQUEST DETECTED:`, {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      body: requestBody.substring(0, 500) // Limit log size
    });
  }
  
  // Log all requests in production
  if (process.env.NODE_ENV === 'production') {
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`🔒 SECURITY LOG: ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
    });
  }
  
  next();
};

// IP blocking middleware (for known malicious IPs)
export const ipBlocking = (req, res, next) => {
  // In production, you might want to maintain a database of blocked IPs
  const blockedIPs = process.env.BLOCKED_IPS ? process.env.BLOCKED_IPS.split(',') : [];
  
  if (blockedIPs.includes(req.ip)) {
    console.warn(`🚫 BLOCKED IP ATTEMPT: ${req.ip} - ${req.method} ${req.url}`);
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked due to suspicious activity'
    });
  }
  
  next();
};

// Content-Type validation
export const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Invalid content type',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
};

// Request timeout middleware
export const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'Request took too long to process'
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};
