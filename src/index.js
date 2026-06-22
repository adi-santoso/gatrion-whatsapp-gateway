import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { config } from './config/env.js';
import { initializeClient, disconnect } from './whatsapp/client.js';
import routes from './api/routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { securityHeaders } from './middleware/security.middleware.js';
import { validateEnvironment } from './utils/validateEnv.js';
import WebSocketServer from './websocket/server.js';
import SessionManager from './whatsapp/sessionManager.js';
import { createWorker } from './queue/workers.js';
import { closeRedis } from './config/redis.js';

export const sessionManager = new SessionManager({});

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(securityHeaders);
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Serve dashboard static files BEFORE API routes
app.use('/dashboard', express.static(path.join(__dirname, '../dashboard/dist'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Fix dashboard asset paths (HTML references /assets/* not /dashboard/assets/*)
app.use('/assets', express.static(path.join(__dirname, '../dashboard/dist/assets'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Dashboard SPA fallback
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

// Initialize and start
let server;
let queueWorker;

async function start() {
  try {
    validateEnvironment();
    
    await sessionManager.restoreAllSessions();
    
    // Old single-session client removed - using SessionManager for multi-session
    // await initializeClient();
    
    const wsServer = new WebSocketServer(httpServer);
    wsServer.initialize();
    sessionManager.setWebSocketServer(wsServer);
    console.log('WebSocket server initialized');
    
    // Start queue worker only if Redis is available
    if (config.redis.enabled) {
      try {
        queueWorker = createWorker();
        console.log('Queue worker started');
      } catch (err) {
        console.warn('Queue worker failed to start:', err.message);
      }
    } else {
      console.log('Queue worker disabled (Redis not available)');
    }
    
    server = httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Dashboard: http://localhost:${config.port}/dashboard`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      });
    }
    
    if (queueWorker) {
      await queueWorker.close();
      console.log('Queue worker closed');
    }
    
    if (sessionManager) {
      await sessionManager.shutdownAll();
      console.log('All sessions closed');
    }
    
    await disconnect();
    console.log('WhatsApp client disconnected');
    
    if (config.redis.enabled) {
      await closeRedis();
      console.log('Redis connection closed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Timeout for forced shutdown
const SHUTDOWN_TIMEOUT = 30000;

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  // Don't shutdown on unhandled rejection in development
  if (config.nodeEnv === 'production') {
    shutdown('unhandledRejection');
  }
});

start();
