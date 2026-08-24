/* eslint-disable react-refresh/only-export-components */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginHouse from '../assets/home.png';
import homifyOneLogo from '../assets/homifyone-color-logo.svg';


const ROLE_REDIRECTS = {
  buyer: '/buyer/dashboard',
  developer: '/developer/dashboard',
  supplier: '/supplier/dashboard',
  admin: '/admin/dashboard',
};

const ROLES = [
  { key: 'buyer', label: 'Buyer', icon: '👤' },
  { key: 'developer', label: 'Developer', icon: '🏗️' },
  { key: 'supplier', label: 'Supplier', icon: '🚚' },
  { key: 'admin', label: 'Admin', icon: '🛡️' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  //const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  //const [darkMode, setDarkMode] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password, selectedRole);
      navigate(ROLE_REDIRECTS[user.role] || '/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex min-h-screen font-sans">

        {/* <div className="hidden lg:flex lg:w-1/2 bg-[#1a4a45] flex-col justify-between p-12 relative overflow-hidden">
        <img
          src={loginHouse}
          alt="Modern new-build home"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#123f3a]/75" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

        <div className="relative z-10 flex flex-col justify-between w-full min-h-screen p-12"></div>

          <div className="relative z-10 flex items-center gap-2 text-white">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 21V12h6v9" />
            </svg>
            <span className="text-xl font-semibold tracking-tight">HomifyOne</span>
          </div>

          <div className="relative z-10">
            <h2 className="text-5xl font-bold text-white leading-tight mb-6">
              Your home,{' '}
              <span className="italic font-light text-[#a8d5cf]">personalised</span>
              <br />with intention.
            </h2>
          </div>

          
        </div> */}

        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <img
            src={loginHouse}
            alt="Modern new-build home"
            className="absolute inset-0 w-full h-full object-cover"
          />

          <div className="absolute inset-0 bg-[#0b332f]/55" />

          <div className="absolute inset-0 bg-gradient-to-b from-[#082c28]/40 via-transparent to-[#082c28]/80" />

          <div className="relative z-10 flex flex-col justify-between w-full min-h-screen p-12">

            <div className="flex items-center gap-3 text-white">
              {/* <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 21V12h6v9"
                />
              </svg> */}
              <img
                src={homifyOneLogo}
                alt="HomifyOne logo"
                className="w-9 h-9 object-contain"
              />
              <span className="text-2xl font-semibold tracking-tight">
                HomifyOne
              </span>
            </div>

            <div className="mb-12 max-w-md">
              <p className="text-4xl font-bold text-white leading-tight">
                Your home,{' '}
                <span className="italic font-light text-[#a8d5cf]">
                  personalised
                </span>
                <br />
                with intention.
              </p>
            </div>

          </div>
        </div>

        <div className="w-full lg:w-1/2 bg-[#f8f7f4] dark:bg-gray-900 flex items-center justify-center px-8 py-12 relative">
          {/* <button
            onClick={() => setDarkMode(!darkMode)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-gray-800 shadow text-gray-500 dark:text-gray-300 hover:scale-110 transition"
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button> */}

          <div className="w-full max-w-md">

            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <svg className="w-7 h-7 text-[#1a4a45]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 21V12h6v9" />
              </svg>
              <span className="text-lg font-semibold text-[#1a4a45]">HomifyOne</span>
            </div>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Sign in to your HomifyOne account to continue.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest text-gray-500 dark:text-gray-400 mb-3">I AM A</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(role => (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all
                      ${selectedRole === role.key
                        ? 'border-[#1a4a45] bg-[#e8f4f2] text-[#1a4a45] dark:bg-teal-900 dark:text-teal-300 dark:border-teal-400'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <span className="text-base">{role.icon}</span>
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-5 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-xs font-semibold tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    type="email" required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a4a45] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  PASSWORD
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-11 pr-11 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a4a45] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end underline">
                {/* <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={e => setKeepSignedIn(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 accent-[#1a4a45]"
                  />
                  Keep me signed in
                </label> */}
                <Link to="/forgot-password"
                  className="text-sm text-right font-medium text-[#1a4a45] dark:text-teal-400 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-[#1a4a45] hover:bg-[#15393500] hover:text-[#1a4a45] border-2 border-[#1a4a45] text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 mt-2"
              >
                {loading ? 'Signing in...' : 'Sign in to HomifyOne'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
              By signing in, you agree to HomifyOne's{' '}
              <span className="text-[#1a4a45] dark:text-teal-500 cursor-pointer hover:underline">Terms of Service</span>
              {' '}and{' '}
              <span className="text-[#1a4a45] dark:text-teal-500 cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}