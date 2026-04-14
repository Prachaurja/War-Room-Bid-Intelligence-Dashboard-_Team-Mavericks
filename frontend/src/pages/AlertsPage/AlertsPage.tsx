import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Search, X, Trash2, Check,
  CheckCheck, AlertCircle, TrendingUp, FileText,
  Info, Filter, Mail, MessageSquare, Smartphone,
  Target, Clock, MapPin, DollarSign, Save,
} from 'lucide-react';
import { formatAgo } from '../../utils/formatters';
import {
  useAlerts, useMarkRead, useMarkAllRead,
  useDeleteAlert, useSavedSearches, useCreateSavedSearch,
  useDeleteSavedSearch, useToggleSavedSearch,
} from '../../hooks/useAlerts';
import styles from './AlertsPage.module.css';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────────
type AlertPriority = 'high' | 'medium' | 'low';
type AlertType     = 'tender' | 'bid' | 'system' | 'report';

// ── Helpers ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<AlertType, { icon: React.ElementType; color: string; bg: string }> = {
  tender: { icon: Target,     color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
  bid:    { icon: TrendingUp, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  report: { icon: FileText,   color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  system: { icon: Info,       color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

const PRIORITY_CONFIG: Record<AlertPriority, { label: string; cls: string }> = {
  high:   { label: 'High',   cls: styles.priHigh   },
  medium: { label: 'Medium', cls: styles.priMedium  },
  low:    { label: 'Low',    cls: styles.priLow     },
};

const SECTOR_LABELS: Record<string, string> = {
  cleaning: 'Cleaning', construction: 'Construction',
  facility_management: 'Facility Mgmt', it_services: 'IT Services',
  healthcare: 'Healthcare', transportation: 'Transportation',
  other: 'Other', '': 'All Sectors',
};

// ── Create saved search modal ─────────────────────────────────
function CreateAlertModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', sector: '', state: '', minValue: '', maxValue: '', notifications: true,
  });
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const createSavedSearch = useCreateSavedSearch();

  const handleSave = async () => {
    if (!form.name.trim()) return;
    await createSavedSearch.mutateAsync({
      name:          form.name,
      sector:        form.sector || undefined,
      state:         form.state  || undefined,
      min_value:     Number(form.minValue) || 0,
      max_value:     Number(form.maxValue) || 0,
      notifications: form.notifications,
    });
    onClose();
  };

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        exit={{    opacity: 0, y: 16, scale: 0.97  }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.modalTitle}>Create Saved Search</h3>
            <p className={styles.modalSub}>Get Notified When Matching Tenders are Published</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Search Name</label>
            <input
              className={styles.formInput}
              placeholder="e.g. Facility Mgmt NSW $1M+"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Sector</label>
              <select className={styles.formSelect} value={form.sector} onChange={e => set('sector', e.target.value)}>
                {Object.entries(SECTOR_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>State</label>
              <select className={styles.formSelect} value={form.state} onChange={e => set('state', e.target.value)}>
                {['', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'ACT', 'NT', 'TAS'].map(s => (
                  <option key={s} value={s}>{s || 'All States'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Min Value (AUD)</label>
              <input type="number" className={styles.formInput} placeholder="500000"
                value={form.minValue} onChange={e => set('minValue', e.target.value)} />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Max Value (AUD)</label>
              <input type="number" className={styles.formInput} placeholder="10000000"
                value={form.maxValue} onChange={e => set('maxValue', e.target.value)} />
            </div>
          </div>

          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Enable Notifications</p>
              <p className={styles.toggleSub}>Get Alerted When New Matches are Found</p>
            </div>
            <button
              className={clsx(styles.toggle, form.notifications && styles.toggleOn)}
              onClick={() => set('notifications', !form.notifications)}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={createSavedSearch.isPending}
          >
            <Save size={13} />
            {createSavedSearch.isPending ? 'Saving…' : 'Save Search'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AlertsPage() {
  const [search,         setSearch]         = useState('');
  const [typeFilter,     setTypeFilter]     = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showModal,      setShowModal]      = useState(false);
  const [notifPrefs,     setNotifPrefs]     = useState({ email: true, sms: false, push: true });

  // ── Real data hooks ───────────────────────────────────────
  const { data: alertsData,   isLoading: alertsLoading   } = useAlerts();
  const { data: searchesData, isLoading: searchesLoading } = useSavedSearches();
  const markRead        = useMarkRead();
  const markAllRead     = useMarkAllRead();
  const deleteAlert     = useDeleteAlert();
  const deleteSavedSearch = useDeleteSavedSearch();
  const toggleSavedSearch = useToggleSavedSearch();

  const alerts   = useMemo(() => alertsData   ?? [], [alertsData]);
  const searches = useMemo(() => searchesData ?? [], [searchesData]);

  const unreadCount = alerts.filter(a => !a.read).length;

  // ── Filter alerts ─────────────────────────────────────────
  const filtered = useMemo(() => alerts.filter(a => {
    const q = search.toLowerCase();
    return (
      (!q || a.title.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q)) &&
      (typeFilter === 'all'     || a.type === typeFilter) &&
      (priorityFilter === 'all' || a.priority === priorityFilter) &&
      (!showUnreadOnly || !a.read)
    );
  }), [alerts, search, typeFilter, priorityFilter, showUnreadOnly]);

  // ── Stat cards ────────────────────────────────────────────
  const statCards = [
    { label: 'Unread Alerts',   value: String(unreadCount),   sub: 'Require Attention',     color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    icon: AlertCircle },
    { label: 'Active Searches', value: String(searches.length), sub: 'Monitoring Live Feeds', color: '#7C3AED', bg: 'rgba(124,58,237,0.1)', icon: Target      },
    { label: 'Total Alerts',    value: String(alerts.length),  sub: 'All Time',              color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',  icon: Bell        },
    {
      label: 'Notifications',
      value: Object.values(notifPrefs).filter(Boolean).length + '/3',
      sub: 'Channels Active', color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: Mail,
    },
  ];

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.heading}>Alerts &amp; Notifications</h2>
          <p className={styles.headingSub}>Manage Your Bid Intelligence Alerts and Saved Search Criteria</p>
        </div>
        <div className={styles.headerActions}>
          {unreadCount > 0 && (
            <button className={styles.ghostBtn} onClick={() => markAllRead.mutate()}>
              <CheckCheck size={13} /> Mark All Read
            </button>
          )}
          <button className={styles.primaryBtn} onClick={() => setShowModal(true)}>
            <Plus size={13} /> Create Alert
          </button>
        </div>
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
            <div className={styles.statIcon} style={{ background: card.bg, color: card.color }}>
              <card.icon size={18} />
            </div>
            <div>
              <p className={styles.statLabel}>{card.label}</p>
              <p className={styles.statValue} style={{ color: card.color }}>{card.value}</p>
              <p className={styles.statSub}>{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div className={styles.contentGrid}>

        {/* LEFT — Alerts list */}
        <div className={styles.alertsColumn}>

          {/* Filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search alerts…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className={styles.clearSearch} onClick={() => setSearch('')}>
                  <X size={11} />
                </button>
              )}
            </div>

            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                {(['all', 'tender', 'bid', 'report', 'system'] as const).map(t => (
                  <button
                    key={t}
                    className={clsx(styles.filterChip, typeFilter === t && styles.filterChipActive)}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              <div className={styles.filterRight}>
                <select
                  className={styles.filterSelect}
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button
                  className={clsx(styles.filterChip, showUnreadOnly && styles.filterChipActive)}
                  onClick={() => setShowUnreadOnly(v => !v)}
                >
                  Unread only
                </button>
                {alerts.some(a => a.read) && (
                  <button
                    className={styles.clearReadBtn}
                    onClick={() => alerts.filter(a => a.read).forEach(a => deleteAlert.mutate(a.id))}
                  >
                    <Trash2 size={11} /> Clear read
                  </button>
                )}
              </div>
            </div>

            <p className={styles.alertCount}>
              {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
              {unreadCount > 0 && <span className={styles.unreadPill}>{unreadCount} unread</span>}
            </p>
          </div>

          {/* Alert list */}
          <div className={styles.alertList}>
            {alertsLoading ? (
              <div className={styles.emptyAlerts}>
                <Bell size={32} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>Loading alerts…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyAlerts}>
                <Bell size={32} className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>No alerts found</p>
                <p className={styles.emptySub}>Try adjusting your filters or create a new saved search</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((alert, i) => {
                  const tc = TYPE_CONFIG[alert.type as AlertType] ?? TYPE_CONFIG.system;
                  const pc = PRIORITY_CONFIG[alert.priority as AlertPriority] ?? PRIORITY_CONFIG.medium;
                  return (
                    <motion.div
                      key={alert.id}
                      className={clsx(styles.alertCard, !alert.read && styles.alertCardUnread)}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0   }}
                      exit={{    opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      layout
                    >
                      {!alert.read && <div className={styles.unreadDot} />}

                      <div className={styles.alertIcon} style={{ background: tc.bg, color: tc.color }}>
                        <tc.icon size={15} />
                      </div>

                      <div className={styles.alertContent}>
                        <div className={styles.alertTopRow}>
                          <h4 className={clsx(styles.alertTitle, !alert.read && styles.alertTitleUnread)}>
                            {alert.title}
                          </h4>
                          <span className={clsx(styles.priorityBadge, pc.cls)}>{pc.label}</span>
                        </div>
                        <p className={styles.alertDesc}>{alert.description}</p>
                        <div className={styles.alertMeta}>
                          <Clock size={11} />
                          <span>{formatAgo(alert.created_at)}</span>
                          <span className={styles.metaDot}>·</span>
                          <span className={styles.alertType}>{alert.type}</span>
                        </div>
                      </div>

                      <div className={styles.alertActions}>
                        {!alert.read && (
                          <button
                            className={styles.alertActionBtn}
                            title="Mark as read"
                            onClick={() => markRead.mutate(alert.id)}
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          className={clsx(styles.alertActionBtn, styles.alertDeleteBtn)}
                          title="Delete alert"
                          onClick={() => deleteAlert.mutate(alert.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* RIGHT — Saved searches + notification prefs */}
        <div className={styles.sideColumn}>

          {/* Saved searches */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <div>
                <h3 className={styles.sideCardTitle}>Saved Searches</h3>
                <p className={styles.sideCardSub}>Auto-Alert On New Matches</p>
              </div>
              <button className={styles.sideAddBtn} onClick={() => setShowModal(true)}>
                <Plus size={13} />
              </button>
            </div>

            <div className={styles.searchList}>
              {searchesLoading ? (
                <p className={styles.emptySub}>Loading…</p>
              ) : searches.length === 0 ? (
                <div className={styles.emptyAlerts}>
                  <Target size={24} className={styles.emptyIcon} />
                  <p className={styles.emptySub}>No saved searches yet. Create one to get started.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {searches.map((s, i) => (
                    <motion.div
                      key={s.id}
                      className={styles.savedSearchCard}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{    opacity: 0, height: 0 }}
                      transition={{ delay: i * 0.05 }}
                      layout
                    >
                      <div className={styles.ssHeader}>
                        <h4 className={styles.ssName}>{s.name}</h4>
                        <div className={styles.ssActions}>
                          <button
                            className={clsx(styles.ssToggle, s.notifications && styles.ssToggleOn)}
                            onClick={() => toggleSavedSearch.mutate(s.id)}
                            title={s.notifications ? 'Disable notifications' : 'Enable notifications'}
                          >
                            <span className={styles.ssToggleThumb} />
                          </button>
                          <button
                            className={styles.ssDeleteBtn}
                            onClick={() => deleteSavedSearch.mutate(s.id)}
                            title="Delete search"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>

                      <div className={styles.ssCriteria}>
                        {s.sector && (
                          <div className={styles.ssCrit}>
                            <Filter size={10} /> {SECTOR_LABELS[s.sector] ?? s.sector}
                          </div>
                        )}
                        {s.state && (
                          <div className={styles.ssCrit}>
                            <MapPin size={10} /> {s.state}
                          </div>
                        )}
                        {(s.min_value > 0 || s.max_value > 0) && (
                          <div className={styles.ssCrit}>
                            <DollarSign size={10} />
                            {s.min_value > 0 ? `$${(s.min_value / 1000000).toFixed(1)}M` : '—'}
                            {' – '}
                            {s.max_value > 0 ? `$${(s.max_value / 1000000).toFixed(1)}M` : '—'}
                          </div>
                        )}
                      </div>

                      <div className={styles.ssMeta}>
                        <span className={clsx(styles.ssNotifBadge, s.notifications ? styles.ssNotifOn : styles.ssNotifOff)}>
                          {s.notifications ? '🔔 Notifications on' : '🔕 Muted'}
                        </span>
                        <span className={styles.ssMatch}>
                          {s.match_count} matches · {s.last_matched ? formatAgo(s.last_matched) : 'Never'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Notification preferences */}
          <div className={styles.sideCard}>
            <div className={styles.sideCardHeader}>
              <div>
                <h3 className={styles.sideCardTitle}>Notification Channels</h3>
                <p className={styles.sideCardSub}>How You Want to be Alerted</p>
              </div>
            </div>

            <div className={styles.notifList}>
              {([
                { key: 'email', icon: Mail,         label: 'Email Alerts',       sub: 'Delivered to Your Inbox'   },
                { key: 'sms',   icon: MessageSquare, label: 'SMS Alerts',         sub: 'Text Message to Your Phone' },
                { key: 'push',  icon: Smartphone,    label: 'Push Notifications', sub: 'Browser / Mobile Push'     },
              ] as const).map(channel => (
                <div key={channel.key} className={styles.notifRow}>
                  <div className={styles.notifLeft}>
                    <div className={clsx(
                      styles.notifIcon,
                      notifPrefs[channel.key] ? styles.notifIconOn : styles.notifIconOff,
                    )}>
                      <channel.icon size={14} />
                    </div>
                    <div>
                      <p className={styles.notifLabel}>{channel.label}</p>
                      <p className={styles.notifSub}>{channel.sub}</p>
                    </div>
                  </div>
                  <button
                    className={clsx(styles.toggle, notifPrefs[channel.key] && styles.toggleOn)}
                    onClick={() => setNotifPrefs(p => ({ ...p, [channel.key]: !p[channel.key] }))}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Create alert modal */}
      <AnimatePresence>
        {showModal && <CreateAlertModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>

    </div>
  );
}