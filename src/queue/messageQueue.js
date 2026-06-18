import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';

export const messageQueue = new Queue('whatsapp:messages', {
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

export const JOB_TYPES = {
  SEND_TEXT: 'send-text',
  SEND_IMAGE: 'send-image'
};

export async function addMessageJob(jobType, sessionId, data, options = {}) {
  if (!sessionId) {
    throw new Error('sessionId is required for all queue jobs');
  }
  
  return messageQueue.add(jobType, {
    sessionId,
    ...data
  }, {
    priority: options.priority || 5,
    delay: options.delay || 0,
    ...options
  });
}

export async function getQueueStats() {
  const counts = await messageQueue.getJobCounts();
  return counts;
}
