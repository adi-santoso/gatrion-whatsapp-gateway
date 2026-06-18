import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { sessionManager } from '../index.js';
import { JOB_TYPES } from './messageQueue.js';
import { config } from '../config/env.js';

export function createWorker() {
  const worker = new Worker(
    'whatsapp:messages',
    async (job) => {
      const { sessionId, to, message, caption } = job.data;
      
      const session = await sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      if (!sessionManager.isSessionConnected(sessionId)) {
        throw new Error(`Session ${sessionId} not connected`);
      }
      
      switch (job.name) {
        case JOB_TYPES.SEND_TEXT:
          return await sessionManager.sendTextMessage(sessionId, to, message);
        
        case JOB_TYPES.SEND_IMAGE:
          return await sessionManager.sendImageMessage(sessionId, to, job.data.imageBuffer, {
            caption,
            mimetype: job.data.mimetype
          });
        
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: config.queue.concurrency,
      limiter: {
        max: config.queue.rateLimitMax,
        duration: config.queue.rateLimitDuration
      }
    }
  );
  
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed for session ${job.data.sessionId}`);
  });
  
  worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed for session ${job.data.sessionId}:`, err.message);
  });
  
  return worker;
}
