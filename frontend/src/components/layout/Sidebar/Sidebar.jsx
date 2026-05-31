import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useInstitution } from '../../../context/InstitutionContext';
import Avatar from '../../common/Avatar/Avatar';
import LanguageSwitcher from '../../common/LanguageSwitcher/LanguageSwitcher';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './Sidebar.css';

const NAV = {
  ADMIN: [
    { to: '/admin',               icon: 'grid',      labelKey: 'nav.dashboard' },
    { divider: true,              sectionKey: 'section.school' },
    { to: '/admin/users',         icon: 'users',     labelKey: 'nav.users' },
    { to: '/admin/classes',       icon: 'school',    labelKey: 'nav.classes' },
    { to: '/admin/students',      icon: 'backpack',  labelKey: 'nav.students' },
    { to: '/admin/import',        icon: 'upload',    labelKey: 'nav.bulkImport' },
    { to: '/admin/subjects',      icon: 'book',      labelKey: 'nav.subjects' },
    { divider: true,              sectionKey: 'section.pedagogy' },
    { to: '/admin/reports',       icon: 'clipboard', labelKey: 'nav.reports' },
    { to: '/admin/statistics',    icon: 'stats',     labelKey: 'nav.statistics' },
    { to: '/admin/bulletins',     icon: 'megaphone', labelKey: 'nav.bulletins' },
    { to: '/admin/mock-exams',         icon: 'exam',      labelKey: 'nav.mockExams' },
    { to: '/admin/mock-exam-fiches',   icon: 'fichexam',  labelKey: 'nav.mockExamFiches' },
    { to: '/admin/mock-exam-results',  icon: 'trophy',    labelKey: 'nav.mockExamResults' },
    { to: '/teacher/lms',              icon: 'lms',       labelKey: 'nav.lms' },
    { divider: true,              sectionKey: 'section.finance' },
    { to: '/admin/fees',          icon: 'coins',     labelKey: 'nav.fees' },
    { to: '/admin/payments',      icon: 'card',      labelKey: 'nav.payments' },
    { divider: true,              sectionKey: 'section.records' },
    { to: '/admin/attendance',       icon: 'attendance',  labelKey: 'nav.attendance' },
    { to: '/admin/staff',            icon: 'briefcase',   labelKey: 'nav.staff' },
    { to: '/admin/calendar',         icon: 'calendar',    labelKey: 'nav.calendar' },
    { to: '/admin/disciplinary',     icon: 'shield',      labelKey: 'nav.disciplinary' },
    { to: '/admin/alumni',           icon: 'graduation',  labelKey: 'nav.alumni' },
    { to: '/admin/transfers',        icon: 'transfer',    labelKey: 'nav.transfers' },
    { to: '/admin/inventory',        icon: 'inventory',   labelKey: 'nav.inventory' },
    { to: '/admin/national-exams',   icon: 'exam_nat',    labelKey: 'nav.nationalExams' },
    { to: '/admin/library',          icon: 'library',     labelKey: 'nav.library' },
    { to: '/admin/health',           icon: 'health',      labelKey: 'nav.health' },
    { to: '/admin/school-documents', icon: 'folder',      labelKey: 'nav.schoolDocuments' },
    { divider: true,              sectionKey: 'section.system' },
    { to: '/admin/notifications', icon: 'bell',      labelKey: 'nav.notifications' },
    { to: '/admin/analytics',     icon: 'chart',     labelKey: 'nav.analytics' },
    { to: '/admin/branding',      icon: 'palette',   labelKey: 'nav.branding' },
    { to: '/admin/settings',      icon: 'settings',  labelKey: 'nav.settings' },
  ],
  TEACHER: [
    { to: '/teacher',             icon: 'grid',      labelKey: 'nav.dashboard' },
    { divider: true,              sectionKey: 'section.classes' },
    { to: '/teacher/classes',     icon: 'school',    labelKey: 'nav.myClasses' },
    { divider: true,              sectionKey: 'section.pedagogy' },
    { to: '/teacher/fiches',      icon: 'notes',     labelKey: 'nav.gradeSheets' },
    { to: '/teacher/reports',     icon: 'clipboard', labelKey: 'nav.reports' },
    { to: '/teacher/statistics',  icon: 'stats',     labelKey: 'nav.statistics' },
    { to: '/teacher/bulletins',   icon: 'megaphone', labelKey: 'nav.bulletins' },
    { to: '/teacher/mock-exams',         icon: 'exam',      labelKey: 'nav.mockExams' },
    { to: '/teacher/mock-exam-fiches',   icon: 'fichexam',  labelKey: 'nav.mockExamFiches' },
    { to: '/teacher/mock-exam-results',  icon: 'trophy',    labelKey: 'nav.mockExamResults' },
    { to: '/teacher/lms',                icon: 'lms',       labelKey: 'nav.lms' },
  ],
  BURSAR: [
    { to: '/bursar',               icon: 'grid',      labelKey: 'nav.dashboard' },
    { to: '/bursar/fees',          icon: 'coins',     labelKey: 'nav.fees' },
    { to: '/bursar/payments',      icon: 'card',      labelKey: 'nav.payments' },
    { to: '/bursar/notifications', icon: 'bell',      labelKey: 'nav.heldBulletins' },
  ],
  PARENT: [
    { to: '/parent',                 icon: 'grid',      labelKey: 'nav.dashboard' },
    { to: '/parent/children',        icon: 'backpack',  labelKey: 'nav.myChildren' },
    { to: '/parent/bulletins',       icon: 'megaphone', labelKey: 'nav.bulletins' },
    { to: '/parent/lms',             icon: 'lms',       labelKey: 'nav.lms' },
    { to: '/parent/payments',        icon: 'card',      labelKey: 'nav.paymentHistory' },
    { to: '/parent/notifications',   icon: 'bell',      labelKey: 'nav.notifications' },
  ],
  STUDENT: [
    { to: '/student',           icon: 'grid',      labelKey: 'nav.dashboard' },
    { to: '/student/reports',   icon: 'clipboard', labelKey: 'nav.myReports' },
    { to: '/student/progress',  icon: 'chart',     labelKey: 'nav.myProgress' },
    { to: '/student/bulletins', icon: 'megaphone', labelKey: 'nav.bulletins' },
    { to: '/student/lms',       icon: 'lms',       labelKey: 'nav.lms' },
  ],
};

const ICONS = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  school: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  backpack: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      <line x1="8" y1="14" x2="16" y2="14"/>
    </svg>
  ),
  book: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  clipboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  ),
  coins: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
      <path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>
    </svg>
  ),
  card: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  megaphone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  ),
  lms: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  palette: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/>
      <circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/>
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  notes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  stats: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  exam: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  fichexam: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9" x2="9" y2="21"/>
    </svg>
  ),
  trophy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  ),
  upload: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  attendance: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  briefcase: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/>
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      <line x1="12" y1="12" x2="12" y2="12"/>
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  shield: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  graduation: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  transfer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  ),
  inventory: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14M5 8a2 2 0 1 1-4 0V6c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v2a2 2 0 1 1-4 0M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4"/>
    </svg>
  ),
  folder: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  exam_nat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      <line x1="12" y1="17" x2="12" y2="20"/>
    </svg>
  ),
  library: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  health: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
};

function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user } = useAuth();
  const { institution } = useInstitution();
  const { t } = useTranslation();
  const items = NAV[user?.role] ?? [];

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside className={[
        'sidebar',
        collapsed ? 'sidebar--collapsed' : '',
        mobileOpen ? 'sidebar--mobile-open' : '',
      ].join(' ')}>

        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__logo-wrap">
            <img src={logoIcon} alt="NovaBulletin" className="sidebar__logo sidebar__logo--icon" />
          </div>
          <button
            className="sidebar__collapse-btn"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            }
          </button>
          <button
            className="sidebar__close-btn"
            onClick={onMobileClose}
            aria-label="Close menu"
          >
            {ICONS.close}
          </button>
        </div>

        {/* User profile */}
        {!collapsed && (
          <div className="sidebar__user">
            <NavLink to="/profile" className="sidebar__user-link" onClick={onMobileClose}>
              <Avatar name={user?.name ?? 'Utilisateur'} src={user?.profileImage} size="sm" />
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{user?.name ?? 'Utilisateur'}</span>
                <span className="sidebar__user-role">{t(`role.${user?.role}`, user?.role)}</span>
              </div>
            </NavLink>
          </div>
        )}
        {collapsed && (
          <div className="sidebar__user sidebar__user--collapsed">
            <NavLink to="/profile" onClick={onMobileClose} title={user?.name}>
              <Avatar name={user?.name ?? 'Utilisateur'} src={user?.profileImage} size="sm" />
            </NavLink>
          </div>
        )}

        {/* Nav items */}
        <nav className="sidebar__nav" aria-label="Navigation principale">
          {items.map((item, idx) => {
            if (item.divider) {
              return !collapsed ? (
                <div key={`div-${idx}`} className="sidebar__group-label">{t(item.sectionKey)}</div>
              ) : (
                <div key={`div-${idx}`} className="sidebar__group-divider" />
              );
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={onMobileClose}
                className={({ isActive }) =>
                  `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                }
              >
                <span className="sidebar__link-icon" aria-hidden="true">{ICONS[item.icon]}</span>
                {!collapsed && <span className="sidebar__link-label">{t(item.labelKey)}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          {!collapsed && (
            <div className="sidebar__help-box">
              <p className="sidebar__help-title">{t('help.title')}</p>
              <p className="sidebar__help-text">{t('help.text')}</p>
            </div>
          )}

          <div className="sidebar__footer-actions">
            <NavLink
              to="/profile"
              onClick={onMobileClose}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon" aria-hidden="true">{ICONS.user}</span>
              {!collapsed && <span className="sidebar__link-label">{t('nav.myProfile')}</span>}
            </NavLink>

            <div className={`sidebar__lang-wrap${collapsed ? ' sidebar__lang-wrap--collapsed' : ''}`}>
              <LanguageSwitcher collapsed={collapsed} />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
