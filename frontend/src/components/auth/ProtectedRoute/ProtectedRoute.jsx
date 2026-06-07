import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Loading from '../../common/Loading/Loading';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('[ProtectedRoute]', location.pathname, '| loading:', loading, '| role:', user?.role, '| required:', roles);

  if (loading) return <Loading fullPage />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return children;
}

export default ProtectedRoute;
