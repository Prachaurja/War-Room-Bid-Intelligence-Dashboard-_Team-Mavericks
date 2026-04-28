import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Download, AlertCircle, Clock,
  CheckCircle2, Layers, DollarSign,
  TrendingUp, Inbox,
} from 'lucide-react';
import { tendersApi } from '../../api/endpoints/tenders.api';
import { useTenders, useOverviewStats } from '../../hooks/useTenders';
import { useDebounce } from '../../hooks/useDebounce';
import TenderCard from '../../components/tenders/TenderCard';
import TenderFilters, { type PageSize } from '../../components/tenders/TenderFilters';
import TenderDetailModal from '../../components/tenders/TenderDetailModal';
import type { Tender } from '../../types/tender.types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import styles from './TendersPage.module.css';
import clsx from 'clsx';

type Tab = 'active' | 'upcoming' | 'closed';
type PageItem = number | 'dots-left' | 'dots-right';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'active',   label: 'Active Bids', icon: AlertCircle  },
  { id: 'upcoming', label: 'Upcoming Bids',    icon: Clock        },
  { id: 'closed',   label: 'Closed Bids',      icon: CheckCircle2 },
];

const getVisiblePages = (currentPage: number, totalPages: number): PageItem[] => {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  const start = Math.max(2, currentPage - 2);
  const end = Math.min(totalPages - 1, currentPage + 2);

  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    pages.add(pageNumber);
  }

  if (currentPage <= 4) {
    [2, 3, 4, 5, 6].forEach((pageNumber) => pages.add(pageNumber));
  }

  if (currentPage >= totalPages - 3) {
    [totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1]
      .filter((pageNumber) => pageNumber > 1)
      .forEach((pageNumber) => pages.add(pageNumber));
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const result: PageItem[] = [];

  sortedPages.forEach((pageNumber, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && pageNumber - previousPage > 1) {
      result.push(previousPage === 1 ? 'dots-left' : 'dots-right');
    }
    result.push(pageNumber);
  });

  return result;
};

export default function TendersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab]         = useState<Tab>('upcoming');
  const [sector, setSector]               = useState('');
  const [state, setState]                 = useState('');
  const [year, setYear]                   = useState('');
  const [sourceName, setSourceName]       = useState('');
  const [pageSize, setPageSize]           = useState<PageSize>('15');
  const [page, setPage]                   = useState(1);
  const [jumpPage, setJumpPage]           = useState('1');
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  const search = searchParams.get('search') ?? '';
  const setSearch = useCallback((next: string) => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      if (next.trim()) params.set('search', next);
      else params.delete('search');
      return params;
    }, { replace: true });
  }, [setSearchParams]);

  const debouncedSearch = useDebounce(search, 400);

  // When filters change, reset to page 1
  const handleSearch = useCallback((v: string) => { setSearch(v);  setPage(1); }, [setSearch]);
  const handleSector = useCallback((v: string) => { setSector(v);  setPage(1); }, []);
  const handleState  = useCallback((v: string) => { setState(v);   setPage(1); }, []);
  const handleYear   = useCallback((v: string) => { setYear(v);    setPage(1); }, []);
  const handleSource = useCallback((v: string) => { setSourceName(v); setPage(1); }, []);
  const handlePageSize = useCallback((v: PageSize) => { setPageSize(v); setPage(1); }, []);
  const handleTab    = useCallback((t: Tab)    => { setActiveTab(t); setPage(1); }, []);

  const handleClear = useCallback(() => {
    setSearch(''); setSector(''); setState(''); setYear(''); setSourceName(''); setPage(1);
  }, [setSearch]);

  const hasYearFilter = Boolean(year);
  const showAllResults = pageSize === 'all';
  const pageSizeNumber = showAllResults ? 100 : Number(pageSize);
  const needsFullDataset = hasYearFilter || showAllResults;

  const filters = {
    page:       needsFullDataset ? 1 : page,
    page_size:  needsFullDataset ? 100 : pageSizeNumber,
    status:     activeTab === 'active' ? 'open' : activeTab,
    sector:     sector    || undefined,
    state:      state     || undefined,
    source_name: sourceName || undefined,
    search:     debouncedSearch || undefined,
  };

  const { data, isLoading, isError } = useTenders(filters);
  const { data: stats }              = useOverviewStats();

  const rawTenders = data?.items ?? [];
  const yearFetchFilters = {
    status: activeTab === 'active' ? 'open' : activeTab,
    sector: sector || undefined,
    state: state || undefined,
    source_name: sourceName || undefined,
    search: debouncedSearch || undefined,
  };

  const fullDatasetQuery = useQuery({
    queryKey: ['tenders-full-dataset', yearFetchFilters, pageSize],
    enabled: needsFullDataset,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const firstPage = await tendersApi.list({ ...yearFetchFilters, page: 1, page_size: 100 });
      const items = [...firstPage.items];

      const totalPagesToFetch = Math.max(firstPage.total_pages, Math.ceil(firstPage.total / 100));
      for (let nextPage = 2; nextPage <= totalPagesToFetch; nextPage += 1) {
        try {
          const pageData = await tendersApi.list({ ...yearFetchFilters, page: nextPage, page_size: 100 });
          items.push(...pageData.items);
        } catch (error) {
          console.warn(`Could not load tender page ${nextPage}; showing ${items.length} loaded tenders.`, error);
          break;
        }
      }

      return items;
    },
  });

  const allYearTenders = useMemo(
    () => needsFullDataset ? fullDatasetQuery.data ?? rawTenders : rawTenders,
    [needsFullDataset, rawTenders, fullDatasetQuery.data],
  );

  const isYearLoading = needsFullDataset && (fullDatasetQuery.isLoading || fullDatasetQuery.isFetching);
  const isListLoading = isLoading || isYearLoading;
  const isListError = isError;

  const getTenderYear = (tender: Tender) => {
    if (!tender.close_date) return '';

    const parsed = new Date(tender.close_date);
    return Number.isNaN(parsed.getTime()) ? '' : String(parsed.getFullYear());
  };

  const yearFilteredTenders = useMemo(() => {
    if (!year) return needsFullDataset ? allYearTenders : rawTenders;
    return allYearTenders.filter((tender) => getTenderYear(tender) === year);
  }, [allYearTenders, needsFullDataset, rawTenders, year]);

  const tenders = showAllResults
    ? yearFilteredTenders
    : needsFullDataset
      ? yearFilteredTenders.slice((page - 1) * pageSizeNumber, page * pageSizeNumber)
    : rawTenders;

  const total = needsFullDataset ? yearFilteredTenders.length : data?.total ?? 0;
  const totalPages = showAllResults
    ? 1
    : needsFullDataset
      ? Math.max(1, Math.ceil(total / pageSizeNumber))
      : data?.total_pages ?? 1;
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  useEffect(() => {
    setJumpPage(String(page));
  }, [page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleJumpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPage = Number(jumpPage);
    if (!Number.isFinite(nextPage)) return;
    setPage(Math.min(totalPages, Math.max(1, Math.trunc(nextPage))));
  };

  const sourceOptions = useMemo(
    () => Object.keys(stats?.sources ?? {}).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [stats?.sources],
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const baseYears = Array.from({ length: 10 }, (_, index) => String(currentYear - index));
    const loadedYears = allYearTenders.map(getTenderYear).filter(Boolean);
    return Array.from(new Set([...baseYears, ...loadedYears])).sort((a, b) => Number(b) - Number(a));
  }, [allYearTenders]);

  // Stat cards
  const statCards = [
    {
      label:    'Total Contracts',
      value:    formatNumber(stats?.total_tenders),
      icon:     Layers,
      gradient: 'linear-gradient(135deg,#7C3AED,#4F46E5)',
    },
    {
      label:    'Total Value',
      value:    formatCurrency(stats?.total_value),
      icon:     DollarSign,
      gradient: 'linear-gradient(135deg,#3B82F6,#06B6D4)',
    },
    {
      label:    'Active Bids',
      value:    formatNumber(stats?.active_tenders ?? 0),
      icon:     TrendingUp,
      gradient: 'linear-gradient(135deg,#10B981,#059669)',
    },
    {
      label:    'Closed Bids',
      value:    formatNumber(stats?.closed_tenders),
      icon:     CheckCircle2,
      gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
    },
  ];

  const exportCSV = () => {
    if (!tenders.length) return;
    const headers = ['Title','Agency','Sector','State','Value','Close Date','Status','Source ID'];
    const rows = tenders.map(t => [
      `"${t.title.replace(/"/g,"'")}"`,
      `"${t.agency.replace(/"/g,"'")}"`,
      t.sector ?? '',
      t.state  ?? '',
      t.contract_value ?? '',
      t.close_date     ?? '',
      t.status,
      t.source_id,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `warroom-tenders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Tender Management</h2>
          <p className={styles.headingSub}>Track and Manage Australian Government Contracts</p>
        </div>
        <button className={styles.exportBtn} onClick={exportCSV}>
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statGrid}>
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            className={styles.statCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: i * 0.07 }}
          >
            <div className={styles.statIcon} style={{ background: card.gradient }}>
              <card.icon size={16} />
            </div>
            <div>
              <p className={styles.statLabel}>{card.label}</p>
              <p className={styles.statValue}>{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ── */}
      <TenderFilters
        search={search}
        sector={sector}
        state={state}
        year={year}
        sourceName={sourceName}
        pageSize={pageSize}
        yearOptions={yearOptions}
        sourceOptions={sourceOptions}
        onSearch={handleSearch}
        onSector={handleSector}
        onState={handleState}
        onYear={handleYear}
        onSource={handleSource}
        onPageSize={handlePageSize}
        onClear={handleClear}
        totalResults={total}
        loading={isListLoading}
      />

      {/* ── Tabs ── */}
      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={clsx(styles.tab, activeTab === tab.id && styles.tabActive)}
            onClick={() => handleTab(tab.id)}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && total > 0 && (
              <span className={styles.tabCount}>{total}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tender list ── */}
      <div className={styles.listWrap}>

        {/* Loading skeletons */}
        {isListLoading && (
          <div className={styles.skeletonList}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonAccent} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className={styles.shimmer} style={{ height: 12, width: '40%' }} />
                  <div className={styles.shimmer} style={{ height: 16, width: '80%' }} />
                  <div className={styles.shimmer} style={{ height: 11, width: '60%' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
                    <div className={styles.shimmer} style={{ height: 10 }} />
                    <div className={styles.shimmer} style={{ height: 10 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {isListError && !isListLoading && (
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} style={{ color: '#F87171' }} />
            <p className={styles.emptyTitle}>Could not load tenders</p>
            <p className={styles.emptySub}>Make sure the backend is running on port 8000</p>
          </div>
        )}

        {/* Empty */}
        {!isListLoading && !isListError && tenders.length === 0 && (
          <div className={styles.emptyState}>
            <Inbox size={36} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No tenders found</p>
            <p className={styles.emptySub}>
              {activeTab === 'active' || activeTab === 'upcoming'
                ? 'No live tenders — your data source contains historical closed contracts'
                : 'Try adjusting your filters'}
            </p>
            {(search || sector || state || year || sourceName) && (
              <button className={styles.clearFiltersBtn} onClick={handleClear}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {!isListLoading && !isListError && tenders.length > 0 && (
          <div className={styles.cardList}>
            {tenders.map((tender, i) => (
              <TenderCard
                key={tender.id}
                tender={tender}
                index={i}
                onSelect={setSelectedTender}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isListLoading && !isListError && totalPages > 1 && (
          <div className={styles.pagination}>
            <div className={styles.pageMain}>
              <button
                className={styles.pageBtn}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>

              <div className={styles.pageNumbers}>
                {visiblePages.map((pageItem) => (
                  typeof pageItem === 'number' ? (
                    <button
                      key={pageItem}
                      className={clsx(styles.pageNum, page === pageItem && styles.pageNumActive)}
                      onClick={() => setPage(pageItem)}
                    >
                      {pageItem}
                    </button>
                  ) : (
                    <span key={pageItem} className={styles.pageDots}>...</span>
                  )
                ))}
              </div>

              <button
                className={styles.pageBtn}
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>

            <form className={styles.pageJump} onSubmit={handleJumpSubmit}>
              <span className={styles.pageJumpLabel}>Go to</span>
              <input
                className={styles.pageJumpInput}
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(event) => setJumpPage(event.target.value)}
              />
              <span className={styles.pageJumpLabel}>/ {totalPages}</span>
              <button className={styles.pageJumpBtn} type="submit">Go</button>
            </form>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selectedTender && (
        <TenderDetailModal
          tender={selectedTender}
          onClose={() => setSelectedTender(null)}
        />
      )}
    </div>
  );
}
