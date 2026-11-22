import { describe, expect, it } from 'vitest';
import { getMockExamStatistics } from './mockExamStatistics';

describe('mock exam statistics', () => {
  it('groups students by their exact average and calculates their percentages', () => {
    const stats = getMockExamStatistics([
      { studentName: 'Awa', average: 6.47 },
      { studentName: 'Binta', average: 6.47 },
      { studentName: 'Koffi', average: 18 },
      { average: null },
    ], 20);

    expect(stats).toMatchObject({
      total: 4,
      withAverage: 3,
      highest: 18,
      highestPercentage: 90,
      lowest: 6.47,
      lowestPercentage: 32.35,
      lowestStudents: ['Awa', 'Binta'],
      highestStudents: ['Koffi'],
    });
    expect(stats.average).toBeCloseTo(51.5667, 3);
    expect(stats.distribution).toHaveLength(2);
    expect(stats.distribution[0]).toMatchObject({
      score: 6.47,
      percentage: 32.35,
      count: 2,
      students: ['Awa', 'Binta'],
    });
    expect(stats.distribution[0].share).toBeCloseTo(200 / 3);
    expect(stats.distribution[1]).toMatchObject({ score: 18, count: 1, students: ['Koffi'] });
  });

  it('returns an empty distribution when no student has an average', () => {
    const stats = getMockExamStatistics([{ average: null }], 20);

    expect(stats.withAverage).toBe(0);
    expect(stats.average).toBeNull();
    expect(stats.distribution).toEqual([]);
    expect(stats.highestStudents).toEqual([]);
    expect(stats.lowestStudents).toEqual([]);
  });

  it('converts averages on other scales to percentage of the maximum', () => {
    const stats = getMockExamStatistics([{ studentName: 'Mina', average: 6.47 }], 10);

    expect(stats.distribution[0]).toMatchObject({ score: 6.47, percentage: 64.7, share: 100 });
  });
});
