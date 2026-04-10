// ── useAuth.ts ───────────────────────────────────────────────
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/endpoints/auth.api';
import { useNavigate } from 'react-router-dom';
import type { LoginRequest } from '../types/auth.types';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = async (data: LoginRequest) => {
    // Try real backend first; fall back to mock for development
    try {
      const response = await authApi.login(data);
      setAuth(response.user, response.access_token);
      navigate('/');
      return { success: true };
    } catch {
      // ── Dev fallback: accept any email + password ──
      if (data.email && data.password) {
        const mockUser = { id: '1', name: 'Prach Aurja', email: data.email, role: 'admin' as const };
        const mockToken = 'dev-token-' + Date.now();
        setAuth(mockUser, mockToken);
        navigate('/');
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    }
  };

  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return { user, token, isAuthenticated, login, logout };
}