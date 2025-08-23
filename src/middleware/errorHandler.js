// Production-ready error handling middleware

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details for debugging
  console.error('🚨 ERROR HANDLED:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AuthenticationError(message);
  }

  // Stream Chat errors
  if (err.name === 'StreamChatError') {
    const message = 'Chat service error';
    error = new AppError(message, 500);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    const message = 'Database connection error';
    error = new AppError(message, 503);
  }

  // Rate limit errors
  if (err.status === 429) {
    const message = 'Too many requests, please try again later';
    error = new AppError(message, 429);
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    const message = 'Cross-origin request not allowed';
    error = new AuthorizationError(message);
  }

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.status = 'error';
  }

  // Production vs Development error responses
  if (process.env.NODE_ENV === 'production') {
    // In production, don't leak error details
    if (error.isOperational) {
      // Operational errors - send message to client
      res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    } else {
      // Programming or unknown errors - don't leak error details
      console.error('💥 UNEXPECTED ERROR:', error);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
      });
    }
  } else {
    // Development - send full error details
    res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      stack: error.stack,
      error: error
    });
  }
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Graceful shutdown handler
export const gracefulShutdown = (server) => {
  return (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = (err) => {
  console.error('💥 UNHANDLED PROMISE REJECTION:', err);
  console.error('Stack:', err.stack);
  
  // Close server & exit process
  process.exit(1);
};

// Uncaught exception handler
export const handleUncaughtException = (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
  console.error('Stack:', err.stack);
  
  // Close server & exit process
  process.exit(1);
};

// Setup global error handlers
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
};
