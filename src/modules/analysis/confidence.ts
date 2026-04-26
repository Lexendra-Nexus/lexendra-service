export function calculateConfidence(context: any, analysis: string): number {
  let confidence = 0.5;
  if (context.context && context.context.length > 100) confidence += 0.2;
  if (context.sources && context.sources.length > 0) confidence += 0.2;
  if (analysis.length > 500) confidence += 0.1;
  return Math.min(confidence, 1.0);
}
