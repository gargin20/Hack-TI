
// import { useEffect, useState } from 'react';
// import { useSelector } from 'react-redux';
// import { Navigate, useLocation } from 'react-router-dom';
// import axios from 'axios';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// function ProtectedRoute({ children }) {
//   const location = useLocation();

//   const { loading, token } = useSelector((state) => state.auth);

//   const activeToken = token || localStorage.getItem('authToken');

//   const [checkingOnboarding, setCheckingOnboarding] = useState(Boolean(activeToken));

//   const [onboardingCompleted, setOnboardingCompleted] = useState(null);

//   useEffect(() => {
//     if (!activeToken) {
//       setCheckingOnboarding(false);
//       return;
//     }

//     let isMounted = true;
//     setCheckingOnboarding(true);

//     async function checkOnboarding() {
//       try {
//         const response = await axios.get(
//           `${API_BASE_URL}/api/onboarding`,
//           {
//             headers: {
//               Authorization: `Bearer ${activeToken}`,
//             },
//           }
//         );

//         if (isMounted) {
//           setOnboardingCompleted(Boolean(response.data.completed));
//         }
//       } catch (error) {
//         console.log('Onboarding check failed', error);

//         if (isMounted) {
//           setOnboardingCompleted(null);
//         }
//       } finally {
//         if (isMounted) {
//           setCheckingOnboarding(false);
//         }
//       }
//     }

//     checkOnboarding();

//     return () => {
//       isMounted = false;
//     };
//   }, [activeToken]);

//   if (loading || checkingOnboarding) {
//     return <div>Loading Protected Route...</div>;
//   }

//   if (!activeToken) {
//     return <Navigate to="/login/" replace state={{ from: location }} />;
//   }

//   if (onboardingCompleted === false) {
//     return <Navigate to="/onboarding/" replace />;
//   }

//   return children;
// }

// export default ProtectedRoute;

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const ROUTE_CHECK_TIMEOUT_MS = 15000;

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading, token } = useSelector((state) => state.auth);
  const activeToken = token || readStoredToken();
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !activeToken) {
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
  }, [activeToken, isAuthenticated]);

  if (loading || checkingOnboarding) {
    return <RouteLoading label="Preparing your workspace..." />;
  }

  if (!isAuthenticated && !activeToken) {
    return <Navigate to="/login/" replace state={{ from: location }} />;
  }

  if (onboardingCompleted === false) {
    return <Navigate to="/onboarding/" replace />;
  }

  return children;
}

export default ProtectedRoute;

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
