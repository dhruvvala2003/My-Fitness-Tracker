import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import HabitsPage from './pages/HabitsPage';
import StreaksPage from './pages/StreaksPage';
import StreakDetailPage from './pages/StreakDetailPage';
import CaloriesPage from './pages/CaloriesPage';
import ChartsPage from './pages/ChartsPage';
import SettingsPage from './pages/SettingsPage';
import ContactPage from './pages/ContactPage';
import InsightsPage from './pages/InsightsPage';
import VideosPage from './pages/VideosPage';
import AdminPage from './pages/AdminPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <DataProvider>
      <Routes>
        {/* Login page — redirect to home if already signed in */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />

        {/* Password reset — always accessible, handles the reset-link redirect */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* All other pages are always accessible (auth enforced per-action) */}
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/"            element={<HomePage />} />
              <Route path="/habits"      element={<HabitsPage />} />
              <Route path="/streaks"     element={<StreaksPage />} />
              <Route path="/streaks/:id" element={<StreakDetailPage />} />
              <Route path="/calories"    element={<CaloriesPage />} />
              <Route path="/charts"      element={<ChartsPage />} />
              <Route path="/settings"    element={<SettingsPage />} />
              <Route path="/contact"     element={<ContactPage />} />
              <Route path="/insights"    element={<InsightsPage />} />
              <Route path="/videos"      element={<VideosPage />} />
              <Route path="/admin"       element={<AdminPage />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </DataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
