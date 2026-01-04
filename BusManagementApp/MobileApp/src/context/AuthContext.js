import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginRequest, register as registerRequest, fetchProfile } from '../api/auth';
import { setAuthToken } from '../api/client';

const AuthContext = createContext({
  initializing: true,
  authLoading: false,
  user: null,
  token: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  refreshProfile: async () => {}
});

const TOKEN_KEY = 'busApp::token';
const USER_KEY = 'busApp::user';

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const persistSession = useCallback(async (sessionToken, sessionUser) => {
    setToken(sessionToken);
    setUser(sessionUser);
    setAuthToken(sessionToken);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, sessionToken],
      [USER_KEY, JSON.stringify(sessionUser)]
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  const refreshProfile = useCallback(
    async (sessionToken = token) => {
      if (!sessionToken) {
        return null;
      }
      try {
        setAuthToken(sessionToken);
        const { data } = await fetchProfile();
        setUser(data.user);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      } catch (error) {
        console.warn('Failed to refresh profile', error);
        await clearSession();
        return null;
      }
    },
    [token, clearSession]
  );

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setAuthToken(storedToken);
          setUser(JSON.parse(storedUser));
          await refreshProfile(storedToken);
        }
      } catch (error) {
        console.warn('Failed to restore auth state', error);
      } finally {
        setInitializing(false);
      }
    })();
  }, [refreshProfile]);

  const login = useCallback(
    async (email, password) => {
      setAuthLoading(true);
      try {
        const { data } = await loginRequest({ email, password });
        await persistSession(data.token, data.user);
        return data.user;
      } catch (error) {
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [persistSession]
  );

  const signup = useCallback(
    async (payload) => {
      setAuthLoading(true);
      try {
        const { data } = await registerRequest(payload);
        await persistSession(data.token, data.user);
        return data.user;
      } catch (error) {
        throw error;
      } finally {
        setAuthLoading(false);
      }
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      initializing,
      authLoading,
      user,
      token,
      login,
      signup,
      logout,
      refreshProfile
    }),
    [initializing, authLoading, user, token, login, signup, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

