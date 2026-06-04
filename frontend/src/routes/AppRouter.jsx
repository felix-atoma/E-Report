import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute/ProtectedRoute';

import HomePage               from '../pages/HomePage/HomePage';
import LoginPage              from '../pages/auth/LoginPage/LoginPage';
import RegisterSchoolPage     from '../pages/public/RegisterSchoolPage/RegisterSchoolPage';
import LegalPage              from '../pages/public/LegalPage/LegalPage';
import LandingPage            from '../pages/public/LandingPage/LandingPage';
import SuperAdminPage         from '../pages/superadmin/SuperAdminPage/SuperAdminPage';
import RegisterPage           from '../pages/auth/RegisterPage/RegisterPage';
import ForgotPasswordPage     from '../pages/auth/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage      from '../pages/auth/ResetPasswordPage/ResetPasswordPage';
import OtpLoginPage           from '../pages/auth/OtpLoginPage/OtpLoginPage';
import SetPasswordPage        from '../pages/auth/SetPasswordPage/SetPasswordPage';
import NotFoundPage           from '../pages/shared/NotFoundPage/NotFoundPage';
import UnauthorizedPage       from '../pages/shared/UnauthorizedPage/UnauthorizedPage';
import ErrorPage              from '../pages/shared/ErrorPage/ErrorPage';

import AdminDashboardPage     from '../pages/admin/AdminDashboardPage/AdminDashboardPage';
import AdminAttendancePage    from '../pages/admin/AttendancePage/AttendancePage';
import SchoolDocumentsPage    from '../pages/admin/SchoolDocumentsPage/SchoolDocumentsPage';
import UsersPage              from '../pages/admin/UsersPage/UsersPage';
import ClassesPage            from '../pages/admin/ClassesPage/ClassesPage';
import AdminClassDetailPage      from '../pages/admin/ClassDetailPage/ClassDetailPage';
import AdminStudentProfilePage  from '../pages/admin/StudentProfilePage/StudentProfilePage';
import StudentsPage           from '../pages/admin/StudentsPage/StudentsPage';
import SubjectsPage           from '../pages/admin/SubjectsPage/SubjectsPage';
import AdminSubjectProfilePage from '../pages/admin/SubjectProfilePage/SubjectProfilePage';
import FeesPage               from '../pages/admin/FeesPage/FeesPage';
import PaymentsPage           from '../pages/admin/PaymentsPage/PaymentsPage';
import AnalyticsPage          from '../pages/admin/AnalyticsPage/AnalyticsPage';
import NotificationLogsPage   from '../pages/admin/NotificationLogsPage/NotificationLogsPage';
import BrandingPage           from '../pages/admin/BrandingPage/BrandingPage';
import SettingsPage           from '../pages/admin/SettingsPage/SettingsPage';
import InstitutionsPage       from '../pages/admin/InstitutionsPage/InstitutionsPage';
import AdminImportPage        from '../pages/admin/AdminImportPage/AdminImportPage';
import BulletinVerifyPage    from '../pages/public/BulletinVerifyPage/BulletinVerifyPage';

import TeacherDashboardPage   from '../pages/teacher/TeacherDashboardPage/TeacherDashboardPage';
import TeacherAttendancePage  from '../pages/teacher/AttendancePage/AttendancePage';
import LMSPage                from '../pages/teacher/LMSPage/LMSPage';
import MyClassesPage          from '../pages/teacher/MyClassesPage/MyClassesPage';
import ClassDetailPage        from '../pages/teacher/ClassDetailPage/ClassDetailPage';
import FichesPage             from '../pages/teacher/FichesPage/FichesPage';
import GradeEntryPage         from '../pages/teacher/GradeEntryPage/GradeEntryPage';
import ReportCardsPage        from '../pages/teacher/ReportCardsPage/ReportCardsPage';
import CreateReportCardPage   from '../pages/teacher/CreateReportCardPage/CreateReportCardPage';
import EditReportCardPage     from '../pages/teacher/EditReportCardPage/EditReportCardPage';
import TeacherBulletinsPage   from '../pages/teacher/BulletinsPage/BulletinsPage';
import StudentProfilePage     from '../pages/teacher/StudentProfilePage/StudentProfilePage';
import ProgramPage            from '../pages/teacher/ProgramPage/ProgramPage';
import ClassStatsPage         from '../pages/teacher/ClassStatsPage/ClassStatsPage';
import TitulaireEntryPage     from '../pages/teacher/TitulaireEntryPage/TitulaireEntryPage';

import ParentDashboardPage    from '../pages/parent/ParentDashboardPage/ParentDashboardPage';
import ParentAbsencesPage    from '../pages/parent/ParentAbsencesPage/ParentAbsencesPage';
import ChildrenPage           from '../pages/parent/ChildrenPage/ChildrenPage';
import ChildReportCardsPage   from '../pages/parent/ChildReportCardsPage/ChildReportCardsPage';
import ParentBulletinsPage    from '../pages/parent/ChildBulletinsPage/ChildBulletinsPage';
import PaymentHistoryPage     from '../pages/parent/PaymentHistoryPage/PaymentHistoryPage';
import PaymentReturnPage     from '../pages/parent/PaymentReturnPage/PaymentReturnPage';
import NotificationPreferencesPage from '../pages/parent/NotificationPreferencesPage/NotificationPreferencesPage';
import ParentLMSPage          from '../pages/parent/ParentLMSPage/ParentLMSPage';

import BursarDashboardPage    from '../pages/bursar/BursarDashboardPage/BursarDashboardPage';

import StudentDashboardPage   from '../pages/student/StudentDashboardPage/StudentDashboardPage';
import MyReportCardsPage      from '../pages/student/MyReportCardsPage/MyReportCardsPage';
import ProgressPage           from '../pages/student/ProgressPage/ProgressPage';
import StudentBulletinsPage   from '../pages/student/BulletinsPage/BulletinsPage';
import StudentLMSPage         from '../pages/student/StudentLMSPage/StudentLMSPage';

import ProfilePage            from '../pages/shared/ProfilePage/ProfilePage';
import HelpPage               from '../pages/shared/HelpPage/HelpPage';
import ClassPalmaresPage      from '../pages/shared/ClassPalmaresPage/ClassPalmaresPage';
import PrintReportCardPage   from '../pages/shared/PrintReportCardPage/PrintReportCardPage';
import AnnualReportPage      from '../pages/shared/AnnualReportPage/AnnualReportPage';
import GoogleCallbackPage    from '../pages/auth/GoogleCallbackPage/GoogleCallbackPage';
import MockExamsPage          from '../pages/teacher/MockExamsPage/MockExamsPage';
import MockExamGradePage      from '../pages/teacher/MockExamGradePage/MockExamGradePage';
import MockExamRelevePage     from '../pages/shared/MockExamRelevePage/MockExamRelevePage';
import MockExamPalmaresPage   from '../pages/shared/MockExamPalmaresPage/MockExamPalmaresPage';
import MockExamFichePage      from '../pages/shared/MockExamFichePage/MockExamFichePage';
import MockExamFichePrintPage from '../pages/shared/MockExamFichePrintPage/MockExamFichePrintPage';
import MockExamFichesListPage from '../pages/shared/MockExamFichesListPage/MockExamFichesListPage';
import MockExamResultsPage    from '../pages/shared/MockExamResultsPage/MockExamResultsPage';
import StaffDirectoryPage     from '../pages/admin/StaffDirectoryPage/StaffDirectoryPage';
import CalendarPage           from '../pages/admin/CalendarPage/CalendarPage';
import DisciplinaryPage       from '../pages/admin/DisciplinaryPage/DisciplinaryPage';
import AlumniPage             from '../pages/admin/AlumniPage/AlumniPage';
import TransfersPage          from '../pages/admin/TransfersPage/TransfersPage';
import InventoryPage          from '../pages/admin/InventoryPage/InventoryPage';
import NationalExamResultsPage from '../pages/admin/NationalExamResultsPage/NationalExamResultsPage';
import LibraryPage             from '../pages/admin/LibraryPage/LibraryPage';
import HealthRecordsPage       from '../pages/admin/HealthRecordsPage/HealthRecordsPage';
import TimetableBuilderPage    from '../pages/admin/TimetableBuilderPage/TimetableBuilderPage';

function AppRouter() {
  return (
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
      <Route path="/error"              element={<ErrorPage />} />

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
      <Route path="/admin/payments"      element={<ProtectedRoute roles={['ADMIN', 'BURSAR']}><PaymentsPage /></ProtectedRoute>} />
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
      <Route path="/admin/national-exams" element={<ProtectedRoute roles={['ADMIN']}><NationalExamResultsPage /></ProtectedRoute>} />
      <Route path="/admin/library"        element={<ProtectedRoute roles={['ADMIN']}><LibraryPage /></ProtectedRoute>} />
      <Route path="/admin/health"         element={<ProtectedRoute roles={['ADMIN']}><HealthRecordsPage /></ProtectedRoute>} />
      <Route path="/admin/timetable"      element={<ProtectedRoute roles={['ADMIN']}><TimetableBuilderPage /></ProtectedRoute>} />

      {/* Bursar */}
      <Route path="/bursar"              element={<ProtectedRoute roles={['BURSAR']}><BursarDashboardPage /></ProtectedRoute>} />
      <Route path="/bursar/fees"         element={<ProtectedRoute roles={['BURSAR']}><FeesPage /></ProtectedRoute>} />
      <Route path="/bursar/payments"     element={<ProtectedRoute roles={['BURSAR']}><PaymentsPage /></ProtectedRoute>} />
      <Route path="/bursar/notifications" element={<ProtectedRoute roles={['BURSAR']}><NotificationLogsPage /></ProtectedRoute>} />

      {/* Teacher */}
      <Route path="/teacher"                    element={<ProtectedRoute roles={['TEACHER']}><TeacherDashboardPage /></ProtectedRoute>} />
      <Route path="/teacher/fiches"                              element={<ProtectedRoute roles={['TEACHER']}><FichesPage /></ProtectedRoute>} />
      <Route path="/teacher/classes"                              element={<ProtectedRoute roles={['TEACHER']}><MyClassesPage /></ProtectedRoute>} />
      <Route path="/teacher/classes/:id"                         element={<ProtectedRoute roles={['TEACHER']}><ClassDetailPage /></ProtectedRoute>} />
      <Route path="/teacher/classes/:classId/grades/:subjectId"  element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><GradeEntryPage /></ProtectedRoute>} />
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
      <Route path="/student"             element={<ProtectedRoute roles={['STUDENT']}><StudentDashboardPage /></ProtectedRoute>} />
      <Route path="/student/reports"     element={<ProtectedRoute roles={['STUDENT']}><MyReportCardsPage /></ProtectedRoute>} />
      <Route path="/student/progress"    element={<ProtectedRoute roles={['STUDENT']}><ProgressPage /></ProtectedRoute>} />
      <Route path="/student/bulletins"   element={<ProtectedRoute roles={['STUDENT']}><StudentBulletinsPage /></ProtectedRoute>} />
      <Route path="/student/lms"         element={<ProtectedRoute roles={['STUDENT']}><StudentLMSPage /></ProtectedRoute>} />

      {/* Admin mock-exams mirror */}
      <Route path="/admin/mock-exams"              element={<ProtectedRoute roles={['ADMIN']}><MockExamsPage /></ProtectedRoute>} />
      <Route path="/admin/mock-exams/:id/grades"   element={<ProtectedRoute roles={['ADMIN']}><MockExamGradePage /></ProtectedRoute>} />
      <Route path="/admin/mock-exam-fiches"        element={<ProtectedRoute roles={['ADMIN']}><MockExamFichesListPage /></ProtectedRoute>} />
      <Route path="/admin/mock-exam-results"       element={<ProtectedRoute roles={['ADMIN']}><MockExamResultsPage /></ProtectedRoute>} />

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
  );
}

export default AppRouter;
