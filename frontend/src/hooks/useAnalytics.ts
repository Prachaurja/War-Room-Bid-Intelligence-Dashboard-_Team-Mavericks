import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

// ── Types ─────────────────────────────────────────────────────

export interface MonthlyVolume {
  month: string;
  count: number;
}

export interface ValueOverTime {
  month:       string;
  total_value: number;
  count:       number;
}

export interface TopDepartment {
  agency:         string;
  contract_count: number;
  total_value:    number;
  avg_value:      number;
}

export interface AnalyticsSummary {
  total_contracts: number;
  total_value:     number;
  avg_value:       number;
  top_sector:      string | null;
  top_state:       string | null;
}

// ── Fetch functions ───────────────────────────────────────────

const fetchSummary = async (): Promise<AnalyticsSummary> => {
  const res = await apiClient.get('/analytics/summary');
  return res.data;
};

const fetchMonthlyVolume = async (): Promise<MonthlyVolume[]> => {
  const res = await apiClient.get('/analytics/monthly-volume');
  return res.data;
};

const fetchValueOverTime = async (): Promise<ValueOverTime[]> => {
  const res = await apiClient.get('/analytics/value-over-time');
  return res.data;
};

const fetchTopDepartments = async (limit = 10): Promise<TopDepartment[]> => {
  const res = await apiClient.get(`/analytics/top-departments?limit=${limit}`);
  return res.data;
};

// ── Hooks ─────────────────────────────────────────────────────

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn:  fetchSummary,
    staleTime: 5 * 60 * 1000,   // cache for 5 minutes
    retry: 1,
  });
}

export function useMonthlyVolume() {
  return useQuery<MonthlyVolume[]>({
    queryKey: ['analytics', 'monthly-volume'],
    queryFn:  fetchMonthlyVolume,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useValueOverTime() {
  return useQuery<ValueOverTime[]>({
    queryKey: ['analytics', 'value-over-time'],
    queryFn:  fetchValueOverTime,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useTopDepartments(limit = 10) {
  return useQuery<TopDepartment[]>({
    queryKey: ['analytics', 'top-departments', limit],
    queryFn:  () => fetchTopDepartments(limit),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}