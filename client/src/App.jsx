import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import OnboardingRoute from './components/OnboardingRoute';
import { GamificationProvider } from './context/GamificationContext';
import { IntegrationProvider } from './context/IntegrationContext';
import { DashboardSyncProvider } from './context/DashboardSyncContext';
import { ThemeProvider } from './context/ThemeContext';
import ToastOverlay from './components/ToastOverlay';
import axios from 'axios';

// Set up global response interceptor to detect successful data mutation requests
axios.interceptors.response.use(
  (response) => {
    const url = response.config?.url || '';
    const method = response.config?.method?.toLowerCase() || '';

    const isMutative = ['post', 'put', 'delete', 'patch'].includes(method) && (
      url.includes('/api/goals') ||
      url.includes('/api/health') ||
      url.includes('/api/finance') ||
      url.includes('/api/career') ||
      url.includes('/api/daily-update') ||
      url.includes('/api/gamification') ||
      url.includes('/api/integrations') ||
      url.includes('/api/meal-plans') ||
      url.includes('/api/ai')
    );

    // Check if the response was successful and represents a mutative action affecting goals/gamification
    if (
      response.status >= 200 &&
      response.status < 300 &&
      isMutative
    ) {
      console.log(`[Axios Interceptor] Ingestion/Sync request success to ${url}, dispatching dashboard-data-updated and gamification-updated events.`);
      window.dispatchEvent(new Event('dashboard-data-updated'));
      window.dispatchEvent(new Event('gamification-updated'));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider } from './context/languageContext.js';
import PageTranslationHost from './components/PageTranslationHost.jsx';

const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Career = lazy(() => import('./pages/Career'));
const Copilot = lazy(() => import('./pages/Copilot'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DailyUpdate = lazy(() => import('./pages/DailyUpdate'));
const Finance = lazy(() => import('./pages/Finance'));
const Goals = lazy(() => import('./pages/Goals'));
const Health = lazy(() => import('./pages/Health'));
const Intelligence = lazy(() => import('./pages/Intelligence'));
const Login = lazy(() => import('./pages/Login'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Settings = lazy(() => import('./pages/Settings'));
const Signup = lazy(() => import('./pages/Signup'));
const Simulation = lazy(() => import('./pages/Simulation'));
const Landing = lazy(() => import('./pages/Landing'));
const DocumentUpload = lazy(() => import('./pages/DocumentUpload'));

axios.defaults.timeout = 15000;

function App() {
  return (
    // The Provider MUST wrap everything!
    <ThemeProvider>
      <GamificationProvider>
        <IntegrationProvider>
          <DashboardSyncProvider>
            <LanguageProvider>
            <BrowserRouter>
          <PageTranslationHost />
          <Suspense fallback={<AppLoading />}>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route
              path="/onboarding"
              element={
                <OnboardingRoute>
                  <Onboarding />
                </OnboardingRoute>
              }
            />

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/health" element={<ErrorBoundary><Health /></ErrorBoundary>} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/career" element={<Career />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/ai-intelligence" element={<Intelligence />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/copilot" element={<Copilot />} />
              <Route path="/simulation" element={<Simulation />} />
              <Route path="/daily-update" element={<DailyUpdate />} />
              <Route path="/document-upload" element={<DocumentUpload />} />
            </Route>
          </Routes>
          </Suspense>
        </BrowserRouter>
            </LanguageProvider>
        
        <ToastOverlay />
          </DashboardSyncProvider>
        </IntegrationProvider>
      </GamificationProvider>
    </ThemeProvider>
  );
}

export default App;

function AppLoading() {
  return (
    <div className="min-h-screen bg-[#050816] text-white grid place-items-center px-6">
      <div className="text-sm text-white/70">Loading...</div>
    </div>
  );
}
