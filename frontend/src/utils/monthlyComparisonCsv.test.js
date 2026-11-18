import { describe, expect, it } from 'vitest';
import { buildMonthlyComparisonRows, rowsToSemicolonCsv } from './monthlyComparisonCsv';

const makeSheet = (label, examDate, scores) => ({
  exam: { label, examDate },
  subjects: [{ id: 'math', nameFr: 'Mathématiques' }],
  students: scores.map(({ id, name, score }) => ({
    studentId: id,
    studentName: name,
    admissionNumber: `M-${id}`,
    grades: [{ subjectId: 'math', score, maxScore: 20 }],
  })),
});

describe('monthly comparison export', () => {
  it('normalizes grades to /10 and calculates student and class evolution', () => {
    const rows = buildMonthlyComparisonRows([
      makeSheet('Octobre', '2026-10-01', [{ id: '1', name: 'Awa', score: 12 }]),
      makeSheet('Novembre', '2026-11-01', [{ id: '1', name: 'Awa', score: 16 }]),
    ]);

    expect(rows).toHaveLength(2);
    const october = Object.keys(rows[0]).find((key) => key.startsWith('Octobre ('));
    const november = Object.keys(rows[0]).find((key) => key.startsWith('Novembre ('));
    expect(rows[0]).toMatchObject({ Élève: 'MOYENNE DE CLASSE', Matière: 'Mathématiques' });
    expect(rows[0][october]).toBe('6.00');
    expect(rows[0][november]).toBe('8.00');
    expect(rows[0]['Évolution (dernière − précédente)']).toBe('2.00');
    expect(rows[1]).toMatchObject({ Élève: 'Awa', 'N° matricule': 'M-1' });
    expect(rows[1][october]).toBe('6.00');
    expect(rows[1][november]).toBe('8.00');
    expect(rows[1]['Évolution (dernière − précédente)']).toBe('2.00');
  });

  it('leaves missing marks blank and escapes semicolons and quotes for Excel', () => {
    const rows = buildMonthlyComparisonRows([
      makeSheet('Octobre', '2026-10-01', [{ id: '1', name: 'Awa; "A"', score: 10 }]),
      makeSheet('Novembre', '2026-11-01', [{ id: '1', name: 'Awa; "A"', score: null }]),
    ]);
    const csv = rowsToSemicolonCsv(rows);
    const november = Object.keys(rows[1]).find((key) => key.startsWith('Novembre ('));

    expect(rows[1][november]).toBe('');
    expect(rows[1]['Évolution (dernière − précédente)']).toBe('');
    expect(csv).toContain('"Awa; ""A"""');
  });
});
