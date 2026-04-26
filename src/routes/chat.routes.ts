import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { upload } from '../controllers/document.controller.js';

const router = Router();

router.post('/query', chatController.query.bind(chatController));
router.post('/query-multimodal', upload.single('file'), chatController.queryMultimodal.bind(chatController));
router.post('/query/stream', chatController.queryStream.bind(chatController));
router.post('/query-multimodal/stream', upload.single('file'), chatController.queryMultimodalStream.bind(chatController));
router.get('/:chatId', chatController.getChat.bind(chatController));
router.delete('/:chatId', chatController.clearChat.bind(chatController));

export default router;