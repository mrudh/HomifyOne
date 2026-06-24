import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles, role }) => {
  const { user, loading } = useAuth();

  const allowedRoles = roles || (role ? [role] : null);

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

  return children ?? <Outlet />;
};

export default ProtectedRoute;