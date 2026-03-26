import Dexie, { type EntityTable } from 'dexie';
import type { Template, ProgramCycle, Session, Settings } from './types';

const db = new Dexie('TrainingPalDB') as Dexie & {
  templates: EntityTable<Template, 'id'>;
  programCycle: EntityTable<ProgramCycle, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  settings: EntityTable<Settings, 'id'>;
};

db.version(1).stores({
  templates: 'id, name',
  programCycle: 'id',
  sessions: 'id, templateId, date, [templateId+date]',
  settings: 'id',
});

db.on('populate', () => {
  db.settings.add({
    id: 'prefs',
    soundEnabled: true,
    vibrationEnabled: true,
  });
});

export { db };
