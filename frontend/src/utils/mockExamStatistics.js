export function getMockExamStatistics(students, scale) {
  const scoreScale = Number(scale);
  const validScale = Number.isFinite(scoreScale) && scoreScale > 0 ? scoreScale : 20;
  const averages = students.flatMap((student) => {
    if (student.average == null) return [];
    const score = Number(student.average);
    if (!Number.isFinite(score)) return [];
    return [{
      score,
      percentage: (score / validScale) * 100,
      studentName: student.studentName || 'Élève sans nom',
    }];
  });
  const average = averages.length
    ? averages.reduce((sum, result) => sum + result.percentage, 0) / averages.length
    : null;
  const highest = averages.length ? Math.max(...averages.map((result) => result.score)) : null;
  const lowest = averages.length ? Math.min(...averages.map((result) => result.score)) : null;
  const studentsAt = (value) => averages
    .filter((result) => result.score === value)
    .map((result) => result.studentName);
  const groupedAverages = new Map();

  averages.forEach((result) => {
    const key = result.score.toFixed(2);
    if (!groupedAverages.has(key)) {
      groupedAverages.set(key, {
        score: Number(key),
        percentage: (Number(key) / validScale) * 100,
        students: [],
      });
    }
    groupedAverages.get(key).students.push(result.studentName);
  });

  const distribution = [...groupedAverages.values()]
    .sort((a, b) => a.score - b.score)
    .map((result) => ({
      ...result,
      count: result.students.length,
      share: averages.length ? (result.students.length / averages.length) * 100 : 0,
    }));

  return {
    total: students.length,
    withAverage: averages.length,
    average,
    highest,
    highestPercentage: highest == null ? null : (highest / validScale) * 100,
    highestStudents: highest == null ? [] : studentsAt(highest),
    lowest,
    lowestPercentage: lowest == null ? null : (lowest / validScale) * 100,
    lowestStudents: lowest == null ? [] : studentsAt(lowest),
    distribution,
  };
}
