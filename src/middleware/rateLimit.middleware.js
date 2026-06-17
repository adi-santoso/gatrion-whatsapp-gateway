import { config } from '../config/env.js';

const store = new Map();

function cleanup() {
  const now = Date.now();
  for (const [ip, data] of store.entries()) {
    if (now > data.resetAt) {
      store.delete(ip);
    }
  }
}

export function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  cleanup();

  const record = store.get(ip);

  if (!record || now > record.resetAt) {
    store.set(ip, {
      count: 1,
      resetAt: now + config.rateLimitWindow
    });
    return next();
  }

  if (record.count >= config.rateLimitMax) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return res.status(429).json({
      success: false,
      error: 'TooManyRequests',
      message: 'Too many requests, please try again later',
      retryAfter
    });
  }

  record.count++;
  next();
}
