import { toE164, countryRule } from '../../src/common/utils/phone.util';

describe('toE164 — country code from the school country', () => {
  it('keeps numbers already written with + or 00', () => {
    expect(toE164('+229 01 97 12 34 56', 'Togo')).toBe('+2290197123456');
    expect(toE164('00233244173068', 'Bénin')).toBe('+233244173068');
    expect(toE164('whatsapp:+22890123456')).toBe('+22890123456');
  });

  it('Togo (default when the country is unknown or empty)', () => {
    expect(toE164('90 12 34 56', 'Togo')).toBe('+22890123456');
    expect(toE164('90 12 34 56')).toBe('+22890123456');
    expect(toE164('90 12 34 56', 'République Togolaise')).toBe('+22890123456');
  });

  it('Bénin: 10-digit numbers (01…) and legacy 8-digit numbers', () => {
    expect(toE164('01 97 12 34 56', 'Bénin')).toBe('+2290197123456');
    expect(toE164('97 12 34 56', 'Benin')).toBe('+22997123456');
  });

  it("Côte d'Ivoire keeps the leading 0 (part of the number)", () => {
    expect(toE164('07 01 02 03 04', "Côte d'Ivoire")).toBe('+2250701020304');
  });

  it('Ghana drops the national 0', () => {
    expect(toE164('024 417 3068', 'Ghana')).toBe('+233244173068');
  });

  it('Sénégal, Burkina, Cameroun', () => {
    expect(toE164('77 123 45 67', 'Sénégal')).toBe('+221771234567');
    expect(toE164('70 12 34 56', 'Burkina Faso')).toBe('+22670123456');
    expect(toE164('6 77 12 34 56', 'Cameroun')).toBe('+237677123456');
  });

  it('a number already containing the country code without + is kept', () => {
    expect(toE164('22890123456', 'Togo')).toBe('+22890123456');
    expect(toE164('233244173068', 'Ghana')).toBe('+233244173068');
  });

  it('rejects unusable numbers', () => {
    expect(toE164('abc', 'Togo')).toBeNull();
    expect(toE164('123', 'Togo')).toBeNull();
    expect(toE164(null, 'Togo')).toBeNull();
  });

  it('does not confuse Niger with Nigeria, nor Congo with RDC', () => {
    expect(countryRule('Niger').code).toBe('227');
    expect(countryRule('Nigeria').code).toBe('234');
    expect(countryRule('République du Congo').code).toBe('242');
    expect(countryRule('République Démocratique du Congo').code).toBe('243');
  });
});
