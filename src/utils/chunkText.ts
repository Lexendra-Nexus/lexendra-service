const TOKENS_PER_CHUNK = 512;
const OVERLAP_TOKENS = 50;
const SENTENCES_BUFFER = 2;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitBySentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.map(s => s.trim());
}

function splitByParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter(p => p.trim());
}

export interface TextChunk {
  text: string;
  tokens: number;
  startChar: number;
  endChar: number;
}

export function chunkText(text: string, maxTokens: number = TOKENS_PER_CHUNK): TextChunk[] {
  if (!text || !text.trim()) return [];

  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let chunkStartChar = 0;

  const paragraphs = splitByParagraphs(text);

  for (const paragraph of paragraphs) {
    const sentences = splitBySentences(paragraph);

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);
      const currentTokens = estimateTokens(currentChunk);

      if (currentTokens + sentenceTokens > maxTokens && currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          tokens: currentTokens,
          startChar: chunkStartChar,
          endChar: chunkStartChar + currentChunk.length
        });

        const previousSentences = splitBySentences(currentChunk);
        const overlapSentences = previousSentences.slice(-SENTENCES_BUFFER).join(' ');
        currentChunk = overlapSentences + ' ' + sentence;
        chunkStartChar += currentChunk.length;
      } else {
        currentChunk += (currentChunk.trim() ? ' ' : '') + sentence.trim();
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      tokens: estimateTokens(currentChunk),
      startChar: chunkStartChar,
      endChar: chunkStartChar + currentChunk.length
    });
  }

  return chunks;
}