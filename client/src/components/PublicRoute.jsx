import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

function PublicRoute({ children }) {
  const { isAuthenticated, loading, token } = useSelector((state) => state.auth);
  const hasPersistedToken = Boolean(token || readStoredToken());

  if (loading && hasPersistedToken) {
    return <RouteLoading label="Restoring session..." />;
  }

  if (isAuthenticated || hasPersistedToken) {
    return <Navigate to="/dashboard/" replace />;
  }

  return children;
}

export default PublicRoute;

function readStoredToken() {
  try {
    return localStorage.getItem('authToken');
  } catch {
    return null;
  }
}

function RouteLoading({ label }) {
  return (
    <div className="min-h-screen bg-[#050816] text-white grid place-items-center px-6">
      <div className="text-sm text-white/70">{label}</div>
    </div>
  );
}
