import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthToken, getAuthToken } from '../lib/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const clearSession = () => {
    setAuthToken(null);
    setUser(null);
    setUserProfile(null);
    setProfileLoading(false);
  };

  const applySession = ({ user: sessionUser, profile }) => {
    setUser(sessionUser);
    setUserProfile(profile);
  };

  const loadSession = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      applySession(data);
    } catch {
      clearSession();
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const signIn = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuthToken(data.token);
      applySession(data);
      return { data, error: null };
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        (error?.message?.includes('Network Error')
          ? 'Cannot connect to the API server. Make sure the backend is running.'
          : 'Sign in failed');
      return { data: null, error: { message } };
    }
  };

  const signOut = async () => {
    clearSession();
    return { error: null };
  };

  const updateProfile = async (updates) => {
    if (!user) return { error: { message: 'No user logged in' } };

    try {
      const { data } = await api.put('/auth/profile', updates);
      setUserProfile(data.profile);
      return { data: data.profile, error: null };
    } catch (error) {
      return {
        error: { message: error?.response?.data?.error || 'Failed to update profile' },
      };
    }
  };

  const refreshProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      return { data: null, error: { message: 'Not signed in' } };
    }

    setProfileLoading(true);
    try {
      const { data } = await api.get('/auth/me');
      applySession(data);
      return { data: data.profile, error: null };
    } catch (error) {
      return {
        error: { message: error?.response?.data?.error || 'Failed to refresh profile' },
      };
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
