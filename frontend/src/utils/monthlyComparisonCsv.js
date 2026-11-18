export function buildMonthlyComparisonRows(sheets) {
  const subjects = new Map();
  const students = new Map();
  sheets.forEach((sheet) => {
    sheet.subjects.forEach((subject) => subjects.set(subject.id, subject.nameFr || subject.nameEn || subject.code));
    sheet.students.forEach((student) => students.set(student.studentId, {
      studentId: student.studentId,
      name: student.studentName || student.admissionNumber || '',
      admissionNumber: student.admissionNumber || '',
    }));
  });

  const examColumns = sheets.map((sheet) => `${sheet.exam.label} (${sheet.exam.examDate
    ? new Date(sheet.exam.examDate).toLocaleDateString('fr-FR') : 'date inconnue'})`);
  const scoresByStudentSubject = new Map();
  sheets.forEach((sheet, examIndex) => sheet.students.forEach((student) => student.grades.forEach((grade) => {
    if (grade.score == null || !(Number(grade.maxScore) > 0)) return;
    const key = `${student.studentId}:${grade.subjectId}`;
    if (!scoresByStudentSubject.has(key)) scoresByStudentSubject.set(key, Array(sheets.length).fill(null));
    scoresByStudentSubject.get(key)[examIndex] = Number(grade.score) / Number(grade.maxScore) * 10;
  })));

  const rows = [];
  const formatScore = (score) => score == null ? '' : score.toFixed(2);
  for (const [subjectId, subjectName] of subjects) {
    const keys = [...scoresByStudentSubject.keys()].filter((key) => key.endsWith(`:${subjectId}`));
    const classAverages = sheets.map((_, examIndex) => {
      const grades = keys.map((key) => scoresByStudentSubject.get(key)[examIndex]).filter((score) => score != null);
      return grades.length ? grades.reduce((sum, score) => sum + score, 0) / grades.length : null;
    });
    const toRow = (studentName, admissionNumber, scores) => ({
      Élève: studentName,
      'N° matricule': admissionNumber,
      Matière: subjectName,
      ...Object.fromEntries(examColumns.map((column, index) => [column, formatScore(scores[index])])),
      'Évolution (dernière − précédente)': scores.length > 1 && scores.at(-1) != null && scores.at(-2) != null
        ? formatScore(scores.at(-1) - scores.at(-2)) : '',
    });

    rows.push(toRow('MOYENNE DE CLASSE', '', classAverages));
    [...students.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr')).forEach((student) => {
      const scores = scoresByStudentSubject.get(`${student.studentId}:${subjectId}`) || Array(sheets.length).fill(null);
      if (scores.some((score) => score != null)) rows.push(toRow(student.name, student.admissionNumber, scores));
    });
  }
  return rows;
}

export function rowsToSemicolonCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return /[;"\r\n]/.test(text) ? `"${text}"` : text;
  };
  return [headers.map(escape).join(';'), ...rows.map((row) => headers.map((header) => escape(row[header])).join(';'))].join('\r\n');
}
