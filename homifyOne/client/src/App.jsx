import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import BuyerDashboard from './pages/dashboards/BuyerDashboard';
import DeveloperDashboard from './pages/dashboards/DeveloperDashboard';
import SupplierDashboard from './pages/dashboards/SupplierDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ChoicesPortal from './pages/buyer/ChoicesPortal';
import BuyerLayout from './layout/BuyerLayout';
import BasketPage from './pages/buyer/BasketPage';
import MyProperty from './pages/buyer/MyProperty';
import Questionnaire from "./pages/buyer/Questionnaire";
import Recommendations from './pages/buyer/Recommendations';
import ProductDetailPage from './pages/buyer/ProductDetailPage';
import MySelections from './pages/buyer/MySelections';


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

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

          <Route element={<ProtectedRoute roles={['buyer']} />}>
            <Route element={<BuyerLayout />}>
              <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
              <Route path="/buyer/choices" element={<ChoicesPortal />} />
              <Route path="/buyer/basket" element={<BasketPage />} />
              <Route path="/buyer/property" element={<MyProperty />} />
              <Route path="/buyer/questionnaire" element={<Questionnaire />} />
              <Route path="/buyer/recommendations" element={<Recommendations />} />
              <Route path="/buyer/extras/:slug" element={<ProductDetailPage />} />
              <Route path="/buyer/my-selections" element={<MySelections />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}