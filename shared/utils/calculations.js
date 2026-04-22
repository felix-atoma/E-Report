export function calculateOverallAverage(grades) {
  if (!grades || grades.length === 0) return 0;
  const totalPoints = grades.reduce((sum, g) => sum + g.score * g.coefficient, 0);
  const totalCoefficients = grades.reduce((sum, g) => sum + g.coefficient, 0);
  if (totalCoefficients === 0) return 0;
  return Math.round((totalPoints / totalCoefficients) * 100) / 100;
}

export function calculateWeightedScore(score, coefficient) {
  return Math.round(score * coefficient * 100) / 100;
}
