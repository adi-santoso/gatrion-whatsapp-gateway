import { Router } from 'express';
import { healthCheck, getStatus } from './controllers/status.controller.js';
import { getQR } from './controllers/qr.controller.js';
import { sendText, sendImage } from './controllers/send.controller.js';
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

export default router;
