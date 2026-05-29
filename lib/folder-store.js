// lib/folder-store.js
// Stores browser folder handles in IndexedDB and rebuilds blob URLs after refresh.

const store = new Map(); // fileName → blobUrl
const handles = new Map(); // category:subjectId → FileSystemDirectoryHandle
const subjectFiles = new Map(); // category:subjectId → Set(fileNames)
const DB_NAME = "zenith-folder-store";
const DB_VERSION = 1;
const STORE_NAME = "handles";

function keyFor(subjectId, category = "course") {
  return `${category}:${subjectId}`;
}

function openDb() {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function persistHandle(key, handle) {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadPersistedHandle(key) {
  const db = await openDb();
  if (!db) return null;
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return handle;
}

async function deletePersistedHandle(key) {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function ensureReadable(handle) {
  if (!handle) return false;
  if (!handle.queryPermission) return true;
  const current = await handle.queryPermission({ mode: "read" });
  if (current === "granted") return true;
  if (!handle.requestPermission) return false;
  const requested = await handle.requestPermission({ mode: "read" });
  return requested === "granted";
}

export const folderStore = {
  // Store a blob URL for a file name
  set: (fileName, blobUrl) => store.set(fileName, blobUrl),

  // Get blob URL by file name
  get: (fileName) => store.get(fileName),

  // Check if a subject's folder is loaded
  hasSubject: (subjectId, category = "course") => handles.has(keyFor(subjectId, category)),

  hasSavedHandle: async (subjectId, category = "course") => {
    if (handles.has(keyFor(subjectId, category))) return true;
    return !!(await loadPersistedHandle(keyFor(subjectId, category)));
  },

  // Store directory handle for a subject
  setHandle: async (subjectId, handle, category = "course") => {
    const key = keyFor(subjectId, category);
    handles.set(key, handle);
    await persistHandle(key, handle);
  },

  // Get directory handle
  getHandle: (subjectId, category = "course") => handles.get(keyFor(subjectId, category)),

  // Load all videos from a directory handle into blob store
  loadFromHandle: async (handle, subjectId, category = "course", options = {}) => {
    const key = keyFor(subjectId, category);
    handles.set(key, handle);
    if (options.persist !== false) await persistHandle(key, handle);
    const loaded = [];
    const filesForSubject = new Set();
    async function collectFiles(dirHandle, path = "") {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file") {
          const file = await entry.getFile();
          const ext = file.name.split(".").pop().toLowerCase();
          const videoExts = ["mp4", "mkv", "webm", "mov", "avi", "m4v", "flv", "wmv", "ogg", "ogv", "ts", "mts", "m2ts", "3gp"];
          const docExts = ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "webp"];
          if (videoExts.includes(ext) || docExts.includes(ext)) {
            const url = URL.createObjectURL(file);
            const fullPath = path + file.name;
            store.set(file.name, url);
            store.set(fullPath, url);
            loaded.push(fullPath);
            filesForSubject.add(fullPath);
          }
        } else if (entry.kind === "directory") {
          await collectFiles(entry, path + entry.name + "/");
        }
      }
    }
    await collectFiles(handle);
    subjectFiles.set(key, filesForSubject);
    return loaded;
  },

  reconnect: async (subjectId, category = "course") => {
    const key = keyFor(subjectId, category);
    let handle = handles.get(key);
    if (!handle) handle = await loadPersistedHandle(key);
    if (!handle) return { ok: false, reason: "missing" };

    const readable = await ensureReadable(handle);
    if (!readable) return { ok: false, reason: "permission" };

    await folderStore.loadFromHandle(handle, subjectId, category, { persist: true });
    return { ok: true };
  },

  getFilesForSubject: (subjectId, category = "course") => {
    const set = subjectFiles.get(keyFor(subjectId, category));
    return set ? Array.from(set) : [];
  },

  // Get blob URL for a lecture — tries exact filename match
  getForLecture: (filePath) => {
    if (!filePath) return null;
    // Try exact match first
    if (store.has(filePath)) return store.get(filePath);
    // Try just the filename portion
    const fileName = filePath.split(/[\\/]/).pop();
    if (store.has(fileName)) return store.get(fileName);
    return null;
  },

  clear: (subjectId, category = "course") => {
    const key = keyFor(subjectId, category);
    handles.delete(key);
    subjectFiles.delete(key);
    deletePersistedHandle(key).catch(() => {});
  },
};
