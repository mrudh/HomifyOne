import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import BuyerDashboard from './pages/dashboards/BuyerDashboard';
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
import OrderStatusPage from './pages/buyer/OrderStatusPage';
import OrderDetailPage from './pages/buyer/OrderDetailPage';
import DeveloperLayout from './layout/DeveloperLayout';
import DeveloperDashboard from './pages/dashboards/DeveloperDashboard';
import PlotsBuyersPage from './pages/developer/PlotsBuyersPage';
import SelectionsReviewPage from './pages/developer/SelectionsReviewPage';
import OrderReviewPage from './pages/developer/OrderReviewPage';
import SupplierPurchaseOrderDetail from './pages/supplier/SupplierPurchaseOrderDetail';
import PurchaseOrdersPage from './pages/developer/PurchaseOrdersPage';
import SupplierLayout from './layout/SupplierLayout';
import SupplierPurchaseOrders from './pages/supplier/SupplierPurchaseOrders';
import CalendarPage from './components/CalendarPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<ProtectedRoute roles={['developer']} />}>
            <Route element={<DeveloperLayout />}>
              <Route path="/developer/dashboard" element={<DeveloperDashboard />} />
              <Route path="/developer/plots" element={<PlotsBuyersPage />} />
              <Route path="/developer/orders" element={<SelectionsReviewPage />} />
              <Route path="/developer/orders/:plotId" element={<OrderReviewPage />} />
              <Route path="/developer/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/developer/calendar" element={<CalendarPage />} />
            </Route>
          </Route>

        <Route element={<ProtectedRoute roles={['supplier']} />}>
          <Route element={<SupplierLayout />}>
            <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier/purchase-orders" element={<SupplierPurchaseOrders />} />
            <Route path="/supplier/purchase-orders/:id" element={<SupplierPurchaseOrderDetail />} />
            <Route path="/supplier/calendar" element={<CalendarPage />} />
          </Route>
        </Route>

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
              <Route path="/buyer/orders" element={<OrderStatusPage />} />
              <Route path="/buyer/orders/:id" element={<OrderDetailPage />} />
              <Route path="/buyer/calendar" element={<CalendarPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}