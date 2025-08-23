import mongoose from 'mongoose';
import { logEvent } from './logging.js';

// Basic health check
export const basicHealthCheck = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
};

// Detailed health check with database connectivity
export const detailedHealthCheck = async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: 'unknown',
      disk: 'unknown'
    }
  };

  try {
    // Check database connectivity
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      health.checks.database = 'connected';
      
      // Test database operation
      try {
        await mongoose.connection.db.admin().ping();
        health.checks.database = 'healthy';
      } catch (pingError) {
        health.checks.database = 'connected_but_unresponsive';
        health.status = 'degraded';
      }
    } else {
      health.checks.database = 'disconnected';
      health.status = 'unhealthy';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    // Memory is healthy if heap used is less than 500MB
    if (memUsageMB.heapUsed < 500) {
      health.checks.memory = 'healthy';
    } else if (memUsageMB.heapUsed < 1000) {
      health.checks.memory = 'warning';
      if (health.status === 'ok') health.status = 'degraded';
    } else {
      health.checks.memory = 'critical';
      health.status = 'unhealthy';
    }

    health.memory = memUsageMB;

    // Check disk space (basic check)
    health.checks.disk = 'unknown'; // Would need fs.statfs for actual disk check

    // Log health check
    logEvent('info', 'Health check performed', {
      status: health.status,
      database: health.checks.database,
      memory: health.checks.memory,
      uptime: health.uptime
    });

  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    
    logEvent('error', 'Health check failed', {
      error: error.message,
      stack: error.stack
    });
  }

  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
};

// Readiness check (for Kubernetes/Render)
export const readinessCheck = async (req, res) => {
  try {
    // Check if database is ready
    const dbState = mongoose.connection.readyState;
    if (dbState !== 1) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database not connected',
        timestamp: new Date().toISOString()
      });
    }

    // Test database operation
    await mongoose.connection.db.admin().ping();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Liveness check (for Kubernetes/Render)
export const livenessCheck = (req, res) => {
  // Simple check - if we can respond, we're alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Metrics endpoint (basic)
export const metrics = (req, res) => {
  const memUsage = process.memoryUsage();
  
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    },
    database: {
      state: mongoose.connection.readyState,
      stateName: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
    }
  };

  res.json(metrics);
};
