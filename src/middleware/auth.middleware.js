import { timingSafeEqual } from 'crypto';
import { config } from '../config/env.js';

export function requireAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required'
    });
  }

  try {
    const keyBuffer = Buffer.from(apiKey);
    const configBuffer = Buffer.from(config.apiKey);
    
    if (keyBuffer.length !== configBuffer.length) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    if (!timingSafeEqual(keyBuffer, configBuffer)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
}
