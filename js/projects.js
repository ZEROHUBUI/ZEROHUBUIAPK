// projects.js — идоракунии воқеии лоиҳаҳо (IndexedDB)
'use strict';

const Projects = {
  async list() {
    const items = await DB.getAll(DB.STORES.PROJECTS);
    return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  async get(id) {
    return DB.get(DB.STORES.PROJECTS, id);
  },

  async create(name) {
    const now = Date.now();
    const project = {
      id: Utils.uid('proj'),
      name: name || 'Лоиҳаи беном',
      createdAt: now,
      updatedAt: now
    };
    await DB.put(DB.STORES.PROJECTS, project);

    // Файлҳои ибтидоии лоиҳа — воқеан сохта мешаванд, на тахминӣ
    const indexHtml = {
      id: Utils.uid('node'),
      projectId: project.id,
      parentId: null,
      type: 'file',
      name: 'index.html',
      content: `<!DOCTYPE html>\n<html lang="tj">\n<head>\n  <meta charset="UTF-8">\n  <title>${Utils.escapeHtml(project.name)}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Салом аз ${Utils.escapeHtml(project.name)}!</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n`,
      createdAt: now,
      updatedAt: now
    };
    const styleCss = {
      id: Utils.uid('node'),
      projectId: project.id,
      parentId: null,
      type: 'file',
      name: 'style.css',
      content: `body {\n  font-family: sans-serif;\n  background: #0f172a;\n  color: #e2e8f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  height: 100vh;\n  margin: 0;\n}\n`,
      createdAt: now,
      updatedAt: now
    };
    const scriptJs = {
      id: Utils.uid('node'),
      projectId: project.id,
      parentId: null,
      type: 'file',
      name: 'script.js',
      content: `console.log('Лоиҳа "${project.name}" иҷро шуд.');\n`,
      createdAt: now,
      updatedAt: now
    };
    await DB.put(DB.STORES.NODES, indexHtml);
    await DB.put(DB.STORES.NODES, styleCss);
    await DB.put(DB.STORES.NODES, scriptJs);

    return project;
  },

  async rename(id, newName) {
    const project = await this.get(id);
    if (!project) throw new Error('Лоиҳа ёфт нашуд.');
    project.name = newName;
    project.updatedAt = Date.now();
    await DB.put(DB.STORES.PROJECTS, project);
    return project;
  },

  async touch(id) {
    const project = await this.get(id);
    if (!project) return;
    project.updatedAt = Date.now();
    await DB.put(DB.STORES.PROJECTS, project);
  },

  async remove(id) {
    const nodes = await DB.getAllByIndex(DB.STORES.NODES, 'byProject', id);
    for (const n of nodes) await DB.delete(DB.STORES.NODES, n.id);
    const chats = await DB.getAllByIndex(DB.STORES.CHATS, 'byScope', id);
    for (const c of chats) await DB.delete(DB.STORES.CHATS, c.id);
    await DB.delete(DB.STORES.PROJECTS, id);
  },

  async stats(id) {
    const nodes = await DB.getAllByIndex(DB.STORES.NODES, 'byProject', id);
    const files = nodes.filter((n) => n.type === 'file');
    const folders = nodes.filter((n) => n.type === 'folder');
    const size = files.reduce((sum, f) => sum + (f.content ? new Blob([f.content]).size : (f.size || 0)), 0);
    return { fileCount: files.length, folderCount: folders.length, size };
  }
};

window.Projects = Projects;
