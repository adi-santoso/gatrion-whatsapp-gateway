import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  const response = {
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message,
    timestamp: new Date()
  };

  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode || 500).json(response);
}
