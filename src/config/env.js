import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || 'your-secret-api-key',
  whatsapp: {
    sessionPath: process.env.SESSION_PATH || './auth_info_baileys',
    phoneNumber: process.env.PHONE_NUMBER || ''
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
