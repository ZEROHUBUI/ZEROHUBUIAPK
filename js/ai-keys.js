// ai-keys.js — идоракунии калидҳои хизматрасониҳои Зеҳни сунъӣ.
// API Key-и хом ҳАРГИЗ ба сервери ZEROHUBUIAL фиристода намешавад — танҳо дар
// дастгоҳи худи корбар (IndexedDB) нигоҳ дошта мешавад ва мустақиман аз браузер
// ба хизматрасонии интихобшуда фиристода мешавад.
'use strict';

const AIKeys = {
  async list() {
    const items = await DB.getAll(DB.STORES.AI_KEYS);
    return items.sort((a, b) => (a.order || 0) - (b.order || 0));
  },

  async get(id) {
    return DB.get(DB.STORES.AI_KEYS, id);
  },

  async add({ name, service, apiKey, model, baseUrl }) {
    const all = await this.list();
    const item = {
      id: Utils.uid('key'),
      name: name || `Калиди ${all.length + 1}`,
      service: service || 'anthropic', // 'anthropic' | 'openai' | 'custom'
      apiKey,
      model: model || '',
      baseUrl: baseUrl || '',
      active: true,
      order: all.length,
      quotaBlockedUntil: 0,
      createdAt: Date.now()
    };
    await DB.put(DB.STORES.AI_KEYS, item);
    return item;
  },

  async update(id, patch) {
    const item = await this.get(id);
    if (!item) throw new Error('Калид ёфт нашуд.');
    Object.assign(item, patch);
    await DB.put(DB.STORES.AI_KEYS, item);
    return item;
  },

  async remove(id) {
    await DB.delete(DB.STORES.AI_KEYS, id);
  },

  async toggleActive(id) {
    const item = await this.get(id);
    if (!item) return;
    item.active = !item.active;
    await DB.put(DB.STORES.AI_KEYS, item);
    return item;
  },

  // Калиди навбатии фаъол ва бе манъи квота
  async nextAvailable(excludeIds = []) {
    const all = await this.list();
    const now = Date.now();
    return all.find((k) => k.active && !excludeIds.includes(k.id) && (!k.quotaBlockedUntil || k.quotaBlockedUntil < now)) || null;
  },

  async markQuotaBlocked(id, minutes = 30) {
    return this.update(id, { quotaBlockedUntil: Date.now() + minutes * 60 * 1000 });
  },

  // Санҷиши пайвастшавии воқеӣ — воқеан ба API дархост мефиристад
  async testConnection(id) {
    const key = await this.get(id);
    if (!key) throw new Error('Калид ёфт нашуд.');
    try {
      await AI.send(key, [{ role: 'user', content: 'ping' }], { maxTokens: 8 });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
};

window.AIKeys = AIKeys;
