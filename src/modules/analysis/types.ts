export interface AnalysisRequest {
  query: string;
  context?: string;
  analysisType: 'legal' | 'contract' | 'compliance' | 'risk' | 'summary';
  chatId?: string;
}

export interface AnalysisResult {
  analysis: string;
  recommendations: string[];
  risks: string[];
  sources: any[];
  confidence: number;
}
