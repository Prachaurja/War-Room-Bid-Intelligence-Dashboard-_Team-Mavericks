import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import {
  Download, Filter, TrendingUp, BarChart3,
  Activity, Building2, Clock,
  DollarSign, Layers,
  Target, Map, Users,
} from 'lucide-react';
import { useSectorStats, useStateStats, useOverviewStats } from '../../hooks/useTenders';
import {
  useTopDepartments,
  useSourceBreakdown, useStatusBreakdown, useClosingSoon,
  useSourceFreshness, useClosingByMonth,
  useWinWindow, useSectorStateHeatmap, useAgencyFrequency, useValueScatter,
  type ScatterPoint,
} from '../../hooks/useAnalytics';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { sectorLabel, sectorColor } from '../../utils/tender.utils';
import styles from './AnalyticsPage.module.css';
import clsx from 'clsx';
import { useState } from 'react';

// ── Constants ─────────────────────────────────────────────────
const STATE_COLORS: Record<string, string> = {
  NSW: '#3B82F6', VIC: '#8B5CF6', QLD: '#F59E0B',
  SA:  '#10B981', WA:  '#EC4899', ACT: '#06B6D4',
  NT:  '#EF4444', TAS: '#84CC16', Federal: '#6B7280',
};

const STATUS_COLORS: Record<string, string> = {
  open:     '#10B981',
  closed:   '#6B7280',
  upcoming: '#F59E0B',
  active:   '#10B981',
};


const DEPT_COLORS = [
  '#7C3AED','#3B82F6','#10B981','#F59E0B',
  '#EC4899','#06B6D4','#EF4444','#84CC16','#8B5CF6','#F97316',
];

function heatColor(value: number, max: number): string {
  if (value === 0 || max === 0) return 'rgba(255,255,255,0.03)';
  const t = Math.min(value / max, 1);
  return `rgba(124,58,237,${0.08 + t * 0.82})`;
}

// ── Tooltips ──────────────────────────────────────────────────
type TooltipEntry = { color: string; name: string; value: number };
const DarkTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      {label && <p className={styles.tooltipTitle}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className={styles.tooltipRow}>
          <span style={{ color: p.color }}>{p.name}</span>
          <strong>{typeof p.value === 'number' && p.value > 10000 ? formatCurrency(p.value) : formatNumber(p.value)}</strong>
        </p>
      ))}
    </div>
  );
};

const ScatterTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint & { x: number; y: number; z: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className={styles.tooltip} style={{ maxWidth: 240 }}>
      <p className={styles.tooltipTitle} style={{ fontSize: 12, marginBottom: 4 }}>{d.title}</p>
      <p className={styles.tooltipRow}><span>Agency</span><strong>{d.agency}</strong></p>
      <p className={styles.tooltipRow}><span>Value</span><strong>{formatCurrency(d.contract_value)}</strong></p>
      <p className={styles.tooltipRow}><span>Closes</span><strong>{d.close_date ? new Date(d.close_date).toLocaleDateString('en-AU') : '—'}</strong></p>
      <p className={styles.tooltipRow}><span>State</span><strong>{d.state}</strong></p>
    </div>
  );
};

const Shimmer = ({ h = 240 }: { h?: number }) => (
  <div className={styles.shimmer} style={{ height: h, borderRadius: 8 }} />
);

const Empty = ({ label }: { label: string }) => (
  <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
    {label}
  </div>
);

// ── Page ──────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [activeMetric, setActiveMetric] = useState<'count' | 'value'>('count');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo,   setDateTo]           = useState('');

  const applyPreset = (months: number | null) => {
    if (months === null) { setDateFrom(''); setDateTo(''); return; }
    const from = new Date(); from.setMonth(from.getMonth() - months);
    const to   = new Date(); to.setMonth(to.getMonth() + months);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  // ── Data hooks ────────────────────────────────────────────
  const { data: sectorData,    isLoading: sectorLoading    } = useSectorStats();
  const { data: stateData,     isLoading: stateLoading     } = useStateStats();
  const { data: overview,      isLoading: overviewLoading  } = useOverviewStats();
  const { data: deptData,      isLoading: deptLoading      } = useTopDepartments(10);
  useSourceBreakdown();
  const { data: statusData,    isLoading: statusLoading    } = useStatusBreakdown();
  const { data: closingData,   isLoading: closingLoading   } = useClosingSoon();
  useSourceFreshness();
  const { data: closingByMonth,isLoading: closingByMonthLoading } = useClosingByMonth(dateFrom || undefined, dateTo || undefined);
  const { data: winWindow,     isLoading: winLoading        } = useWinWindow();
  const { data: heatmap,       isLoading: heatLoading       } = useSectorStateHeatmap();
  const { data: agencyFreq,    isLoading: agencyLoading     } = useAgencyFrequency(15);
  const { data: scatterData,   isLoading: scatterLoading    } = useValueScatter();

  // ── Derived ───────────────────────────────────────────────
  const KNOWN = new Set(['facility_management','construction','cleaning','it_services','healthcare','transportation','utilities','other']);

  const sectorChartData = (sectorData ?? [])
    .filter(d => d.sector && KNOWN.has(d.sector))
    .sort((a, b) => b.count - a.count)
    .map(d => ({ name: d.sector, label: sectorLabel(d.sector), count: d.count, total_value: d.total_value, fill: sectorColor(d.sector) }));

  const stateChartData = (stateData ?? [])
    .filter(d => d.state && d.state !== 'Unknown')
    .sort((a, b) => b.count - a.count).slice(0, 9)
    .map(d => ({ state: d.state, count: d.count, total_value: d.total_value, fill: STATE_COLORS[d.state] ?? '#6B7280' }));

  const topSectors = [...sectorChartData].sort((a, b) => b.total_value - a.total_value).slice(0, 6);
  const statusChartData = (statusData ?? []).map(s => ({ ...s, label: s.status.charAt(0).toUpperCase() + s.status.slice(1), fill: STATUS_COLORS[s.status] ?? '#6B7280' }));

  const maxValue   = topSectors[0]?.total_value ?? 1;
  const maxDeptVal = (deptData ?? [])[0]?.total_value ?? 1;
  const maxAgency  = (agencyFreq ?? [])[0]?.count ?? 1;
  const isLoading  = sectorLoading || stateLoading || overviewLoading;

  const scatterPoints = (scatterData ?? []).map(d => ({
    ...d,
    x: d.close_date ? new Date(d.close_date).getTime() : 0,
    y: d.contract_value,
    z: Math.min(Math.sqrt(d.contract_value / 10000), 20) + 4,
  })).filter(d => d.x > 0);

  const heatMax = heatmap
    ? Math.max(1, ...((heatmap.sectors ?? []).flatMap(sec => (heatmap.states ?? []).map(st => heatmap.matrix?.[sec]?.[st] ?? 0))))
    : 1;

  const kpis = [
    { label: 'Total Contracts', value: formatNumber(overview?.total_tenders), sub: 'All Time',          icon: BarChart3,  gradient: 'linear-gradient(135deg,#7C3AED,#4F46E5)' },
    { label: 'Total Value',     value: formatCurrency(overview?.total_value),  sub: 'Combined Value',    icon: TrendingUp, gradient: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
    { label: 'Average Value',   value: formatCurrency(overview?.avg_value),    sub: 'Per Contract',      icon: Activity,   gradient: 'linear-gradient(135deg,#10B981,#059669)' },
    { label: 'Active Bids',     value: formatNumber(overview?.active_tenders ?? 0), sub: 'Open Right Now', icon: Layers,  gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
  ];

  return (
    <div className={`${styles.page} page-enter`}>

      {/* Header */}
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

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} className={styles.kpiCard}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className={styles.kpiIcon} style={{ background: kpi.gradient }}><kpi.icon size={16} /></div>
            <div>
              <p className={styles.kpiLabel}>{kpi.label}</p>
              <p className={styles.kpiValue}>{isLoading ? <span className={styles.kpiSkeleton} /> : kpi.value}</p>
              <p className={styles.kpiSub}>{kpi.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Row 1: Status + Closing Soon */}
      <div className={styles.chartsRow2}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>Tender Status</h3><p className={styles.chartSub}>Open vs Closed vs Upcoming</p></div>
            <div className={styles.pill}>{(statusData ?? []).reduce((s, d) => s + d.count, 0)} total</div>
          </div>
          {statusLoading ? <Shimmer /> : statusChartData.length === 0 ? <Empty label="No status data" /> : (
            <div className={styles.pieWrap}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {statusChartData.map(e => <Cell key={e.status} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNumber(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.pieLegend}>
                {statusChartData.map(d => (
                  <div key={d.status} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: d.fill }} />
                    <span className={styles.legendLabel}>{d.label}</span>
                    <span className={styles.legendValue}>{formatNumber(d.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>Closing Soon</h3><p className={styles.chartSub}>Active Tenders by Days Remaining</p></div>
            <div className={styles.pill}><Clock size={11} /> {closingData?.total_active ?? 0} active</div>
          </div>
          {closingLoading ? <Shimmer /> : !closingData ? <Empty label="No deadline data" /> : (
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {closingData.buckets.map(b => (
                  <div key={b.label} style={{ flex: 1, background: b.color + '12', border: `1px solid ${b.color}30`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: b.color, margin: 0 }}>{formatNumber(b.count)}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '4px 0 0' }}>{b.label}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={closingData.buckets} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name="Tenders" radius={[5, 5, 0, 0]} maxBarSize={60}>
                    {closingData.buckets.map(b => <Cell key={b.label} fill={b.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Win Window */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Win Window — Next 90 Days</h3>
            <p className={styles.chartSub}>Tenders Closing This Quarter by Sector — Focus Your Bid Efforts Here</p>
          </div>
          <div className={styles.pill}><Target size={11} /> Next 90 days</div>
        </div>
        {winLoading ? <Shimmer h={260} /> : !winWindow?.data?.length ? <Empty label="No tenders closing in the next 90 days" /> : (
          <div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={winWindow.data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {(winWindow.sectors ?? []).map((sec, i) => (
                  <Bar key={sec} dataKey={sec} name={sectorLabel(sec)} stackId="win"
                    fill={sectorColor(sec)} maxBarSize={60}
                    radius={i === (winWindow.sectors.length - 1) ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
              {(winWindow.sectors ?? []).map(sec => (
                <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: sectorColor(sec), flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sectorLabel(sec)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Row 3: Sector × State Heatmap */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Sector × State Heatmap</h3>
            <p className={styles.chartSub}>Tender Activity by Sector and State — Darker = More Tenders</p>
          </div>
          <div className={styles.pill}><Map size={11} /> Geographic view</div>
        </div>
        {heatLoading ? <Shimmer h={280} /> : !heatmap?.sectors?.length ? <Empty label="No heatmap data" /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ width: 140, textAlign: 'left', fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, paddingBottom: 8 }}>Sector</th>
                  {heatmap.states.map(st => (
                    <th key={st} style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center', paddingBottom: 8, minWidth: 48 }}>{st}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.sectors.map(sec => (
                  <tr key={sec}>
                    <td style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 600, paddingRight: 12, paddingBottom: 3, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: sectorColor(sec), flexShrink: 0 }} />
                        {sectorLabel(sec)}
                      </div>
                    </td>
                    {heatmap.states.map(st => {
                      const val = heatmap.matrix?.[sec]?.[st] ?? 0;
                      return (
                        <td key={st} title={`${sectorLabel(sec)} × ${st}: ${val}`}
                          style={{ background: heatColor(val, heatMax), borderRadius: 6, textAlign: 'center', padding: '9px 4px', paddingBottom: 3, fontSize: 11, fontWeight: val > 0 ? 700 : 400, color: val > heatMax * 0.45 ? '#fff' : val > 0 ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.12)' }}>
                          {val > 0 ? formatNumber(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 4: Agency Frequency + State bar */}
      <div className={styles.chartsRow2}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>Agency Frequency</h3><p className={styles.chartSub}>Top 15 Agencies by Tender Count — Spot Repeat Clients</p></div>
            <div className={styles.pill}><Users size={11} /> Top 15</div>
          </div>
          {agencyLoading ? <Shimmer h={340} /> : !agencyFreq?.length ? <Empty label="No agency data" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(agencyFreq ?? []).map((a, i) => {
                const pct     = (a.count / maxAgency) * 100;
                const color   = DEPT_COLORS[i % DEPT_COLORS.length];
                const openPct = a.count > 0 ? Math.round((a.open_count / a.count) * 100) : 0;
                return (
                  <motion.div key={a.agency} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-dim)', width: 20, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 155, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={a.agency}>{a.agency}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', width: 36, textAlign: 'right', flexShrink: 0 }}>{formatNumber(a.count)}</span>
                    {openPct > 0 && (
                      <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)', flexShrink: 0, minWidth: 44, textAlign: 'center' }}>
                        {openPct}% open
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>State Distribution</h3><p className={styles.chartSub}>Contract Volume by Australian State</p></div>
            <div className={styles.metricToggle}>
              <button className={clsx(styles.toggleBtn, activeMetric === 'count' && styles.toggleBtnActive)} onClick={() => setActiveMetric('count')}>Count</button>
              <button className={clsx(styles.toggleBtn, activeMetric === 'value' && styles.toggleBtnActive)} onClick={() => setActiveMetric('value')}>Value</button>
            </div>
          </div>
          {stateLoading ? <Shimmer h={300} /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stateChartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="state" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey={activeMetric === 'count' ? 'count' : 'total_value'} name={activeMetric === 'count' ? 'Contracts' : 'Value'} radius={[5, 5, 0, 0]} maxBarSize={36}>
                  {stateChartData.map(e => <Cell key={e.state} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 5: Tender Value Scatter */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Tender Value Scatter</h3>
            <p className={styles.chartSub}>Upcoming Tenders with Value — X = Close Date · Y = Contract Value · Size = Scale</p>
          </div>
          <div className={styles.pill}><DollarSign size={11} /> {scatterPoints.length} tenders with value</div>
        </div>
        {scatterLoading ? <Shimmer h={300} /> : !scatterPoints.length ? <Empty label="No upcoming tenders with contract value" /> : (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="x" type="number" domain={['auto', 'auto']} name="Close Date"
                  tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => new Date(v).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}
                />
                <YAxis dataKey="y" type="number" name="Value"
                  tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} width={56}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(0)}M` : `$${(v/1000).toFixed(0)}K`}
                />
                <ZAxis dataKey="z" range={[30, 400]} />
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                {Array.from(new Set(scatterPoints.map(d => d.sector))).map(sec => (
                  <Scatter key={sec} name={sectorLabel(sec)} data={scatterPoints.filter(d => d.sector === sec)} fill={sectorColor(sec)} fillOpacity={0.75} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
              {Array.from(new Set(scatterPoints.map(d => d.sector))).map(sec => (
                <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sectorColor(sec) }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sectorLabel(sec)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Row 6: Tenders Closing by Month */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Tenders Closing by Month</h3>
            <p className={styles.chartSub}>All Tenders with Close Dates — Filter by Date Range</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className={styles.metricToggle}>
              {[{ label: '6M', months: 6 }, { label: '1Y', months: 12 }, { label: '2Y', months: 24 }, { label: 'All', months: null }].map(p => (
                <button key={p.label}
                  className={clsx(styles.toggleBtn, p.months === null && !dateFrom && !dateTo && styles.toggleBtnActive, p.months !== null && dateFrom && styles.toggleBtnActive)}
                  onClick={() => applyPreset(p.months)}
                >{p.label}</button>
              ))}
            </div>
            <input type="date" className={styles.formInput} style={{ width: 130, fontSize: 11, padding: '4px 8px', height: 30 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>→</span>
            <input type="date" className={styles.formInput} style={{ width: 130, fontSize: 11, padding: '4px 8px', height: 30 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <div className={styles.pill}>{(closingByMonth ?? []).reduce((s, d) => s + d.count, 0)} tenders</div>
          </div>
        </div>
        {closingByMonthLoading ? <Shimmer h={240} /> : !closingByMonth?.length ? <Empty label="No data for this date range" /> : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={closingByMonth} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={44}
                tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="count" name="Tenders" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 7: Top Sectors by Value + Top Departments */}
      <div className={styles.chartsRow2}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>Top Sectors by Contract Value</h3><p className={styles.chartSub}>Total Awarded Value Per Sector</p></div>
            <div className={styles.pill}>AusTender</div>
          </div>
          {sectorLoading ? <Shimmer h={280} /> : topSectors.length === 0 ? <Empty label="No sector value data" /> : (
            <div className={styles.topTable}>
              {topSectors.map((sector, i) => {
                const pct = (sector.total_value / maxValue) * 100;
                return (
                  <motion.div key={sector.name} className={styles.topRow} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div className={styles.topRank}>#{i + 1}</div>
                    <div className={styles.topSectorLabel}><span className={styles.topDot} style={{ background: sector.fill }} />{sector.label}</div>
                    <div className={styles.topBarWrap}><div className={styles.topBar} style={{ width: `${pct}%`, background: sector.fill }} /></div>
                    <div className={styles.topMeta}><span className={styles.topValue}>{formatCurrency(sector.total_value)}</span><span className={styles.topCount}>{formatNumber(sector.count)} contracts</span></div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>Top Departments by Spend</h3><p className={styles.chartSub}>Top 10 Agencies by Total Contract Value</p></div>
            <div className={styles.pill}><Building2 size={11} /> Top 10</div>
          </div>
          {deptLoading ? <Shimmer h={280} /> : !(deptData ?? []).length ? <Empty label="No department data" /> : (
            <div className={styles.topTable}>
              {(deptData ?? []).map((dept, i) => {
                const pct   = (dept.total_value / maxDeptVal) * 100;
                const color = DEPT_COLORS[i % DEPT_COLORS.length];
                return (
                  <motion.div key={dept.agency} className={styles.topRow} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <div className={styles.topRank}>#{i + 1}</div>
                    <div className={styles.topSectorLabel}><span className={styles.topDot} style={{ background: color }} /><span className={styles.deptName}>{dept.agency}</span></div>
                    <div className={styles.topBarWrap}><div className={styles.topBar} style={{ width: `${pct}%`, background: color }} /></div>
                    <div className={styles.topMeta}><span className={styles.topValue}>{formatCurrency(dept.total_value)}</span><span className={styles.topCount}>{formatNumber(dept.contract_count)} contracts</span></div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}