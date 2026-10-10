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

describe('SmsService — sending through Twilio', () => {
  const axios = require('axios');
  const config = (vals: Record<string, string>) => ({ get: (k: string, d: any) => vals[k] ?? d }) as any;
  const live = () => new SmsService(config({
    SMS_PROVIDER: 'TWILIO', TWILIO_ACCOUNT_SID: 'AC123', TWILIO_AUTH_TOKEN: 'secret', TWILIO_SMS_FROM: 'NOVABULL',
  }));
  let post: jest.SpyInstance;
  beforeEach(() => { post = jest.spyOn(axios, 'post').mockResolvedValue({ data: { sid: 'SM1' } }); });
  afterEach(() => post.mockRestore());

  const sentParams = () => new URLSearchParams(post.mock.calls[0][1]);

  it('posts to the Twilio Messages API with From, To and auth', async () => {
    await expect(live().sendText('90 12 34 56', 'Bonjour', 'Togo')).resolves.toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    const [url, , opts] = post.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    expect(opts.auth).toEqual({ username: 'AC123', password: 'secret' });
    expect(sentParams().get('From')).toBe('NOVABULL');
    expect(sentParams().get('To')).toBe('+22890123456');
    expect(sentParams().get('Body')).toBe('Bonjour');
  });

  it("uses the school's country code for local numbers", async () => {
    await live().sendText('024 417 3068', 'x', 'Ghana');
    expect(sentParams().get('To')).toBe('+233244173068');
    post.mockClear();
    await live().sendText('07 01 02 03 04', 'x', "Côte d'Ivoire");
    expect(sentParams().get('To')).toBe('+2250701020304');
    post.mockClear();
    await live().sendText('01 97 12 34 56', 'x', 'Bénin');
    expect(sentParams().get('To')).toBe('+2290197123456');
  });

  it('removes accents from free text before sending (1 segment = 160 chars)', async () => {
    await live().sendText('90123456', 'Élève : reçu payé — merci', 'Togo');
    expect(sentParams().get('Body')).toBe('Eleve : recu paye - merci');
  });

  it('bulletin SMS goes to the parent with the country code', async () => {
    await live().sendBulletinReady({
      toPhone: '0244173068', studentName: 'Kofi', termName: '1er Trimestre', academicYear: '2026-2027',
      average: '12,00', mention: 'Assez Bien', pdfUrl: null, institutionName: 'St Pierre Claver', country: 'Ghana',
    });
    expect(sentParams().get('To')).toBe('+233244173068');
    expect(sentParams().get('Body')).toContain('Bulletin retenu');
  });

  it('returns false (no crash) when Twilio refuses the message', async () => {
    post.mockRejectedValueOnce({ response: { data: { code: 21408, message: 'Permission to send an SMS has not been enabled' } } });
    await expect(live().sendText('90123456', 'x', 'Togo')).resolves.toBe(false);
  });

  it('does not call Twilio for an invalid number', async () => {
    await expect(live().sendText('123', 'x', 'Togo')).resolves.toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it('does not call Twilio when TWILIO_SMS_FROM is empty (current .env)', async () => {
    const svc = new SmsService(config({ SMS_PROVIDER: 'TWILIO', TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't' }));
    expect(svc.enabled).toBe(false);
    await expect(svc.sendText('90123456', 'x', 'Togo')).resolves.toBe(false);
    expect(post).not.toHaveBeenCalled();
  });
});
