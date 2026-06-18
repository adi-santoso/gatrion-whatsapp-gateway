import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { sessionManager } from '../index.js';
import { JOB_TYPES } from './messageQueue.js';
import { config } from '../config/env.js';
import { webhookService } from '../services/webhookService.js';
import { bulkService } from '../services/bulkService.js';

export function createWorker() {
  const worker = new Worker(
    'whatsapp:messages',
    async (job) => {
      const { sessionId } = job.data;
      
      // Handle webhook delivery
      if (job.name === JOB_TYPES.WEBHOOK_DELIVERY) {
        const { eventType, payload } = job.data;
        const session = await sessionManager.getSession(sessionId);
        
        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }
        
        await webhookService.sendWebhook(session, eventType, payload);
        return { status: 'webhook_sent' };
      }
      
      // Handle message sending
      const { to, message, caption } = job.data;
      
      const session = await sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      if (!sessionManager.isSessionConnected(sessionId)) {
        throw new Error(`Session ${sessionId} not connected`);
      }
      
      let result;
      
      switch (job.name) {
        case JOB_TYPES.SEND_TEXT:
          result = await sessionManager.sendTextMessage(sessionId, to, message);
          if (job.data.bulkJobId) {
            bulkService.updateJobProgress(job.data.bulkJobId, true);
          }
          return result;
        
        case JOB_TYPES.SEND_IMAGE:
          return await sessionManager.sendImageMessage(sessionId, to, job.data.imageBuffer, {
            caption,
            mimetype: job.data.mimetype
          });
        
        case JOB_TYPES.SEND_VIDEO:
          return await sessionManager.sendVideoMessage(sessionId, to, job.data.videoBuffer, {
            caption,
            mimetype: job.data.mimetype
          });

        case JOB_TYPES.SEND_AUDIO:
          return await sessionManager.sendAudioMessage(sessionId, to, job.data.audioBuffer, {
            ptt: job.data.ptt,
            mimetype: job.data.mimetype
          });

        case JOB_TYPES.SEND_DOCUMENT:
          return await sessionManager.sendDocumentMessage(sessionId, to, job.data.documentBuffer, {
            filename: job.data.filename,
            caption,
            mimetype: job.data.mimetype
          });

        case JOB_TYPES.SEND_LOCATION:
          return await sessionManager.sendLocationMessage(sessionId, to, {
            latitude: job.data.latitude,
            longitude: job.data.longitude,
            name: job.data.name,
            address: job.data.address
          });

        case JOB_TYPES.SEND_CONTACT:
          return await sessionManager.sendContactMessage(sessionId, to, job.data.contact);

        case JOB_TYPES.SEND_STICKER:
          return await sessionManager.sendStickerMessage(sessionId, to, job.data.stickerBuffer, {
            mimetype: job.data.mimetype
          });

        case JOB_TYPES.SEND_GROUP_MESSAGE:
          return await sessionManager.sendGroupMessage(
            sessionId, 
            job.data.groupId, 
            job.data.message,
            { mentions: job.data.mentions }
          );
        
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
    if (job.data.bulkJobId) {
      bulkService.updateJobProgress(job.data.bulkJobId, false);
    }
  });
  
  return worker;
}
