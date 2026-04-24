import {
  Menu,
  Bell,
  Search,
  RefreshCw,
  Moon,
  Sun,
  Monitor,
  ArrowRight,
  Clock3,
  CheckCheck,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAlerts, useMarkAllRead, useMarkRead } from '../../hooks/useAlerts';
import { useTenders } from '../../hooks/useTenders';
import { useUIStore } from '../../store/ui.store';
import { formatAgo } from '../../utils/formatters';
import styles from './TopBar.module.css';

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/':          { title: 'Overview',          sub: 'Bid intelligence dashboard' },
  '/tenders':   { title: 'Tender Management', sub: 'Track and manage government tenders' },
  '/analytics': { title: 'Analytics',         sub: 'Deep dive into bid performance' },
  '/reports':   { title: 'Reports',           sub: 'Generate and export reports' },
  '/customers': { title: 'Customers',         sub: 'Manage customer relationships' },
  '/alerts':    { title: 'Alerts',            sub: 'Notifications and saved searches' },
};

interface TopBarProps {
  pathname: string;
}

interface SearchAction {
  id: string;
  kind: 'action' | 'tender' | 'alert';
  title: string;
  description: string;
  keywords: string[];
  run: () => void;
}

export default function TopBar({ pathname }: TopBarProps) {
  const { toggleSidebar, themeMode, resolvedTheme, cycleThemeMode } = useUIStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: alertsData } = useAlerts();
  const { data: tendersData } = useTenders({ page: 1, page_size: 50 });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pageInfo = PAGE_TITLES[pathname] ?? PAGE_TITLES['/'];
  const today = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  const themeConfig = {
    system: { label: 'System', icon: Monitor },
    dark: { label: 'Dark', icon: Moon },
    light: { label: 'Light', icon: Sun },
  }[themeMode];

  const ThemeIcon = themeConfig.icon;
  const unreadAlerts = (alertsData ?? []).filter((alert) => !alert.read);
  const recentAlerts = [...(alertsData ?? [])].slice(0, 5);
  const tenders = tendersData?.items ?? [];

  const searchActions = useMemo<SearchAction[]>(() => [
    {
      id: 'overview',
      kind: 'action',
      title: 'Open Overview',
      description: 'Go to dashboard overview',
      keywords: ['overview', 'dashboard', 'home'],
      run: () => navigate('/'),
    },
    {
      id: 'tenders',
      kind: 'action',
      title: 'Open Tenders',
      description: 'Browse current tender opportunities',
      keywords: ['tenders', 'contracts', 'bids', 'procurement'],
      run: () => navigate('/tenders'),
    },
    {
      id: 'analytics',
      kind: 'action',
      title: 'Open Analytics',
      description: 'Review performance and trend analytics',
      keywords: ['analytics', 'charts', 'insights'],
      run: () => navigate('/analytics'),
    },
    {
      id: 'reports',
      kind: 'action',
      title: 'Open Reports',
      description: 'Generate and export report data',
      keywords: ['reports', 'exports', 'csv'],
      run: () => navigate('/reports'),
    },
    {
      id: 'customers',
      kind: 'action',
      title: 'Open Customers',
      description: 'Manage customer and agency contacts',
      keywords: ['customers', 'clients', 'contacts'],
      run: () => navigate('/customers'),
    },
    {
      id: 'alerts',
      kind: 'action',
      title: 'Open Alerts',
      description: 'View notifications and saved searches',
      keywords: ['alerts', 'notifications', 'saved search'],
      run: () => navigate('/alerts'),
    },
    {
      id: 'refresh',
      kind: 'action',
      title: 'Refresh Data',
      description: 'Refetch cached query data',
      keywords: ['refresh', 'reload', 'sync', 'refetch'],
      run: () => {
        void handleRefresh();
      },
    },
    {
      id: 'theme',
      kind: 'action',
      title: `Theme: ${themeConfig.label}`,
      description: `Current resolved theme is ${resolvedTheme}`,
      keywords: ['theme', 'dark', 'light', 'system', 'appearance'],
      run: () => cycleThemeMode(),
    },
  ], [navigate, themeConfig.label, resolvedTheme, cycleThemeMode]);

  const tenderActions = useMemo<SearchAction[]>(
    () => tenders.map((tender) => ({
      id: `tender-${tender.id}`,
      kind: 'tender',
      title: tender.title,
      description: `${tender.agency} · ${tender.state ?? 'Unknown State'} · ${tender.status}`,
      keywords: [
        tender.agency,
        tender.state ?? '',
        tender.sector ?? '',
        tender.source_name,
        tender.description ?? '',
      ],
      run: () => navigate(`/tenders?search=${encodeURIComponent(tender.title)}`),
    })),
    [tenders, navigate],
  );

  const alertActions = useMemo<SearchAction[]>(
    () => (alertsData ?? []).map((alert) => ({
      id: `alert-${alert.id}`,
      kind: 'alert',
      title: alert.title,
      description: alert.description ?? `Alert · ${alert.priority}`,
      keywords: [alert.type, alert.priority, alert.description ?? ''],
      run: () => navigate(`/alerts?search=${encodeURIComponent(alert.title)}`),
    })),
    [alertsData, navigate],
  );

  const searchableActions = useMemo(
    () => [...searchActions, ...tenderActions, ...alertActions],
    [searchActions, tenderActions, alertActions],
  );

  const filteredSearchActions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchableActions.slice(0, 12);

    return searchableActions.filter((action) =>
      [action.title, action.description, ...action.keywords]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [searchableActions, searchQuery]);

  const groupedSearchActions = useMemo(() => {
    const sections: Array<{ label: string; items: SearchAction[] }> = [];
    const actions = filteredSearchActions.filter((item) => item.kind === 'action');
    const tenderResults = filteredSearchActions.filter((item) => item.kind === 'tender').slice(0, 6);
    const alertResults = filteredSearchActions.filter((item) => item.kind === 'alert').slice(0, 6);

    if (actions.length > 0) sections.push({ label: 'Quick Actions', items: actions });
    if (tenderResults.length > 0) sections.push({ label: 'Tenders', items: tenderResults });
    if (alertResults.length > 0) sections.push({ label: 'Alerts', items: alertResults });

    return sections;
  }, [filteredSearchActions]);

  useEffect(() => {
    if (!searchOpen) return;

    setNotifOpen(false);
    const timeoutId = window.setTimeout(() => searchInputRef.current?.focus(), 20);
    return () => window.clearTimeout(timeoutId);
  }, [searchOpen]);

  useEffect(() => {
    if (!notifOpen) return;

    setSearchOpen(false);
    const handlePointerDown = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [notifOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }

      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const runSearchAction = (action: SearchAction) => {
    action.run();
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={toggleSidebar}>
          <Menu size={18} />
        </button>
        <div className={styles.pageInfo}>
          <h1 className={styles.pageTitle}>{pageInfo.title}</h1>
          <p className={styles.pageSub}>{today}</p>
        </div>
      </div>

      <div className={styles.right}>
        <button
          className={styles.themeBtn}
          onClick={cycleThemeMode}
          title={`Theme mode: ${themeConfig.label} (${resolvedTheme})`}
          aria-label={`Theme mode: ${themeConfig.label}. Click to switch theme mode.`}
        >
          <ThemeIcon size={15} />
          <span className={styles.themeLabel}>{themeConfig.label}</span>
        </button>

        <button
          className={styles.iconBtn}
          onClick={handleRefresh}
          title="Refresh data"
        >
          <RefreshCw size={15} className={refreshing ? styles.spinning : ''} />
        </button>

        <button
          className={styles.iconBtn}
          title="Search"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={15} />
        </button>

        <div className={styles.notifWrap} ref={notifRef}>
          <button
            className={styles.notifBtn}
            title="Notifications"
            onClick={() => setNotifOpen((open) => !open)}
          >
            <Bell size={15} />
            {unreadAlerts.length > 0 && <span className={styles.notifDot} />}
          </button>

          {notifOpen && (
            <div className={styles.notifPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelTitle}>Notifications</p>
                  <p className={styles.panelSub}>
                    {unreadAlerts.length > 0 ? `${unreadAlerts.length} unread` : 'All caught up'}
                  </p>
                </div>
                {unreadAlerts.length > 0 && (
                  <button
                    className={styles.panelAction}
                    onClick={() => void markAllRead.mutateAsync()}
                  >
                    <CheckCheck size={13} />
                    Mark all
                  </button>
                )}
              </div>

              <div className={styles.notifList}>
                {recentAlerts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Bell size={16} />
                    <span>No alerts yet</span>
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <button
                      key={alert.id}
                      className={styles.notifItem}
                      onClick={() => {
                        if (!alert.read) {
                          void markRead.mutateAsync(alert.id);
                        }
                        setNotifOpen(false);
                        navigate('/alerts');
                      }}
                    >
                      <div className={styles.notifItemTop}>
                        <span className={styles.notifItemTitle}>{alert.title}</span>
                        {!alert.read && <span className={styles.notifUnread}>New</span>}
                      </div>
                      {alert.description && (
                        <p className={styles.notifItemDesc}>{alert.description}</p>
                      )}
                      <div className={styles.notifMeta}>
                        <Clock3 size={11} />
                        <span>{formatAgo(alert.created_at)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <button
                className={styles.viewAllBtn}
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/alerts');
                }}
              >
                View all alerts
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {searchOpen && createPortal(
        <div className={styles.searchOverlay} onClick={() => setSearchOpen(false)}>
          <div className={styles.searchModal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.searchBar}>
              <Search size={16} className={styles.searchBarIcon} />
              <input
                ref={searchInputRef}
                className={styles.searchField}
                placeholder="Search pages and actions..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button className={styles.searchClose} onClick={() => setSearchOpen(false)}>
                Esc
              </button>
            </div>

            <div className={styles.searchResults}>
              {groupedSearchActions.length === 0 ? (
                <div className={styles.emptyState}>
                  <Search size={16} />
                  <span>No matching actions</span>
                </div>
              ) : (
                groupedSearchActions.map((section) => (
                  <div key={section.label} className={styles.searchSection}>
                    <p className={styles.searchSectionTitle}>{section.label}</p>
                    {section.items.map((action) => (
                      <button
                        key={action.id}
                        className={styles.searchResult}
                        onClick={() => runSearchAction(action)}
                      >
                        <div>
                          <p className={styles.searchResultTitle}>{action.title}</p>
                          <p className={styles.searchResultDesc}>{action.description}</p>
                        </div>
                        <ArrowRight size={14} className={styles.searchResultArrow} />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
