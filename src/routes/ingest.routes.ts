import { Router } from 'express';
import { ingestController, upload } from '../controllers/ingest.controller.js';

const router = Router();

router.post('/batch', upload.array('files', 20), ingestController.ingestBatch.bind(ingestController));
router.get('/status', ingestController.ingestStatus.bind(ingestController));

export default router;