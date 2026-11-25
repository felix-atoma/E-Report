import { AiService, reportTeacherTitle } from '../../src/modules/ai/ai.service';

describe('report comment gender agreements', () => {
  it('uses the teacher title matching gender and school level', () => {
    expect(reportTeacherTitle('F', true)).toBe('maîtresse de l’école primaire');
    expect(reportTeacherTitle('F', false)).toBe('enseignante');
    expect(reportTeacherTitle('M', true)).toBe('maître de l’école primaire');
    expect(reportTeacherTitle('M', false)).toBe('enseignant');
    expect(reportTeacherTitle(null, false)).toBe('titulaire de la classe');
  });

  it('sends both student and teacher gender context to comment generation', async () => {
    const service = new AiService({ get: () => 'test-key' } as any);
    const create = jest.fn().mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Élève sérieuse et appliquée.' }],
    });
    (service as any).client = { beta: { messages: { create } } };

    await service.generateReportComment({
      studentName: 'Ama',
      sex: 'F',
      teacherSex: 'F',
      isPrimary: true,
      className: 'CE2',
      avg: 15,
      mention: 'Bien',
      grades: [{ subject: 'Français', score: 15, coefficient: 1 }],
    });

    const prompt = create.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('une élève (fille)');
    expect(prompt).toContain('maîtresse de l’école primaire');
    expect(create.mock.calls[0][0].system).toContain('Tu es maîtresse de l’école primaire');
    expect(create.mock.calls[0][0].system).toContain('n\'emploie jamais le masculin par défaut');
  });
});
