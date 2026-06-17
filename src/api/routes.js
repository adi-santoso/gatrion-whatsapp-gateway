import { Router } from 'express';
import { healthCheck, getStatus } from './controllers/status.controller.js';
import { getQR } from './controllers/qr.controller.js';
import { sendText } from './controllers/send.controller.js';
import { validateSendText } from '../middleware/validation.middleware.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/qr', getQR);
router.get('/status', getStatus);
router.post('/send-text', validateSendText, sendText);

export default router;
