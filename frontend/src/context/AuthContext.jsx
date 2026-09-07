import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('wayka_token') || null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('wayka_token');
      const storedUser = localStorage.getItem('wayka_user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(storedToken);
          setActiveRole(parsedUser.activeRole || (parsedUser.roles && parsedUser.roles[0]) || null);
        } catch (e) {
          console.error('Error parsing stored user:', e);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password, rolId = null, ubicacionOrgId = null) => {
    try {
      const res = await authService.login({
        login: username,
        password,
        rolId,
        ubicacionOrgId
      });

      if (res.success && res.data) {
        const { token: newToken, user: userData } = res.data;
        setToken(newToken);
        setUser(userData);
        setActiveRole(userData.activeRole);

        localStorage.setItem('wayka_token', newToken);
        localStorage.setItem('wayka_user', JSON.stringify(userData));

        return { success: true, user: userData };
      }
      return { success: false, message: res.message || 'Error en inicio de sesión' };
    } catch (error) {
      const message = error.response?.data?.message || 'Error al conectar con el servidor';
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setActiveRole(null);
    localStorage.removeItem('wayka_token');
    localStorage.removeItem('wayka_user');
  };

  const switchRole = async (rolId, ubicacionOrgId) => {
    if (!user) return { success: false, message: 'Usuario no autenticado' };
    try {
      const res = await authService.switchRole({ rolId, ubicacionOrgId });
      if (res.success && res.data) {
        const { token: newToken, activeRole: newActiveRole } = res.data;
        setToken(newToken);
        setActiveRole(newActiveRole);

        const updatedUser = { ...user, activeRole: newActiveRole };
        setUser(updatedUser);

        localStorage.setItem('wayka_token', newToken);
        localStorage.setItem('wayka_user', JSON.stringify(updatedUser));

        return { success: true, activeRole: newActiveRole };
      }
      return { success: false, message: res.message || 'No se pudo cambiar de rol' };
    } catch (err) {
      const message = err.response?.data?.message || 'Error al cambiar de rol';
      return { success: false, message };
    }
  };

  const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      return res;
    } catch (err) {
      const message = err.response?.data?.message || 'Error al cambiar la contraseña';
      return { success: false, message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activeRole,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout,
        switchRole,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
