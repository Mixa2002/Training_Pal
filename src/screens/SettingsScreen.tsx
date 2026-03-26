import { useSettings } from '../hooks/useSettings';
import { db } from '../db/database';
import Toggle from '../components/common/Toggle';
import styles from './SettingsScreen.module.css';

export default function SettingsScreen() {
  const settings = useSettings();

  async function updateSetting(key: 'soundEnabled' | 'vibrationEnabled', value: boolean) {
    await db.settings.update('prefs', { [key]: value });
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Rest Timer</h2>
          <div className={styles.toggleList}>
            <Toggle
              label="Sound"
              description="Play a beep when rest timer ends"
              checked={settings.soundEnabled}
              onChange={(v) => updateSetting('soundEnabled', v)}
            />
            <Toggle
              label="Vibration"
              description="Vibrate when rest timer ends"
              checked={settings.vibrationEnabled}
              onChange={(v) => updateSetting('vibrationEnabled', v)}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Data</h2>
          <button className={styles.exportBtn} disabled>
            Export Data (Coming Soon)
          </button>
        </div>

        <div className={styles.footer}>
          <p className={styles.version}>Training Pal v1.0.0</p>
          <p className={styles.footerText}>
            All data is stored locally on your device.
          </p>
        </div>
      </div>
    </div>
  );
}
