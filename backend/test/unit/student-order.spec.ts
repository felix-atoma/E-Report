import { byStudentName } from '../../src/common/utils/student-order.util';

describe('fiche de notes — alphabetical order', () => {
  const sort = (list: Array<{ name: string | null; admissionNumber: string }>) =>
    [...list].sort(byStudentName((s) => s)).map((s) => s.name ?? s.admissionNumber);

  it('sorts by name, ignoring accents and capitals', () => {
    expect(sort([
      { name: 'KOFFI Yao', admissionNumber: 'M3' },
      { name: 'Ébo Ama', admissionNumber: 'M1' },
      { name: 'adjo Akossiwa', admissionNumber: 'M9' },
      { name: 'Dzifa Kodjo', admissionNumber: 'M2' },
    ])).toEqual(['adjo Akossiwa', 'Dzifa Kodjo', 'Ébo Ama', 'KOFFI Yao']);
  });

  it('same name: by admission number; no name: by admission number', () => {
    expect(sort([
      { name: 'Ama', admissionNumber: 'M10' },
      { name: 'Ama', admissionNumber: 'M2' },
      { name: null, admissionNumber: 'B-001' },
    ])).toEqual(['Ama', 'Ama', 'B-001']);
    expect([{ name: 'Ama', admissionNumber: 'M10' }, { name: 'Ama', admissionNumber: 'M2' }]
      .sort(byStudentName((s) => s)).map((s) => s.admissionNumber)).toEqual(['M2', 'M10']);
  });
});
