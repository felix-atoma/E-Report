export const MOCK_EXAM_AVERAGE_BANDS = Array.from({ length: 20 }, (_, average) => ({
  label: average === 19 ? 'De 19 à 20 / 20' : `De ${average} à moins de ${average + 1} / 20`,
  min: average,
  max: average + 1,
}));

export function getMockExamStatistics(students, scale) {
  const scoreScale = Number(scale);
  const validScale = Number.isFinite(scoreScale) && scoreScale > 0 ? scoreScale : 20;
  const averages = students.flatMap((student) => {
    if (student.average == null) return [];
    const score = Number(student.average);
    if (!Number.isFinite(score)) return [];
    return [{
      percentage: (score / validScale) * 100,
      averageOn20: (score / validScale) * 20,
      studentName: student.studentName || 'Élève sans nom',
    }];
  });
  const average = averages.length
    ? averages.reduce((sum, result) => sum + result.percentage, 0) / averages.length
    : null;
  const highest = averages.length ? Math.max(...averages.map((result) => result.percentage)) : null;
  const lowest = averages.length ? Math.min(...averages.map((result) => result.percentage)) : null;
  const studentsAt = (value) => averages
    .filter((result) => result.percentage === value)
    .map((result) => result.studentName);

  return {
    total: students.length,
    withAverage: averages.length,
    average,
    highest,
    highestStudents: highest == null ? [] : studentsAt(highest),
    lowest,
    lowestStudents: lowest == null ? [] : studentsAt(lowest),
    bands: MOCK_EXAM_AVERAGE_BANDS.map((band) => {
      const count = averages.filter((result) => (
        result.averageOn20 >= band.min
        && (result.averageOn20 < band.max || (band.max === 20 && result.averageOn20 === 20))
      )).length;
      return {
        ...band,
        count,
        percentage: averages.length ? (count / averages.length) * 100 : 0,
      };
    }),
  };
}
