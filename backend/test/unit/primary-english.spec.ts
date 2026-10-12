import { PdfService, ReportCardData, isPrimaryEnglish, primaryTotals } from '../../src/modules/pdf/pdf.service';

/** Primaire : l'anglais est noté à part (encadré à côté du tableau), hors total, moyenne et rang. */
describe('primary school — English graded separately', () => {
  const g = (nameFr: string, moy20: number, maxScore = 20) => ({ moyenneMatiere: moy20, subject: { nameFr, maxScore } });

  it('recognises the English subject', () => {
    expect(isPrimaryEnglish({ nameFr: 'Anglais' })).toBe(true);
    expect(isPrimaryEnglish({ nameFr: 'Langue anglaise' })).toBe(true);
    expect(isPrimaryEnglish({ nameFr: 'English' })).toBe(true);
    expect(isPrimaryEnglish({ nameFr: 'Français' })).toBe(false);
    expect(isPrimaryEnglish(null)).toBe(false);
  });

  it('leaves English out of the total and the average', () => {
    // Français 16/20 + Calcul 8/10 (= 16/20) → 24 / 30 → 8/10 → 16/20 ; l'anglais (4/20) ne change rien
    const without = primaryTotals([g('Français', 16), g('Calcul', 16, 10)]);
    const withEnglish = primaryTotals([g('Français', 16), g('Calcul', 16, 10), g('Anglais', 4)]);
    expect(withEnglish).toEqual(without);
    expect(withEnglish).toEqual({ total: 24, max: 30, average20: 16 });
  });

  describe('bulletin HTML', () => {
    const service = new PdfService({ get: (_k: string, d?: any) => d } as any, { enabled: false } as any);
    const grade = (nameFr: string, moy: number, extra: Record<string, any> = {}) => ({
      subjectId: nameFr, moyenneMatiere: moy, score: moy, coefficient: 1, weightedScore: moy,
      subject: { nameFr, maxScore: 20 }, ...extra,
    });
    const data = (classLevel: string): ReportCardData => ({
      report: { id: 'r1', termName: '1er trimestre', academicYear: '2026-2027', termNumber: 1, status: 'PUBLISHED',
        overallAverage: 14, classRank: 2, classSize: 30 } as any,
      student: { admissionNumber: 'M1', user: { name: 'Kofi' } } as any,
      grades: [grade('Français', 14), grade('Anglais', 18, { rangMatiere: 1, appreciation: 'Très bien' })] as any,
      className: 'CM2', classLevel,
      institution: { name: 'École', address: null, phone: null, motto: null, logo: null, crest: null, stamp: null, brandingSettings: {} },
    } as any);
    const html = (d: ReportCardData) => (service as any).buildHtml(d) as Promise<string>;

    it('CM2: English in the side box, not in the table, total = French only', async () => {
      const out = await html(data('CM2'));
      expect(out).toContain('class="pr-extra"');
      expect(out).toContain('Hors total et moyenne');
      const table = out.slice(out.indexOf('<table class="pr-grades pr-grades--primary"'), out.indexOf('class="pr-extra"'));
      expect(table).toContain('Français');
      expect(table).not.toContain('Anglais');
      const box = out.slice(out.indexOf('class="pr-extra"'));
      expect(box).toContain('18');
      expect(box).toContain('Très bien');
      expect(table).toContain('14,00 / 20'); // total des points : le français seul
      expect(table).toContain('7,00 / 10');  // moyenne sans l'anglais (18/20 l'aurait relevée)
    });

    it('secondary school: English stays a normal subject in the table', async () => {
      const out = await html(data('3ème'));
      expect(out).not.toContain('class="pr-extra"');
      expect(out).toContain('Anglais');
    });
  });
});
