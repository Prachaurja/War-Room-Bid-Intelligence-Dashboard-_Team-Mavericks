import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, Home, Gavel, BarChart3, FileText,
  Bell, LogOut, Settings, ChevronRight,
  Target, Wifi, X, RefreshCw, Database, HardDrive,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../store/ui.store';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAlerts } from '../../hooks/useAlerts';
import { useOverviewStats } from '../../hooks/useTenders';
import { getSourceDescription, getSourceLabel } from '../../utils/sourceLabels';
import clsx from 'clsx';
import styles from './SideBar.module.css';

type SystemPanelKey = 'sources' | null;

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen }  = useUIStore();
  const location         = useLocation();
  const navigate         = useNavigate();
  const queryClient      = useQueryClient();
  const { status, newTenders, newAlerts, clearCounters } = useWebSocket();
  const { data: alertsData } = useAlerts();
  const { data: stats }      = useOverviewStats();
  const [systemPanel, setSystemPanel] = useState<SystemPanelKey>(null);

  const unreadCount = (alertsData ?? []).filter((a) => !a.read).length;
  const totalBadge  = unreadCount + newAlerts;

  const isConnected  = status === 'connected';
  const isConnecting = status === 'connecting';
  const hasNewData   = newTenders > 0;

  const NAV_ITEMS = [
    { label: 'Home',         path: '/',             icon: Home,            badge: null },
    { label: 'Overview',     path: '/overview',     icon: LayoutDashboard, badge: null },
    { label: 'Tenders',      path: '/tenders',      icon: Gavel,           badge: null },
    { label: 'Analytics',    path: '/analytics',    icon: BarChart3,       badge: null },
    { label: 'Reports',      path: '/reports',      icon: FileText,        badge: null },
    { label: 'Alerts',       path: '/alerts',       icon: Bell,            badge: totalBadge > 0 ? String(totalBadge) : null },
    { label: 'Data Sources', path: '/data-sources', icon: HardDrive,       badge: null },
  ];

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'WR';

  // CHANGE: read avatar scoped to current user's ID — prevents cross-user contamination
  const avatarKey = `wr_avatar_${user?.id ?? 'default'}`;
  const avatarSrc = user?.avatar ?? localStorage.getItem(avatarKey) ?? '';

  const systemButtons = [
    { key: 'sources', label: 'Data Sources', icon: Database },
  ] as const;

  const closeSystemPanel = () => setSystemPanel(null);

  const renderSystemPanel = () => {
    if (!systemPanel) return null;

    if (systemPanel === 'sources') {
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      const sourceEntries = Object.entries(stats?.sources ?? {})
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

      return (
        <div className={styles.systemPanelBody}>
          {sourceEntries.map(([sourceName, count]) => (
            <div key={sourceName} className={styles.sourceCard}>
              <div>
                <p className={styles.sourceCardTitle}>{getSourceLabel(sourceName)}</p>
                <p className={styles.sourceCardSub}>{getSourceDescription(sourceName)}</p>
              </div>
              <span className={styles.sourceCardCount}>{count}</span>
            </div>
          ))}
          <div className={styles.sourceRow}>
            <span className={styles.sourceLabel}>API Endpoint</span>
            <span className={styles.sourceValue}>{apiUrl}</span>
          </div>
          <div className={styles.sourceRow}>
            <span className={styles.sourceLabel}>WebSocket</span>
            <span className={styles.sourceValue}>{status}</span>
          </div>
          <div className={styles.sourceRow}>
            <span className={styles.sourceLabel}>Unread Alerts</span>
            <span className={styles.sourceValue}>{unreadCount}</span>
          </div>
          <div className={styles.sourceRow}>
            <span className={styles.sourceLabel}>New Tenders</span>
            <span className={styles.sourceValue}>{newTenders}</span>
          </div>
          <div className={styles.systemActionRow}>
            <button
              className={styles.systemGhostBtn}
              onClick={() => {
                clearCounters();
                void queryClient.invalidateQueries();
              }}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          key="sidebar"
          initial={{ x: -240, opacity: 0 }}
          animate={{ x: 0,    opacity: 1 }}
          exit={{    x: -240, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={styles.sidebar}
        >
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Target size={18} />
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoName}>War Room</span>
              <span className={styles.logoSub}>Bid Intelligence</span>
            </div>

            <div
              className={styles.liveIndicator}
              title={
                isConnected  ? 'Live feed connected'
                : isConnecting ? 'Connecting...'
                : 'Disconnected - reconnecting'
              }
            >
              <motion.span
                className={styles.liveDot}
                animate={
                  hasNewData   ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                  : isConnected  ? { opacity: 1 }
                  : isConnecting ? { opacity: [1, 0.3, 1] }
                  : { opacity: 0.3 }
                }
                transition={
                  hasNewData   ? { duration: 0.6, repeat: 3 }
                  : isConnecting ? { duration: 1, repeat: Infinity }
                  : {}
                }
                style={{
                  background: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#6B7280',
                }}
              />
              <span
                className={styles.liveLabel}
                style={{
                  color: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#6B7280',
                }}
              >
                {hasNewData ? 'NEW DATA' : isConnected ? 'LIVE' : isConnecting ? 'CONNECTING' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className={styles.divider} />

          <AnimatePresence>
            {newTenders > 0 && (
              <motion.div
                className={styles.newDataBanner}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{    opacity: 0, height: 0 }}
              >
                <Wifi size={12} />
                {newTenders} New Tender{newTenders > 1 ? 's' : ''} Ingested
              </motion.div>
            )}
          </AnimatePresence>

          <nav className={styles.nav}>
            <p className={styles.navSection}>NAVIGATION</p>
            {NAV_ITEMS.map((item) => {
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={clsx(styles.navItem, isActive && styles.navItemActive)}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className={styles.activeBackground}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <item.icon size={17} className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && (
                    <motion.span
                      key={item.badge}
                      className={clsx(styles.navBadge, isActive && styles.navBadgeActive)}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1,   opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                  {isActive && <ChevronRight size={13} className={styles.navChevron} />}
                </NavLink>
              );
            })}
          </nav>

          <div className={styles.spacer} />
          <div className={styles.divider} />

          <div className={styles.systemLinks}>
            {systemButtons.map((button) => (
              <button
                key={button.key}
                className={clsx(styles.systemItem, systemPanel === button.key && styles.systemItemActive)}
                onClick={() => setSystemPanel((current) => current === button.key ? null : button.key)}
              >
                <button.icon size={15} />
                <span>{button.label}</span>
              </button>
            ))}
            <button
              className={clsx(styles.systemItem, location.pathname === '/settings' && styles.systemItemActive)}
              onClick={() => {
                closeSystemPanel();
                navigate('/settings');
              }}
            >
              <Settings size={15} />
              <span>Settings</span>
            </button>
          </div>

          <AnimatePresence>
            {systemPanel && (
              <motion.div
                className={styles.systemPanel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, y: 8 }}
              >
                <div className={styles.systemPanelHeader}>
                  <div>
                    <p className={styles.systemPanelTitle}>Data Sources</p>
                    <p className={styles.systemPanelSub}>
                      Active feeds, source coverage, and connectivity status
                    </p>
                  </div>
                  <button className={styles.systemPanelClose} onClick={closeSystemPanel}>
                    <X size={14} />
                  </button>
                </div>
                {renderSystemPanel()}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.divider} />

          {/* ── User section with per-user avatar ── */}
          <div className={styles.userSection}>
            <div className={styles.avatar}>
              {avatarSrc
                ? <img
                    src={avatarSrc}
                    alt="avatar"
                    style={{
                      width: '100%', height: '100%',
                      objectFit: 'cover',
                      borderRadius: 'inherit',
                    }}
                  />
                : initials}
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user?.name ?? 'Analyst'}</p>
              <p className={styles.userRole}>{user?.role ?? 'admin'}</p>
            </div>
            <button className={styles.logoutBtn} onClick={() => void logout()} title="Logout">
              <LogOut size={15} />
            </button>
          </div>

        </motion.aside>
      )}
    </AnimatePresence>
  );
}
