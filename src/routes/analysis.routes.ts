import { Router } from 'express';
import { analysisController } from '../controllers/analysis.controller.js';

const router = Router();

router.post('/analyze', analysisController.analyze.bind(analysisController));
router.post('/report', analysisController.generateReport.bind(analysisController));
router.get('/types', analysisController.getAnalysisTypes.bind(analysisController));

export default router;