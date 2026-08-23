import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { email, otp, newPassword });
      setSuccess('Password reset! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">HomifyOne</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {step === 1 ? 'Reset your password' : 'Enter the OTP sent to your email'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className={`h-2 w-16 rounded-full transition-all ${step >= s ? 'bg-[#1a4a45]' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-5 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-lg px-4 py-3 mb-5 text-sm">{success}</div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email" required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a45]"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#1a4a45] hover:bg-[#2d6b62] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">6-digit OTP</label>
              <input
                type="text" required maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-center tracking-widest font-mono text-xl focus:outline-none focus:ring-2 focus:ring-[#1a4a45]"
                placeholder="_ _ _ _ _ _"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password" required minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4a45]"
                placeholder="Min. 6 characters"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#1a4a45] hover:bg-[#2d6b62] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); setOtp(''); }}
              className="w-full text-sm text-gray-500 hover:text-[#1a4a45] transition"
            >
              ← Back / Resend OTP
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Remembered it? <Link to="/login" className="text-[#1a4a45] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}