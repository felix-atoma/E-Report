import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { notificationsService } from '../../../services/notificationsService';
import Sidebar from '../Sidebar/Sidebar';
import Topbar from '../Topbar/Topbar';
import AiAssistant from '../../common/AiAssistant/AiAssistant';
import './AppShell.css';

const NOTIF_ROUTE = {
  ADMIN: '/admin/notifications', BURSAR: '/bursar/notifications',
  TEACHER: '/teacher/notifications', PARENT: '/parent/notifications',
  STUDENT: '/student/notifications', SUPERADMIN: '/superadmin',
};

function AppShell({ children, title }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-mine'],
    queryFn: () => notificationsService.mine().then((r) => r.data),
    refetchInterval: 60000,
    enabled: !!user,
    select: (data) => data.filter((n) => !n.isRead).length,
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`app-shell${collapsed ? ' app-shell--collapsed' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="app-shell__main">
        <Topbar
          title={title}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="app-shell__content">
          <div key={location.pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>

      {/* Fixed right-side floating action buttons */}
      <div className="side-btn-wrapper">
        {/* Profile */}
        <button
          className="side-btn side-btn--green"
          title="Mon profil"
          onClick={() => navigate('/profile')}
          aria-label="Mon profil"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </button>

        {/* Notifications with live badge */}
        <button
          className="side-btn side-btn--red"
          title="Notifications"
          onClick={() => navigate(NOTIF_ROUTE[user?.role] ?? '/profile')}
          aria-label="Notifications"
          style={{ position: 'relative' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadData > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: '#ef4444', color: '#fff',
              fontSize: '10px', fontWeight: 700,
              borderRadius: '999px', minWidth: '16px', height: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', lineHeight: 1,
            }}>
              {unreadData > 9 ? '9+' : unreadData}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          className="side-btn side-btn--blue"
          title="Se déconnecter"
          onClick={handleLogout}
          aria-label="Se déconnecter"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>

        {/* Help / AI Assistant */}
        <AiAssistant />
      </div>
    </div>
  );
}

export default AppShell;
