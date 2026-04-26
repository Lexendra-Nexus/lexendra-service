import { Router } from 'express';
import { documentController, upload } from '../controllers/document.controller.js';

const router = Router();

router.post('/', upload.single('file'), documentController.uploadDocument.bind(documentController));
router.post('/batch', upload.array('files', 10), documentController.uploadBatch.bind(documentController));
router.get('/', documentController.getDocuments.bind(documentController));
router.get('/search', documentController.searchDocuments.bind(documentController));
router.get('/:id', documentController.getDocument.bind(documentController));
router.delete('/:id', documentController.deleteDocument.bind(documentController));

export default router;
