import { contextCompressor } from '../../modules/lightRag/compressor.js';
import { logInfo, logError } from '../../utils/logger.js';

export function buildContext(question: string, relevantDocs: any[]): string {
  // Manejar caso cuando relevantDocs es undefined o no es un array
  if (!relevantDocs || !Array.isArray(relevantDocs)) {
    logError('buildContext: relevantDocs is undefined or not an array', { question, relevantDocs });
    return `No se encontró información documental disponible para: ${question}`;
  }

  if (relevantDocs.length === 0) {
    return `No se encontraron documentos relevantes para la pregunta: ${question}`;
  }

  logInfo(`Building context for ${relevantDocs.length} documents`);

  try {
    if (relevantDocs.length > 3) {
      const compressed = contextCompressor.compressContext(relevantDocs, question, 1500);
      return `Contexto de documentos legales:

${compressed.compressedText}

Pregunta: ${question}`;
    }

    const contextText = relevantDocs.map(doc => doc.text || doc.content || JSON.stringify(doc)).join('\n\n---\n\n');
    return `Contexto de documentos legales:\n\n${contextText}\n\nPregunta: ${question}`;
  } catch (error) {
    logError('Error building context', error);
    return `No se pudo construir el contexto para: ${question}`;
  }
}
