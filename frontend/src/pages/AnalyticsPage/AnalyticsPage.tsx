import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Download, Filter, TrendingUp, BarChart3, PieChart as PieIcon, Activity, Building2 } from 'lucide-react';
import { useSectorStats, useStateStats, useOverviewStats } from '../../hooks/useTenders';
import { useMonthlyVolume, useValueOverTime, useTopDepartments } from '../../hooks/useAnalytics';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { sectorLabel, sectorColor } from '../../utils/tender.utils';
import styles from './AnalyticsPage.module.css';
import clsx from 'clsx';
import { useState } from 'react';

// ── Colours ──────────────────────────────────────────────────
const STATE_COLORS: Record<string, string> = {
  NSW: '#3B82F6', VIC: '#8B5CF6', QLD: '#F59E0B',
  SA:  '#10B981', WA:  '#EC4899', ACT: '#06B6D4',
  NT:  '#EF4444', TAS: '#84CC16', Federal: '#6B7280',
};

const DEPT_COLORS = [
  '#7C3AED','#3B82F6','#10B981','#F59E0B',
  '#EC4899','#06B6D4','#EF4444','#84CC16','#8B5CF6','#F97316',
];

// ── Tooltip components ────────────────────────────────────────
type TooltipEntry = { color: string; name: string; value: number };

const DarkTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      {label && <p className={styles.tooltipTitle}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className={styles.tooltipRow}>
          <span style={{ color: p.color }}>{p.name}</span>
          <strong>{typeof p.value === 'number' && p.value > 10000
            ? formatCurrency(p.value)
            : formatNumber(p.value)
          }</strong>
        </p>
      ))}
    </div>
  );
};

type PieEntry = { name: string; value: number; payload: { total_value: number } };

const PieTooltip = ({ active, payload }: { active?: boolean; payload?: PieEntry[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{sectorLabel(d.name)}</p>
      <p className={styles.tooltipRow}><span>Contracts</span><strong>{formatNumber(d.value)}</strong></p>
      <p className={styles.tooltipRow}><span>Value</span><strong>{formatCurrency(d.payload.total_value)}</strong></p>
    </div>
  );
};

export default function AnalyticsPage() {
  const [activeMetric, setActiveMetric] = useState<'count' | 'value'>('count');

  // ── Existing hooks ────────────────────────────────────────
  const { data: sectorData,  isLoading: sectorLoading  } = useSectorStats();
  const { data: stateData,   isLoading: stateLoading   } = useStateStats();
  const { data: overview,    isLoading: overviewLoading } = useOverviewStats();

  // ── New analytics hooks ───────────────────────────────────
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyVolume();
  const { data: valueData,   isLoading: valueLoading   } = useValueOverTime();
  const { data: deptData,    isLoading: deptLoading    } = useTopDepartments(10);

  // ── Derived chart data ────────────────────────────────────
  const sectorChartData = (sectorData ?? [])
    .filter(d => d.sector)
    .sort((a, b) => b.count - a.count)
    .map(d => ({
      name:        d.sector,
      label:       sectorLabel(d.sector),
      count:       d.count,
      total_value: d.total_value,
      fill:        sectorColor(d.sector),
    }));

  const stateChartData = (stateData ?? [])
    .filter(d => d.state && d.state !== 'Unknown')
    .sort((a, b) => b.count - a.count)
    .slice(0, 9)
    .map(d => ({
      state:       d.state,
      count:       d.count,
      total_value: d.total_value,
      fill:        STATE_COLORS[d.state] ?? '#6B7280',
    }));

  const topSectors = [...sectorChartData]
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 6);

  const maxValue    = topSectors[0]?.total_value ?? 1;
  const maxDeptVal  = (deptData ?? [])[0]?.total_value ?? 1;

  // ── KPI cards ─────────────────────────────────────────────
  const kpis = [
    {
      label:    'Total Contracts',
      value:    formatNumber(overview?.total_tenders),
      sub:      'All Time',
      icon:     BarChart3,
      gradient: 'linear-gradient(135deg,#7C3AED,#4F46E5)',
    },
    {
      label:    'Total Value',
      value:    formatCurrency(overview?.total_value),
      sub:      'Combined Contract Value',
      icon:     TrendingUp,
      gradient: 'linear-gradient(135deg,#3B82F6,#06B6D4)',
    },
    {
      label:    'Average Value',
      value:    formatCurrency(overview?.avg_value),
      sub:      'Per Contract',
      icon:     Activity,
      gradient: 'linear-gradient(135deg,#10B981,#059669)',
    },
    {
      label:    'Sectors Tracked',
      value:    String(sectorChartData.length),
      sub:      'Procurement Categories',
      icon:     PieIcon,
      gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
    },
  ];

  const isLoading = sectorLoading || stateLoading || overviewLoading;

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Analytics</h2>
          <p className={styles.headingSub}>Deep Dive Analytics into Australian Government Procurement Data</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostBtn}><Filter size={13} /> Filter</button>
          <button className={styles.ghostBtn}><Download size={13} /> Export</button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            className={styles.kpiCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            transition={{ delay: i * 0.07 }}
          >
            <div className={styles.kpiIcon} style={{ background: kpi.gradient }}>
              <kpi.icon size={16} />
            </div>
            <div>
              <p className={styles.kpiLabel}>{kpi.label}</p>
              <p className={styles.kpiValue}>
                {isLoading ? <span className={styles.kpiSkeleton} /> : kpi.value}
              </p>
              <p className={styles.kpiSub}>{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Row 1: Sector pie + State bar ── */}
      <div className={styles.chartsRow2}>

        {/* Sector Pie */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Sector Distribution</h3>
              <p className={styles.chartSub}>Contracts by Procurement Category</p>
            </div>
            <div className={styles.pill}>{sectorChartData.length} sectors</div>
          </div>
          {sectorLoading ? (
            <div className={styles.loadingArea}>
              <div className={clsx(styles.shimmer, styles.shimmerCircle)} />
            </div>
          ) : (
            <div className={styles.pieWrap}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={sectorChartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    paddingAngle={3}
                  >
                    {sectorChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegend}>
                {sectorChartData.map(d => (
                  <div key={d.name} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: d.fill }} />
                    <span className={styles.legendLabel}>{sectorLabel(d.name)}</span>
                    <span className={styles.legendValue}>{formatNumber(d.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* State Bar */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>State Distribution</h3>
              <p className={styles.chartSub}>Contract Volume by Australian State</p>
            </div>
            <div className={styles.metricToggle}>
              <button
                className={clsx(styles.toggleBtn, activeMetric === 'count' && styles.toggleBtnActive)}
                onClick={() => setActiveMetric('count')}
              >Count</button>
              <button
                className={clsx(styles.toggleBtn, activeMetric === 'value' && styles.toggleBtnActive)}
                onClick={() => setActiveMetric('value')}
              >Value</button>
            </div>
          </div>
          {stateLoading ? (
            <div className={styles.loadingArea}>
              <div className={clsx(styles.shimmer)} style={{ height: 260 }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stateChartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="state" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar
                  dataKey={activeMetric === 'count' ? 'count' : 'total_value'}
                  name={activeMetric === 'count' ? 'Contracts' : 'Value'}
                  radius={[5, 5, 0, 0]} maxBarSize={36}
                >
                  {stateChartData.map(entry => (
                    <Cell key={entry.state} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 2: Top sectors by value ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Top Sectors by Contract Value</h3>
            <p className={styles.chartSub}>Total Awarded Contract Value Per Procurement Sector</p>
          </div>
          <div className={styles.pill}>AusTender Data</div>
        </div>
        {sectorLoading ? (
          <div className={styles.loadingTable}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className={styles.tableSkeletonRow}>
                <div className={clsx(styles.shimmer)} style={{ width: 100, height: 11 }} />
                <div className={clsx(styles.shimmer)} style={{ flex: 1, height: 8 }} />
                <div className={clsx(styles.shimmer)} style={{ width: 70, height: 11 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.topTable}>
            {topSectors.map((sector, i) => {
              const pct = (sector.total_value / maxValue) * 100;
              return (
                <motion.div
                  key={sector.name}
                  className={styles.topRow}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0  }}
                  transition={{ delay: i * 0.06 }}
                >
                  <div className={styles.topRank}>#{i + 1}</div>
                  <div className={styles.topSectorLabel}>
                    <span className={styles.topDot} style={{ background: sector.fill }} />
                    {sector.label}
                  </div>
                  <div className={styles.topBarWrap}>
                    <div className={styles.topBar} style={{ width: `${pct}%`, background: sector.fill }} />
                  </div>
                  <div className={styles.topMeta}>
                    <span className={styles.topValue}>{formatCurrency(sector.total_value)}</span>
                    <span className={styles.topCount}>{formatNumber(sector.count)} contracts</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Row 3: Sector horizontal bar ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Contract Count by Sector</h3>
            <p className={styles.chartSub}>Number of Awarded Contracts Per Sector</p>
          </div>
        </div>
        {sectorLoading ? (
          <div className={clsx(styles.shimmer)} style={{ height: 260 }} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={sectorChartData}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="label" type="category"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                axisLine={false} tickLine={false} width={98}
              />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" name="Contracts" radius={[0, 5, 5, 0]} maxBarSize={18}>
                {sectorChartData.map(entry => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── NEW Row 4: Monthly volume bar + Value over time line ── */}
      <div className={styles.chartsRow2}>

        {/* Monthly Volume Bar */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Monthly Contract Volume</h3>
              <p className={styles.chartSub}>Number of Contracts Ingested Per Month</p>
            </div>
            <div className={styles.pill}>
              {(monthlyData ?? []).reduce((s, d) => s + d.count, 0)} total
            </div>
          </div>
          {monthlyLoading ? (
            <div className={clsx(styles.shimmer)} style={{ height: 240 }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData ?? []} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="count" name="Contracts" fill="#7C3AED" radius={[5, 5, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Value Over Time Line */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Contract Value Over Time</h3>
              <p className={styles.chartSub}>Total Contract Value Ingested Per Month</p>
            </div>
            <div className={styles.pill}>AUD</div>
          </div>
          {valueLoading ? (
            <div className={clsx(styles.shimmer)} style={{ height: 240 }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={valueData ?? []} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={48}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}K`}
                />
                <Tooltip content={<DarkTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total_value"
                  name="Total Value"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── NEW Row 5: Top Departments by spend ── */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Top Departments by Spend</h3>
            <p className={styles.chartSub}>Top 10 Government Agencies Ranked by Total Contract Value</p>
          </div>
          <div className={styles.pill}>
            <Building2 size={11} /> Top 10
          </div>
        </div>
        {deptLoading ? (
          <div className={styles.loadingTable}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className={styles.tableSkeletonRow}>
                <div className={clsx(styles.shimmer)} style={{ width: 120, height: 11 }} />
                <div className={clsx(styles.shimmer)} style={{ flex: 1, height: 8 }} />
                <div className={clsx(styles.shimmer)} style={{ width: 80, height: 11 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.topTable}>
            {(deptData ?? []).map((dept, i) => {
              const pct = (dept.total_value / maxDeptVal) * 100;
              const color = DEPT_COLORS[i % DEPT_COLORS.length];
              return (
                <motion.div
                  key={dept.agency}
                  className={styles.topRow}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0  }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className={styles.topRank}>#{i + 1}</div>
                  <div className={styles.topSectorLabel}>
                    <span className={styles.topDot} style={{ background: color }} />
                    <span className={styles.deptName}>{dept.agency}</span>
                  </div>
                  <div className={styles.topBarWrap}>
                    <div className={styles.topBar} style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className={styles.topMeta}>
                    <span className={styles.topValue}>{formatCurrency(dept.total_value)}</span>
                    <span className={styles.topCount}>{formatNumber(dept.contract_count)} contracts</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
