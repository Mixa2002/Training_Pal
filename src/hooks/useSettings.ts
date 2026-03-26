import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Settings } from '../db/types';

const defaults: Settings = {
  id: 'prefs',
  soundEnabled: true,
  vibrationEnabled: true,
};

export function useSettings(): Settings {
  const settings = useLiveQuery(() => db.settings.get('prefs'));
  return settings ?? defaults;
}
