import { Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { sessionManager } from '../index.js';
import { JOB_TYPES } from './messageQueue.js';
import { config } from '../config/env.js';
import { webhookService } from '../services/webhookService.js';
import { bulkService } from '../services/bulkService.js';
import { analyticsService } from '../services/analyticsService.js';
import { loggerService } from '../services/loggerService.js';

export function createWorker() {
  if (!config.redis.enabled) {
    throw new Error('Redis is disabled, worker cannot be created');
  }
  
  const worker = new Worker(
    'whatsapp-messages',
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
          analyticsService.trackMessageSent(sessionId, 'text');
          loggerService.info(sessionId, 'Message sent', { jobId: job.id, to });
          return result;
        
        case JOB_TYPES.SEND_IMAGE:
          result = await sessionManager.sendImageMessage(sessionId, to, job.data.imageBuffer, {
            caption,
            mimetype: job.data.mimetype
          });
          analyticsService.trackMessageSent(sessionId, 'image');
          loggerService.info(sessionId, 'Image sent', { jobId: job.id, to });
          return result;
        
        case JOB_TYPES.SEND_VIDEO:
          result = await sessionManager.sendVideoMessage(sessionId, to, job.data.videoBuffer, {
            caption,
            mimetype: job.data.mimetype
          });
          analyticsService.trackMessageSent(sessionId, 'video');
          loggerService.info(sessionId, 'Video sent', { jobId: job.id, to });
          return result;

        case JOB_TYPES.SEND_AUDIO:
          result = await sessionManager.sendAudioMessage(sessionId, to, job.data.audioBuffer, {
            ptt: job.data.ptt,
            mimetype: job.data.mimetype
          });
          analyticsService.trackMessageSent(sessionId, 'audio');
          loggerService.info(sessionId, 'Audio sent', { jobId: job.id, to });
          return result;

        case JOB_TYPES.SEND_DOCUMENT:
          result = await sessionManager.sendDocumentMessage(sessionId, to, job.data.documentBuffer, {
            filename: job.data.filename,
            caption,
            mimetype: job.data.mimetype
          });
          analyticsService.trackMessageSent(sessionId, 'document');
          loggerService.info(sessionId, 'Document sent', { jobId: job.id, to });
          return result;

        case JOB_TYPES.SEND_LOCATION:
          result = await sessionManager.sendLocationMessage(sessionId, to, {
            latitude: job.data.latitude,
            longitude: job.data.longitude,
            name: job.data.name,
            address: job.data.address
          });
          analyticsService.trackMessageSent(sessionId, 'location');
          loggerService.info(sessionId, 'Location sent', { jobId: job.id, to });
          return result;

        case JOB_TYPES.SEND_CONTACT:
          result = await sessionManager.sendContactMessage(sessionId, to, job.data.contact);
          analyticsService.trackMessageSent(sessionId, 'contact');
          loggerService.info(sessionId, 'Contact sent', { jobId: job.id, to });
          return result;

        case JOB_TYPES.SEND_STICKER:
          result = await sessionManager.sendStickerMessage(sessionId, to, job.data.stickerBuffer, {
            mimetype: job.data.mimetype
          });
          analyticsService.trackMessageSent(sessionId, 'sticker');
          loggerService.info(sessionId, 'Sticker sent', { jobId: job.id, to });
          return result;

        case JOB_TYPES.SEND_GROUP_MESSAGE:
          result = await sessionManager.sendGroupMessage(
            sessionId, 
            job.data.groupId, 
            job.data.message,
            { mentions: job.data.mentions }
          );
          analyticsService.trackMessageSent(sessionId, 'group');
          loggerService.info(sessionId, 'Group message sent', { jobId: job.id, groupId: job.data.groupId });
          return result;
        
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
    analyticsService.trackMessageFailed(job.data.sessionId);
    loggerService.error(job.data.sessionId, 'Message failed', { jobId: job.id, error: err.message });
  });
  
  return worker;
}
