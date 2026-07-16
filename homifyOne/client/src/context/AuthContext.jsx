/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const BUYER_SCRATCH_KEYS = [
  'basket',
  'cachedRecommendations',
  'cachedSummaryMsg',
  'token',
];

function reconcileBuyerScratch(nextUserId) {
  const owner = localStorage.getItem('basketOwner');
  if (nextUserId && owner && owner !== nextUserId) {
    BUYER_SCRATCH_KEYS.forEach(key => localStorage.removeItem(key));
  }
  localStorage.removeItem('questionnaireReward');
  if (nextUserId) {
    localStorage.setItem('basketOwner', nextUserId);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .then(res => {
        reconcileBuyerScratch(res.data.user?._id || null);
        setUser(res.data.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, role) => {
    const res = await axios.post(`${API}/auth/login`, { email, password, role }, { withCredentials: true });
    const userId = res.data.user?._id || res.data.user?.id;
    reconcileBuyerScratch(userId);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);