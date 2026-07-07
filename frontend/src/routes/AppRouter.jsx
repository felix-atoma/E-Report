import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute/ProtectedRoute';
import Loading from '../components/common/Loading/Loading';

// ── Public ────────────────────────────────────────────────────────────────────
const HomePage               = lazy(() => import('../pages/HomePage/HomePage'));
const LandingPage            = lazy(() => import('../pages/public/LandingPage/LandingPage'));
const LoginPage              = lazy(() => import('../pages/auth/LoginPage/LoginPage'));
const RegisterPage           = lazy(() => import('../pages/auth/RegisterPage/RegisterPage'));
const RegisterSchoolPage     = lazy(() => import('../pages/public/RegisterSchoolPage/RegisterSchoolPage'));
const LegalPage              = lazy(() => import('../pages/public/LegalPage/LegalPage'));
const ForgotPasswordPage     = lazy(() => import('../pages/auth/ForgotPasswordPage/ForgotPasswordPage'));
const ResetPasswordPage      = lazy(() => import('../pages/auth/ResetPasswordPage/ResetPasswordPage'));
const OtpLoginPage           = lazy(() => import('../pages/auth/OtpLoginPage/OtpLoginPage'));
const SetPasswordPage        = lazy(() => import('../pages/auth/SetPasswordPage/SetPasswordPage'));
const GoogleCallbackPage     = lazy(() => import('../pages/auth/GoogleCallbackPage/GoogleCallbackPage'));
const BulletinVerifyPage     = lazy(() => import('../pages/public/BulletinVerifyPage/BulletinVerifyPage'));
const NotFoundPage           = lazy(() => import('../pages/shared/NotFoundPage/NotFoundPage'));
const UnauthorizedPage       = lazy(() => import('../pages/shared/UnauthorizedPage/UnauthorizedPage'));
const ErrorPage              = lazy(() => import('../pages/shared/ErrorPage/ErrorPage'));

// ── Super-Admin ───────────────────────────────────────────────────────────────
const SuperAdminPage         = lazy(() => import('../pages/superadmin/SuperAdminPage/SuperAdminPage'));

// ── Admin ─────────────────────────────────────────────────────────────────────
const AdminDashboardPage     = lazy(() => import('../pages/admin/AdminDashboardPage/AdminDashboardPage'));
const AdminAttendancePage    = lazy(() => import('../pages/admin/AttendancePage/AttendancePage'));
const SchoolDocumentsPage    = lazy(() => import('../pages/admin/SchoolDocumentsPage/SchoolDocumentsPage'));
const UsersPage              = lazy(() => import('../pages/admin/UsersPage/UsersPage'));
const ClassesPage            = lazy(() => import('../pages/admin/ClassesPage/ClassesPage'));
const AdminClassDetailPage   = lazy(() => import('../pages/admin/ClassDetailPage/ClassDetailPage'));
const AdminStudentProfilePage = lazy(() => import('../pages/admin/StudentProfilePage/StudentProfilePage'));
const StudentsPage           = lazy(() => import('../pages/admin/StudentsPage/StudentsPage'));
const SubjectsPage           = lazy(() => import('../pages/admin/SubjectsPage/SubjectsPage'));
const AdminSubjectProfilePage = lazy(() => import('../pages/admin/SubjectProfilePage/SubjectProfilePage'));
const FeesPage               = lazy(() => import('../pages/admin/FeesPage/FeesPage'));
const PaymentsPage           = lazy(() => import('../pages/admin/PaymentsPage/PaymentsPage'));
const PaymentPlansPage       = lazy(() => import('../pages/admin/PaymentPlansPage/PaymentPlansPage'));
const AnalyticsPage          = lazy(() => import('../pages/admin/AnalyticsPage/AnalyticsPage'));
const NotificationLogsPage   = lazy(() => import('../pages/admin/NotificationLogsPage/NotificationLogsPage'));
const BrandingPage           = lazy(() => import('../pages/admin/BrandingPage/BrandingPage'));
const SettingsPage           = lazy(() => import('../pages/admin/SettingsPage/SettingsPage'));
const InstitutionsPage       = lazy(() => import('../pages/admin/InstitutionsPage/InstitutionsPage'));
const AdminImportPage        = lazy(() => import('../pages/admin/AdminImportPage/AdminImportPage'));
const StaffDirectoryPage     = lazy(() => import('../pages/admin/StaffDirectoryPage/StaffDirectoryPage'));
const CalendarPage           = lazy(() => import('../pages/admin/CalendarPage/CalendarPage'));
const DisciplinaryPage       = lazy(() => import('../pages/admin/DisciplinaryPage/DisciplinaryPage'));
const AlumniPage             = lazy(() => import('../pages/admin/AlumniPage/AlumniPage'));
const TransfersPage          = lazy(() => import('../pages/admin/TransfersPage/TransfersPage'));
const InventoryPage          = lazy(() => import('../pages/admin/InventoryPage/InventoryPage'));
const PurchasesPage          = lazy(() => import('../pages/admin/PurchasesPage/PurchasesPage'));
const NationalExamResultsPage = lazy(() => import('../pages/admin/NationalExamResultsPage/NationalExamResultsPage'));
const LibraryPage            = lazy(() => import('../pages/admin/LibraryPage/LibraryPage'));
const HealthRecordsPage      = lazy(() => import('../pages/admin/HealthRecordsPage/HealthRecordsPage'));
const TimetableBuilderPage   = lazy(() => import('../pages/admin/TimetableBuilderPage/TimetableBuilderPage'));
const SubscriptionPage       = lazy(() => import('../pages/admin/SubscriptionPage/SubscriptionPage'));
const SubscriptionReturnPage = lazy(() => import('../pages/admin/SubscriptionReturnPage/SubscriptionReturnPage'));

// ── Bursar ────────────────────────────────────────────────────────────────────
const BursarDashboardPage    = lazy(() => import('../pages/bursar/BursarDashboardPage/BursarDashboardPage'));

// ── Teacher ───────────────────────────────────────────────────────────────────
const TeacherDashboardPage   = lazy(() => import('../pages/teacher/TeacherDashboardPage/TeacherDashboardPage'));
const TeacherAttendancePage  = lazy(() => import('../pages/teacher/AttendancePage/AttendancePage'));
const LMSPage                = lazy(() => import('../pages/teacher/LMSPage/LMSPage'));
const MyClassesPage          = lazy(() => import('../pages/teacher/MyClassesPage/MyClassesPage'));
const ClassDetailPage        = lazy(() => import('../pages/teacher/ClassDetailPage/ClassDetailPage'));
const FichesPage             = lazy(() => import('../pages/teacher/FichesPage/FichesPage'));
const GradeEntryPage         = lazy(() => import('../pages/teacher/GradeEntryPage/GradeEntryPage'));
const ReportCardsPage        = lazy(() => import('../pages/teacher/ReportCardsPage/ReportCardsPage'));
const CreateReportCardPage   = lazy(() => import('../pages/teacher/CreateReportCardPage/CreateReportCardPage'));
const EditReportCardPage     = lazy(() => import('../pages/teacher/EditReportCardPage/EditReportCardPage'));
const TeacherBulletinsPage   = lazy(() => import('../pages/teacher/BulletinsPage/BulletinsPage'));
const StudentProfilePage     = lazy(() => import('../pages/teacher/StudentProfilePage/StudentProfilePage'));
const ProgramPage            = lazy(() => import('../pages/teacher/ProgramPage/ProgramPage'));
const TeacherSchedulePage    = lazy(() => import('../pages/teacher/TeacherSchedulePage/TeacherSchedulePage'));
const TeacherRoadmapPage     = lazy(() => import('../pages/teacher/TeacherRoadmapPage/TeacherRoadmapPage'));
const ClassStatsPage         = lazy(() => import('../pages/teacher/ClassStatsPage/ClassStatsPage'));
const TitulaireEntryPage     = lazy(() => import('../pages/teacher/TitulaireEntryPage/TitulaireEntryPage'));
const MockExamsPage          = lazy(() => import('../pages/teacher/MockExamsPage/MockExamsPage'));
const MockExamGradePage      = lazy(() => import('../pages/teacher/MockExamGradePage/MockExamGradePage'));

// ── Parent ────────────────────────────────────────────────────────────────────
const ParentDashboardPage    = lazy(() => import('../pages/parent/ParentDashboardPage/ParentDashboardPage'));
const ParentAbsencesPage     = lazy(() => import('../pages/parent/ParentAbsencesPage/ParentAbsencesPage'));
const ChildrenPage           = lazy(() => import('../pages/parent/ChildrenPage/ChildrenPage'));
const ChildReportCardsPage   = lazy(() => import('../pages/parent/ChildReportCardsPage/ChildReportCardsPage'));
const ParentBulletinsPage    = lazy(() => import('../pages/parent/ChildBulletinsPage/ChildBulletinsPage'));
const PaymentHistoryPage     = lazy(() => import('../pages/parent/PaymentHistoryPage/PaymentHistoryPage'));
const PaymentReturnPage      = lazy(() => import('../pages/parent/PaymentReturnPage/PaymentReturnPage'));
const NotificationPreferencesPage = lazy(() => import('../pages/parent/NotificationPreferencesPage/NotificationPreferencesPage'));
const ParentLMSPage          = lazy(() => import('../pages/parent/ParentLMSPage/ParentLMSPage'));

// ── Student ───────────────────────────────────────────────────────────────────
const StudentDashboardPage   = lazy(() => import('../pages/student/StudentDashboardPage/StudentDashboardPage'));
const MyReportCardsPage      = lazy(() => import('../pages/student/MyReportCardsPage/MyReportCardsPage'));
const ProgressPage           = lazy(() => import('../pages/student/ProgressPage/ProgressPage'));
const StudentBulletinsPage   = lazy(() => import('../pages/student/BulletinsPage/BulletinsPage'));
const StudentLMSPage         = lazy(() => import('../pages/student/StudentLMSPage/StudentLMSPage'));

const ReportIncidentPage     = lazy(() => import('../pages/shared/ReportIncidentPage/ReportIncidentPage'));
const IncidentsPage          = lazy(() => import('../pages/admin/IncidentsPage/IncidentsPage'));

// ── Shared (protected) ────────────────────────────────────────────────────────
const ProfilePage            = lazy(() => import('../pages/shared/ProfilePage/ProfilePage'));
const HelpPage               = lazy(() => import('../pages/shared/HelpPage/HelpPage'));
const ClassPalmaresPage      = lazy(() => import('../pages/shared/ClassPalmaresPage/ClassPalmaresPage'));
const PrintReportCardPage    = lazy(() => import('../pages/shared/PrintReportCardPage/PrintReportCardPage'));
const AnnualReportPage       = lazy(() => import('../pages/shared/AnnualReportPage/AnnualReportPage'));
const MockExamRelevePage     = lazy(() => import('../pages/shared/MockExamRelevePage/MockExamRelevePage'));
const MockExamPalmaresPage   = lazy(() => import('../pages/shared/MockExamPalmaresPage/MockExamPalmaresPage'));
const MockExamFichePage      = lazy(() => import('../pages/shared/MockExamFichePage/MockExamFichePage'));
const MockExamFichePrintPage = lazy(() => import('../pages/shared/MockExamFichePrintPage/MockExamFichePrintPage'));
const FicheDeNotesPrintPage  = lazy(() => import('../pages/shared/FicheDeNotesPrintPage/FicheDeNotesPrintPage'));
const MockExamFichesListPage = lazy(() => import('../pages/shared/MockExamFichesListPage/MockExamFichesListPage'));
const MockExamResultsPage    = lazy(() => import('../pages/shared/MockExamResultsPage/MockExamResultsPage'));

const fallback = <Loading fullPage />;

function AppRouter() {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        {/* Public */}
        <Route path="/"                   element={<HomePage />} />
        <Route path="/home"               element={<LandingPage />} />
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/register"           element={<RegisterPage />} />
        <Route path="/register-school"    element={<RegisterSchoolPage />} />
        <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
        <Route path="/reset-password"     element={<ResetPasswordPage />} />
        <Route path="/login-otp"          element={<OtpLoginPage />} />
        <Route path="/set-password"       element={<SetPasswordPage />} />
        <Route path="/auth/callback"      element={<GoogleCallbackPage />} />
        <Route path="/verify-bulletin"    element={<BulletinVerifyPage />} />
        <Route path="/legal/:type"        element={<LegalPage />} />
        <Route path="/unauthorized"       element={<UnauthorizedPage />} />
        <Route path="/error"             element={<ErrorPage />} />

        {/* Super-Admin */}
        <Route path="/superadmin" element={<ProtectedRoute roles={['SUPERADMIN']}><SuperAdminPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin"               element={<ProtectedRoute roles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/users"         element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="/admin/classes"       element={<ProtectedRoute roles={['ADMIN']}><ClassesPage /></ProtectedRoute>} />
        <Route path="/admin/classes/:id"  element={<ProtectedRoute roles={['ADMIN']}><AdminClassDetailPage /></ProtectedRoute>} />
        <Route path="/admin/students"      element={<ProtectedRoute roles={['ADMIN']}><StudentsPage /></ProtectedRoute>} />
        <Route path="/admin/students/:id"  element={<ProtectedRoute roles={['ADMIN']}><AdminStudentProfilePage /></ProtectedRoute>} />
        <Route path="/admin/subjects"      element={<ProtectedRoute roles={['ADMIN']}><SubjectsPage /></ProtectedRoute>} />
        <Route path="/admin/subjects/:id"  element={<ProtectedRoute roles={['ADMIN']}><AdminSubjectProfilePage /></ProtectedRoute>} />
        <Route path="/admin/fees"          element={<ProtectedRoute roles={['ADMIN']}><FeesPage /></ProtectedRoute>} />
        <Route path="/admin/payments"       element={<ProtectedRoute roles={['ADMIN', 'BURSAR']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/admin/payment-plans" element={<ProtectedRoute roles={['ADMIN', 'BURSAR']}><PaymentPlansPage /></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute roles={['ADMIN', 'BURSAR']}><NotificationLogsPage /></ProtectedRoute>} />
        <Route path="/admin/analytics"     element={<ProtectedRoute roles={['ADMIN']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/admin/branding"      element={<ProtectedRoute roles={['ADMIN']}><BrandingPage /></ProtectedRoute>} />
        <Route path="/admin/settings"      element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
        <Route path="/admin/bulletins"     element={<ProtectedRoute roles={['ADMIN']}><TeacherBulletinsPage /></ProtectedRoute>} />
        <Route path="/admin/reports"       element={<ProtectedRoute roles={['ADMIN']}><ReportCardsPage /></ProtectedRoute>} />
        <Route path="/admin/reports/new"   element={<ProtectedRoute roles={['ADMIN']}><CreateReportCardPage /></ProtectedRoute>} />
        <Route path="/admin/reports/:id"   element={<ProtectedRoute roles={['ADMIN']}><EditReportCardPage /></ProtectedRoute>} />
        <Route path="/admin/statistics"    element={<ProtectedRoute roles={['ADMIN']}><ClassStatsPage /></ProtectedRoute>} />
        <Route path="/admin/import"        element={<ProtectedRoute roles={['ADMIN']}><AdminImportPage /></ProtectedRoute>} />
        <Route path="/admin/attendance"    element={<ProtectedRoute roles={['ADMIN']}><AdminAttendancePage /></ProtectedRoute>} />
        <Route path="/admin/school-documents" element={<ProtectedRoute roles={['ADMIN']}><SchoolDocumentsPage /></ProtectedRoute>} />
        <Route path="/admin/staff"         element={<ProtectedRoute roles={['ADMIN']}><StaffDirectoryPage /></ProtectedRoute>} />
        <Route path="/admin/calendar"      element={<ProtectedRoute roles={['ADMIN']}><CalendarPage /></ProtectedRoute>} />
        <Route path="/admin/disciplinary"  element={<ProtectedRoute roles={['ADMIN']}><DisciplinaryPage /></ProtectedRoute>} />
        <Route path="/admin/alumni"        element={<ProtectedRoute roles={['ADMIN']}><AlumniPage /></ProtectedRoute>} />
        <Route path="/admin/transfers"     element={<ProtectedRoute roles={['ADMIN']}><TransfersPage /></ProtectedRoute>} />
        <Route path="/admin/inventory"     element={<ProtectedRoute roles={['ADMIN']}><InventoryPage /></ProtectedRoute>} />
        <Route path="/admin/purchases"     element={<ProtectedRoute roles={['ADMIN']}><PurchasesPage /></ProtectedRoute>} />
        <Route path="/admin/national-exams" element={<ProtectedRoute roles={['ADMIN']}><NationalExamResultsPage /></ProtectedRoute>} />
        <Route path="/admin/library"        element={<ProtectedRoute roles={['ADMIN']}><LibraryPage /></ProtectedRoute>} />
        <Route path="/admin/health"         element={<ProtectedRoute roles={['ADMIN']}><HealthRecordsPage /></ProtectedRoute>} />
        <Route path="/admin/timetable"      element={<ProtectedRoute roles={['ADMIN']}><TimetableBuilderPage /></ProtectedRoute>} />
        <Route path="/admin/mock-exams"              element={<ProtectedRoute roles={['ADMIN']}><MockExamsPage /></ProtectedRoute>} />
        <Route path="/admin/mock-exams/:id/grades"   element={<ProtectedRoute roles={['ADMIN']}><MockExamGradePage /></ProtectedRoute>} />
        <Route path="/admin/mock-exam-fiches"        element={<ProtectedRoute roles={['ADMIN']}><MockExamFichesListPage /></ProtectedRoute>} />
        <Route path="/admin/mock-exam-results"       element={<ProtectedRoute roles={['ADMIN']}><MockExamResultsPage /></ProtectedRoute>} />
        <Route path="/admin/subscription"            element={<ProtectedRoute roles={['ADMIN']}><SubscriptionPage /></ProtectedRoute>} />
        <Route path="/subscription-return"           element={<SubscriptionReturnPage />} />

        {/* Bursar */}
        <Route path="/bursar"              element={<ProtectedRoute roles={['BURSAR']}><BursarDashboardPage /></ProtectedRoute>} />
        <Route path="/bursar/fees"         element={<ProtectedRoute roles={['BURSAR']}><FeesPage /></ProtectedRoute>} />
        <Route path="/bursar/payments"       element={<ProtectedRoute roles={['BURSAR']}><PaymentsPage /></ProtectedRoute>} />
        <Route path="/bursar/payment-plans" element={<ProtectedRoute roles={['BURSAR']}><PaymentPlansPage /></ProtectedRoute>} />
        <Route path="/bursar/notifications" element={<ProtectedRoute roles={['BURSAR']}><NotificationLogsPage /></ProtectedRoute>} />

        {/* Teacher */}
        <Route path="/teacher"                    element={<ProtectedRoute roles={['TEACHER']}><TeacherDashboardPage /></ProtectedRoute>} />
        <Route path="/teacher/fiches"                              element={<ProtectedRoute roles={['TEACHER']}><FichesPage /></ProtectedRoute>} />
        <Route path="/teacher/classes"                              element={<ProtectedRoute roles={['TEACHER']}><MyClassesPage /></ProtectedRoute>} />
        <Route path="/teacher/classes/:id"                         element={<ProtectedRoute roles={['TEACHER']}><ClassDetailPage /></ProtectedRoute>} />
        <Route path="/teacher/classes/:classId/grades/:subjectId"  element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><GradeEntryPage /></ProtectedRoute>} />
        <Route path="/teacher/classes/:classId/grades/:subjectId/print" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><FicheDeNotesPrintPage /></ProtectedRoute>} />
        <Route path="/teacher/classes/:classId/titulaire"          element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TitulaireEntryPage /></ProtectedRoute>} />
        <Route path="/teacher/classes/:classId/subjects/:subjectId/program" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><ProgramPage /></ProtectedRoute>} />
        <Route path="/teacher/students/:id"       element={<ProtectedRoute roles={['TEACHER']}><StudentProfilePage /></ProtectedRoute>} />
        <Route path="/teacher/reports"            element={<ProtectedRoute roles={['TEACHER']}><ReportCardsPage /></ProtectedRoute>} />
        <Route path="/teacher/reports/new"        element={<ProtectedRoute roles={['TEACHER']}><CreateReportCardPage /></ProtectedRoute>} />
        <Route path="/teacher/reports/:id"        element={<ProtectedRoute roles={['TEACHER']}><EditReportCardPage /></ProtectedRoute>} />
        <Route path="/teacher/bulletins"          element={<ProtectedRoute roles={['TEACHER']}><TeacherBulletinsPage /></ProtectedRoute>} />
        <Route path="/teacher/statistics"         element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><ClassStatsPage /></ProtectedRoute>} />
        <Route path="/teacher/attendance"         element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><TeacherAttendancePage /></ProtectedRoute>} />
        <Route path="/teacher/lms"                element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><LMSPage /></ProtectedRoute>} />
        <Route path="/teacher/mock-exams"            element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamsPage /></ProtectedRoute>} />
        <Route path="/teacher/mock-exams/:id/grades" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamGradePage /></ProtectedRoute>} />
        <Route path="/teacher/mock-exam-fiches"      element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamFichesListPage /></ProtectedRoute>} />
        <Route path="/teacher/mock-exam-results"     element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamResultsPage /></ProtectedRoute>} />
        <Route path="/teacher/schedule"      element={<ProtectedRoute roles={['TEACHER']}><TeacherSchedulePage /></ProtectedRoute>} />
        <Route path="/teacher/roadmap"       element={<ProtectedRoute roles={['TEACHER']}><TeacherRoadmapPage /></ProtectedRoute>} />
        <Route path="/teacher/calendar"    element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><CalendarPage /></ProtectedRoute>} />

        {/* Parent */}
        <Route path="/parent"                     element={<ProtectedRoute roles={['PARENT']}><ParentDashboardPage /></ProtectedRoute>} />
        <Route path="/parent/children"            element={<ProtectedRoute roles={['PARENT']}><ChildrenPage /></ProtectedRoute>} />
        <Route path="/parent/children/:id/reports" element={<ProtectedRoute roles={['PARENT']}><ChildReportCardsPage /></ProtectedRoute>} />
        <Route path="/parent/bulletins"           element={<ProtectedRoute roles={['PARENT']}><ParentBulletinsPage /></ProtectedRoute>} />
        <Route path="/parent/payments"            element={<ProtectedRoute roles={['PARENT']}><PaymentHistoryPage /></ProtectedRoute>} />
        <Route path="/payment-return"             element={<ProtectedRoute roles={['PARENT']}><PaymentReturnPage /></ProtectedRoute>} />
        <Route path="/parent/notifications"       element={<ProtectedRoute roles={['PARENT']}><NotificationPreferencesPage /></ProtectedRoute>} />
        <Route path="/parent/lms"                 element={<ProtectedRoute roles={['PARENT']}><ParentLMSPage /></ProtectedRoute>} />
        <Route path="/parent/absences"            element={<ProtectedRoute roles={['PARENT']}><ParentAbsencesPage /></ProtectedRoute>} />
        <Route path="/parent/calendar"     element={<ProtectedRoute roles={['PARENT']}><CalendarPage /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student"                  element={<ProtectedRoute roles={['STUDENT']}><StudentDashboardPage /></ProtectedRoute>} />
        <Route path="/student/reports"          element={<ProtectedRoute roles={['STUDENT']}><MyReportCardsPage /></ProtectedRoute>} />
        <Route path="/student/progress"         element={<ProtectedRoute roles={['STUDENT']}><ProgressPage /></ProtectedRoute>} />
        <Route path="/student/bulletins"        element={<ProtectedRoute roles={['STUDENT']}><StudentBulletinsPage /></ProtectedRoute>} />
        <Route path="/student/lms"              element={<ProtectedRoute roles={['STUDENT']}><StudentLMSPage /></ProtectedRoute>} />
        <Route path="/student/report-incident"  element={<ProtectedRoute roles={['STUDENT']}><ReportIncidentPage /></ProtectedRoute>} />

        {/* Teacher — incident reporting */}
        <Route path="/teacher/report-incident"  element={<ProtectedRoute roles={['TEACHER']}><ReportIncidentPage /></ProtectedRoute>} />

        {/* Admin — incident management */}
        <Route path="/admin/incidents"          element={<ProtectedRoute roles={['ADMIN']}><IncidentsPage /></ProtectedRoute>} />

        {/* Shared */}
        <Route path="/help"     element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />
        <Route path="/palmares" element={<ProtectedRoute roles={['ADMIN','TEACHER']}><ClassPalmaresPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/reports/:id/print" element={<ProtectedRoute><PrintReportCardPage /></ProtectedRoute>} />
        <Route path="/reports/annual/:studentId/:academicYear" element={<ProtectedRoute><AnnualReportPage /></ProtectedRoute>} />
        <Route path="/mock-exams/:id/fiche"          element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamFichePage /></ProtectedRoute>} />
        <Route path="/mock-exams/:id/fiche/print"    element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamFichePrintPage /></ProtectedRoute>} />
        <Route path="/mock-exams/:id/releve"         element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamRelevePage /></ProtectedRoute>} />
        <Route path="/mock-exams/:id/palmares"       element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><MockExamPalmaresPage /></ProtectedRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
