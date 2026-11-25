import { PdfService, digitalStampFor, ReportCardData } from '../../src/modules/pdf/pdf.service';
import { directorTitleFor } from '../../src/common/utils/school-identity.util';

const STAMP = 'https://example.com/cachet.png';

describe('director title on report cards', () => {
  it('uses the administrator sex and a neutral title when it is unknown', () => {
    expect(directorTitleFor('F')).toBe('La Directrice');
    expect(directorTitleFor('M')).toBe('Le Directeur');
    expect(directorTitleFor(null)).toBe('La Direction');
  });
});

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

  it('prints the stamp on electronic published copies and leaves school print copies blank', () => {
    expect(digitalStampFor({ stampMode: 'MANUAL' }, STAMP, 'PUBLISHED', 'ELECTRONIC')).toBe(true);
    expect(digitalStampFor({ stampMode: 'DIGITAL' }, STAMP, 'PUBLISHED', 'PRINT')).toBe(false);
    expect(digitalStampFor({ stampMode: 'MANUAL' }, STAMP, 'DRAFT', 'ELECTRONIC')).toBe(false);
  });

  describe('bulletin HTML', () => {
    const service = new PdfService({ get: (_k: string, d?: any) => d } as any, { enabled: false } as any);
    const data = (status: string, stampMode?: string, directorSex?: string): ReportCardData => ({
      directorSex,
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

    it('can include the stamp electronically even when the school print mode is MANUAL', async () => {
      expect(await html({ ...data('PUBLISHED'), stampDelivery: 'ELECTRONIC' }))
        .toContain('class="pr-sig__stamp-img"');
      expect(await html({ ...data('PUBLISHED', 'DIGITAL'), stampDelivery: 'PRINT' }))
        .not.toContain('class="pr-sig__stamp-img"');
    });

    it('renders the director title from the administrator sex', async () => {
      expect(await html(data('PUBLISHED', undefined, 'F'))).toContain('pr-sig__label">La Directrice</div>');
      expect(await html(data('PUBLISHED', undefined, 'M'))).toContain('pr-sig__label">Le Directeur</div>');
    });
  });
});
