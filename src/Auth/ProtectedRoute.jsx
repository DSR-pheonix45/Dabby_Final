import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated -> send to login, preserve intended path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile is missing or partial, require onboarding before accessing protected areas.
  // Preserve the intended path so onboarding can redirect back after completion.
  const isOnboardingRoute = location.pathname === '/onboarding' || location.pathname.startsWith('/onboarding/');

  if ((!profile || profile.status === 'partial') && !isOnboardingRoute) {
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  // If user already completed onboarding, prevent access to onboarding UI
  if (profile && profile.status === 'active' && isOnboardingRoute) {
    const intended = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={intended} replace />;
  }

  return <>{children}</>;
}