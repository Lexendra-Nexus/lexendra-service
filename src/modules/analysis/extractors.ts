export function extractRecommendations(analysis: string): string[] {
  return analysis
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('recomend') || lower.includes('suger') || /^[-*•]/.test(line);
    })
    .map(line => line.replace(/^[-*•]\s*/, ''))
    .slice(0, 5);
}

export function extractRisks(analysis: string): string[] {
  return analysis
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      const lower = line.toLowerCase();
      return lower.includes('riesgo') || lower.includes('pelig') || lower.includes('advertenc') || /^[-*•]/.test(line);
    })
    .map(line => line.replace(/^[-*•]\s*/, ''))
    .slice(0, 5);
}
