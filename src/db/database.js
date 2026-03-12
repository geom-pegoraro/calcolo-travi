import Dexie from 'dexie';

export const db = new Dexie('EngToolboxDB');

db.version(1).stores({
  // Modulo A
  profilo:    '++id, nome, albo, piva',
  clienti:    '++id, ragioneSociale, piva, email, createdAt',
  preventivi: '++id, clienteId, numero, data, stato, totale, createdAt',
  prestazioni:'++id, preventivoId, descrizione, quantita, prezzoUnitario',

  // Modulo C
  travi:      '++id, nome, luce, profiloTipo, profiloSerie, createdAt',
  carichi:    '++id, traveId, tipo, valore, posizione, lunghezza',

  // Modulo D
  ancoraggi:  '++id, traveId, nome, tipo, config',

  // Sistema
  settings:   'key',
});

// ─── Helpers generici ────────────────────────────────────────────────────────

export async function getAll(table) {
  return db[table].toArray();
}

export async function getById(table, id) {
  return db[table].get(id);
}

export async function upsert(table, record) {
  if (record.id) {
    await db[table].put(record);
    return record.id;
  }
  record.createdAt = new Date().toISOString();
  return db[table].add(record);
}

export async function remove(table, id) {
  return db[table].delete(id);
}

// ─── Profilo ─────────────────────────────────────────────────────────────────

export async function getProfilo() {
  const items = await db.profilo.toArray();
  return items[0] || { nome: '', albo: '', piva: '', citta: '', tel: '', email: '' };
}

export async function saveProfilo(data) {
  const existing = await db.profilo.toArray();
  if (existing.length > 0) {
    await db.profilo.put({ ...data, id: existing[0].id });
  } else {
    await db.profilo.add(data);
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSetting(key, defaultVal = null) {
  const row = await db.settings.get(key);
  return row ? row.value : defaultVal;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// ─── Backup / Restore ────────────────────────────────────────────────────────

export async function exportDB() {
  const tables = ['profilo','clienti','preventivi','prestazioni','travi','carichi','ancoraggi','settings'];
  const backup = {};
  for (const t of tables) {
    backup[t] = await db[t].toArray();
  }
  backup.exportedAt = new Date().toISOString();
  backup.version = db.verno;
  return backup;
}

export async function importDB(backup) {
  const tables = ['profilo','clienti','preventivi','prestazioni','travi','carichi','ancoraggi','settings'];
  await db.transaction('rw', tables.map(t => db[t]), async () => {
    for (const t of tables) {
      if (backup[t]) {
        await db[t].clear();
        await db[t].bulkAdd(backup[t]);
      }
    }
  });
}
