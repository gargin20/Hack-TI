
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function ProtectedRoute({ children }) {
  const location = useLocation();

  const { loading, token } = useSelector((state) => state.auth);

  const activeToken = token || localStorage.getItem('authToken');

  const [checkingOnboarding, setCheckingOnboarding] = useState(Boolean(activeToken));

  const [onboardingCompleted, setOnboardingCompleted] = useState(null);

  useEffect(() => {
    if (!activeToken) {
      setCheckingOnboarding(false);
      return;
    }

    let isMounted = true;
    setCheckingOnboarding(true);

    async function checkOnboarding() {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/onboarding`,
          {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          }
        );

        if (isMounted) {
          setOnboardingCompleted(Boolean(response.data.completed));
        }
      } catch (error) {
        console.log('Onboarding check failed', error);

        if (isMounted) {
          setOnboardingCompleted(null);
        }
      } finally {
        if (isMounted) {
          setCheckingOnboarding(false);
        }
      }
    }

    checkOnboarding();

    return () => {
      isMounted = false;
    };
  }, [activeToken]);

  if (loading || checkingOnboarding) {
    return <div>Loading Protected Route...</div>;
  }

  if (!activeToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

export default ProtectedRoute;