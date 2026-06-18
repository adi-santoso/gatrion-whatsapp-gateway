import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { config } from '../config/env.js';

let messageQueue = null;

function getQueue() {
  if (!config.redis.enabled) {
    throw new Error('Redis queue is disabled. Enable REDIS_ENABLED=true in .env to use queue features.');
  }
  
  if (!messageQueue) {
    messageQueue = new Queue('whatsapp-messages', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: {
          age: 3600,
          count: 1000
        },
        removeOnFail: {
          age: 86400
        }
      }
    });
  }
  
  return messageQueue;
}

export const JOB_TYPES = {
  SEND_TEXT: 'send-text',
  SEND_IMAGE: 'send-image',
  SEND_VIDEO: 'send-video',
  SEND_AUDIO: 'send-audio',
  SEND_DOCUMENT: 'send-document',
  SEND_LOCATION: 'send-location',
  SEND_CONTACT: 'send-contact',
  SEND_STICKER: 'send-sticker',
  SEND_GROUP_MESSAGE: 'send-group-message',
  WEBHOOK_DELIVERY: 'webhook-delivery'
};

export async function addMessageJob(jobType, sessionId, data, options = {}) {
  if (!config.redis.enabled) {
    throw new Error('Queue is disabled. Messages will be sent directly without queue.');
  }
  
  if (!sessionId) {
    throw new Error('sessionId is required for all queue jobs');
  }
  
  const queue = getQueue();
  return queue.add(jobType, {
    sessionId,
    ...data
  }, {
    priority: options.priority || 5,
    delay: options.delay || 0,
    ...options
  });
}

export async function getQueueStats() {
  if (!config.redis.enabled) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  }
  
  const queue = getQueue();
  const counts = await queue.getJobCounts();
  return counts;
}

export async function addWebhookJob(sessionId, eventType, payload, options = {}) {
  if (!config.redis.enabled) {
    console.warn('Queue disabled, webhook will be sent directly');
    return null;
  }
  
  if (!sessionId) {
    throw new Error('sessionId is required for webhook jobs');
  }
  
  const queue = getQueue();
  return queue.add(JOB_TYPES.WEBHOOK_DELIVERY, {
    sessionId,
    eventType,
    payload
  }, {
    priority: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    ...options
  });
}
