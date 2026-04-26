import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';
import { clearCsrfToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    // V-01: user data comes from response body (no token stored in localStorage)
    setUser(data.user);
    // V-06: session identifier changed (JWT cookie now set) — refresh CSRF token
    clearCsrfToken();
    return data;
  };

  const logout = async () => {
    await authService.logout();
    clearCsrfToken(); // V-06: session identifier changed after logout
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = fetchUser;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
