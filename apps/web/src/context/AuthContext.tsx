import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import { AuthUser, Role } from '@digicatlog/shared';

interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  expiresAt: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  shop: ShopInfo | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<{ user: AuthUser; shop: ShopInfo | null }>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  clearPasswordChangeRequirement: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: AuthUser; shop: ShopInfo | null }>('/auth/me');
      setUser(data.user);
      setShop(data.shop);
    } catch {
      setUser(null);
      setShop(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (loginId: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.post<{ user: AuthUser; shop: ShopInfo | null }>('/auth/login', {
        loginId,
        password,
      });
      setUser(data.user);
      setShop(data.shop);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setShop(null);
    }
  };

  const clearPasswordChangeRequirement = () => {
    if (user) {
      setUser({ ...user, mustChangePassword: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        isLoading,
        login,
        logout,
        refetchUser: fetchCurrentUser,
        clearPasswordChangeRequirement,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
