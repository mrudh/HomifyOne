import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      <div className="bg-white border-b border-gray-100 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name || 'Admin'}</h1>
        <p className="text-sm text-gray-400 mt-1">Manage accounts and the product catalogue.</p>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-[#1a4a45] transition"
        >
          <p className="text-2xl mb-2">👤</p>
          <h2 className="font-bold text-gray-900">Manage Users</h2>
          <p className="text-sm text-gray-400 mt-1">Create and edit buyer, developer, supplier, and admin accounts.</p>
        </button>

        <button
          onClick={() => navigate('/admin/products')}
          className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-[#1a4a45] transition"
        >
          <p className="text-2xl mb-2">📦</p>
          <h2 className="font-bold text-gray-900">Manage Products</h2>
          <p className="text-sm text-gray-400 mt-1">Add, edit, and manage the master product catalogue.</p>
        </button>

        <button
          onClick={() => navigate('/admin/properties')}
          className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-[#1a4a45] transition"
        >
          <p className="text-2xl mb-2">🏡</p>
          <h2 className="font-bold text-gray-900">Buyer Properties</h2>
          <p className="text-sm text-gray-400 mt-1">See every buyer's plot, developer, and floor plan at a glance.</p>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
