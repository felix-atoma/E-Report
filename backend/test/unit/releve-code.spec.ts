import { releveCode, parseReleveCode, releveCodeMatches } from '../../src/modules/mock-exams/releve-code.util';

describe('relevé verification code (QR code)', () => {
  const EXAM = '1a2b3c4d-0000-4000-8000-000000000001';
  const STUDENT = '9f8e7d6c-0000-4000-8000-000000000002';

  it('has the R-EXAM-STUDENT-SIGNATURE format', () => {
    expect(releveCode(EXAM, STUDENT)).toMatch(/^R-1A2B3C4D-9F8E7D6C-[0-9A-F]{6}$/);
    expect(parseReleveCode(releveCode(EXAM, STUDENT))).toEqual({ examPrefix: '1a2b3c4d', studentPrefix: '9f8e7d6c' });
  });

  it('accepts the real code (any case), refuses a forged or mismatched one', () => {
    const code = releveCode(EXAM, STUDENT);
    expect(releveCodeMatches(code.toLowerCase(), EXAM, STUDENT)).toBe(true);
    expect(releveCodeMatches(code.slice(0, -6) + '000000', EXAM, STUDENT)).toBe(false);
    expect(releveCodeMatches(code, EXAM, '9f8e7d6c-0000-4000-8000-000000000099')).toBe(false);
  });

  it('rejects garbage', () => {
    expect(parseReleveCode('2425T1-AB3K-MNPQ')).toBeNull();
    expect(parseReleveCode('R-XYZ')).toBeNull();
  });
});
