import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Gavel, BarChart3, FileText,
  Users, Bell, Shield, LogOut, Settings, ChevronRight,
  Target, Wifi,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../store/ui.store';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAlerts } from '../../hooks/useAlerts';
import clsx from 'clsx';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { user, logout }                        = useAuth();
  const { sidebarOpen }                         = useUIStore();
  const location                                = useLocation();
  const { status, newTenders, newAlerts }       = useWebSocket();
  const { data: alertsData }                    = useAlerts();

  const unreadCount = (alertsData ?? []).filter(a => !a.read).length;
  const totalBadge  = unreadCount + newAlerts;

  const isConnected    = status === 'connected';
  const isConnecting   = status === 'connecting';
  const hasNewData     = newTenders > 0;

  const NAV_ITEMS = [
    { label: 'Overview',  path: '/',          icon: LayoutDashboard, badge: null        },
    { label: 'Tenders',   path: '/tenders',   icon: Gavel,           badge: null        },
    { label: 'Analytics', path: '/analytics', icon: BarChart3,       badge: null        },
    { label: 'Reports',   path: '/reports',   icon: FileText,        badge: null        },
    { label: 'Customers', path: '/customers', icon: Users,           badge: null        },
    { label: 'Alerts',    path: '/alerts',    icon: Bell,            badge: totalBadge > 0 ? String(totalBadge) : null },
  ];

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'WR';

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
          {/* ── Logo ── */}
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Target size={18} />
            </div>
            <div className={styles.logoText}>
              <span className={styles.logoName}>War Room</span>
              <span className={styles.logoSub}>Bid Intelligence</span>
            </div>

            {/* ── Live indicator — real WebSocket status ── */}
            <div
              className={styles.liveIndicator}
              title={
                isConnected   ? 'Live feed connected' :
                isConnecting  ? 'Connecting…' :
                'Disconnected — reconnecting'
              }
            >
              <motion.span
                className={styles.liveDot}
                animate={
                  hasNewData    ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } :
                  isConnected   ? { opacity: 1 } :
                  isConnecting  ? { opacity: [1, 0.3, 1] } :
                  { opacity: 0.3 }
                }
                transition={
                  hasNewData   ? { duration: 0.6, repeat: 3 } :
                  isConnecting ? { duration: 1, repeat: Infinity } :
                  {}
                }
                style={{
                  background:
                    isConnected  ? '#10B981' :
                    isConnecting ? '#F59E0B' :
                    '#6B7280',
                }}
              />
              <span
                className={styles.liveLabel}
                style={{
                  color:
                    isConnected  ? '#10B981' :
                    isConnecting ? '#F59E0B' :
                    '#6B7280',
                }}
              >
                {hasNewData   ? 'NEW DATA' :
                 isConnected  ? 'LIVE' :
                 isConnecting ? 'CONNECTING' :
                 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* ── New tenders toast ── */}
          <AnimatePresence>
            {newTenders > 0 && (
              <motion.div
                className={styles.newDataBanner}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{    opacity: 0, height: 0 }}
              >
                <Wifi size={12} />
                {newTenders} new tender{newTenders > 1 ? 's' : ''} ingested
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Navigation ── */}
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

          {/* ── System links ── */}
          <div className={styles.systemLinks}>
            <button className={styles.systemItem}>
              <Shield size={15} /><span>Security</span>
            </button>
            <button className={styles.systemItem}>
              <Wifi size={15} /><span>Data Sources</span>
            </button>
            <button className={styles.systemItem}>
              <Settings size={15} /><span>Settings</span>
            </button>
          </div>

          <div className={styles.divider} />

          {/* ── User section ── */}
          <div className={styles.userSection}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user?.name ?? 'Analyst'}</p>
              <p className={styles.userRole}>{user?.role ?? 'admin'}</p>
            </div>
            <button className={styles.logoutBtn} onClick={logout} title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}