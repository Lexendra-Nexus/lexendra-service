import { contextCompressor } from '../../modules/lightRag/compressor.js';
import { logInfo } from '../../utils/logger.js';

export function buildContext(question: string, relevantDocs: any[]): string {
  if (relevantDocs.length === 0) {
    return `No se encontraron documentos relevantes para la pregunta: ${question}`;
  }

  logInfo(`Building context for ${relevantDocs.length} documents`);

  if (relevantDocs.length > 3) {
    const compressed = contextCompressor.compressContext(relevantDocs, question, 1500);
    return `Contexto de documentos legales:

${compressed.compressedText}

Pregunta: ${question}`;
  }

  const contextText = relevantDocs.map(doc => doc.text).join('\n\n---\n\n');
  return `Contexto de documentos legales:\n\n${contextText}\n\nPregunta: ${question}`;
}
