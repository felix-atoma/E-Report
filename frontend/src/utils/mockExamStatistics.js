export const MOCK_EXAM_AVERAGE_BANDS = [
  { label: 'Moins de 40 %', min: 0, max: 40 },
  { label: '40 % à moins de 50 %', min: 40, max: 50 },
  { label: '50 % à moins de 60 %', min: 50, max: 60 },
  { label: '60 % à moins de 70 %', min: 60, max: 70 },
  { label: '70 % à moins de 80 %', min: 70, max: 80 },
  { label: '80 % à moins de 90 %', min: 80, max: 90 },
  { label: '90 % et plus', min: 90, max: Number.POSITIVE_INFINITY },
];

export function getMockExamStatistics(students, scale) {
  const scoreScale = Number(scale);
  const validScale = Number.isFinite(scoreScale) && scoreScale > 0 ? scoreScale : 20;
  const averages = students
    .map((student) => Number(student.average))
    .filter((average, index) => students[index].average != null && Number.isFinite(average))
    .map((average) => (average / validScale) * 100);
  const average = averages.length
    ? averages.reduce((sum, value) => sum + value, 0) / averages.length
    : null;

  return {
    total: students.length,
    withAverage: averages.length,
    average,
    highest: averages.length ? Math.max(...averages) : null,
    lowest: averages.length ? Math.min(...averages) : null,
    bands: MOCK_EXAM_AVERAGE_BANDS.map((band) => {
      const count = averages.filter((value) => value >= band.min && value < band.max).length;
      return {
        ...band,
        count,
        percentage: averages.length ? (count / averages.length) * 100 : 0,
      };
    }),
  };
}
