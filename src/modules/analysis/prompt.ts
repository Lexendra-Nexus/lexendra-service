import type { AnalysisRequest } from './types.js';

const prompts = {
  legal: `- Identifica los aspectos legales relevantes
- Analiza la aplicabilidad de las normativas
- Evalúa posibles interpretaciones legales
- Sugiere acciones legales apropiadas
- Identifica riesgos legales potenciales`,
  contract: `- Revisa cláusulas contractuales relevantes
- Identifica obligaciones y derechos de las partes
- Evalúa riesgos contractuales
- Sugiere modificaciones o mejoras
- Analiza cumplimiento contractual`,
  compliance: `- Verifica cumplimiento normativo
- Identifica brechas de cumplimiento
- Sugiere medidas correctivas
- Evalúa riesgos de no cumplimiento
- Recomienda mejores prácticas`,
  risk: `- Identifica riesgos legales, financieros y operativos
- Evalúa probabilidad e impacto de cada riesgo
- Clasifica riesgos por severidad
- Sugiere estrategias de mitigación
- Prioriza riesgos por importancia`,
  summary: `- Resume los puntos clave del documento/consulta
- Extrae información esencial
- Organiza la información de manera clara
- Identifica temas principales
- Proporciona un resumen ejecutivo`
};

export function buildAnalysisPrompt(request: AnalysisRequest, context: any): string {
  const basePrompt = `Eres un asistente legal especializado en análisis de documentos jurídicos.
Analiza la siguiente consulta considerando el contexto proporcionado.

CONSULTA: ${request.query}

CONTEXTO RELEVANTE:
${context.context || 'No hay contexto específico disponible'}

INSTRUCCIONES DE ANÁLISIS:
`;

  return basePrompt + (prompts[request.analysisType] || `- Proporciona un análisis general completo
- Identifica aspectos relevantes
- Sugiere recomendaciones apropiadas`);
}
