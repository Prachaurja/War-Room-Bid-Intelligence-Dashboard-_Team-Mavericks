import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// No auth interceptor yet — JWT auth comes in Phase 2
// The tenders API is currently public (no auth required)

export default apiClient;