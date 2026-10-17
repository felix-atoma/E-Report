import { appreciationOn20, subjectLang } from '../../src/common/utils/appreciation.util';

describe('barème des appréciations', () => {
  it.each([
    [20, 'Excellent'], [18, 'Excellent'],
    [17.99, 'Très Bien'], [16, 'Très Bien'],
    [15.99, 'Bien'], [14, 'Bien'],
    [13.99, 'Assez Bien'], [12, 'Assez Bien'],
    [11.99, 'Passable'], [10, 'Passable'],
    [9.99, 'Insuffisant'], [8, 'Insuffisant'],
    [7.99, 'Très Insuffisant'], [0, 'Très Insuffisant'],
  ])('%s / 20 → %s', (score, label) => {
    expect(appreciationOn20(score)).toBe(label);
  });

  it('uses the subject language (English, German…)', () => {
    expect(appreciationOn20(19, subjectLang('Anglais'))).toBe('Excellent');
    expect(appreciationOn20(9, subjectLang('English Grammar'))).toBe('Insufficient');
    expect(appreciationOn20(5, subjectLang('Allemand'))).toBe('Sehr ungenügend');
    expect(subjectLang('Mathématiques')).toBe('fr');
  });
});
