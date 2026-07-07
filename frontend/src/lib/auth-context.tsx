'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from './api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
  is_active: boolean;
  theme_preference: string;
  email_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, fullName: string, orgName: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('grc_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await auth.me();
      setUser(userData);
    } catch {
      localStorage.removeItem('grc_access_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string, rememberMe = false) => {
    const result = await auth.login(email, password, rememberMe);
    localStorage.setItem('grc_access_token', result.access_token);
    const userData = await auth.me();
    setUser(userData);
  };

  const register = async (email: string, password: string, fullName: string, orgName: string) => {
    const result = await auth.register(email, password, fullName, orgName);
    localStorage.setItem('grc_access_token', result.access_token);
    const userData = await auth.me();
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('grc_access_token');
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) setUser({ ...user, ...data });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
