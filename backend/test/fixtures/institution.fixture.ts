export const institutionFixture = {
  id: 'inst-001',
  name: 'Lycée Test',
  address: 'Lomé, Togo',
  phone: '+22890000000',
  email: 'test@school.tg',
  website: null,
  motto: "L'excellence",
  missionStatement: null,
  logo: null,
  crest: null,
  stamp: null,
  brandingSettings: null,
  academicSettings: { termSystem: 'TRIMESTRE', passMark: 10, feeGateEnabled: true },
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const adminUserFixture = {
  id: 'user-admin-001',
  email: 'admin@test.tg',
  name: 'Admin Test',
  role: 'ADMIN' as const,
  institutionId: institutionFixture.id,
  isActive: true,
  language: 'FR' as const,
  profileImage: null,
  whatsappNumber: null,
  whatsappVerified: false,
  notificationPreferences: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const teacherUserFixture = {
  ...adminUserFixture,
  id: 'user-teacher-001',
  email: 'teacher@test.tg',
  name: 'Teacher Test',
  role: 'TEACHER' as const,
};

export const parentUserFixture = {
  ...adminUserFixture,
  id: 'user-parent-001',
  email: 'parent@test.tg',
  name: 'Parent Test',
  role: 'PARENT' as const,
  whatsappNumber: '+22890111111',
};

export const studentFixture = {
  id: 'student-001',
  admissionNumber: 'LYC-001',
  dateOfBirth: new Date('2010-05-15'),
  enrollmentDate: new Date('2024-09-01'),
  userId: null,
  parentId: parentUserFixture.id,
  institutionId: institutionFixture.id,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const classFixture = {
  id: 'class-001',
  name: '6ème A',
  level: '6eme',
  series: null,
  section: 'A',
  capacity: 40,
  academicYear: '2024-2025',
  room: 'Salle 01',
  notes: null,
  institutionId: institutionFixture.id,
  teacherId: teacherUserFixture.id,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const subjectMathFixture = {
  id: 'subject-math-001',
  nameFr: 'Mathématiques',
  nameEn: 'Mathematics',
  code: 'MATH',
  category: 'Sciences',
  department: null,
  description: null,
  passMark: 10,
  institutionId: institutionFixture.id,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const subjectFrFixture = {
  ...subjectMathFixture,
  id: 'subject-fr-001',
  nameFr: 'Français',
  nameEn: 'French',
  code: 'FR',
};

export const reportCardFixture = {
  id: 'report-001',
  studentId: studentFixture.id,
  classId: classFixture.id,
  academicYear: '2024-2025',
  termType: 'TRIMESTRE' as const,
  termNumber: 1,
  termName: '1er Trimestre',
  status: 'DRAFT' as const,
  teacherComment: null,
  principalComment: null,
  conductRating: null,
  attendanceDays: null,
  attendancePresent: null,
  overallAverage: null,
  classRank: null,
  classSize: null,
  mention: null,
  pdfUrl: null,
  deliveryStatus: null,
  publishedAt: null,
  createdById: teacherUserFixture.id,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};
