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
  }
};
