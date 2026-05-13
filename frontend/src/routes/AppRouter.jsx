import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute/ProtectedRoute';

import HomePage               from '../pages/HomePage/HomePage';
import LoginPage              from '../pages/auth/LoginPage/LoginPage';
import RegisterPage           from '../pages/auth/RegisterPage/RegisterPage';
import ForgotPasswordPage     from '../pages/auth/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage      from '../pages/auth/ResetPasswordPage/ResetPasswordPage';
import NotFoundPage           from '../pages/shared/NotFoundPage/NotFoundPage';
import UnauthorizedPage       from '../pages/shared/UnauthorizedPage/UnauthorizedPage';
import ErrorPage              from '../pages/shared/ErrorPage/ErrorPage';

import AdminDashboardPage     from '../pages/admin/AdminDashboardPage/AdminDashboardPage';
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

import TeacherDashboardPage   from '../pages/teacher/TeacherDashboardPage/TeacherDashboardPage';
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
import ChildrenPage           from '../pages/parent/ChildrenPage/ChildrenPage';
import ChildReportCardsPage   from '../pages/parent/ChildReportCardsPage/ChildReportCardsPage';
import ParentBulletinsPage    from '../pages/parent/ChildBulletinsPage/ChildBulletinsPage';
import PaymentHistoryPage     from '../pages/parent/PaymentHistoryPage/PaymentHistoryPage';
import NotificationPreferencesPage from '../pages/parent/NotificationPreferencesPage/NotificationPreferencesPage';
import ParentLMSPage          from '../pages/parent/ParentLMSPage/ParentLMSPage';

import BursarDashboardPage    from '../pages/bursar/BursarDashboardPage/BursarDashboardPage';

import StudentDashboardPage   from '../pages/student/StudentDashboardPage/StudentDashboardPage';
import MyReportCardsPage      from '../pages/student/MyReportCardsPage/MyReportCardsPage';
import ProgressPage           from '../pages/student/ProgressPage/ProgressPage';
import StudentBulletinsPage   from '../pages/student/BulletinsPage/BulletinsPage';
import StudentLMSPage         from '../pages/student/StudentLMSPage/StudentLMSPage';

import ProfilePage            from '../pages/shared/ProfilePage/ProfilePage';
import PrintReportCardPage   from '../pages/shared/PrintReportCardPage/PrintReportCardPage';

function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"                   element={<HomePage />} />
      <Route path="/login"              element={<LoginPage />} />
      <Route path="/register"           element={<RegisterPage />} />
      <Route path="/forgot-password"    element={<ForgotPasswordPage />} />
      <Route path="/reset-password"     element={<ResetPasswordPage />} />
      <Route path="/unauthorized"       element={<UnauthorizedPage />} />
      <Route path="/error"              element={<ErrorPage />} />

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
      <Route path="/admin/statistics"    element={<ProtectedRoute roles={['ADMIN']}><ClassStatsPage /></ProtectedRoute>} />

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
      <Route path="/teacher/lms"                element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><LMSPage /></ProtectedRoute>} />

      {/* Parent */}
      <Route path="/parent"                     element={<ProtectedRoute roles={['PARENT']}><ParentDashboardPage /></ProtectedRoute>} />
      <Route path="/parent/children"            element={<ProtectedRoute roles={['PARENT']}><ChildrenPage /></ProtectedRoute>} />
      <Route path="/parent/children/:id/reports" element={<ProtectedRoute roles={['PARENT']}><ChildReportCardsPage /></ProtectedRoute>} />
      <Route path="/parent/bulletins"           element={<ProtectedRoute roles={['PARENT']}><ParentBulletinsPage /></ProtectedRoute>} />
      <Route path="/parent/payments"            element={<ProtectedRoute roles={['PARENT']}><PaymentHistoryPage /></ProtectedRoute>} />
      <Route path="/parent/notifications"       element={<ProtectedRoute roles={['PARENT']}><NotificationPreferencesPage /></ProtectedRoute>} />
      <Route path="/parent/lms"                 element={<ProtectedRoute roles={['PARENT']}><ParentLMSPage /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student"             element={<ProtectedRoute roles={['STUDENT']}><StudentDashboardPage /></ProtectedRoute>} />
      <Route path="/student/reports"     element={<ProtectedRoute roles={['STUDENT']}><MyReportCardsPage /></ProtectedRoute>} />
      <Route path="/student/progress"    element={<ProtectedRoute roles={['STUDENT']}><ProgressPage /></ProtectedRoute>} />
      <Route path="/student/bulletins"   element={<ProtectedRoute roles={['STUDENT']}><StudentBulletinsPage /></ProtectedRoute>} />
      <Route path="/student/lms"         element={<ProtectedRoute roles={['STUDENT']}><StudentLMSPage /></ProtectedRoute>} />

      {/* Shared */}
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/reports/:id/print" element={<ProtectedRoute><PrintReportCardPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
