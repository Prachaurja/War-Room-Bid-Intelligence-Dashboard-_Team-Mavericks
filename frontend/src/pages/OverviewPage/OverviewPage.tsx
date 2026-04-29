import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Layers, CheckCircle2,
  TrendingUp, Bell, ArrowRight, Zap,
  Sparkles, Radio, Activity,
} from 'lucide-react';
import StatCard from '../../components/overview/StatCard';
import BidsBySectorChart from '../../components/overview/BidsBySectorChart';
import RegionalBidChart from '../../components/overview/RegionalBidChart';
import RecentActivityFeed from '../../components/overview/RecentActivityFeed';
import SourceBreakdown from '../../components/overview/SourceBreakdown';
import { useOverviewStats } from '../../hooks/useTenders';
import { useAlerts } from '../../hooks/useAlerts';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatNumber, formatAgo } from '../../utils/formatters';
import styles from './OverviewPage.module.css';

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  austender:   { label: 'AusTender',   color: '#7C3AED' },
  tendersnet:  { label: 'Tenders.Net', color: '#10B981' },
  qld_tenders: { label: 'QLD Tenders', color: '#F59E0B' },
  nsw_etender: { label: 'NSW eTender', color: '#3B82F6' },
  manual:      { label: 'Manual',      color: '#EC4899' },
};

const STORAGE_KEY_COUNT     = 'wr_last_total_tenders';
const STORAGE_KEY_TIMESTAMP = 'wr_last_visit_ts';

export default function OverviewPage() {
  const { data: stats, isLoading } = useOverviewStats();
  const { data: alertsData }       = useAlerts();
  const { user }                   = useAuth();
  const navigate                   = useNavigate();

  const [snapshot] = useState(() => {
    const rawCount = localStorage.getItem(STORAGE_KEY_COUNT);
    return {
      prevCount: rawCount !== null ? Number(rawCount) : null,
      prevTs:    localStorage.getItem(STORAGE_KEY_TIMESTAMP),
    };
  });

  const newSinceLastVisit = useMemo<number | null>(() => {
    if (stats?.total_tenders == null || snapshot.prevCount === null) return null;
    const diff = stats.total_tenders - snapshot.prevCount;
    return diff > 0 ? diff : 0;
  }, [stats?.total_tenders, snapshot.prevCount]);

  const lastVisitTs = snapshot.prevTs;

  useEffect(() => {
    if (stats?.total_tenders == null) return;
    localStorage.setItem(STORAGE_KEY_COUNT,     String(stats.total_tenders));
    localStorage.setItem(STORAGE_KEY_TIMESTAMP, new Date().toISOString());
  }, [stats?.total_tenders]);

  const unreadAlerts = useMemo(
    () => (alertsData ?? []).filter(a => !a.read).length,
    [alertsData],
  );

  const firstName = useMemo(() => {
    const name = user?.name ?? '';
    return name.split(' ')[0] || 'Analyst';
  }, [user]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const today = useMemo(() =>
    new Date().toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
    [],
  );

  const sources = useMemo(
    () => Object.entries(stats?.sources ?? {}),
    [stats?.sources],
  );

  const statCards = [
    {
      title:    'Total Tenders Value',
      value:    formatCurrency(stats?.total_value),
      sub:      `Avg ${formatCurrency(stats?.avg_value)} per tender`,
      icon:     DollarSign,
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
      change:   0,
    },
    {
      title:    'Total Tenders',
      value:    formatNumber(stats?.total_tenders),
      sub:      `Across ${Object.keys(stats?.sources ?? {}).length} data sources`,
      icon:     Layers,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
      change:   8.1,
    },
    {
      title:    'Active Tenders',
      value:    formatNumber(stats?.active_tenders ?? 0),
      sub:      stats?.upcoming_tenders
        ? `+ ${formatNumber(stats.upcoming_tenders)} upcoming`
        : 'Live procurement opportunities',
      icon:     Activity,
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      change:   3.2,
    },
    {
      title:    'Closed Tenders',
      value:    formatNumber(stats?.closed_tenders),
      sub:      'Historical awarded contracts',
      icon:     CheckCircle2,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      change:   5.3,
    },
  ];

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Welcome strip ── */}
      <motion.div
        className={styles.welcomeStrip}
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className={styles.welcomeLeft}>
          <div className={styles.welcomeTextBlock}>
            <h1 className={styles.welcomeHeading}>
              {greeting}, <span className={styles.welcomeName}>{firstName}!</span>
            </h1>
            <p className={styles.welcomeSub}>{today}</p>
          </div>
          <div className={styles.welcomeBadges}>
            {unreadAlerts > 0 && (
              <motion.button
                className={styles.alertBadge}
                onClick={() => navigate('/alerts')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Bell size={11} />
                {unreadAlerts} unread alert{unreadAlerts !== 1 ? 's' : ''}
                <ArrowRight size={11} />
              </motion.button>
            )}
            {stats?.active_tenders != null && (
              <div className={styles.activeBadge}>
                <Zap size={11} />
                {formatNumber(stats.active_tenders)} Active Tenders
              </div>
            )}
          </div>
        </div>

        <div className={styles.stripDivider} />

        <div className={styles.welcomeRight}>
          <div className={styles.newTendersBlock}>
            <div className={styles.newTendersHeader}>
              <Sparkles size={12} className={styles.newTendersIcon} />
              <span className={styles.newTendersLabel}>New since last visit</span>
            </div>
            {isLoading ? (
              <div className={styles.newTendersCount} style={{ color: 'var(--text-dim)' }}>…</div>
            ) : newSinceLastVisit === null ? (
              <div className={styles.newTendersCount}>First visit</div>
            ) : newSinceLastVisit === 0 ? (
              <div className={styles.newTendersCount} style={{ color: 'var(--text-muted)' }}>
                No new tenders
              </div>
            ) : (
              <div className={styles.newTendersCount}>
                +{formatNumber(newSinceLastVisit)} tenders
              </div>
            )}
            {lastVisitTs && (
              <p className={styles.newTendersSub}>Last visit {formatAgo(lastVisitTs)}</p>
            )}
          </div>

          <div className={styles.rightInnerDivider} />

          <div className={styles.ingestionBlock}>
            <div className={styles.ingestionHeader}>
              <Radio size={12} className={styles.ingestionIcon} />
              <span className={styles.ingestionLabel}>Ingestion Status</span>
            </div>
            <div className={styles.sourceRows}>
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className={styles.sourceStatusRow}>
                    <div className={styles.shimmer} style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0 }} />
                    <div className={styles.shimmer} style={{ flex: 1, height: 10 }} />
                    <div className={styles.shimmer} style={{ width: 36, height: 10 }} />
                  </div>
                ))
              ) : sources.length === 0 ? (
                <p className={styles.noSources}>No sources connected</p>
              ) : (
                sources.map(([name, count]) => {
                  const cfg   = SOURCE_CONFIG[name] ?? { label: name.replace(/_/g, ' '), color: '#6B7280' };
                  const total = sources.reduce((s, [, v]) => s + v, 0);
                  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={name} className={styles.sourceStatusRow}>
                      <span className={styles.sourceStatusDot} style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }} />
                      <span className={styles.sourceStatusLabel}>{cfg.label}</span>
                      <span className={styles.sourceStatusCount}>{formatNumber(count)}</span>
                      <span className={styles.sourceStatusPct} style={{ color: cfg.color }}>{pct}%</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className={styles.statGrid}>
        {statCards.map((card, i) => (
          <StatCard key={card.title} {...card} loading={isLoading} delay={i * 0.07} />
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className={styles.chartsRow}>
        <BidsBySectorChart />
        <RegionalBidChart />
      </div>

      {/* ── Bottom row ── */}
      <div className={styles.bottomRow}>
        <div className={styles.feedWrap}>
          <RecentActivityFeed />
        </div>
        <div className={styles.sideWrap}>
          <SourceBreakdown />
          <motion.div
            className={styles.miniCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className={styles.miniHeader}>
              <TrendingUp size={14} className={styles.miniIcon} />
              <span>Quick Stats</span>
            </div>
            <div className={styles.miniGrid}>
              {[
                { label: 'Avg Tender',    value: formatCurrency(stats?.avg_value) },
                { label: 'Total Sources', value: String(Object.keys(stats?.sources ?? {}).length) },
                { label: 'Closed',        value: formatNumber(stats?.closed_tenders) },
                { label: 'Active',        value: formatNumber(stats?.active_tenders ?? 0) },
              ].map(item => (
                <div key={item.label} className={styles.miniStat}>
                  <p className={styles.miniLabel}>{item.label}</p>
                  <p className={styles.miniValue}>{isLoading ? '…' : item.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
