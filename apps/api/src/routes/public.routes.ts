import { Router } from 'express';
import * as publicController from '../controllers/public.controller.js';

const router = Router();

router.get('/menu/:slug', publicController.getPublicMenu);
router.post('/menu/:slug/scan', publicController.recordScan);

export default router;
