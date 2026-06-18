import { Router } from 'express';
import { healthCheck, getStatus } from './controllers/status.controller.js';
import { getQR } from './controllers/qr.controller.js';
import { sendText, sendImage } from './controllers/send.controller.js';
import * as sessionController from './controllers/session.controller.js';
import * as queueController from './controllers/queue.controller.js';
import { validateSendText } from '../middleware/validation.middleware.js';
import { uploadImage } from '../middleware/upload.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/qr', requireAuth, getQR);
router.get('/status', requireAuth, getStatus);
router.post('/send-text', requireAuth, rateLimit, validateSendText, sendText);
router.post('/send-image', requireAuth, rateLimit, uploadImage, sendImage);

router.post('/sessions', sessionController.createSession);
router.get('/sessions', sessionController.getAllSessions);
router.get('/sessions/:id', sessionController.getSession);
router.get('/sessions/:id/qr', sessionController.getSessionQR);
router.get('/sessions/:id/status', sessionController.getSessionStatus);
router.patch('/sessions/:id/webhook', sessionController.updateWebhook);
router.post('/sessions/:id/logout', sessionController.logoutSession);
router.delete('/sessions/:id', sessionController.deleteSession);

router.get('/queue/stats', queueController.getStats);
router.get('/queue/jobs/:jobId', queueController.getJob);

export default router;
