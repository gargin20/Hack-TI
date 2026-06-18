import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/languageContext.js';
import GamificationContext from './context/GamificationContext';
import IntegrationContext from './context/IntegrationContext';
import DashboardSyncContext from './context/DashboardSyncContext';

const mockGamificationValue = {
  totalXP: 0,
  level: 1,
  history: [],
  unlockedBadges: [],
  availableBadges: [],
  triggerReward: () => {},
  toast: null,
};

const mockIntegrationValue = {
  integrations: {
    github:    { status: 'disconnected', username: '',  data: null, connectedAt: null },
    leetcode:  { status: 'disconnected', username: '',  data: null, connectedAt: null },
    fitbit:    { status: 'disconnected', username: '',  data: null, connectedAt: null },
    linkedin:  { status: 'disconnected', username: '',  data: null, connectedAt: null },
    banking:   { status: 'disconnected', profileLink: '', data: null, connectedAt: null },
    portfolio: { status: 'disconnected', url: '',        data: null, connectedAt: null },
  },
  loading: false,
  error: null,
  isConnected: () => false,
  saveIntegration: () => {},
  disconnectIntegration: () => {},
  refreshIntegrations: () => {},
};

const mockDashboardSyncValue = {
  dashboardData: null,
  setDashboardData: () => {},
  isLoading: false,
  refreshDashboard: () => {},
};

function App() {
  return (
    <ThemeProvider>
      <GamificationContext.Provider value={mockGamificationValue}>
        <IntegrationContext.Provider value={mockIntegrationValue}>
          <DashboardSyncContext.Provider value={mockDashboardSyncValue}>
            <LanguageProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<div>Landing Page Works</div>} />
                  <Route path="/login" element={<div>Login Page Works</div>} />
                  <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<div>Dashboard Page Works Inside MainLayout</div>} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </LanguageProvider>
          </DashboardSyncContext.Provider>
        </IntegrationContext.Provider>
      </GamificationContext.Provider>
    </ThemeProvider>
  );
}

export default App;

