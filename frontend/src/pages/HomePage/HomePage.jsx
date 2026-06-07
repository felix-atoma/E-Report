import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LandingPage from '../public/LandingPage/LandingPage';
import Loading from '../../components/common/Loading/Loading';

const ROLE_HOME = {
  ADMIN: '/admin', TEACHER: '/teacher',
  BURSAR: '/bursar', PARENT: '/parent', STUDENT: '/student',
  SUPERADMIN: '/superadmin',
};

function HomePage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      window.location.replace(ROLE_HOME[user.role] ?? '/login');
    }
  }, [user, loading]);

  if (loading) return <Loading fullPage />;

  // Show landing page for unauthenticated visitors
  if (!user) return <LandingPage />;

  return <Loading fullPage />;
}

export default HomePage;
