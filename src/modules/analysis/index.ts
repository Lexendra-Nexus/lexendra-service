import { llmService } from '../../services/llm.service.js';
import { ragService } from '../../services/rag.service.js';
import { logInfo, logError } from '../../utils/logger.js';
import { buildAnalysisPrompt } from './prompt.js';
import { extractRecommendations, extractRisks } from './extractors.js';
import { calculateConfidence } from './confidence.js';
import type { AnalysisRequest, AnalysisResult } from './types.js';

export class AnalysisService {
  async analyzeLegalDocument(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      logInfo(`Iniciando análisis ${request.analysisType} para consulta: ${request.query}`);
      const ragContext = await ragService.queryRAG(request.query, { k: 5 });
      const analysisPrompt = buildAnalysisPrompt(request, ragContext);
      const analysis = await llmService.generateResponse(analysisPrompt, request.query);
      const recommendations = extractRecommendations(analysis);
      const risks = extractRisks(analysis);
      const confidence = calculateConfidence(ragContext, analysis);

      return {
        analysis,
        recommendations,
        risks,
        sources: ragContext.sources || [],
        confidence
      };
    } catch (error) {
      logError('Error en análisis legal', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Analysis failed: ${message}`);
    }
  }

  async generateLegalReport(request: AnalysisRequest): Promise<string> {
    const analysis = await this.analyzeLegalDocument(request);

    return `# REPORTE DE ANÁLISIS LEGAL

## Consulta Analizada
${request.query}

## Tipo de Análisis
${request.analysisType.toUpperCase()}

## Análisis Detallado
${analysis.analysis}

## Recomendaciones
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## Riesgos Identificados
${analysis.risks.map(risk => `- ${risk}`).join('\n')}

## Fuentes Consultadas
${analysis.sources.map((source, index) => `${index + 1}. ${source.filename || 'Documento sin nombre'}`).join('\n')}

## Nivel de Confianza
${Math.round(analysis.confidence * 100)}%

---
*Reporte generado automáticamente por Lexentra AI - ${new Date().toISOString()}*`;
  }
}

export const analysisService = new AnalysisService();
