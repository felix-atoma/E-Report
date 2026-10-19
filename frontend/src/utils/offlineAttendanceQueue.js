import { attendanceService } from '../services/attendanceService';

/**
 * Appels faits sans internet : gardés sur l'appareil (IndexedDB) puis envoyés automatiquement au
 * retour du réseau. Une séance (classe + date + matière + heure) n'est gardée qu'une fois : refaire
 * l'appel hors ligne remplace la version précédente.
 */
const DB_NAME = 'novabulletin-offline-attendance';
const STORE = 'attendance-queue';
const EVENT = 'offline-attendance-change';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE, { keyPath: 'key' });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function run(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const notify = () => window.dispatchEvent(new Event(EVENT));
const keyOf = (p) => [p.classId, p.date, p.subjectId ?? '', p.startTime ?? ''].join('|');

export async function enqueueAttendance(payload, meta = {}) {
  await run('readwrite', (s) => s.put({ key: keyOf(payload), payload, meta, queuedAt: Date.now() }));
  notify();
}

export const pendingAttendance = () => run('readonly', (s) => s.getAll());
export const pendingAttendanceCount = () => run('readonly', (s) => s.count());

/** Erreur due à l'absence de réseau (et non un refus du serveur). */
export const isNetworkError = (err) => !navigator.onLine || err?.code === 'ERR_NETWORK' || (!err?.response && !!err?.request);

let syncing = null;
/** Envoie les appels en attente ; renvoie le nombre envoyé. Un appel refusé par le serveur est retiré. */
export function syncAttendanceQueue() {
  if (syncing) return syncing;
  syncing = (async () => {
    let sent = 0;
    try {
      const items = await pendingAttendance();
      for (const item of items) {
        try {
          await attendanceService.bulkUpsert(item.payload);
          sent++;
          await run('readwrite', (s) => s.delete(item.key));
        } catch (err) {
          if (isNetworkError(err)) break; // toujours hors ligne : on réessaiera
          // Refus définitif (classe supprimée, droits…) : on ne bloque pas les autres appels
          await run('readwrite', (s) => s.delete(item.key));
        }
      }
    } catch { /* IndexedDB indisponible */ }
    notify();
    return sent;
  })().finally(() => { syncing = null; });
  return syncing;
}

export function onAttendanceQueueChange(fn) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
