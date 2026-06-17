import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initializeClient, disconnect } from './whatsapp/client.js';
import routes from './api/routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { securityHeaders } from './middleware/security.middleware.js';
import { validateEnvironment } from './utils/validateEnv.js';

const app = express();

// Middleware
app.use(securityHeaders);
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

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

async function start() {
  try {
    // Validate environment
    validateEnvironment();
    
    // Initialize WhatsApp client first
    console.log('Initializing WhatsApp client...');
    await initializeClient();
    
    // Start HTTP server
    server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  
  await disconnect();
  console.log('WhatsApp client disconnected');
  
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

start();
