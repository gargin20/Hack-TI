import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const ROUTE_CHECK_TIMEOUT_MS = 15000;

function OnboardingRoute({ children }) {
  const { isAuthenticated, loading, token } = useSelector((state) => state.auth);
  const activeToken = token || readStoredToken();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);

  useEffect(() => {
    if (!activeToken) {
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      setCheckingOnboarding(true);

      axios.get(`${API_BASE_URL}/api/onboarding`, {
        headers: { Authorization: `Bearer ${activeToken}` },
        timeout: ROUTE_CHECK_TIMEOUT_MS,
      })
        .then((response) => {
          if (isMounted) setOnboardingCompleted(Boolean(response.data.completed));
        })
        .catch(() => {
          if (isMounted) setOnboardingCompleted(false);
        })
        .finally(() => {
          if (isMounted) setCheckingOnboarding(false);
        });
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [activeToken]);

  if (loading || checkingOnboarding) {
    return <RouteLoading label="Checking onboarding..." />;
  }

  if (!isAuthenticated && !activeToken) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default OnboardingRoute;

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
