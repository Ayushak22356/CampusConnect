import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cc_token');
    const stored = localStorage.getItem('cc_user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      // Refresh user from server
      api.get('/auth/me')
        .then(res => { setUser(res.data.user); localStorage.setItem('cc_user', JSON.stringify(res.data.user)); })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('cc_token', res.data.token);
    localStorage.setItem('cc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('cc_token', res.data.token);
    localStorage.setItem('cc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    setUser(null);
  };

  const isOrganizer = user && ['organizer', 'faculty', 'admin'].includes(user.role);
  const isAdmin     = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isOrganizer, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);