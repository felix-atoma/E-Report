import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Avatar from '../../common/Avatar/Avatar';
import './Topbar.css';

const ROLE_LABEL = {
  ADMIN: 'Administrateur', TEACHER: 'Enseignant',
  BURSAR: 'Économe', PARENT: 'Parent', STUDENT: 'Élève',
};

const ROLE_HOME = {
  ADMIN: '/admin', TEACHER: '/teacher',
  BURSAR: '/bursar', PARENT: '/parent', STUDENT: '/student',
};

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

function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const notif = useDropdown();
  const userDrop = useDropdown();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <header className="topbar">
      {/* Hamburger — mobile only */}
      <button className="topbar__hamburger" onClick={onMenuClick} aria-label="Ouvrir le menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {title && <h1 className="topbar__title">{title}</h1>}

      {/* Search bar — ZDesk style */}
      <form className="topbar__search" onSubmit={handleSearch}>
        <svg className="topbar__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          className="topbar__search-input"
          placeholder="Recherche rapide…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      <div className="topbar__spacer" />

      {/* Notification dropdown */}
      <div className="topbar__dropdown-wrap" ref={notif.ref}>
        <button
          className="topbar__icon-btn topbar__icon-btn--badge"
          onClick={() => notif.setOpen((v) => !v)}
          aria-label="Notifications"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="topbar__badge">2</span>
        </button>
        {notif.open && (
          <div className="topbar__dropdown topbar__dropdown--notif">
            <div className="topbar__dropdown-header">
              <span className="topbar__dropdown-title">Notifications</span>
              <span className="topbar__notif-count">2 nouvelles</span>
            </div>
            <div className="topbar__notif-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p>Aucune nouvelle notification</p>
            </div>
            <div className="topbar__dropdown-footer">
              <Link to="/notifications" onClick={() => notif.setOpen(false)}>
                Voir toutes les notifications
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
          aria-label="Menu utilisateur"
        >
          <Avatar name={user?.name} src={user?.profileImage} size="sm" />
          <div className="topbar__user-info">
            <span className="topbar__user-name">{user?.name}</span>
            <span className="topbar__user-role">{ROLE_LABEL[user?.role] ?? user?.role}</span>
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
                <p className="topbar__drop-user-role">{ROLE_LABEL[user?.role] ?? user?.role}</p>
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
              Mon profil
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
              Tableau de bord
            </Link>
            <div className="topbar__dropdown-divider" />
            <button className="topbar__drop-item topbar__drop-item--danger" onClick={handleLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Topbar;
