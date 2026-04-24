import { useOverviewStats } from '../../hooks/useTenders';
import { formatNumber } from '../../utils/formatters';
import styles from './Chart.module.css';

const SOURCE_COLORS: Record<string, string> = {
  austender:   '#7C3AED',
  nsw_etender: '#3B82F6',
  manual:      '#10B981',
};

export default function SourceBreakdown() {
  const { data, isLoading } = useOverviewStats();

  const sources = Object.entries(data?.sources ?? {});
  const total   = sources.reduce((s, [, v]) => s + v, 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Data Sources</h3>
          <p className={styles.sub}>Ingestion Breakdown</p>
        </div>
        <div className={styles.pill}>{formatNumber(total)} total</div>
      </div>

      {isLoading ? (
        <div className={styles.sourceList}>
          {[1, 2].map(i => (
            <div key={i}>
              <div className={styles.sourceRow}>
                <div className={styles.shimmer} style={{ width: 8, height: 8, borderRadius: '50%' }} />
                <div className={styles.shimmer} style={{ flex: 1, height: 11 }} />
                <div className={styles.shimmer} style={{ width: 40, height: 11 }} />
              </div>
              <div className={styles.sourceBar}>
                <div className={styles.shimmer} style={{ height: '100%', width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.sourceList}>
          {sources.map(([name, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = SOURCE_COLORS[name] ?? '#6B7280';
            return (
              <div key={name}>
                <div className={styles.sourceRow}>
                  <span className={styles.sourceDot} style={{ background: color }} />
                  <span className={styles.sourceLabel}>{name.replace('_', ' ')}</span>
                  <span className={styles.sourceCount}>{formatNumber(count)}</span>
                </div>
                <div className={styles.sourceBar}>
                  <div
                    className={styles.sourceBarFill}
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}