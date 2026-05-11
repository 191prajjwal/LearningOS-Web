// lib/folder-store.js
// In-memory store mapping lecture file_name → blob URL
// Persists across navigation within a session, cleared on full reload

const store = new Map(); // fileName → blobUrl
const handles = new Map(); // category:subjectId → FileSystemDirectoryHandle
const subjectFiles = new Map(); // category:subjectId → Set(fileNames)

export const folderStore = {
  // Store a blob URL for a file name
  set: (fileName, blobUrl) => store.set(fileName, blobUrl),

  // Get blob URL by file name
  get: (fileName) => store.get(fileName),

  // Check if a subject's folder is loaded
  hasSubject: (subjectId, category = "course") => handles.has(`${category}:${subjectId}`),

  // Store directory handle for a subject
  setHandle: (subjectId, handle, category = "course") => handles.set(`${category}:${subjectId}`, handle),

  // Get directory handle
  getHandle: (subjectId, category = "course") => handles.get(`${category}:${subjectId}`),

  // Load all videos from a directory handle into blob store
  loadFromHandle: async (handle, subjectId, category = "course") => {
    const key = `${category}:${subjectId}`;
    handles.set(key, handle);
    const loaded = [];
    const filesForSubject = new Set();
    for await (const entry of handle.values()) {
      if (entry.kind === "file") {
        const file = await entry.getFile();
        const ext = file.name.split(".").pop().toLowerCase();
        const videoExts = ["mp4", "mkv", "webm", "mov", "avi", "m4v", "flv"];
        const docExts = ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "webp"];
        if (videoExts.includes(ext) || docExts.includes(ext)) {
          const url = URL.createObjectURL(file);
          store.set(file.name, url);
          loaded.push(file.name);
          filesForSubject.add(file.name);
        }
      }
    }
    subjectFiles.set(key, filesForSubject);
    return loaded;
  },

  getFilesForSubject: (subjectId, category = "course") => {
    const set = subjectFiles.get(`${category}:${subjectId}`);
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
    const key = `${category}:${subjectId}`;
    handles.delete(key);
    subjectFiles.delete(key);
  },
};