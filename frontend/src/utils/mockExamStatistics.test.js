import { describe, expect, it } from 'vitest';
import { getMockExamStatistics } from './mockExamStatistics';

describe('mock exam statistics', () => {
  it('converts averages to percentages and counts each average in one band', () => {
    const stats = getMockExamStatistics([
      { studentName: 'Awa', average: 4 },
      { studentName: 'Binta', average: 5 },
      { studentName: 'Koffi', average: 18 },
      { average: null },
    ], 20);

    expect(stats).toMatchObject({
      total: 4,
      withAverage: 3,
      average: 45,
      highest: 90,
      lowest: 20,
      lowestStudents: ['Awa'],
      highestStudents: ['Koffi'],
    });
    expect(stats.bands).toHaveLength(20);
    expect(stats.bands[4]).toMatchObject({ count: 1, label: 'De 4 à moins de 5 / 20' });
    expect(stats.bands[5]).toMatchObject({ count: 1, label: 'De 5 à moins de 6 / 20' });
    expect(stats.bands[18]).toMatchObject({ count: 1, label: 'De 18 à moins de 19 / 20' });
    expect(stats.bands[4].percentage).toBeCloseTo(100 / 3);
    expect(stats.bands[5].percentage).toBeCloseTo(100 / 3);
    expect(stats.bands[18].percentage).toBeCloseTo(100 / 3);
  });

  it('returns zero-valued bands when no student has an average', () => {
    const stats = getMockExamStatistics([{ average: null }], 20);

    expect(stats.withAverage).toBe(0);
    expect(stats.average).toBeNull();
    expect(stats.bands.every(({ count, percentage }) => count === 0 && percentage === 0)).toBe(true);
  });
});
