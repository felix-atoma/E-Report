import { describe, expect, it } from 'vitest';
import { gradeResponse, normalizeAnswer } from './assistedCorrection';

describe('assisted correction local grading', () => {
  it('normalizes accents, case, and spacing for exact answer matching', () => {
    expect(normalizeAnswer('  ÉQUATION   DU 1er degré ')).toBe('equation du 1er degre');
    expect(gradeResponse(
      { type: 'short', points: 2, answer: 'Équation du 1er degré', alternatives: '' },
      'equation DU 1er degré',
    )).toMatchObject({ score: 2, source: 'local', needsReview: false });
  });

  it('accepts configured alternatives and rejects partial matches', () => {
    const question = { type: 'qcm', points: 1, answer: 'B', alternatives: 'la deuxième réponse' };
    expect(gradeResponse(question, 'la deuxième réponse').score).toBe(1);
    expect(gradeResponse(question, 'BB').score).toBe(0);
  });

  it('uses whole keywords for written-answer fallback and flags review', () => {
    const question = { type: 'written', points: 4, keywords: 'photosynthèse, lumière' };
    expect(gradeResponse(question, 'La lumière déclenche la photosynthèse.')).toMatchObject({
      score: 4,
      source: 'local',
      needsReview: true,
    });
    expect(gradeResponse(question, 'illumination')).toMatchObject({ score: 0, needsReview: true });
    expect(gradeResponse({ ...question, keywords: '' }, 'texte libre')).toBeNull();
  });
});
