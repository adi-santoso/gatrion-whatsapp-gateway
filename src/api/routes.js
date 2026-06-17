import { Router } from 'express';
import { healthCheck, getStatus } from './controllers/status.controller.js';
import { getQR } from './controllers/qr.controller.js';

const router = Router();

router.get('/health', healthCheck);
router.get('/qr', getQR);
router.get('/status', getStatus);

export default router;
