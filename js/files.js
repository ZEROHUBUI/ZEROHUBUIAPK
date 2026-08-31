// files.js — идоракунии воқеии файлҳо ва папкаҳо дар дохили лоиҳа
'use strict';

const Files = {
  async children(projectId, parentId = null) {
    const all = await DB.getAllByIndex(DB.STORES.NODES, 'byProject', projectId);
    const kids = all.filter((n) => (n.parentId || null) === (parentId || null));
    // ПАПКАҲО АВВАЛ, ФАЙЛҲО БАЪД
    kids.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, 'tg');
    });
    return kids;
  },

  async allInProject(projectId) {
    return DB.getAllByIndex(DB.STORES.NODES, 'byProject', projectId);
  },

  async get(nodeId) {
    return DB.get(DB.STORES.NODES, nodeId);
  },

  async siblingNameExists(projectId, parentId, name, excludeId = null) {
    const kids = await this.children(projectId, parentId);
    return kids.some((k) => k.name.toLowerCase() === name.toLowerCase() && k.id !== excludeId);
  },

  async createFolder(projectId, parentId, name) {
    if (await this.siblingNameExists(projectId, parentId, name)) {
      throw new Error(`Папкаи бо номи "${name}" аллакай вуҷуд дорад.`);
    }
    const now = Date.now();
    const node = {
      id: Utils.uid('node'), projectId, parentId: parentId || null,
      type: 'folder', name, createdAt: now, updatedAt: now
    };
    await DB.put(DB.STORES.NODES, node);
    await Projects.touch(projectId);
    return node;
  },

  async createFile(projectId, parentId, name, content = '') {
    if (await this.siblingNameExists(projectId, parentId, name)) {
      throw new Error(`Файли бо номи "${name}" аллакай вуҷуд дорад.`);
    }
    const now = Date.now();
    const node = {
      id: Utils.uid('node'), projectId, parentId: parentId || null,
      type: 'file', name, content, createdAt: now, updatedAt: now
    };
    await DB.put(DB.STORES.NODES, node);
    await Projects.touch(projectId);
    return node;
  },

  async rename(nodeId, newName) {
    const node = await this.get(nodeId);
    if (!node) throw new Error('Ин файл/папка ёфт нашуд.');
    if (await this.siblingNameExists(node.projectId, node.parentId, newName, nodeId)) {
      throw new Error(`Номи "${newName}" аллакай истифода шудааст.`);
    }
    node.name = newName;
    node.updatedAt = Date.now();
    await DB.put(DB.STORES.NODES, node);
    await Projects.touch(node.projectId);
    return node;
  },

  async updateContent(nodeId, content) {
    const node = await this.get(nodeId);
    if (!node) throw new Error('Файл ёфт нашуд.');
    node.content = content;
    node.updatedAt = Date.now();
    await DB.put(DB.STORES.NODES, node);
    await Projects.touch(node.projectId);
    return node;
  },

  async delete(nodeId) {
    const node = await this.get(nodeId);
    if (!node) return;
    if (node.type === 'folder') {
      const kids = await this.children(node.projectId, node.id);
      for (const k of kids) await this.delete(k.id);
    }
    await DB.delete(DB.STORES.NODES, nodeId);
    await Projects.touch(node.projectId);
  },

  async move(nodeId, newParentId) {
    const node = await this.get(nodeId);
    if (!node) throw new Error('Ёфт нашуд.');
    // пешгирии ҷойивазкунии папка ба зерпапкаи худаш
    if (node.type === 'folder') {
      let cursor = newParentId;
      while (cursor) {
        if (cursor === node.id) throw new Error('Папкаро ба дохили худаш гузарондан мумкин нест.');
        const p = await this.get(cursor);
        cursor = p ? p.parentId : null;
      }
    }
    if (await this.siblingNameExists(node.projectId, newParentId, node.name, nodeId)) {
      throw new Error('Дар мақсад файл/папкаи ҳамин ном аллакай ҳаст.');
    }
    node.parentId = newParentId || null;
    node.updatedAt = Date.now();
    await DB.put(DB.STORES.NODES, node);
    return node;
  },

  async duplicate(nodeId) {
    const node = await this.get(nodeId);
    if (!node) throw new Error('Ёфт нашуд.');
    const copyName = this._copyName(node.name);
    if (node.type === 'file') {
      return this.createFile(node.projectId, node.parentId, copyName, node.content);
    }
    const folder = await this.createFolder(node.projectId, node.parentId, copyName);
    const kids = await this.children(node.projectId, node.id);
    for (const k of kids) await this._duplicateInto(k, folder.id);
    return folder;
  },

  async _duplicateInto(node, newParentId) {
    if (node.type === 'file') {
      return this.createFile(node.projectId, newParentId, node.name, node.content);
    }
    const folder = await this.createFolder(node.projectId, newParentId, node.name);
    const kids = await this.children(node.projectId, node.id);
    for (const k of kids) await this._duplicateInto(k, folder.id);
    return folder;
  },

  _copyName(name) {
    const dot = name.lastIndexOf('.');
    if (dot > 0) return `${name.slice(0, dot)} (нусха)${name.slice(dot)}`;
    return `${name} (нусха)`;
  },

  async pathOf(nodeId) {
    const parts = [];
    let cursor = await this.get(nodeId);
    while (cursor) {
      parts.unshift(cursor.name);
      cursor = cursor.parentId ? await this.get(cursor.parentId) : null;
    }
    return parts.join('/');
  }
};

window.Files = Files;
