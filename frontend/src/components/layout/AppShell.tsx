import { Outlet, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/ui.store';
import Sidebar from './Sidebar'; 
import TopBar from './TopBar'; 
import styles from './AppShell.module.css';

export default function AppShell() {
  const { sidebarOpen } = useUIStore();
  const location = useLocation();

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div
        className={styles.main}
        style={{ marginLeft: sidebarOpen ? 'var(--sidebar-width)' : '0' }}
      >
        <TopBar pathname={location.pathname} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}