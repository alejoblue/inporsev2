
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { User, UserRole, PermissionAction } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  updateCurrentUserPassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from session storage", error);
      sessionStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, pass: string) => {
    const userData = await api.login(username, pass);
    if (userData) {
      setUser(userData);
      sessionStorage.setItem('user', JSON.stringify(userData));
    } else {
      throw new Error('Credenciales inválidas.');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('user');
  }, []);
  
  const updateCurrentUserPassword = useCallback(async (newPass: string) => {
    if (!user) throw new Error("No user is logged in");
    await api.updateUserPassword(user.id, newPass);
    // In a real app, you might re-authenticate or just give a success message
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateCurrentUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const usePermissions = (resource: string) => {
    const { user } = useAuth();

    if (!user) {
        return { canView: false, canCreate: false, canEdit: false, canDelete: false };
    }

    if (user.role === UserRole.ADMIN) {
        return { canView: true, canCreate: true, canEdit: true, canDelete: true };
    }

    const userPermissions = user.permissions?.[resource] || [];

    return {
        canView: userPermissions.includes(PermissionAction.VIEW),
        canCreate: userPermissions.includes(PermissionAction.CREATE),
        canEdit: userPermissions.includes(PermissionAction.EDIT),
        canDelete: userPermissions.includes(PermissionAction.DELETE),
    };
};
