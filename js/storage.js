// storage.js — қабати воқеии нигоҳдории маълумот (IndexedDB барои маълумоти калон,
// localStorage барои танзимоти хурд). Ҳеҷ маълумот ба сервер фиристода намешавад.
'use strict';

const DB_NAME = 'zerohubuial_db';
const DB_VERSION = 1;

const STORES = {
  PROJECTS: 'projects',
  NODES: 'nodes',       // файлҳо ва папкаҳо
  CHATS: 'chats',       // таърихи чат (ҳам AI дохили лоиҳа, ҳам AL CHAT)
  AI_KEYS: 'ai_keys',
  BUILDS: 'builds'      // таърихи сохтмонҳои APK
};

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.NODES)) {
        const nodeStore = db.createObjectStore(STORES.NODES, { keyPath: 'id' });
        nodeStore.createIndex('byProject', 'projectId', { unique: false });
        nodeStore.createIndex('byParent', 'parentId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.CHATS)) {
        const chatStore = db.createObjectStore(STORES.CHATS, { keyPath: 'id' });
        chatStore.createIndex('byScope', 'scope', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.AI_KEYS)) {
        db.createObjectStore(STORES.AI_KEYS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.BUILDS)) {
        const buildStore = db.createObjectStore(STORES.BUILDS, { keyPath: 'id' });
        buildStore.createIndex('byProject', 'projectId', { unique: false });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

const DB = {
  STORES,

  async put(storeName, value) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.put(value);
      r.onsuccess = () => resolve(value);
      r.onerror = () => reject(r.error);
    });
  },

  async get(storeName, id) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const r = store.get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  },

  async delete(storeName, id) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.delete(id);
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  },

  async getAll(storeName) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  },

  async getAllByIndex(storeName, indexName, value) {
    const store = await tx(storeName);
    return new Promise((resolve, reject) => {
      const idx = store.index(indexName);
      const r = idx.getAll(value);
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  },

  async clearStore(storeName) {
    const store = await tx(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const r = store.clear();
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  },

  async clearAll() {
    for (const s of Object.values(STORES)) {
      await this.clearStore(s);
    }
  }
};

// ---- localStorage барои танзимоти хурд ----
const LS_PREFIX = 'zh_';
const Settings = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Хатои нигоҳдории localStorage:', e);
    }
  },
  remove(key) {
    localStorage.removeItem(LS_PREFIX + key);
  },
  clearAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(LS_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }
};

window.DB = DB;
window.Settings = Settings;
