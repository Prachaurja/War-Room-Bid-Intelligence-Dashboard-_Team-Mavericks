import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  LayoutDashboard, Gavel, BarChart3, FileText,
  Users, Bell, Shield, LogOut, Settings, ChevronRight,
  Target, Wifi, X, RefreshCw, Database, LockKeyhole, Paintbrush,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../store/ui.store';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAlerts } from '../../hooks/useAlerts';
import clsx from 'clsx';
import styles from './SideBar.module.css';

type SystemPanelKey = 'security' | 'sources' | 'settings' | null;

export default function Sidebar() {
  const { user, logout } = useAuth();
  const {
    sidebarOpen,
    themeMode,
    resolvedTheme,
    setThemeMode,
    setSidebarOpen,
  } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { status, newTenders, newAlerts, clearCounters } = useWebSocket();
  const { data: alertsData } = useAlerts();
  const [systemPanel, setSystemPanel] = useState<SystemPanelKey>(null);

  const unreadCount = (alertsData ?? []).filter((a) => !a.read).length;
  const totalBadge = unreadCount + newAlerts;

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const hasNewData = newTenders > 0;

  const NAV_ITEMS = [
    { label: 'Overview', path: '/', icon: LayoutDashboard, badge: null },
    { label: 'Tenders', path: '/tenders', icon: Gavel, badge: null },
    { label: 'Analytics', path: '/analytics', icon: BarChart3, badge: null },
    { label: 'Reports', path: '/reports', icon: FileText, badge: null },
    { label: 'Customers', path: '/customers', icon: Users, badge: null },
    { label: 'Alerts', path: '/alerts', icon: Bell, badge: totalBadge > 0 ? String(totalBadge) : null },
  ];

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'WR';

  const systemButtons = [
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'sources', label: 'Data Sources', icon: Database },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const closeSystemPanel = () => setSystemPanel(null);

  const renderSystemPanel = () => {
    if (!systemPanel) return null;

    if (systemPanel === 'security') {
      return (
        <div className={styles.systemPanelBody}>
          <div className={styles.systemStatGrid}>
            <div className={styles.systemStat}>
              <span className={styles.systemStatLabel}>Account</span>
              <strong className={styles.systemStatValue}>{user?.name ?? 'Analyst'}</strong>
            </div>
            <div className={styles.systemStat}>
              <span className={styles.systemStatLabel}>Role</span>
              <strong className={styles.systemStatValue}>{user?.role ?? 'admin'}</strong>
            </div>
            <div className={styles.systemStat}>
              <span className={styles.systemStatLabel}>Session</span>
              <strong className={styles.systemStatValue}>Authenticated</strong>
            </div>
            <div className={styles.systemStat}>
              <span className={styles.systemStatLabel}>Token Cache</span>
              <strong className={styles.systemStatValue}>
                {localStorage.getItem('wr_token') ? 'Stored locally' : 'Unavailable'}
              </strong>
            </div>
          </div>
          <button className={styles.systemPrimaryBtn} onClick={() => void logout()}>
            <LockKeyhole size={14} />
            Sign out
          </button>
        </div>
      );
    }

    if (systemPanel === 'sources') {
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
      return (
        <div className={styles.systemPanelBody}>
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
            <button
              className={styles.systemGhostBtn}
              onClick={() => {
                closeSystemPanel();
                navigate('/alerts');
              }}
            >
              <Bell size={13} />
              Open Alerts
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.systemPanelBody}>
        <div className={styles.themeChoiceGroup}>
          {(['system', 'dark', 'light'] as const).map((mode) => (
            <button
              key={mode}
              className={clsx(styles.themeChoice, themeMode === mode && styles.themeChoiceActive)}
              onClick={() => setThemeMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className={styles.sourceRow}>
          <span className={styles.sourceLabel}>Resolved Theme</span>
          <span className={styles.sourceValue}>{resolvedTheme}</span>
        </div>
        <div className={styles.systemActionRow}>
          <button
            className={styles.systemGhostBtn}
            onClick={() => {
              closeSystemPanel();
              setSidebarOpen(false);
            }}
          >
            <Paintbrush size={13} />
            Collapse Sidebar
          </button>
          <button
            className={styles.systemGhostBtn}
            onClick={() => {
              closeSystemPanel();
              navigate('/');
            }}
          >
            <LayoutDashboard size={13} />
            Dashboard
          </button>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          key="sidebar"
          initial={{ x: -240, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -240, opacity: 0 }}
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
                isConnected ? 'Live feed connected'
                  : isConnecting ? 'Connecting...'
                    : 'Disconnected - reconnecting'
              }
            >
              <motion.span
                className={styles.liveDot}
                animate={
                  hasNewData ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                    : isConnected ? { opacity: 1 }
                      : isConnecting ? { opacity: [1, 0.3, 1] }
                        : { opacity: 0.3 }
                }
                transition={
                  hasNewData ? { duration: 0.6, repeat: 3 }
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
                exit={{ opacity: 0, height: 0 }}
              >
                <Wifi size={12} />
                {newTenders} new tender{newTenders > 1 ? 's' : ''} ingested
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
                      animate={{ scale: 1, opacity: 1 }}
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
          </div>

          <AnimatePresence>
            {systemPanel && (
              <motion.div
                className={styles.systemPanel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <div className={styles.systemPanelHeader}>
                  <div>
                    <p className={styles.systemPanelTitle}>
                      {systemPanel === 'security' ? 'Security' : systemPanel === 'sources' ? 'Data Sources' : 'Settings'}
                    </p>
                    <p className={styles.systemPanelSub}>
                      {systemPanel === 'security'
                        ? 'Local account and session actions'
                        : systemPanel === 'sources'
                          ? 'Frontend connectivity and feed status'
                          : 'Appearance and workspace preferences'}
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

          <div className={styles.userSection}>
            <div className={styles.avatar}>{initials}</div>
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
