import { logInfo } from '../../utils/logger.js';

export interface DocumentToRerank {
  text: string;
  metadata?: Record<string, any>;
  score?: number;
}

export class Reranker {
  rerankByDiversity(documents: DocumentToRerank[], topK: number = 4): DocumentToRerank[] {
    if (documents.length <= topK) return documents;

    logInfo(`Reranking ${documents.length} documents by diversity, selecting top ${topK}`);

    const selected: DocumentToRerank[] = [];

    // Start with the highest-scored document
    const firstDocument = documents[0];
    if (firstDocument) {
      selected.push(firstDocument);
    }

    // Add documents that are most different from already selected ones
    for (let i = 1; i < documents.length && selected.length < topK; i++) {
      const candidate = documents[i];
      if (!candidate) continue;

      let maxSimilarity = 0;

      // Calculate maximum similarity to already selected documents
      for (const selectedDoc of selected) {
        const similarity = this.calculateSimilarity(candidate.text, selectedDoc.text);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // Only add if similarity is below threshold (ensuring diversity)
      if (maxSimilarity < 0.7) {
        selected.push(candidate);
      }
    }

    return selected;
  }

  rerankByRelevance(documents: DocumentToRerank[], question: string, topK: number = 4): DocumentToRerank[] {
    logInfo(`Reranking ${documents.length} documents by relevance to question`);

    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // Recalculate scores based on question relevance
    documents.forEach(doc => {
      const relevanceScore = this.calculateRelevanceScore(doc.text, questionWords);
      doc.score = relevanceScore;
    });

    // Sort by new relevance score
    documents.sort((a, b) => (b.score || 0) - (a.score || 0));

    return documents.slice(0, topK);
  }

  rerankByRecency(documents: DocumentToRerank[], topK: number = 4): DocumentToRerank[] {
    logInfo(`Reranking ${documents.length} documents by recency`);

    // Sort by upload date if available in metadata
    documents.sort((a, b) => {
      const dateA = a.metadata?.uploadedAt ? new Date(a.metadata.uploadedAt).getTime() : 0;
      const dateB = b.metadata?.uploadedAt ? new Date(b.metadata.uploadedAt).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

    return documents.slice(0, topK);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Jaccard similarity based on word overlap
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private calculateRelevanceScore(text: string, questionWords: string[]): number {
    const textWords = text.toLowerCase().split(/\s+/);
    let score = 0;

    questionWords.forEach(qWord => {
      const matches = textWords.filter(tWord =>
        tWord.includes(qWord) || this.isSimilarWord(tWord, qWord)
      ).length;
      score += matches;
    });

    return score / Math.max(textWords.length, 1);
  }

  private isSimilarWord(word1: string, word2: string): boolean {
    // Simple stemming check (remove common suffixes)
    const stem1 = word1.replace(/(ing|ed|er|est|s)$/, '');
    const stem2 = word2.replace(/(ing|ed|er|est|s)$/, '');

    return stem1 === stem2 && Math.abs(word1.length - word2.length) <= 2;
  }
}

export const reranker = new Reranker();