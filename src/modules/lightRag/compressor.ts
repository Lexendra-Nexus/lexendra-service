import { logInfo } from '../../utils/logger.js';

export interface CompressedContext {
  originalDocuments: any[];
  compressedText: string;
  compressionRatio: number;
  keyPoints: string[];
}

export class ContextCompressor {
  compressContext(documents: any[], question: string, maxTokens: number = 2000): CompressedContext {
    logInfo(`Compressing context for ${documents.length} documents, max tokens: ${maxTokens}`);

    // Extract key sentences most relevant to the question
    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const relevantSentences: Array<{text: string, score: number, docIndex: number}> = [];

    documents.forEach((doc, docIndex) => {
      const sentences = this.splitIntoSentences(doc.text);

      sentences.forEach(sentence => {
        const score = this.calculateRelevanceScore(sentence, questionWords);
        if (score > 0.1) { // Only keep somewhat relevant sentences
          relevantSentences.push({
            text: sentence,
            score,
            docIndex
          });
        }
      });
    });

    // Sort by relevance and limit by token count
    relevantSentences.sort((a, b) => b.score - a.score);

    let compressedText = '';
    let totalTokens = 0;
    const selectedSentences: string[] = [];

    for (const sentence of relevantSentences) {
      const tokens = Math.ceil(sentence.text.length / 4);
      if (totalTokens + tokens <= maxTokens) {
        compressedText += sentence.text + ' ';
        selectedSentences.push(sentence.text);
        totalTokens += tokens;
      } else {
        break;
      }
    }

    const originalTotalTokens = documents.reduce((sum, doc) =>
      sum + Math.ceil(doc.text.length / 4), 0
    );

    const compressionRatio = originalTotalTokens > 0 ? totalTokens / originalTotalTokens : 1;

    return {
      originalDocuments: documents,
      compressedText: compressedText.trim(),
      compressionRatio,
      keyPoints: selectedSentences
    };
  }

  private splitIntoSentences(text: string): string[] {
    // Split by sentence endings, keeping the punctuation
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  private calculateRelevanceScore(sentence: string, questionWords: string[]): number {
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    let score = 0;

    questionWords.forEach(qWord => {
      const matches = sentenceWords.filter(sWord =>
        sWord.includes(qWord) || qWord.includes(sWord)
      ).length;
      score += matches;
    });

    // Normalize by sentence length to avoid bias towards long sentences
    return score / Math.max(sentenceWords.length, 1);
  }

  extractKeyPoints(text: string, maxPoints: number = 5): string[] {
    const sentences = this.splitIntoSentences(text);
    // Simple extraction: take first few sentences as key points
    return sentences.slice(0, maxPoints).map(s => s.trim());
  }
}

export const contextCompressor = new ContextCompressor();