import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Download, AlertCircle, Clock,
  CheckCircle2, DollarSign,
  Activity, Inbox,
} from 'lucide-react';
import { useTenders, useOverviewStats, useSourceStats } from '../../hooks/useTenders';
import { useDebounce } from '../../hooks/useDebounce';
import TenderCard from '../../components/tenders/TenderCard';
import TenderFilters from '../../components/tenders/TenderFilters';
import TenderDetailModal from '../../components/tenders/TenderDetailModal';
import type { Tender } from '../../types/tender.types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import styles from './TendersPage.module.css';
import clsx from 'clsx';

type Tab = 'active' | 'upcoming' | 'closed';

const STATUS_CARDS: {
  id: Tab;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  countKey: 'active_tenders' | 'upcoming_tenders' | 'closed_tenders';
  valueKey: 'active_value' | 'upcoming_value' | 'closed_value';
}[] = [
  {
    id:       'active',
    label:    'Active Bids',
    desc:     'Open Tender Bids — Accepting Submissions Now',
    icon:     Activity,
    color:    '#10B981',
    bg:       'rgba(16,185,129,0.07)',
    border:   'rgba(16,185,129,0.22)',
    countKey: 'active_tenders',
    valueKey: 'active_value',
  },
  {
    id:       'upcoming',
    label:    'Upcoming Bids',
    desc:     'Planned Tender Bids — Not Yet Released',
    icon:     Clock,
    color:    '#F59E0B',
    bg:       'rgba(245,158,11,0.07)',
    border:   'rgba(245,158,11,0.22)',
    countKey: 'upcoming_tenders',
    valueKey: 'upcoming_value',
  },
  {
    id:       'closed',
    label:    'Closed Bids',
    desc:     'Awarded Tender Bids — Historical Tenders',
    icon:     CheckCircle2,
    color:    '#6366F1',
    bg:       'rgba(99,102,241,0.07)',
    border:   'rgba(99,102,241,0.22)',
    countKey: 'closed_tenders',
    valueKey: 'closed_value',
  },
];

export default function TendersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab]         = useState<Tab>('active');
  const [sector, setSector]               = useState('');
  const [state, setState]                 = useState('');
  const [source, setSource]               = useState('');
  const [page, setPage]                   = useState(1);
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

  const handleSearch = useCallback((v: string) => { setSearch(v);  setPage(1); }, [setSearch]);
  const handleSector = useCallback((v: string) => { setSector(v);  setPage(1); }, []);
  const handleState  = useCallback((v: string) => { setState(v);   setPage(1); }, []);
  const handleSource = useCallback((v: string) => { setSource(v);  setPage(1); }, []);
  const handleTab    = useCallback((t: Tab)    => { setActiveTab(t); setPage(1); }, []);

  const handleClear = useCallback(() => {
    setSearch(''); setSector(''); setState(''); setSource(''); setPage(1);
  }, [setSearch]);

  const filters = {
    page,
    page_size: 15,
    status:      activeTab === 'active' ? 'open' : activeTab,
    sector:      sector || undefined,
    state:       state  || undefined,
    source_name: source || undefined,
    search:      debouncedSearch || undefined,
  };

  const { data, isLoading, isError } = useTenders(filters);
  const { data: stats }              = useOverviewStats();
  const { data: sourceStats }        = useSourceStats();

  const tenders    = data?.items      ?? [];
  const total      = data?.total      ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const exportCSV = () => {
    if (!tenders.length) return;
    const headers = ['Title','Agency','Sector','State','Value','Close Date','Status','Source'];
    const rows = tenders.map(t => [
      `"${t.title.replace(/"/g,"'")}"`,
      `"${t.agency.replace(/"/g,"'")}"`,
      t.sector ?? '',
      t.state  ?? '',
      t.contract_value ?? '',
      t.close_date     ?? '',
      t.status,
      t.source_name ?? '',
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

  const activeCard = STATUS_CARDS.find(c => c.id === activeTab)!;

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Tender Management</h2>
          <p className={styles.headingSub}>Track and Manage Australian Government Tenders</p>
        </div>
        <button className={styles.exportBtn} onClick={exportCSV}>
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* ── Total Value card (full width) ── */}
      <motion.div
        className={styles.totalValueCard}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.totalValueLeft}>
          <div className={styles.totalValueIcon}>
            <DollarSign size={20} />
          </div>
          <div>
            <p className={styles.totalValueLabel}>Total Portfolio Value</p>
            <p className={styles.totalValueAmount}>
              {stats ? formatCurrency(stats.total_value) : '…'}
            </p>
          </div>
        </div>
        <div className={styles.totalValueRight}>
          <div className={styles.totalValueStat}>
            <p className={styles.tvStatLabel}>Total Tenders</p>
            <p className={styles.tvStatValue}>{stats ? formatNumber(stats.total_tenders) : '…'}</p>
          </div>
          <div className={styles.totalValueDivider} />
          <div className={styles.totalValueStat}>
            <p className={styles.tvStatLabel}>Avg Value</p>
            <p className={styles.tvStatValue}>{stats ? formatCurrency(stats.avg_value) : '…'}</p>
          </div>
          <div className={styles.totalValueDivider} />
          <div className={styles.totalValueStat}>
            <p className={styles.tvStatLabel}>Data Sources</p>
            <p className={styles.tvStatValue}>{stats ? Object.keys(stats.sources).length : '…'}</p>
          </div>
        </div>
      </motion.div>

      {/* ── Status filter cards (Active / Upcoming / Closed) ── */}
      <div className={styles.statusGrid}>
        {STATUS_CARDS.map((card, i) => {
          const isActive = activeTab === card.id;
          const count    = stats?.[card.countKey] ?? 0;
          const value    = stats?.[card.valueKey] ?? 0;
          return (
            <motion.button
              key={card.id}
              className={styles.statusCard}
              style={{
                background:   isActive ? card.bg    : 'var(--card-bg)',
                borderColor:  isActive ? card.color : 'var(--card-border)',
                boxShadow:    isActive ? `0 0 0 1px ${card.color}55, 0 4px 24px ${card.color}22` : 'none',
              }}
              onClick={() => handleTab(card.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Icon + label */}
              <div className={styles.scTop}>
                <div
                  className={styles.scIconWrap}
                  style={{
                    background: isActive ? card.color + '25' : 'var(--bg-elevated)',
                    border:     `1px solid ${isActive ? card.color + '55' : 'var(--border)'}`,
                  }}
                >
                  <card.icon size={15} style={{ color: isActive ? card.color : 'var(--text-dim)' }} />
                </div>
                <span className={styles.scLabel} style={{ color: isActive ? card.color : 'var(--text-secondary)' }}>
                  {card.label}
                </span>
                {isActive && (
                  <motion.span
                    className={styles.scActivePill}
                    style={{ background: card.color + '22', color: card.color, border: `1px solid ${card.color}44` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    Selected
                  </motion.span>
                )}
              </div>

              {/* Count */}
              <p className={styles.scCount} style={{ color: isActive ? card.color : 'var(--text-primary)' }}>
                {stats ? formatNumber(count) : '…'}
              </p>

              <p className={styles.scDesc}>{card.desc}</p>

              {/* Divider */}
              <div className={styles.scDivider} style={{ background: isActive ? card.color + '33' : 'var(--border)' }} />

              {/* Value — source breakdown for active, total for others */}
              {card.id === 'active' ? (
                <div className={styles.scSourceBreakdown}>
                  {sourceStats
                    ? Object.entries(sourceStats)
                        .filter(([, statuses]) => 'open' in statuses || 'active' in statuses)
                        .map(([srcName, statuses]) => {
                          const d = statuses['open'] ?? statuses['active'] ?? { count: 0, value: 0 };
                          const label =
                            srcName === 'austender'   ? 'AusTender'   :
                            srcName === 'tendersnet'  ? 'Tenders.Net' :
                            srcName === 'qld_tenders' ? 'QLD Tenders' :
                            srcName.replace(/_/g, ' ');
                          return (
                            <div key={srcName} className={styles.scBreakdownRow}>
                              <span className={styles.scBreakdownSrc}>{label}</span>
                              <span className={styles.scBreakdownCount}>{formatNumber(d.count)} tenders</span>
                              <span className={styles.scBreakdownVal} style={{ color: card.color }}>
                                {d.value > 0 ? formatCurrency(d.value) : 'Not disclosed'}
                              </span>
                            </div>
                          );
                        })
                    : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading…</span>
                  }
                </div>
              ) : (
                <div className={styles.scValueRow}>
                  <span className={styles.scValueLabel}>Total Value</span>
                  <span className={styles.scValue} style={{ color: isActive ? card.color : 'var(--text-secondary)' }}>
                    {stats ? (value > 0 ? formatCurrency(value) : 'Not disclosed') : '…'}
                  </span>
                </div>
              )}

              {/* Source filter row */}
              <div className={styles.scSourceRow} onClick={e => e.stopPropagation()}>
                <span className={styles.scSourceLabel}>Filter Source:</span>
                <select
                  className={styles.scSourceSelect}
                  value={isActive ? source : ''}
                  onChange={e => { handleTab(card.id); handleSource(e.target.value); }}
                  style={{ borderColor: isActive ? card.color + '44' : 'var(--border)' }}
                >
                  <option value="">All Sources</option>
                  {Object.keys(stats?.sources ?? {}).map(s => (
                    <option key={s} value={s}>
                      {s === 'austender' ? 'AusTender' :
                       s === 'tendersnet' ? 'Tenders.Net' :
                       s === 'qld_tenders' ? 'QLD Tenders' :
                       s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </motion.button>
          );
        })}
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

      {/* ── Active tab label ── */}
      <div className={styles.activeTabLabel}>
        <activeCard.icon size={14} style={{ color: activeCard.color }} />
        <span style={{ color: activeCard.color, fontWeight: 600 }}>{activeCard.label}</span>
        {total > 0 && (
          <span className={styles.activeTabCount} style={{ background: activeCard.color + '22', color: activeCard.color }}>
            {formatNumber(total)} results
          </span>
        )}
      </div>

      {/* ── Tender list ── */}
      <div className={styles.listWrap}>
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

        {isError && !isLoading && (
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} style={{ color: '#F87171' }} />
            <p className={styles.emptyTitle}>Could not load tenders</p>
            <p className={styles.emptySub}>Make sure the backend is running on port 8000</p>
          </div>
        )}

        {!isLoading && !isError && tenders.length === 0 && (
          <div className={styles.emptyState}>
            <Inbox size={36} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No tenders found</p>
            <p className={styles.emptySub}>
              {activeTab === 'active'
                ? 'No active tenders — add more Tenders.Net URLs in Data Sources'
                : activeTab === 'upcoming'
                  ? 'No upcoming tenders matching your filters'
                  : 'Try adjusting your filters'}
            </p>
            {(search || sector || state || source) && (
              <button className={styles.clearFiltersBtn} onClick={handleClear}>
                Clear filters
              </button>
            )}
          </div>
        )}

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

        {!isLoading && !isError && totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
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
              {totalPages > 10 && <span className={styles.pageDots}>…{totalPages}</span>}
            </div>
            <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>

      {selectedTender && (
        <TenderDetailModal tender={selectedTender} onClose={() => setSelectedTender(null)} />
      )}
    </div>
  );
}
