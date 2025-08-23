import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom token for request body size
morgan.token('body-size', (req) => {
  return req.headers['content-length'] || '0';
});

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req, res) => {
  if (!res._header || !req._startAt) return '';
  const diff = process.hrtime(req._startAt);
  const ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(2);
});

// Custom token for user agent
morgan.token('user-agent', (req) => {
  return req.get('User-Agent') || 'Unknown';
});

// Custom token for referrer
morgan.token('referrer', (req) => {
  return req.get('Referrer') || 'Direct';
});

// Development format
const devFormat = ':method :url :status :response-time-ms ms - :body-size bytes';

// Production format (more detailed)
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Error format (for error logging)
const errorFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Create a stream for access logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Create a stream for error logs
const errorLogStream = fs.createWriteStream(
  path.join(logsDir, 'error.log'),
  { flags: 'a' }
);

// Create a stream for combined logs
const combinedLogStream = fs.createWriteStream(
  path.join(logsDir, 'combined.log'),
  { flags: 'a' }
);

// Development logging middleware
export const devLogging = morgan(devFormat, {
  stream: {
    write: (message) => {
      console.log(message.trim());
      accessLogStream.write(message);
    }
  }
});

// Production logging middleware
export const prodLogging = morgan(prodFormat, {
  stream: {
    write: (message) => {
      accessLogStream.write(message);
      combinedLogStream.write(message);
    }
  }
});

// Error logging middleware
export const errorLogging = morgan(errorFormat, {
  skip: (req, res) => res.statusCode < 400,
  stream: {
    write: (message) => {
      errorLogStream.write(message);
      combinedLogStream.write(message);
    }
  }
});

// Custom logging function for application events
export const logEvent = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    pid: process.pid
  };

  const logMessage = JSON.stringify(logEntry) + '\n';
  
  // Write to appropriate log file based on level
  switch (level.toLowerCase()) {
    case 'error':
      errorLogStream.write(logMessage);
      console.error(`[${timestamp}] ERROR: ${message}`, data);
      break;
    case 'warn':
      console.warn(`[${timestamp}] WARN: ${message}`, data);
      break;
    case 'info':
      console.log(`[${timestamp}] INFO: ${message}`, data);
      break;
    case 'debug':
      console.log(`[${timestamp}] DEBUG: ${message}`, data);
      break;
    default:
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
  }
  
  // Always write to combined log
  combinedLogStream.write(logMessage);
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request start
  logEvent('info', 'Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referrer: req.get('Referrer')
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log request completion
    logEvent('info', 'Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || '0'
    });
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Error logging middleware
export const errorLogger = (err, req, res, next) => {
  logEvent('error', 'Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next(err);
};

// Database operation logging
export const logDatabaseOperation = (operation, collection, duration, success, error = null) => {
  const data = {
    operation,
    collection,
    duration: `${duration}ms`,
    success
  };
  
  if (error) {
    data.error = error.message;
    logEvent('error', 'Database operation failed', data);
  } else {
    logEvent('info', 'Database operation completed', data);
  }
};

// Security event logging
export const logSecurityEvent = (event, details) => {
  logEvent('warn', `Security event: ${event}`, {
    ...details,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown'
  });
};
