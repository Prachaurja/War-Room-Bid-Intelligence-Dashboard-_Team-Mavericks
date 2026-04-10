import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Gavel, BarChart3, FileText,
  Users, Bell, Shield, LogOut, Settings, ChevronRight,
  Target, Wifi
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUIStore } from '../../store/ui.store';
import clsx from 'clsx';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Overview',   path: '/',          icon: LayoutDashboard, badge: null },
  { label: 'Tenders',    path: '/tenders',   icon: Gavel,           badge: null },
  { label: 'Analytics',  path: '/analytics', icon: BarChart3,       badge: null },
  { label: 'Reports',    path: '/reports',   icon: FileText,        badge: null },
  { label: 'Customers',  path: '/customers', icon: Users,           badge: null },
  { label: 'Alerts',     path: '/alerts',    icon: Bell,            badge: null },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen } = useUIStore();
  const location = useLocation();

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
          exit={{   x: -240, opacity: 0 }}
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
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              <span className={styles.liveLabel}>LIVE</span>
            </div>
          </div>

          <div className={styles.divider} />

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
                    <span className={clsx(styles.navBadge, isActive && styles.navBadgeActive)}>
                      {item.badge}
                    </span>
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
              <Shield size={15} />
              <span>Security</span>
            </button>
            <button className={styles.systemItem}>
              <Wifi size={15} />
              <span>Data Sources</span>
            </button>
            <button className={styles.systemItem}>
              <Settings size={15} />
              <span>Settings</span>
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