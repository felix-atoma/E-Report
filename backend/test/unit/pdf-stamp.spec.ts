import { PdfService, digitalStampFor, ReportCardData } from '../../src/modules/pdf/pdf.service';

const STAMP = 'https://example.com/cachet.png';

describe('digital school stamp on report cards', () => {
  it('is off by default (manual stamp)', () => {
    expect(digitalStampFor({}, STAMP, 'PUBLISHED')).toBe(false);
    expect(digitalStampFor(null, STAMP, 'PUBLISHED')).toBe(false);
  });

  it('is printed only on published report cards when the school chose DIGITAL', () => {
    expect(digitalStampFor({ stampMode: 'DIGITAL' }, STAMP, 'PUBLISHED')).toBe(true);
    expect(digitalStampFor({ stampMode: 'DIGITAL' }, STAMP, 'DRAFT')).toBe(false);
    expect(digitalStampFor({ stampMode: 'DIGITAL' }, STAMP, 'REVIEW')).toBe(false);
    expect(digitalStampFor({ stampMode: 'DIGITAL' }, null, 'PUBLISHED')).toBe(false);
  });

  describe('bulletin HTML', () => {
    const service = new PdfService({ get: (_k: string, d?: any) => d } as any, { enabled: false } as any);
    const data = (status: string, stampMode?: string): ReportCardData => ({
      report: {
        id: 'r1', termName: '1er trimestre', academicYear: '2026-2027', termNumber: 1, status,
        overallAverage: 12, classRank: 1, classSize: 10, classHighest: 15, classLowest: 5, classAverage: 10,
      } as any,
      student: { admissionNumber: 'M1', user: { name: 'Ama' } } as any,
      grades: [],
      className: '3ème',
      institution: {
        name: 'École', address: null, phone: null, motto: null, logo: null, crest: null, stamp: STAMP,
        brandingSettings: stampMode ? { stampMode } : {},
      },
    } as any);
    const html = (d: ReportCardData) => (service as any).buildHtml(d) as Promise<string>;

    it('prints the stamp image on a published bulletin of a DIGITAL school', async () => {
      expect(await html(data('PUBLISHED', 'DIGITAL'))).toContain('class="pr-sig__stamp-img"');
    });

    it('leaves the empty box on a draft, or for a MANUAL school', async () => {
      expect(await html(data('DRAFT', 'DIGITAL'))).not.toContain('class="pr-sig__stamp-img"');
      expect(await html(data('PUBLISHED'))).not.toContain('class="pr-sig__stamp-img"');
    });
  });
});
