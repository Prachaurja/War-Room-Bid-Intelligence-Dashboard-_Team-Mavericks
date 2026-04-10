import { motion } from 'framer-motion';
import {
  DollarSign, Layers, CheckCircle2, Clock,
  TrendingUp, Database,
} from 'lucide-react';
import StatCard from '../../components/overview/StatCard';
import BidsBySectorChart from '../../components/overview/BidsBySectorChart';
import RegionalBidChart from '../../components/overview/RegionalBidChart';
import RecentActivityFeed from '../../components/overview/RecentActivityFeed';
import SourceBreakdown from '../../components/overview/SourceBreakdown';
import { useOverviewStats } from '../../hooks/useTenders';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import styles from './OverviewPage.module.css';

export default function OverviewPage() {
  const { data: stats, isLoading } = useOverviewStats();

  const statCards = [
    {
      title:    'Total Contract Value',
      value:    formatCurrency(stats?.total_value),
      sub:      `Avg ${formatCurrency(stats?.avg_value)} Per Contract`,
      icon:     DollarSign,
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
      change:   0,
    },
    {
      title:    'Total Contracts',
      value:    formatNumber(stats?.total_tenders),
      sub:      `Across ${Object.keys(stats?.sources ?? {}).length} Data Sources`,
      icon:     Layers,
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
      change:   8.1,
    },
    {
      title:    'Active Bids',
      value:    formatNumber(stats?.active_tenders ?? 0),
      sub:      stats?.upcoming_tenders
        ? `+ ${stats.upcoming_tenders} upcoming`
        : 'Live Procurement Opportunities',
      icon:     Clock,
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
      change:   stats?.active_tenders ? 3.2 : undefined,
    },
    {
      title:    'Closed Tenders',
      value:    formatNumber(stats?.closed_tenders),
      sub:      'Historical GaPS Contracts',
      icon:     CheckCircle2,
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
      change:   5.3,
    },
  ];

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Page header ── */}
      <motion.div
        className={styles.pageHeader}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y:  0  }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h2 className={styles.heading}>Intelligence Overview</h2>
          <p className={styles.headingSub}>
            Real-time Data from Australian Government Procurement Feeds
          </p>
        </div>
        <div className={styles.dataTag}>
          <Database size={12} />
          <span>AusTender · GaPS Export</span>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className={styles.statGrid}>
        {statCards.map((card, i) => (
          <StatCard
            key={card.title}
            {...card}
            loading={isLoading}
            delay={i * 0.07}
          />
        ))}
      </div>

      {/* ── Charts row 1 ── */}
      <div className={styles.chartsRow}>
        <BidsBySectorChart />
        <RegionalBidChart />
      </div>

      {/* ── Bottom row: activity feed + source breakdown ── */}
      <div className={styles.bottomRow}>
        <div className={styles.feedWrap}>
          <RecentActivityFeed />
        </div>
        <div className={styles.sideWrap}>
          <SourceBreakdown />

          {/* Quick-stats mini card */}
          <motion.div
            className={styles.miniCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: 0.5 }}
          >
            <div className={styles.miniHeader}>
              <TrendingUp size={14} className={styles.miniIcon} />
              <span>Quick Stats</span>
            </div>
            <div className={styles.miniGrid}>
              {[
                { label: 'Avg Contract',   value: formatCurrency(stats?.avg_value) },
                { label: 'Total Sources',  value: String(Object.keys(stats?.sources ?? {}).length) },
                { label: 'Closed',         value: formatNumber(stats?.closed_tenders) },
                { label: 'Active',         value: formatNumber(stats?.active_tenders ?? 0) },
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