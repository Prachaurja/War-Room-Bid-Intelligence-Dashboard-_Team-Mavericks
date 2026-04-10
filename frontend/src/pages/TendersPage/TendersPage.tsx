import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Download, AlertCircle, Clock,
  CheckCircle2, Layers, DollarSign,
  TrendingUp, Inbox,
} from 'lucide-react';
import { useTenders, useOverviewStats } from '../../hooks/useTenders';
import { useDebounce } from '../../hooks/useDebounce';
import TenderCard from '../../components/tenders/TenderCard';
import TenderFilters from '../../components/tenders/TenderFilters';
import TenderDetailModal from '../../components/tenders/TenderDetailModal';
import type { Tender } from '../../types/tender.types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import styles from './TendersPage.module.css';
import clsx from 'clsx';

type Tab = 'active' | 'upcoming' | 'closed';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'active',   label: 'Active Bids', icon: AlertCircle  },
  { id: 'upcoming', label: 'Upcoming Bids',    icon: Clock        },
  { id: 'closed',   label: 'Closed Bids',      icon: CheckCircle2 },
];

export default function TendersPage() {
  const [activeTab, setActiveTab]         = useState<Tab>('closed');
  const [search, setSearch]               = useState('');
  const [sector, setSector]               = useState('');
  const [state, setState]                 = useState('');
  const [page, setPage]                   = useState(1);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  // When filters change, reset to page 1
  const handleSearch = useCallback((v: string) => { setSearch(v);  setPage(1); }, []);
  const handleSector = useCallback((v: string) => { setSector(v);  setPage(1); }, []);
  const handleState  = useCallback((v: string) => { setState(v);   setPage(1); }, []);
  const handleTab    = useCallback((t: Tab)    => { setActiveTab(t); setPage(1); }, []);

  const handleClear = useCallback(() => {
    setSearch(''); setSector(''); setState(''); setPage(1);
  }, []);

  const filters = {
    page,
    page_size: 15,
    status:     activeTab,
    sector:     sector    || undefined,
    state:      state     || undefined,
    search:     debouncedSearch || undefined,
  };

  const { data, isLoading, isError } = useTenders(filters);
  const { data: stats }              = useOverviewStats();

  const tenders    = data?.items      ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.total_pages ?? 1;

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
        onSearch={handleSearch}
        onSector={handleSector}
        onState={handleState}
        onClear={handleClear}
        totalResults={total}
        loading={isLoading}
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
        {isLoading && (
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
        {isError && !isLoading && (
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} style={{ color: '#F87171' }} />
            <p className={styles.emptyTitle}>Could not load tenders</p>
            <p className={styles.emptySub}>Make sure the backend is running on port 8000</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && tenders.length === 0 && (
          <div className={styles.emptyState}>
            <Inbox size={36} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No tenders found</p>
            <p className={styles.emptySub}>
              {activeTab === 'active' || activeTab === 'upcoming'
                ? 'No live tenders — your data source contains historical closed contracts'
                : 'Try adjusting your filters'}
            </p>
            {(search || sector || state) && (
              <button className={styles.clearFiltersBtn} onClick={handleClear}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Cards */}
        {!isLoading && !isError && tenders.length > 0 && (
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
        {!isLoading && !isError && totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Prev
            </button>

            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={clsx(styles.pageNum, page === p && styles.pageNumActive)}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 7 && <span className={styles.pageDots}>…{totalPages}</span>}
            </div>

            <button
              className={styles.pageBtn}
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
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