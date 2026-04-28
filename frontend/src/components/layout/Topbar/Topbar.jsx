import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Avatar from '../../common/Avatar/Avatar';
import './Topbar.css';

const ROLE_LABEL = {
  ADMIN: 'Administrateur', TEACHER: 'Enseignant',
  BURSAR: 'Économe', PARENT: 'Parent', STUDENT: 'Élève',
};

function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      {/* Hamburger — visible only on mobile/tablet */}
      <button
        className="topbar__hamburger"
        onClick={onMenuClick}
        aria-label="Ouvrir le menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {title && <h1 className="topbar__title">{title}</h1>}

      <div className="topbar__spacer" />

      <div className="topbar__user">
        <Avatar name={user?.name} size="sm" />
        <div className="topbar__user-info">
          <span className="topbar__user-name">{user?.name}</span>
          <span className="topbar__user-role">{ROLE_LABEL[user?.role] ?? user?.role}</span>
        </div>
        <button
          className="topbar__logout"
          onClick={handleLogout}
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
