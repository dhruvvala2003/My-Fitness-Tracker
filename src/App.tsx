import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import HabitsPage from './pages/HabitsPage';
import StreaksPage from './pages/StreaksPage';
import StreakDetailPage from './pages/StreakDetailPage';
import CaloriesPage from './pages/CaloriesPage';
import ChartsPage from './pages/ChartsPage';
import SettingsPage from './pages/SettingsPage';
import ContactPage from './pages/ContactPage';

export default function App() {
  return (
    <BrowserRouter>
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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
