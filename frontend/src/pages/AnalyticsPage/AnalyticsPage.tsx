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
  Target, Users,
} from 'lucide-react';
import { useSectorStats, useStateStats, useOverviewStats } from '../../hooks/useTenders';
import {
  useTopDepartments,
  useStatusBreakdown, useClosingSoon,
  useWinWindow, useSectorStateHeatmap, useAgencyFrequency, useValueScatter,
  useSectorTreemap, useSectorStatusBreakdown,
  type ScatterPoint,
} from '../../hooks/useAnalytics';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { sectorLabel, sectorColor } from '../../utils/tender.utils';
import styles from './AnalyticsPage.module.css';
import clsx from 'clsx';
import { useMemo, useRef, useState, type ReactNode } from 'react';

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

const KNOWN_SECTORS = new Set([
  'facility_management',
  'construction',
  'cleaning',
  'it_services',
  'healthcare',
  'transportation',
  'utilities',
  'other',
]);

const DEPT_COLORS = [
  '#7C3AED','#3B82F6','#10B981','#F59E0B',
  '#EC4899','#06B6D4','#EF4444','#84CC16','#8B5CF6','#F97316',
];

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const barWidth = (value: number, max: number) =>
  `${Math.max(4, Math.min(100, max > 0 ? (value / max) * 100 : 0))}%`;

function heatColor(value: number, max: number): string {
  if (value === 0 || max === 0) return 'rgba(255,255,255,0.03)';
  const t = Math.min(value / max, 1);
  return `rgba(124,58,237,${0.08 + t * 0.82})`;
}

function heatTextColor(value: number, max: number): string {
  if (value === 0) return 'var(--text-dim)';
  return value > max * 0.45 ? '#fff' : 'var(--text-primary)';
}

// Local sector label map — guaranteed correct capitalisation
const SECTOR_LABEL_MAP: Record<string, string> = {
  facility_management: 'Facility Mgmt',
  construction:        'Construction',
  cleaning:            'Cleaning',
  it_services:         'IT Services',
  healthcare:          'Healthcare',
  transportation:      'Transportation',
  utilities:           'Utilities',
  other:               'Other',
};
const getSectorLabel = (sec: string): string =>
  SECTOR_LABEL_MAP[sec] ?? sec.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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

const ChartCard = ({
  children,
  delay = 0,
  defer = false,
}: {
  children: ReactNode;
  delay?: number;
  defer?: boolean;
}) => (
  <motion.div
    className={styles.chartCard}
    initial={{ opacity: 0 }}
    {...(defer
      ? {
          whileInView: { opacity: 1 },
          viewport: { once: true, amount: 0.18 },
        }
      : { animate: { opacity: 1 } })}
    transition={{ duration: 0.3, delay }}
  >
    {children}
  </motion.div>
);

// ── Page ──────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [activeMetric, setActiveMetric] = useState<'count' | 'value'>('count');
  const pageRef = useRef<HTMLDivElement>(null);

  // ── Data hooks ────────────────────────────────────────────
  const { data: sectorData,    isLoading: sectorLoading    } = useSectorStats();
  const { data: stateData,     isLoading: stateLoading     } = useStateStats();
  const { data: overview,      isLoading: overviewLoading  } = useOverviewStats();
  const { data: deptData,      isLoading: deptLoading      } = useTopDepartments(5);
  const { data: statusData,    isLoading: statusLoading    } = useStatusBreakdown();
  const { data: closingData,   isLoading: closingLoading   } = useClosingSoon();
  const { data: winWindow,     isLoading: winLoading        } = useWinWindow();
  const { data: heatmap,       isLoading: heatLoading       } = useSectorStateHeatmap();
  const { data: agencyFreq,    isLoading: agencyLoading     } = useAgencyFrequency(15);
  const { data: scatterData,   isLoading: scatterLoading    } = useValueScatter();
  const { data: treemapData,   isLoading: treemapLoading    } = useSectorTreemap();
  const { data: sectorStatus,  isLoading: sectorStatusLoading } = useSectorStatusBreakdown();

  // ── Derived ───────────────────────────────────────────────
  const sectorChartData = useMemo(() => (sectorData ?? [])
    .filter(d => d.sector && KNOWN_SECTORS.has(d.sector))
    .sort((a, b) => b.count - a.count)
    .map(d => ({ name: d.sector, label: sectorLabel(d.sector), count: d.count, total_value: d.total_value, fill: sectorColor(d.sector) })), [sectorData]);

  const stateChartData = useMemo(() => (stateData ?? [])
    .filter(d => d.state && d.state !== 'Unknown')
    .sort((a, b) => b.count - a.count).slice(0, 9)
    .map(d => ({ state: d.state, count: d.count, total_value: d.total_value, fill: STATE_COLORS[d.state] ?? '#6B7280' })), [stateData]);

  const topSectors = useMemo(() => [...sectorChartData].sort((a, b) => b.total_value - a.total_value).slice(0, 5), [sectorChartData]);
  const statusChartData = useMemo(() => (statusData ?? []).map(s => ({ ...s, label: s.status.charAt(0).toUpperCase() + s.status.slice(1), fill: STATUS_COLORS[s.status] ?? '#6B7280' })), [statusData]);

  const maxValue   = topSectors[0]?.total_value ?? 1;
  const maxDeptVal = (deptData ?? [])[0]?.total_value ?? 1;
  const maxAgency  = (agencyFreq ?? [])[0]?.count ?? 1;
  const isLoading  = sectorLoading || stateLoading || overviewLoading;

  const scatterPoints = useMemo(() => (scatterData ?? []).map(d => ({
    ...d,
    x: d.close_date ? new Date(d.close_date).getTime() : 0,
    y: d.contract_value,
    z: Math.min(Math.sqrt(d.contract_value / 10000), 20) + 4,
  })).filter(d => d.x > 0), [scatterData]);

  const heatMax = useMemo(() => heatmap
    ? Math.max(1, ...((heatmap.sectors ?? []).flatMap(sec => (heatmap.states ?? []).map(st => heatmap.matrix?.[sec]?.[st] ?? 0))))
    : 1, [heatmap]);

  const kpis = [
    { label: 'Total Contracts', value: formatNumber(overview?.total_tenders), sub: 'All Time',          icon: BarChart3,  gradient: 'linear-gradient(135deg,#7C3AED,#4F46E5)' },
    { label: 'Total Value',     value: formatCurrency(overview?.total_value),  sub: 'Combined Value',    icon: TrendingUp, gradient: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
    { label: 'Average Value',   value: formatCurrency(overview?.avg_value),    sub: 'Per Contract',      icon: Activity,   gradient: 'linear-gradient(135deg,#10B981,#059669)' },
    { label: 'Active Bids',     value: formatNumber(overview?.active_tenders ?? 0), sub: 'Open Right Now', icon: Layers,  gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
  ];

  const handleExport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const generatedAt = new Date();
    const sectorMax = Math.max(1, ...topSectors.map((sector) => sector.total_value));
    const deptMax = Math.max(1, ...(deptData ?? []).map((dept) => dept.total_value));
    const stateMax = Math.max(1, ...stateChartData.map((state) => state.count));
    const stateValueMax = Math.max(1, ...stateChartData.map((state) => state.total_value));
    const statusTotal = Math.max(1, (statusData ?? []).reduce((sum, item) => sum + item.count, 0));
    const agencyMax = Math.max(1, ...(agencyFreq ?? []).map((agency) => agency.count));
    const hasScatterPoints = scatterPoints.length > 0;
    const scatterXMin = hasScatterPoints ? Math.min(...scatterPoints.map((point) => point.x)) : 0;
    const scatterXMax = hasScatterPoints ? Math.max(...scatterPoints.map((point) => point.x)) : 1;
    const scatterYMax = Math.max(1, ...scatterPoints.map((point) => point.y));
    const scatterXRange = Math.max(1, scatterXMax - scatterXMin);

    const kpiHtml = kpis.map((kpi) => `
      <section class="kpi">
        <span>${escapeHtml(kpi.label)}</span>
        <strong>${escapeHtml(kpi.value)}</strong>
        <small>${escapeHtml(kpi.sub)}</small>
      </section>
    `).join('');

    const sectorRows = topSectors.map((sector, index) => `
      <div class="bar-row">
        <div class="bar-meta"><strong>#${index + 1} ${escapeHtml(sector.label)}</strong><span>${formatCurrency(sector.total_value)} - ${formatNumber(sector.count)} contracts</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${barWidth(sector.total_value, sectorMax)}; background:${sector.fill}"></div></div>
      </div>
    `).join('');

    const departmentRows = (deptData ?? []).map((dept, index) => `
      <div class="bar-row">
        <div class="bar-meta"><strong>#${index + 1} ${escapeHtml(dept.agency)}</strong><span>${formatCurrency(dept.total_value)} - ${formatNumber(dept.contract_count)} contracts</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${barWidth(dept.total_value, deptMax)}; background:${DEPT_COLORS[index % DEPT_COLORS.length]}"></div></div>
      </div>
    `).join('');

    const stateRows = stateChartData.slice(0, 8).map((state) => `
      <div class="bar-row compact">
        <div class="bar-meta"><strong>${escapeHtml(state.state)}</strong><span>${formatNumber(state.count)} tenders - ${formatCurrency(state.total_value)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${barWidth(state.count, stateMax)}; background:${state.fill}"></div></div>
      </div>
    `).join('');

    const statusRows = (statusData ?? []).map((status) => {
      const fill = STATUS_COLORS[status.status] ?? '#6B7280';
      return `
        <div class="status-pill">
          <span class="status-dot" style="background:${fill}"></span>
          <strong>${escapeHtml(status.status)}</strong>
          <span>${formatNumber(status.count)}</span>
          <div class="status-track"><div style="width:${barWidth(status.count, statusTotal)}; background:${fill}"></div></div>
        </div>
      `;
    }).join('');

    const closingRows = (closingData?.buckets ?? []).map((bucket) => `
      <div class="metric-chip" style="border-color:${bucket.color}55; background:${bucket.color}12">
        <strong style="color:${bucket.color}">${formatNumber(bucket.count)}</strong>
        <span>${escapeHtml(bucket.label)}</span>
      </div>
    `).join('');

    const winWindowRows = (winWindow?.data ?? []).map((month: Record<string, string | number>) => {
      const total = (winWindow?.sectors ?? []).reduce((sum: number, sector: string) => sum + Number(month[sector] ?? 0), 0);
      const segments = (winWindow?.sectors ?? []).map((sector: string) => {
        const value = Number(month[sector] ?? 0);
        if (value <= 0) return '';
        return `<span title="${escapeHtml(getSectorLabel(sector))}: ${formatNumber(value)}" style="width:${barWidth(value, total)}; background:${sectorColor(sector)}"></span>`;
      }).join('');
      return `
        <div class="stack-row">
          <strong>${escapeHtml(month.month)}</strong>
          <div class="stack-track">${segments || '<span style="width:100%; background:#e5e7eb"></span>'}</div>
          <em>${formatNumber(total)}</em>
        </div>
      `;
    }).join('');

    const heatmapRows = heatmap?.sectors?.map((sector) => `
      <tr>
        <th><span style="background:${sectorColor(sector)}"></span>${escapeHtml(getSectorLabel(sector))}</th>
        ${(heatmap.states ?? []).map((state) => {
          const value = heatmap.matrix?.[sector]?.[state] ?? 0;
          return `<td style="background:${heatColor(value, heatMax)}; color:${heatTextColor(value, heatMax)}">${value > 0 ? formatNumber(value) : '-'}</td>`;
        }).join('')}
      </tr>
    `).join('');

    const agencyRows = (agencyFreq ?? []).slice(0, 10).map((agency, index) => `
      <div class="bar-row compact">
        <div class="bar-meta"><strong>#${index + 1} ${escapeHtml(agency.agency)}</strong><span>${formatNumber(agency.count)} tenders</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${barWidth(agency.count, agencyMax)}; background:${DEPT_COLORS[index % DEPT_COLORS.length]}"></div></div>
      </div>
    `).join('');

    const stateValueRows = stateChartData.slice(0, 8).map((state) => `
      <div class="bar-row compact">
        <div class="bar-meta"><strong>${escapeHtml(state.state)}</strong><span>${formatCurrency(state.total_value)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${barWidth(state.total_value, stateValueMax)}; background:${state.fill}"></div></div>
      </div>
    `).join('');

    const scatterRows = scatterPoints.slice(0, 140).map((point) => {
      const left = ((point.x - scatterXMin) / scatterXRange) * 94 + 3;
      const bottom = (point.y / scatterYMax) * 82 + 8;
      const size = Math.max(5, Math.min(15, point.z));
      return `
        <span
          class="scatter-dot"
          title="${escapeHtml(point.title)}"
          style="left:${left}%; bottom:${bottom}%; width:${size}px; height:${size}px; background:${sectorColor(point.sector)}"
        ></span>
      `;
    }).join('');

    const ringRows = (sectorStatus ?? []).map((sector) => {
      const openPct = sector.total > 0 ? Math.round((sector.open / sector.total) * 100) : 0;
      const upcomingPct = sector.total > 0 ? Math.round((sector.upcoming / sector.total) * 100) : 0;
      return `
        <div class="ring-card">
          <div class="ring" style="--open:${openPct}; --upcoming:${upcomingPct}; --color:${sectorColor(sector.sector)}">
            <strong>${formatNumber(sector.total)}</strong>
          </div>
          <span>${escapeHtml(getSectorLabel(sector.sector))}</span>
        </div>
      `;
    }).join('');

    const treemapTotal = Math.max(1, ...(treemapData ?? []).map((item) => item.count));
    const treemapRows = (treemapData ?? []).slice(0, 18).map((item) => `
      <div class="tile" style="flex:${Math.max(8, (item.count / treemapTotal) * 45)} 0 120px; border-color:${sectorColor(item.sector)}66; background:${sectorColor(item.sector)}18">
        <strong>${escapeHtml(getSectorLabel(item.sector))}</strong>
        <span>${escapeHtml(item.state)} - ${formatNumber(item.count)}</span>
      </div>
    `).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Analytics Report</title>
          <style>
            @page { size: A4 portrait; margin: 7mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f6f7fb;
              color: #111827;
              font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report {
              min-height: 100vh;
              padding: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              align-items: flex-start;
              padding-bottom: 10px;
              border-bottom: 1px solid #dbe2ea;
            }
            h1 { margin: 0; font-size: 23px; letter-spacing: -0.04em; }
            .subtitle { margin: 4px 0 0; color: #64748b; font-size: 12px; }
            .date { color: #7c3aed; font-size: 11px; text-align: right; white-space: nowrap; }
            .kpis {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin: 10px 0;
            }
            .kpi, .card {
              background: #fff;
              border: 1px solid #dbe2ea;
              border-radius: 14px;
            }
            .kpi { padding: 10px; min-height: 76px; }
            .kpi span { display: block; color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; }
            .kpi strong { display: block; margin-top: 6px; font-size: 19px; letter-spacing: -0.04em; }
            .kpi small { display: block; margin-top: 2px; color: #94a3b8; font-size: 10px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: start; }
            .card { padding: 11px; break-inside: avoid-page; page-break-inside: avoid; margin-bottom: 8px; }
            .card.wide { grid-column: 1 / -1; }
            .card h2 { margin: 0 0 3px; font-size: 14px; }
            .card p { margin: 0 0 9px; color: #64748b; font-size: 10.5px; }
            .bar-row { margin-top: 8px; }
            .bar-row.compact { margin-top: 6px; }
            .bar-meta { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; font-size: 10.5px; }
            .bar-meta strong { color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .bar-meta span { color: #64748b; white-space: nowrap; }
            .bar-track { height: 7px; margin-top: 5px; border-radius: 999px; background: #edf1f6; overflow: hidden; }
            .bar-fill { height: 100%; border-radius: inherit; }
            .status-grid, .chip-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
            .status-pill { padding: 9px; border-radius: 12px; background: #f8fafc; border: 1px solid #e5eaf1; }
            .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
            .status-pill strong { text-transform: capitalize; margin-right: 8px; }
            .status-pill span:last-of-type { color: #475569; font-size: 11px; }
            .status-track { height: 5px; border-radius: 99px; background: #e5eaf1; overflow: hidden; margin-top: 7px; }
            .status-track div { height: 100%; border-radius: inherit; }
            .metric-chip { padding: 9px; border-radius: 12px; border: 1px solid; text-align: center; }
            .metric-chip strong { display:block; font-size: 22px; }
            .metric-chip span { font-size: 10px; color: #64748b; }
            .stack-row { display: grid; grid-template-columns: 58px minmax(0, 1fr) 36px; gap: 8px; align-items: center; margin-top: 8px; font-size: 10.5px; }
            .stack-row strong { color: #111827; }
            .stack-row em { color: #64748b; font-style: normal; text-align: right; }
            .stack-track { display: flex; height: 18px; overflow: hidden; border-radius: 999px; background: #edf1f6; }
            .stack-track span { height: 100%; min-width: 2px; }
            .heat-wrap { overflow: hidden; }
            .heat { width: 100%; border-collapse: separate; border-spacing: 2px; table-layout: fixed; }
            .heat th { text-align: left; font-size: 9px; color: #334155; font-weight: 700; white-space: nowrap; }
            .heat th span { display:inline-block; width:7px; height:7px; border-radius:2px; margin-right:4px; }
            .heat td { height: 24px; border-radius: 5px; text-align:center; font-size: 9px; font-weight: 800; }
            .scatter { position: relative; height: 205px; border: 1px solid #e5eaf1; border-radius: 12px; background: linear-gradient(#f8fafc, #fff); overflow: hidden; }
            .scatter::before { content: ""; position: absolute; inset: 12px; background-image: linear-gradient(#e5eaf1 1px, transparent 1px), linear-gradient(90deg, #e5eaf1 1px, transparent 1px); background-size: 100% 40px, 90px 100%; opacity: .8; }
            .scatter-dot { position: absolute; transform: translate(-50%, 50%); border-radius: 999px; border: 1px solid #fff; box-shadow: 0 1px 5px rgba(15,23,42,.22); }
            .ring-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
            .ring-card { display:flex; flex-direction:column; align-items:center; gap:5px; padding:8px; border:1px solid #e5eaf1; border-radius:12px; background:#f8fafc; }
            .ring { width:54px; height:54px; border-radius:999px; display:grid; place-items:center; background: conic-gradient(var(--color) calc(var(--open) * 1%), #f59e0b 0 calc((var(--open) + var(--upcoming)) * 1%), #94a3b8 0); position:relative; }
            .ring::after { content:""; position:absolute; inset:9px; border-radius:inherit; background:#fff; }
            .ring strong { position:relative; z-index:1; font-size:12px; color:#111827; }
            .ring-card span { font-size:9.5px; text-align:center; color:#475569; font-weight:700; }
            .tile-wrap { display:flex; flex-wrap:wrap; gap:5px; }
            .tile { min-height:50px; border:1px solid; border-radius:10px; padding:7px; }
            .tile strong { display:block; font-size:10px; color:#111827; }
            .tile span { display:block; margin-top:4px; font-size:9px; color:#64748b; }
            @media print {
              .card, .kpi { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <main class="report">
            <header class="header">
              <div>
                <h1>Analytics Report</h1>
                <p class="subtitle">Australian Government Procurement Intelligence</p>
              </div>
              <div class="date">Generated ${escapeHtml(generatedAt.toLocaleString('en-AU'))}</div>
            </header>
            <section class="kpis">${kpiHtml}</section>
            <section class="grid">
              <article class="card"><h2>Tender Status</h2><p>Open, closed and upcoming tender mix</p><div class="status-grid">${statusRows || '<p>No status data</p>'}</div></article>
              <article class="card"><h2>Closing Soon</h2><p>Active tenders by days remaining</p><div class="chip-grid">${closingRows || '<p>No deadline data</p>'}</div></article>
              <article class="card wide"><h2>Win Window - Next 90 Days</h2><p>Tenders closing this quarter by sector</p>${winWindowRows || '<p>No tenders closing in the next 90 days</p>'}</article>
              <article class="card wide"><h2>Sector x State Heatmap</h2><p>Tender activity by sector and state</p><div class="heat-wrap"><table class="heat"><tbody>${heatmapRows || '<tr><td>No heatmap data</td></tr>'}</tbody></table></div></article>
              <article class="card"><h2>Agency Frequency</h2><p>Top agencies by tender count</p>${agencyRows || '<p>No agency data</p>'}</article>
              <article class="card"><h2>State Distribution - Count</h2><p>Tender volume by Australian state</p>${stateRows || '<p>No state data</p>'}</article>
              <article class="card"><h2>State Distribution - Value</h2><p>Total value by Australian state</p>${stateValueRows || '<p>No state value data</p>'}</article>
              <article class="card"><h2>Sector Completion Rings</h2><p>Open, upcoming and closed breakdown per sector</p><div class="ring-grid">${ringRows || '<p>No sector status data</p>'}</div></article>
              <article class="card wide"><h2>Tender Value Scatter</h2><p>Upcoming tenders with value, plotted by close date and contract value</p><div class="scatter">${scatterRows || '<p>No upcoming tenders with contract value</p>'}</div></article>
              <article class="card wide"><h2>Sector x State Treemap</h2><p>Tender volume by sector and state</p><div class="tile-wrap">${treemapRows || '<p>No treemap data</p>'}</div></article>
              <article class="card"><h2>Top Sectors by Contract Value</h2><p>Top 5 sectors ranked by awarded value</p>${sectorRows || '<p>No sector data</p>'}</article>
              <article class="card"><h2>Top Departments by Spend</h2><p>Top 5 agencies ranked by total contract value</p>${departmentRows || '<p>No department data</p>'}</article>
            </section>
          </main>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 250);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  void handleExport;

  const handleFullPageExport = () => {
    const reportNode = pageRef.current;
    if (!reportNode) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const stylesheets = Array.from(
      document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style'),
    ).map((node) => node.outerHTML).join('\n');
    const theme = 'light';
    const colorScheme = 'light';
    const reportWidth = Math.ceil(reportNode.getBoundingClientRect().width || 1300);
    const framePadding = 24;
    const frameWidth = reportWidth + framePadding * 2;
    const printScale = Math.min(1, 700 / frameWidth);
    const clonedReport = reportNode.cloneNode(true) as HTMLElement;
    clonedReport.style.width = `${reportWidth}px`;
    clonedReport.style.maxWidth = 'none';
    clonedReport.querySelectorAll('button').forEach((button) => button.remove());
    const stateCountMax = Math.max(1, ...stateChartData.map((state) => state.count));
    const stateValueMax = Math.max(1, ...stateChartData.map((state) => state.total_value));
    const stateDistributionPrint = stateChartData.map((state) => `
      <div class="printStateRow">
        <span class="printStateName">${escapeHtml(state.state)}</span>
        <div class="printStateBars">
          <div class="printStateMetric">
            <span>Count</span>
            <div class="printStateTrack"><div style="width:${barWidth(state.count, stateCountMax)}; background:${state.fill}"></div></div>
            <strong>${formatNumber(state.count)}</strong>
          </div>
          <div class="printStateMetric">
            <span>Value</span>
            <div class="printStateTrack"><div style="width:${barWidth(state.total_value, stateValueMax)}; background:${state.fill}"></div></div>
            <strong>${formatCurrency(state.total_value)}</strong>
          </div>
        </div>
      </div>
    `).join('');

    const html = `
      <!doctype html>
      <html data-theme="${theme}">
        <head>
          <title>Analytics Report</title>
          ${stylesheets}
          <style>
            @page { size: A4 portrait; margin: 10mm 8mm; }
            * { box-sizing: border-box; }
            html { color-scheme: ${colorScheme}; background: #fff; }
            body {
              margin: 0;
              background: #fff;
              color: var(--text-primary);
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .printViewport {
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              padding: 18px 0;
              background: #fff;
            }
            .printShell {
              width: ${frameWidth}px;
              max-width: none;
              margin: 0;
              padding: 0;
              zoom: ${printScale};
            }
            .printFrame {
              width: ${frameWidth}px;
              overflow: visible;
              border: 0;
              outline: 0;
              border-radius: 24px;
              background: var(--card-bg);
              padding: ${framePadding}px;
              box-shadow:
                inset 0 0 0 1px var(--card-border),
                0 18px 60px rgba(15, 23, 42, 0.08);
            }
            .printHeader {
              display: flex;
              align-items: flex-end;
              justify-content: space-between;
              gap: 16px;
              margin: 18px 18px 12px;
              padding-bottom: 10px;
              border-bottom: 1px solid var(--border);
            }
            .printHeader h1 {
              margin: 0;
              font-size: 24px;
              letter-spacing: -0.04em;
            }
            .printHeader p {
              margin: 4px 0 0;
              color: var(--text-dim);
              font-size: 12px;
            }
            .printDate {
              color: var(--accent-lighter);
              font-size: 12px;
              white-space: nowrap;
            }
            .analyticsPrintRoot,
            .analyticsPrintRoot > * {
              max-width: none !important;
              width: ${reportWidth}px !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            .analyticsPrintRoot * {
              opacity: 1 !important;
              animation: none !important;
            }
            .analyticsPrintRoot [class*="pageHeader"] {
              display: none !important;
            }
            .analyticsPrintRoot [class*="chartCard"],
            .analyticsPrintRoot [class*="kpiCard"] {
              box-shadow: none !important;
            }
            .analyticsPrintRoot [class*="kpiCard"] {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .analyticsPrintRoot [class*="chartCard"] {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .analyticsPrintRoot [class*="chartsRow2"] {
              align-items: stretch;
            }
            .analyticsPrintRoot .recharts-responsive-container {
              overflow: visible !important;
            }
            .analyticsPrintRoot .recharts-wrapper,
            .analyticsPrintRoot .recharts-surface {
              overflow: visible !important;
            }
            .analyticsPrintRoot [class*="topTable"] {
              gap: 2px !important;
            }
            .analyticsPrintRoot [class*="topRow"] {
              padding-top: 4px !important;
              padding-bottom: 4px !important;
            }
            .analyticsPrintRoot td {
              color: var(--text-primary) !important;
              text-shadow: none !important;
            }
            .analyticsPrintRoot td[title*=": 0"] {
              color: var(--text-dim) !important;
            }
            .printStateBothModes {
              width: ${reportWidth}px;
              max-width: ${reportWidth}px;
              margin-top: 10px;
              padding: 12px;
              border: 1px solid var(--card-border);
              border-radius: var(--radius-lg);
              background: var(--card-bg);
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .printStateBothModes h2 {
              margin: 0;
              font-size: 15px;
              color: var(--text-primary);
              white-space: nowrap;
            }
            .printStateBothModes p {
              margin: 3px 0 10px;
              font-size: 12px;
              color: var(--text-dim);
            }
            .printStateRow {
              display: grid;
              grid-template-columns: 64px minmax(0, 1fr);
              gap: 10px;
              align-items: center;
              padding: 6px 0;
              border-top: 1px solid var(--border);
            }
            .printStateRow:first-of-type {
              border-top: 0;
            }
            .printStateName {
              font-size: 12px;
              font-weight: 700;
              color: var(--text-primary);
            }
            .printStateBars {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .printStateMetric {
              display: grid;
              grid-template-columns: 42px minmax(0, 1fr) 76px;
              gap: 8px;
              align-items: center;
              font-size: 11px;
              color: var(--text-dim);
            }
            .printStateMetric strong {
              color: var(--text-primary);
              text-align: right;
              font-variant-numeric: tabular-nums;
            }
            .printStateTrack {
              height: 7px;
              border-radius: 99px;
              background: var(--bg-elevated);
              overflow: hidden;
            }
            .printStateTrack div {
              height: 100%;
              border-radius: inherit;
            }
            .analyticsPrintRoot svg {
              max-width: none !important;
            }
            @media print {
              .printViewport {
                min-height: auto;
                padding: 0;
                display: block;
                background: #fff;
              }
              .printShell {
                margin: 0 auto;
              }
              .printShell { padding: 0; }
              .printFrame {
                box-shadow: inset 0 0 0 1px var(--card-border);
                border-radius: 18px;
                -webkit-box-decoration-break: clone;
                box-decoration-break: clone;
                margin-top: 8px;
              }
              .analyticsPrintRoot [class*="kpiGrid"] {
                display: grid !important;
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
              }
              .analyticsPrintRoot [class*="chartsRow2"] {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 16px !important;
              }
              .analyticsPrintRoot [class*="pieWrap"] {
                display: flex !important;
                flex-direction: row !important;
              }
              .analyticsPrintRoot [class*="chartCard"],
              .analyticsPrintRoot [class*="kpiCard"] {
                width: auto !important;
                max-width: none !important;
              }
              .analyticsPrintRoot [class*="chartCard"] {
                margin-top: 14px !important;
              }
              .analyticsPrintRoot [class*="chartsRow2"] [class*="chartCard"] {
                margin-top: 0 !important;
              }
              .printStateBothModes {
                width: ${reportWidth}px !important;
                max-width: ${reportWidth}px !important;
                margin-top: 18px !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="printViewport">
            <main class="printShell">
              <div class="printFrame">
                <header class="printHeader">
                  <div>
                    <h1>Analytics Report</h1>
                    <p>Full dashboard export with all visible Analytics diagrams</p>
                  </div>
                  <div class="printDate">Generated ${new Date().toLocaleString('en-AU')}</div>
                </header>
                <section class="analyticsPrintRoot">${clonedReport.outerHTML}</section>
                <section class="printStateBothModes">
                  <h2>State Distribution: Count and Value</h2>
                  <p>Both modes are included for PDF export.</p>
                  ${stateDistributionPrint || '<p>No state distribution data</p>'}
                </section>
              </div>
            </main>
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => window.print(), 800);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  void handleFullPageExport;

  return (
    <div ref={pageRef} className={`${styles.page} page-enter`}>

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Analytics</h2>
          <p className={styles.headingSub}>Deep Dive Analytics into Australian Government Procurement Data</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostBtn}><Filter size={13} /> Filter</button>
          <button className={styles.ghostBtn} onClick={handleFullPageExport}><Download size={13} /> Export PDF</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} className={styles.kpiCard}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
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
        <ChartCard delay={0.08}>
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
                  <Tooltip formatter={(v) => formatNumber(Number(v ?? 0))} />
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
        </ChartCard>

        <ChartCard delay={0.12}>
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
        </ChartCard>
      </div>

      {/* Row 2: Win Window */}
      <ChartCard delay={0.16}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Win Window — Next 90 Days</h3>
            <p className={styles.chartSub}>Tenders Closing This Quarter by Sector — Focus Your Bid Efforts Here</p>
          </div>
          <div className={styles.pill}>
            <Target size={11} /> Next 90 days
          </div>
        </div>
        {winLoading ? <Shimmer h={260} /> : !winWindow?.data?.length ? <Empty label="No tenders closing in the next 90 days" /> : (
          <div>
            {/* Month summary cards */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              {winWindow.data.map((month: Record<string, string | number>) => {
                const total = (winWindow.sectors ?? []).reduce((s: number, sec: string) => s + ((month[sec] as number) ?? 0), 0);
                return (
                  <div key={String(month.month)} style={{
                    flex: 1, background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 16px', textAlign: 'center'
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: '0 0 4px' }}>{String(month.month)}</p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{total}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '2px 0 0' }}>tenders closing</p>
                  </div>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={winWindow.data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                {(winWindow.sectors ?? []).map((sec: string, i: number) => (
                  <Bar key={sec} dataKey={sec} name={getSectorLabel(sec)} stackId="win"
                    fill={sectorColor(sec)} maxBarSize={80}
                    radius={i === (winWindow.sectors.length - 1) ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 14 }}>
              {(winWindow.sectors ?? []).map((sec: string) => {
                const total = winWindow.data.reduce((s: number, m: Record<string, string | number>) => s + ((m[sec] as number) ?? 0), 0);
                return (
                  <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 99,
                    background: sectorColor(sec) + '15',
                    border: `1px solid ${sectorColor(sec)}30` }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: sectorColor(sec), flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{getSectorLabel(sec)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sectorColor(sec) }}>{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ChartCard>

      {/* Row 3: Sector × State Heatmap */}
      <ChartCard defer>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Sector × State Heatmap</h3>
            <p className={styles.chartSub}>Tender Activity by Sector and State — Darker = More Tenders</p>
          </div>
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
                          style={{ background: heatColor(val, heatMax), borderRadius: 6, textAlign: 'center', padding: '9px 4px', paddingBottom: 3, fontSize: 11, fontWeight: val > 0 ? 800 : 500, color: heatTextColor(val, heatMax), textShadow: val > 0 ? '0 1px 2px rgba(255,255,255,0.35)' : 'none' }}>
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
      </ChartCard>

      {/* Row 4: Agency Frequency + State bar */}
      <div className={styles.chartsRow2}>
        <ChartCard defer>
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
                    <div style={{ flex: 1, height: 5, background: 'var(--bg-overlay)', borderRadius: 4, overflow: 'hidden' }}>
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
        </ChartCard>

        <ChartCard defer>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>State Distribution</h3><p className={styles.chartSub}>Contract Volume by Australian State</p></div>
            <div className={styles.metricToggle}>
              <button className={clsx(styles.toggleBtn, activeMetric === 'count' && styles.toggleBtnActive)} onClick={() => setActiveMetric('count')}>Count</button>
              <button className={clsx(styles.toggleBtn, activeMetric === 'value' && styles.toggleBtnActive)} onClick={() => setActiveMetric('value')}>Value</button>
            </div>
          </div>
          {stateLoading ? <Shimmer h={300} /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stateChartData} margin={{ top: 4, right: 8, bottom: 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="state" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} width={76} />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey={activeMetric === 'count' ? 'count' : 'total_value'} name={activeMetric === 'count' ? 'Contracts' : 'Value'} radius={[5, 5, 0, 0]} maxBarSize={36}>
                  {stateChartData.map(e => <Cell key={e.state} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 5: Tender Value Scatter */}
      <ChartCard defer>
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
      </ChartCard>

      {/* Row 6: Radial Sector Completion */}
      <ChartCard defer>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Sector Completion Rings</h3>
            <p className={styles.chartSub}>Open · Upcoming · Closed Breakdown Per Sector</p>
          </div>
          <div className={styles.pill}>All Sectors</div>
        </div>
        {sectorStatusLoading ? <Shimmer h={280} /> : !sectorStatus?.length ? <Empty label="No sector data" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, padding: '8px 0' }}>
            {sectorStatus.map(s => {
              const openPct     = s.total > 0 ? (s.open / s.total) * 100 : 0;
              const upcomingPct = s.total > 0 ? (s.upcoming / s.total) * 100 : 0;
              const closedPct   = s.total > 0 ? (s.closed / s.total) * 100 : 0;
              const r = 38;
              const circ = 2 * Math.PI * r;
              const openDash     = (openPct / 100) * circ;
              const upcomingDash = (upcomingPct / 100) * circ;
              const closedDash   = (closedPct / 100) * circ;
              const openOffset     = 0;
              const upcomingOffset = -openDash;
              const closedOffset   = -(openDash + upcomingDash);
              return (
                <div key={s.sector} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 8px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  {/* Ring */}
                  <div style={{ position: 'relative', width: 96, height: 96 }}>
                    <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                      {/* Closed — grey */}
                      <circle cx="48" cy="48" r={r} fill="none" stroke="#6B7280" strokeWidth="10"
                        strokeDasharray={`${closedDash} ${circ - closedDash}`}
                        strokeDashoffset={closedOffset} strokeLinecap="butt" />
                      {/* Upcoming — amber */}
                      <circle cx="48" cy="48" r={r} fill="none" stroke="#F59E0B" strokeWidth="10"
                        strokeDasharray={`${upcomingDash} ${circ - upcomingDash}`}
                        strokeDashoffset={upcomingOffset} strokeLinecap="butt" />
                      {/* Open — sector colour */}
                      <circle cx="48" cy="48" r={r} fill="none" stroke={sectorColor(s.sector)} strokeWidth="10"
                        strokeDasharray={`${openDash} ${circ - openDash}`}
                        strokeDashoffset={openOffset} strokeLinecap="butt" />
                    </svg>
                    {/* Centre label */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{s.total}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>total</span>
                    </div>
                  </div>
                  {/* Sector name */}
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {getSectorLabel(s.sector)}
                  </span>
                  {/* Mini stats */}
                  <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
                    <span style={{ color: sectorColor(s.sector) }}>{s.open} Open</span>
                    <span style={{ color: 'var(--text-dim)' }}>·</span>
                    <span style={{ color: '#F59E0B' }}>{s.upcoming} Upcoming</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      {/* Row 7: Treemap */}
      <ChartCard defer>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Sector × State Treemap</h3>
            <p className={styles.chartSub}>Tender Volume by Sector and State — Area = Count</p>
          </div>
          <div className={styles.pill}>All States</div>
        </div>
        {treemapLoading ? <Shimmer h={320} /> : !treemapData?.length ? <Empty label="No treemap data" /> : (() => {
          // Build nested structure: sector → states
          const sectors: Record<string, {state: string; count: number}[]> = {};
          (treemapData ?? []).forEach(d => {
            if (!sectors[d.sector]) sectors[d.sector] = [];
            sectors[d.sector].push({ state: d.state, count: d.count });
          });
          const total = (treemapData ?? []).reduce((s, d) => s + d.count, 0);

          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 300 }}>
              {Object.entries(sectors).map(([sec, states]) => {
                const secTotal = states.reduce((s, d) => s + d.count, 0);
                const secPct   = total > 0 ? (secTotal / total) * 100 : 0;
                return (
                  <div key={sec} style={{
                    flex: `${secPct} 0 ${Math.max(secPct, 8)}%`,
                    minWidth: 60,
                    background: sectorColor(sec) + '15',
                    border: `2px solid ${sectorColor(sec)}40`,
                    borderRadius: 10,
                    padding: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    overflow: 'hidden',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: sectorColor(sec), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getSectorLabel(sec)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{secTotal}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                      {states.sort((a, b) => b.count - a.count).slice(0, 6).map(st => (
                        <div key={st.state} title={`${st.state}: ${st.count}`}
                          style={{
                            background: sectorColor(sec) + '30',
                            border: `1px solid ${sectorColor(sec)}50`,
                            borderRadius: 4,
                            padding: '2px 5px',
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            gap: 3,
                            alignItems: 'center',
                          }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{st.state}</span>
                          <span>{st.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </ChartCard>

      {/* Row 7: Top Sectors by Value + Top Departments */}
      <div className={styles.chartsRow2}>
        <ChartCard defer>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>Top Sectors by Contract Value</h3><p className={styles.chartSub}>Total Awarded Value Per Sector</p></div>
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
        </ChartCard>

        <ChartCard defer>
          <div className={styles.chartHeader}>
            <div><h3 className={styles.chartTitle}>Top Departments by Spend</h3><p className={styles.chartSub}>Top 5 Agencies by Total Contract Value</p></div>
            <div className={styles.pill}><Building2 size={11} /> Top 5</div>
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
        </ChartCard>
      </div>

    </div>
  );
}
