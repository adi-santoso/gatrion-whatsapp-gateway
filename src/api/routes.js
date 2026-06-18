import { Router } from 'express';
import { healthCheck, getStatus } from './controllers/status.controller.js';
import { getQR } from './controllers/qr.controller.js';
import { sendText, sendImage } from './controllers/send.controller.js';
import * as sessionController from './controllers/session.controller.js';
import * as queueController from './controllers/queue.controller.js';
import * as mediaController from './controllers/media.controller.js';
import * as groupController from './controllers/group.controller.js';
import { validateSendText } from '../middleware/validation.middleware.js';
import { uploadImage, uploadVideo, uploadAudio, uploadDocument, uploadSticker } from '../middleware/upload.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { rateLimit } from '../middleware/rateLimit.middleware.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/qr', requireAuth, getQR);
router.get('/status', requireAuth, getStatus);
router.post('/send-text', requireAuth, rateLimit, validateSendText, sendText);
router.post('/send-image', requireAuth, rateLimit, uploadImage, sendImage);

router.post('/send-video', uploadVideo, mediaController.sendVideo);
router.post('/send-audio', uploadAudio, mediaController.sendAudio);
router.post('/send-document', uploadDocument, mediaController.sendDocument);
router.post('/send-location', mediaController.sendLocation);
router.post('/send-contact', mediaController.sendContact);
router.post('/send-sticker', uploadSticker, mediaController.sendSticker);

router.post('/sessions', sessionController.createSession);
router.get('/sessions', sessionController.getAllSessions);
router.get('/sessions/:id', sessionController.getSession);
router.get('/sessions/:id/qr', sessionController.getSessionQR);
router.get('/sessions/:id/status', sessionController.getSessionStatus);
router.patch('/sessions/:id/webhook', sessionController.updateWebhook);
router.post('/sessions/:id/webhook/test', sessionController.testWebhook);
router.post('/sessions/:id/logout', sessionController.logoutSession);
router.delete('/sessions/:id', sessionController.deleteSession);

router.get('/queue/stats', queueController.getStats);
router.get('/queue/jobs/:jobId', queueController.getJob);

router.get('/groups', groupController.listGroups);
router.get('/groups/:id', groupController.getGroupDetails);
router.post('/groups/create', groupController.createGroup);
router.put('/groups/:id', groupController.updateGroup);
router.post('/groups/:id/participants', groupController.addParticipants);
router.delete('/groups/:id/participants', groupController.removeParticipants);
router.post('/groups/:id/promote', groupController.promoteParticipants);
router.post('/groups/:id/demote', groupController.demoteParticipants);
router.post('/groups/:id/leave', groupController.leaveGroup);
router.get('/groups/:id/invite', groupController.getInviteCode);
router.post('/groups/:id/send', groupController.sendToGroup);

export default router;
