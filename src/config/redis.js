import { Redis } from 'ioredis';
import { config } from './env.js';

let redisClient = null;

export function getRedisConnection() {
  if (!config.redis.enabled) {
    console.warn('Redis is disabled in configuration');
    return null;
  }
  
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 50, 2000);
      }
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
  }
  
  return redisClient;
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
