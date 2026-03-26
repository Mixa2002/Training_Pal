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

// v2: StrengthExercise.sets changed from number to StrengthSetTarget[]
db.version(2).stores({
  templates: 'id, name',
  programCycle: 'id',
  sessions: 'id, templateId, date, [templateId+date]',
  settings: 'id',
}).upgrade((tx) => {
  return tx.table('templates').toCollection().modify((template) => {
    for (const ex of template.exercises) {
      if (ex.type === 'strength' && typeof ex.sets === 'number') {
        const count = ex.sets as number;
        ex.sets = Array.from({ length: count }, () => ({ weight: 0, reps: 0, rir: 2 }));
        delete ex.repMin;
        delete ex.repMax;
      }
    }
  });
});

db.on('populate', () => {
  db.settings.add({
    id: 'prefs',
    soundEnabled: true,
    vibrationEnabled: true,
  });
});

export { db };
