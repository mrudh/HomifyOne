import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import BuyerDashboard from './pages/dashboards/BuyerDashboard';
import DeveloperDashboard from './pages/dashboards/DeveloperDashboard';
import SupplierDashboard from './pages/dashboards/SupplierDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/dashboard/buyer" element={
            <ProtectedRoute roles={['buyer']}>
              <BuyerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/developer" element={
            <ProtectedRoute roles={['developer']}>
              <DeveloperDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/supplier" element={
            <ProtectedRoute roles={['supplier']}>
              <SupplierDashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}