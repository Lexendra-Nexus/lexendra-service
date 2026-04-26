import type { Request, Response } from 'express';
import { analysisService } from '../services/analysis.service.js';

interface AnalysisRequest {
  query: string;
  context?: string;
  analysisType: 'legal' | 'contract' | 'compliance' | 'risk' | 'summary';
  chatId?: string;
}

export class AnalysisController {
  async analyze(req: Request, res: Response) {
    try {
      const request: AnalysisRequest = req.body;

      if (!request.query || !request.analysisType) {
        return res.status(400).json({
          error: 'Query and analysisType are required'
        });
      }

      const result = await analysisService.analyzeLegalDocument(request);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Error performing analysis' });
    }
  }

  async generateReport(req: Request, res: Response) {
    try {
      const request: AnalysisRequest = req.body;

      if (!request.query || !request.analysisType) {
        return res.status(400).json({
          error: 'Query and analysisType are required'
        });
      }

      const report = await analysisService.generateLegalReport(request);

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="legal-report.md"');
      res.send(report);
    } catch (error) {
      res.status(500).json({ error: 'Error generating report' });
    }
  }

  async getAnalysisTypes(req: Request, res: Response) {
    res.json({
      types: [
        {
          id: 'legal',
          name: 'Análisis Legal General',
          description: 'Análisis completo de aspectos legales'
        },
        {
          id: 'contract',
          name: 'Análisis Contractual',
          description: 'Revisión de cláusulas y obligaciones contractuales'
        },
        {
          id: 'compliance',
          name: 'Análisis de Cumplimiento',
          description: 'Verificación de cumplimiento normativo'
        },
        {
          id: 'risk',
          name: 'Análisis de Riesgos',
          description: 'Identificación y evaluación de riesgos'
        },
        {
          id: 'summary',
          name: 'Resumen Ejecutivo',
          description: 'Resumen conciso de documentos y consultas'
        }
      ]
    });
  }
}

export const analysisController = new AnalysisController();