import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import OnboardingRoute from './components/OnboardingRoute';
import MainLayout from './layouts/MainLayout';
import Career from './pages/Career';
import Copilot from './pages/Copilot';
import Dashboard from './pages/Dashboard';
import DailyUpdate from './pages/DailyUpdate';
import Finance from './pages/Finance';
import Goals from './pages/Goals';
import Health from './pages/Health';
import Intelligence from './pages/Intelligence';
import Login from './pages/Login';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import Simulation from './pages/Simulation';
import Landing from './pages/Landing';
import DocumentUpload from './pages/DocumentUpload';
import { GamificationProvider } from './context/GamificationContext';
import { IntegrationProvider } from './context/IntegrationContext';
import { DashboardSyncProvider } from './context/DashboardSyncContext';
import ToastOverlay from './components/ToastOverlay';

function App() {
  return (
    // ✅ The Provider MUST wrap everything!
    <GamificationProvider>
      <IntegrationProvider>
        <DashboardSyncProvider>
          <BrowserRouter>
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
            <Route path="/health" element={<Health />} />
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
      </BrowserRouter>
    
      <ToastOverlay />
        </DashboardSyncProvider>
      </IntegrationProvider>
    </GamificationProvider>
  );
}

export default App;
