import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function BuyerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name} 👋</h1>
            <p className="text-sm text-gray-500 mt-1">Buyer Dashboard</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['My Plot', 'My Selections', 'Extras Basket'].map(card => (
            <div key={card} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <p className="text-gray-400 text-sm">{card}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">—</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}