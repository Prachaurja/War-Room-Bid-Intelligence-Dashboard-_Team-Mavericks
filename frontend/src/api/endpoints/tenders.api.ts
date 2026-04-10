import apiClient from '../client';
import type { TenderListResponse, TenderFilters, OverviewStats, SectorStat, StateStat } from '../../types/tender.types';

export const tendersApi = {
  list: (filters: TenderFilters = {}) =>
    apiClient.get<TenderListResponse>('/tenders', { params: filters }).then(r => r.data),

  get: (id: string) =>
    apiClient.get(`/tenders/${id}`).then(r => r.data),

  overview: () =>
    apiClient.get<OverviewStats>('/tenders/stats/overview').then(r => r.data),

  bySector: () =>
    apiClient.get<SectorStat[]>('/tenders/stats/by-sector').then(r => r.data),

  byState: () =>
    apiClient.get<StateStat[]>('/tenders/stats/by-state').then(r => r.data),
};