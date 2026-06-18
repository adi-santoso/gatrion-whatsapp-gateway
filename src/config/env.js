import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && !process.env.API_KEY) {
  throw new Error('API_KEY is required in production');
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv,
  apiKey: process.env.API_KEY || 'your-secret-api-key',
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 20,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  whatsapp: {
    sessionPath: process.env.SESSION_PATH || './auth_info_baileys',
    phoneNumber: process.env.PHONE_NUMBER || ''
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    enabled: process.env.REDIS_ENABLED === 'true'
  },
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY) || 5,
    rateLimitMax: parseInt(process.env.QUEUE_RATE_LIMIT_MAX) || 20,
    rateLimitDuration: parseInt(process.env.QUEUE_RATE_LIMIT_DURATION) || 60000
  },
  webhook: {
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT) || 10000,
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS) || 3
  }
};
