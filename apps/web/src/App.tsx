import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Entries from './pages/Entries';
import EntryForm from './pages/EntryForm';
import ProfitAnalysis from './pages/ProfitAnalysis';
import FuelEfficiency from './pages/FuelEfficiency';
import Trends from './pages/Trends';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import Help from './pages/Help';
import AdminDashboard from './pages/admin/AdminDashboard';
import type { ReactNode } from 'react';

function AdminOnly({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace state={{ from: location }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/entries" element={<Entries />} />
            <Route path="/entries/new" element={<EntryForm />} />
            <Route path="/entries/:id/edit" element={<EntryForm />} />
            <Route path="/profit" element={<ProfitAnalysis />} />
            <Route path="/fuel" element={<FuelEfficiency />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
