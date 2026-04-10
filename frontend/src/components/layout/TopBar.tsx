import { Menu, Bell, Search, RefreshCw } from 'lucide-react';
import { useUIStore } from '../../store/ui.store';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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

export default function TopBar({ pathname }: TopBarProps) {
  const { toggleSidebar } = useUIStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const pageInfo = PAGE_TITLES[pathname] ?? PAGE_TITLES['/'];

  const today = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <header className={styles.topbar}>
      {/* Left */}
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={toggleSidebar}>
          <Menu size={18} />
        </button>
        <div className={styles.pageInfo}>
          <h1 className={styles.pageTitle}>{pageInfo.title}</h1>
          <p className={styles.pageSub}>{today}</p>
        </div>
      </div>

      {/* Right */}
      <div className={styles.right}>
        <button
          className={styles.iconBtn}
          onClick={handleRefresh}
          title="Refresh data"
        >
          <RefreshCw size={15} className={refreshing ? styles.spinning : ''} />
        </button>
        <button className={styles.iconBtn} title="Search">
          <Search size={15} />
        </button>
        <button className={styles.notifBtn} title="Notifications">
          <Bell size={15} />
          <span className={styles.notifDot} />
        </button>
      </div>
    </header>
  );
}