import { describe, expect, it } from 'vitest';
import { getMockExamStatistics } from './mockExamStatistics';

describe('mock exam statistics', () => {
  it('converts averages to percentages and counts each average in one band', () => {
    const stats = getMockExamStatistics([
      { average: 8 },
      { average: 10 },
      { average: 18 },
      { average: null },
    ], 20);

    expect(stats).toMatchObject({
      total: 4,
      withAverage: 3,
      average: 60,
      highest: 90,
      lowest: 40,
    });
    expect(stats.bands.map(({ count }) => count)).toEqual([0, 1, 1, 0, 0, 0, 1]);
    expect(stats.bands[1].percentage).toBeCloseTo(100 / 3);
    expect(stats.bands[2].percentage).toBeCloseTo(100 / 3);
    expect(stats.bands[6].percentage).toBeCloseTo(100 / 3);
  });

  it('returns zero-valued bands when no student has an average', () => {
    const stats = getMockExamStatistics([{ average: null }], 20);

    expect(stats.withAverage).toBe(0);
    expect(stats.average).toBeNull();
    expect(stats.bands.every(({ count, percentage }) => count === 0 && percentage === 0)).toBe(true);
  });
});
