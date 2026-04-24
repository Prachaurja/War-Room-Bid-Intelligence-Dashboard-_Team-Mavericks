import { useAuthStore } from '../store/auth.store';
import { useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import type { LoginRequest } from '../types/auth.types';
import apiClient from '../api/client';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = async (data: LoginRequest) => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);

      const response = await apiClient.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, user: userData } = response.data;
      setAuth(userData, access_token);
      navigate('/');
      return { success: true };
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const msg =
        axiosErr?.response?.data?.detail ?? 'Login FAILED. Check Your Credentials.';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.warn('Logout Request Failed (Session May Already be Expired):', err);
    }
    clearAuth();
    navigate('/login');
  };

  const checkMe = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch {
      clearAuth();
      return null;
    }
  };

  return { user, token, isAuthenticated, login, logout, checkMe };
}