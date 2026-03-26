import { Outlet } from 'react-router-dom';
import BottomTabBar from './BottomTabBar';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  return (
    <div className={styles.layout}>
      <main className={styles.content}>
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
}
