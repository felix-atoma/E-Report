const DB_NAME = 'novabulletin-offline';
const STORE   = 'grade-queue';
const DB_VER  = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function enqueueGrade(entry) {
  return tx('readwrite', (store) => store.add({ ...entry, queuedAt: Date.now() }));
}

export async function dequeueAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function removeFromQueue(id) {
  return tx('readwrite', (store) => store.delete(id));
}

export async function queueCount() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
