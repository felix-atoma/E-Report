import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { notificationsService } from '../../../services/notificationsService';
import Avatar from '../../common/Avatar/Avatar';
import logoIcon from '../../../assets/images/novaBulletin-icon.svg';
import './Topbar.css';

const ROLE_HOME = {
  ADMIN: '/admin', TEACHER: '/teacher',
  BURSAR: '/bursar', PARENT: '/parent', STUDENT: '/student',
};

function useTimeAgo(t) {
  return (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return t('topbar.timeAgo.now');
    if (diff < 3600) return t('topbar.timeAgo.minutes', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('topbar.timeAgo.hours', { count: Math.floor(diff / 3600) });
    return t('topbar.timeAgo.days', { count: Math.floor(diff / 86400) });
  };
}

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return { open, setOpen, ref };
}

const STATUS_ICON = {
  DELIVERED: '✅', PENDING: '🕐', HELD_UNPAID: '🔒', HELD_PARTIAL: '🟡',
  FAILED: '❌', SENT: '📨',
};

function Topbar({ title, onMenuClick }) {
  const { t } = useTranslation();
  const timeAgo = useTimeAgo(t);
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const notif = useDropdown();
  const userDrop = useDropdown();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-mine'],
    queryFn: () => notificationsService.mine().then((r) => r.data),
    refetchInterval: 60000,
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-mine'] }),
  });

  const handleOpenNotif = () => {
    notif.setOpen((v) => {
      if (!v && unreadCount > 0) markAllRead.mutate();
      return !v;
    });
  };

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    userDrop.setOpen(false);
    setLoggingOut(true);
    await logout();
    // Let the fade-out animation finish before navigating
    setTimeout(() => navigate('/login'), 700);
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <header className="topbar">
      {/* Left — hamburger + brand + title */}
      <div className="topbar__left">
        <button className="topbar__hamburger" onClick={onMenuClick} aria-label={t('topbar.openMenu')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div className="topbar__brand">
          <img src={logoIcon} alt="NovaBulletin" className="topbar__brand-logo" />
          <span className="topbar__brand-name">NovaBulletin <span className="topbar__brand-ltd">Ltd</span></span>
        </div>
        {title && <h1 className="topbar__title">{title}</h1>}
      </div>

      {/* Centre — search */}
      <form className="topbar__search" onSubmit={handleSearch}>
        <svg className="topbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          className="topbar__search-input"
          placeholder={t('topbar.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {/* Right — theme + notifications + user */}
      <div className="topbar__right">
        {/* Theme toggle */}
        <button
          className="topbar__icon-btn"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1"  x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1"  y1="12" x2="3"  y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Notification dropdown */}
        <div className="topbar__dropdown-wrap" ref={notif.ref}>
          <button
            className="topbar__icon-btn topbar__icon-btn--badge"
            onClick={handleOpenNotif}
            aria-label={t('topbar.notifications')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="topbar__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notif.open && (
            <div className="topbar__dropdown topbar__dropdown--notif">
              <div className="topbar__dropdown-header">
                <span className="topbar__dropdown-title">{t('topbar.notifications')}</span>
                {unreadCount > 0 && (
                  <span className="topbar__notif-count">{t('topbar.newNotifBadge', { count: unreadCount })}</span>
                )}
              </div>

              <div className="topbar__notif-list">
                {notifications.length === 0 ? (
                  <div className="topbar__notif-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <p>{t('topbar.noNotifications')}</p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className={`topbar__notif-item${!n.isRead ? ' topbar__notif-item--unread' : ''}`}
                    >
                      <span className="topbar__notif-icon">
                        {STATUS_ICON[n.status] ?? '🔔'}
                      </span>
                      <div className="topbar__notif-body">
                        <p className="topbar__notif-text">
                          {n.student?.user?.name ?? t('role.STUDENT')} —{' '}
                          {n.reportCard?.termName ?? 'Bulletin'}
                          {n.reportCard?.academicYear ? ` ${n.reportCard.academicYear}` : ''}
                        </p>
                        <p className="topbar__notif-status">
                          {t(`topbar.notifStatus.${n.status}`, n.status)}
                        </p>
                        <p className="topbar__notif-time">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="topbar__dropdown-footer">
                <Link to="/notifications" onClick={() => notif.setOpen(false)}>
                  {t('topbar.viewAllNotifications')}
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="topbar__divider" aria-hidden="true" />

        {/* User dropdown — ZDesk style */}
        <div className="topbar__dropdown-wrap" ref={userDrop.ref}>
        <button
          className="topbar__user-btn"
          onClick={() => userDrop.setOpen((v) => !v)}
          aria-label={t('topbar.userMenu')}
        >
          <Avatar name={user?.name} src={user?.profileImage} size="sm" />
          <div className="topbar__user-info">
            <span className="topbar__user-name">{user?.name}</span>
            <span className="topbar__user-role">{t(`role.${user?.role}`, user?.role)}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {userDrop.open && (
          <div className="topbar__dropdown topbar__dropdown--user">
            {/* User header */}
            <div className="topbar__dropdown-header topbar__dropdown-header--user">
              <Avatar name={user?.name} src={user?.profileImage} size="md" />
              <div>
                <p className="topbar__drop-user-name">{user?.name}</p>
                <p className="topbar__drop-user-role">{t(`role.${user?.role}`, user?.role)}</p>
              </div>
            </div>
            <div className="topbar__dropdown-divider" />
            <Link
              className="topbar__drop-item"
              to="/profile"
              onClick={() => userDrop.setOpen(false)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {t('topbar.myProfile')}
            </Link>
            <Link
              className="topbar__drop-item"
              to={ROLE_HOME[user?.role] ?? '/'}
              onClick={() => userDrop.setOpen(false)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              {t('topbar.dashboard')}
            </Link>
            <div className="topbar__dropdown-divider" />
            <button className="topbar__drop-item topbar__drop-item--danger" onClick={handleLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {t('action.logout')}
            </button>
          </div>
        )}
        </div>
      </div>
      {loggingOut && (
        <div className="topbar__logout-overlay" aria-live="polite">
          <div className="topbar__logout-card">
            <div className="topbar__logout-spinner" />
            <p className="topbar__logout-text">{t('action.loggingOut')}</p>
          </div>
        </div>
      )}
    </header>
  );
}

export default Topbar;
