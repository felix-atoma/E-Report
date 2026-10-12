import { PdfService, ReportCardData } from '../../src/modules/pdf/pdf.service';

/** Date de naissance et photo facultatives : sur le bulletin seulement si l'école les a fournies. */
describe('report card — optional date of birth and photo', () => {
  const service = new PdfService({ get: (_k: string, d?: any) => d } as any, { enabled: false } as any);
  const data = (student: Record<string, any>): ReportCardData => ({
    report: {
      id: 'r1', termName: '1er trimestre', academicYear: '2026-2027', termNumber: 1, status: 'PUBLISHED',
      overallAverage: 12, classRank: 3, classSize: 40, classHighest: 15, classLowest: 5, classAverage: 10,
    } as any,
    student: { admissionNumber: 'M1', sex: 'F', ...student } as any,
    grades: [],
    className: '3ème A',
    institution: {
      name: 'École', address: null, phone: null, motto: null, logo: null, crest: null, stamp: null, brandingSettings: {},
    },
  } as any);
  const html = (d: ReportCardData) => (service as any).buildHtml(d) as Promise<string>;

  it('prints the date of birth, the class size and the photo when provided', async () => {
    const out = await html(data({
      dateOfBirth: new Date('2011-03-22T00:00:00Z'),
      user: { name: 'Ama', profileImage: 'https://example.com/ama.jpg' },
    }));
    expect(out).toContain('Date de naissance');
    expect(out).toContain('22/03/2011');
    expect(out).toContain('Effectif');
    expect(out).toContain('class="prh__photo"');
  });

  it('leaves out the date row and the photo frame (no empty silhouette) when missing', async () => {
    const out = await html(data({ dateOfBirth: null, user: { name: 'Ama', profileImage: null } }));
    expect(out).not.toContain('Date de naissance');
    expect(out).not.toContain('class="prh__photo"');
    // Sexe et Classe partagent une ligne ; l'effectif reste dans le rang « 3e / 40 »
    expect(out).toMatch(/Sexe<\/td>[\s\S]*?Féminin[\s\S]*?Classe<\/td>[\s\S]*?3ème A/);
    expect(out).toContain('3e / 40');
  });

  it('each one is independent: photo without date, date without photo', async () => {
    const photoOnly = await html(data({ dateOfBirth: null, user: { name: 'Ama', profileImage: 'https://example.com/ama.jpg' } }));
    expect(photoOnly).toContain('class="prh__photo"');
    expect(photoOnly).not.toContain('Date de naissance');
    const dateOnly = await html(data({ dateOfBirth: new Date('2011-03-22T00:00:00Z'), user: { name: 'Ama' } }));
    expect(dateOnly).toContain('Date de naissance');
    expect(dateOnly).not.toContain('class="prh__photo"');
  });
});
