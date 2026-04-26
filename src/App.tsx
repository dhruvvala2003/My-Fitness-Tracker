import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <DataProvider>
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
          <Route path="/insights"   element={<InsightsPage />} />
          <Route path="/videos"     element={<VideosPage />} />
        </Routes>
      </Layout>
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
