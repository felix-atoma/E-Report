import { SmsService, toE164, toGsm } from './sms.service';

describe('toE164', () => {
  it('adds the Togo country code to 8-digit local numbers', () => {
    expect(toE164('90 12 34 56')).toBe('+22890123456');
    expect(toE164('70-12-34-56')).toBe('+22870123456');
  });
  it('keeps international numbers', () => {
    expect(toE164('+228 90123456')).toBe('+22890123456');
    expect(toE164('00233244173068')).toBe('+233244173068');
    expect(toE164('whatsapp:+22890123456')).toBe('+22890123456');
  });
  it('rejects garbage', () => {
    expect(toE164('abc')).toBeNull();
    expect(toE164('123')).toBeNull();
  });
});

describe('toGsm', () => {
  it('strips accents and typographic characters so the SMS stays GSM-7', () => {
    expect(toGsm('Élève : Très Bien — « 1ère » …')).toBe('Eleve : Tres Bien - " 1ere " ...');
  });
});

describe('SmsService', () => {
  const config = (vals: Record<string, string>) => ({ get: (k: string, d: any) => vals[k] ?? d }) as any;

  it('is disabled without Twilio credentials', () => {
    expect(new SmsService(config({ SMS_PROVIDER: 'TWILIO' })).enabled).toBe(false);
  });

  it('builds a short, accent-free bulletin message', async () => {
    const svc = new SmsService(config({
      SMS_PROVIDER: 'TWILIO', TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_SMS_FROM: 'NOVABULL',
    }));
    const msg: string = (svc as any).buildBulletinMessage({
      toPhone: '90123456', studentName: 'AMEGAN Kafui', termName: '1er Trimestre', academicYear: '2025-2026',
      average: '13,42', mention: 'Très Bien', pdfUrl: 'https://x.io/b.pdf', institutionName: 'Lycée de Lomé',
    });
    expect(msg).toBe(
      'Lycee de Lome: le bulletin du 1er Trimestre 2025-2026 de AMEGAN Kafui est disponible. ' +
      'Moyenne : 13,42/20 (Tres Bien). Telecharger : https://x.io/b.pdf',
    );
    expect(/^[\x20-\x7E]*$/.test(msg)).toBe(true);
  });
});
