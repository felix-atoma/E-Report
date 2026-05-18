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
    { to: '/admin/subjects',      icon: 'book',      labelKey: 'nav.subjects' },
    { divider: true,              sectionKey: 'section.pedagogy' },
    { to: '/admin/reports',       icon: 'clipboard', labelKey: 'nav.reports' },
    { to: '/admin/statistics',    icon: 'stats',     labelKey: 'nav.statistics' },
    { to: '/admin/bulletins',     icon: 'megaphone', labelKey: 'nav.bulletins' },
    { to: '/teacher/lms',         icon: 'lms',       labelKey: 'nav.lms' },
    { divider: true,              sectionKey: 'section.finance' },
    { to: '/admin/fees',          icon: 'coins',     labelKey: 'nav.fees' },
    { to: '/admin/payments',      icon: 'card',      labelKey: 'nav.payments' },
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
    { to: '/teacher/lms',         icon: 'lms',       labelKey: 'nav.lms' },
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
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
                end={item.to.split('/').length <= 2}
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
