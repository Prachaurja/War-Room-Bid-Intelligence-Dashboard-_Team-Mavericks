import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download, FileText, BarChart3, Clock,
  CheckCircle2, TrendingUp, Database, RefreshCw, Eye,
} from 'lucide-react';
import { useOverviewStats, useSectorStats, useStateStats } from '../../hooks/useTenders';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { sectorLabel, sectorColor } from '../../utils/tender.utils';
import { useAuthStore } from '../../store/auth.store';
import styles from './ReportsPage.module.css';
import clsx from 'clsx';

const API_URL = import.meta.env.VITE_API_URL || '';

type ReportStatus = 'completed' | 'processing' | 'scheduled';

interface Report {
  id:          string;
  title:       string;
  description: string;
  type:        'sector' | 'regional' | 'value' | 'source' | 'custom';
  status:      ReportStatus;
  generated:   string;
  size:        string;
  records:     number;
}

const REPORTS: Report[] = [
  { id:'RPT-001', title:'AusTender GaPS & Queensland Tenders — Full Export',          description:'Complete Dataset of All Ingested Contracts from the Government Contracts Publishing System', type:'source',   status:'completed',  generated: new Date(Date.now()-2*3600000).toISOString(),  size:'4.2 MB', records:500 },
  { id:'RPT-002', title:'Sector Breakdown Report',               description:'Contract Volume and Value Analysis Across All Procurement Sectors',                          type:'sector',   status:'completed',  generated: new Date(Date.now()-6*3600000).toISOString(),  size:'1.1 MB', records:7   },
  { id:'RPT-003', title:'Regional Distribution Analysis',        description:'State-by-State Contract Distribution with Total Awarded Values',                            type:'regional', status:'completed',  generated: new Date(Date.now()-24*3600000).toISOString(), size:'0.8 MB', records:9   },
  { id:'RPT-004', title:'High-Value Contracts Report',           description:'Contracts Above $1M Sorted by Awarded Value — Top Procurement Opportunities',               type:'value',    status:'completed',  generated: new Date().toISOString(),                      size:'2.1 MB', records:0   },
  { id:'RPT-005', title:'Facility Management Sector Report',     description:'Targeted Analysis of Facility Management and Cleaning Contracts',                           type:'custom',   status:'scheduled',  generated: new Date(Date.now()+3600000).toISOString(),    size:'—',      records:0   },
];

const TYPE_COLORS: Record<string, string> = {
  sector:'#7C3AED', regional:'#3B82F6', value:'#F59E0B', source:'#10B981', custom:'#EC4899',
};
const TYPE_LABELS: Record<string, string> = {
  sector:'Sector', regional:'Regional', value:'Value', source:'Source', custom:'Custom',
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const config = {
    completed:  { icon: CheckCircle2, label:'Completed',  cls: styles.badgeCompleted  },
    processing: { icon: RefreshCw,    label:'Processing', cls: styles.badgeProcessing },
    scheduled:  { icon: Clock,        label:'Scheduled',  cls: styles.badgeScheduled  },
  }[status];
  return (
    <span className={clsx(styles.statusBadge, config.cls)}>
      <config.icon size={10} /> {config.label}
    </span>
  );
}

export default function ReportsPage() {
  const [activeType, setActiveType] = useState<string>('all');
  const { token } = useAuthStore();

  const { data: overview } = useOverviewStats();
  const { data: sectors  } = useSectorStats();
  const { data: states   } = useStateStats();

  // ── Server-side CSV download via backend ──────────────────
  const downloadFromBackend = async (endpoint: string, filename: string) => {
    try {
      const res = await fetch(`${API_URL}/reports/${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report download failed:', err);
    }
  };

  const exportSectorCSV    = () => downloadFromBackend('sector',     `warroom-sector-report-${new Date().toISOString().split('T')[0]}.csv`);
  const exportStateCSV     = () => downloadFromBackend('regional',   `warroom-regional-report-${new Date().toISOString().split('T')[0]}.csv`);
  const exportOverviewCSV  = () => downloadFromBackend('overview',   `warroom-overview-report-${new Date().toISOString().split('T')[0]}.csv`);
  const exportHighValueCSV = () => downloadFromBackend('high-value', `warroom-high-value-report-${new Date().toISOString().split('T')[0]}.csv`);

  // ── Route download by report type ─────────────────────────
  const handleDownload = (report: Report) => {
    switch (report.type) {
      case 'sector':   return exportSectorCSV();
      case 'regional': return exportStateCSV();
      case 'source':   return exportOverviewCSV();
      case 'value':    return exportHighValueCSV();
      case 'custom':   return exportSectorCSV();
    }
  };

  // ── Preview (unchanged — opens text in new tab) ───────────
  const handlePreview = (report: Report) => {
    const lines: string[] = [
      `╔══════════════════════════════════════════════════╗`,
    `  WAR ROOM — REPORT PREVIEW`,
      `  ${report.title}`,
      `  ID: ${report.id}  |  Generated: ${formatDate(report.generated)}`,
      `╚══════════════════════════════════════════════════╝`,
      '',
    ];
    if (report.type === 'sector' && sectors?.length) {
      lines.push('SECTOR BREAKDOWN');
      lines.push('─'.repeat(60));
      sectors.sort((a, b) => b.total_value - a.total_value).forEach((s, i) => {
        const label = sectorLabel(s.sector).padEnd(24);
        const count = String(s.count).padStart(4) + ' contracts';
        const value = formatCurrency(s.total_value).padStart(12);
        lines.push(`  ${i + 1}. ${label}  ${count}   ${value}`);
      });
    } else if (report.type === 'regional' && states?.length) {
      lines.push('REGIONAL DISTRIBUTION');
      lines.push('─'.repeat(60));
      states.sort((a, b) => b.count - a.count).forEach(s => {
        const state = (s.state ?? 'Unknown').padEnd(12);
        const count = String(s.count).padStart(4) + ' contracts';
        const value = formatCurrency(s.total_value).padStart(12);
        lines.push(`  ${state}  ${count}   ${value}`);
      });
    } else if (overview) {
      lines.push('OVERVIEW SUMMARY');
      lines.push('─'.repeat(60));
      lines.push(`  Total Tenders  : ${formatNumber(overview.total_tenders)}`);
      lines.push(`  Total Value    : ${formatCurrency(overview.total_value)}`);
      lines.push(`  Average Value  : ${formatCurrency(overview.avg_value)}`);
      lines.push('');
      lines.push('DATA SOURCES');
      lines.push('─'.repeat(60));
      Object.entries(overview.sources).forEach(([src, count]) => {
        lines.push(`  ${src.padEnd(20)} ${count} records`);
      });
    }
    lines.push('', '─'.repeat(60));
  lines.push('  Generated by War Room Bid Intelligence Platform');
    lines.push(`  ${new Date().toLocaleString('en-AU')}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const filteredReports = activeType === 'all' ? REPORTS : REPORTS.filter(r => r.type === activeType);

  const statCards = [
    { label:'Total Reports',       value:'5',                              sub:'Available Now',           icon:FileText,  gradient:'linear-gradient(135deg,#7C3AED,#4F46E5)' },
    { label:'Contracts Covered',   value:formatNumber(overview?.total_tenders), sub:'Across All Reports', icon:Database,  gradient:'linear-gradient(135deg,#3B82F6,#06B6D4)' },
    { label:'Total Value Tracked', value:formatCurrency(overview?.total_value), sub:'Combined Contract Value', icon:BarChart3, gradient:'linear-gradient(135deg,#10B981,#059669)' },
    { label:'Sectors Analysed',    value:String(sectors?.length ?? 0),    sub:'Procurement Categories',  icon:TrendingUp, gradient:'linear-gradient(135deg,#F59E0B,#EF4444)' },
  ];

  const quickExports = [
    { title:'Sector Analysis',      desc:`${sectors?.length ?? 0} sectors · Server-Generated CSV`,      icon:BarChart3,  color:'#7C3AED', action:exportSectorCSV,    ready:!!sectors?.length },
    { title:'Regional Report',      desc:`${states?.length ?? 0} states · Contract Distribution`,       icon:TrendingUp, color:'#3B82F6', action:exportStateCSV,     ready:!!states?.length  },
    { title:'Full Overview Export', desc:`${formatNumber(overview?.total_tenders)} contracts · All Metrics`, icon:Database, color:'#10B981', action:exportOverviewCSV, ready:!!overview       },
    { title:'High-Value Contracts', desc:'Real Tenders Above $1M · Sorted by Value',                    icon:FileText,   color:'#F59E0B', action:exportHighValueCSV, ready:true              },
  ];

  return (
    <div className={`${styles.page} page-enter`}>

      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Reports</h2>
          <p className={styles.headingSub}>Generate and Export Procurement Intelligence Reports</p>
        </div>
      </div>

      <div className={styles.statGrid}>
        {statCards.map((card, i) => (
          <motion.div key={card.label} className={styles.statCard}
            initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}>
            <div className={styles.statIcon} style={{ background: card.gradient }}>
              <card.icon size={16} />
            </div>
            <div>
              <p className={styles.statLabel}>{card.label}</p>
              <p className={styles.statValue}>{card.value ?? '—'}</p>
              <p className={styles.statSub}>{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Quick Exports</h3>
        <div className={styles.exportGrid}>
          {quickExports.map((item, i) => (
            <motion.div key={item.title} className={styles.exportCard}
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}>
              <div className={styles.exportCardIcon} style={{ background:`${item.color}18`, color:item.color }}>
                <item.icon size={20} />
              </div>
              <div className={styles.exportCardBody}>
                <h4 className={styles.exportCardTitle}>{item.title}</h4>
                <p className={styles.exportCardDesc}>{item.desc}</p>
              </div>
              <button className={styles.exportCardBtn} onClick={item.action} disabled={!item.ready}
                style={{ borderColor:`${item.color}40`, color:item.color, background:`${item.color}10` }}>
                <Download size={13} />
                {item.ready ? 'Export' : 'Loading…'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
