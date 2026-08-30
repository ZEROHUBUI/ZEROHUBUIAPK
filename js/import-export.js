// import-export.js — содирот/воридоти воқеии маълумот (JSON) ва лоиҳа ба ZIP
'use strict';

const ImportExport = {
  async exportAll() {
    const [projects, nodes, chats, keys] = await Promise.all([
      DB.getAll(DB.STORES.PROJECTS),
      DB.getAll(DB.STORES.NODES),
      DB.getAll(DB.STORES.CHATS),
      DB.getAll(DB.STORES.AI_KEYS)
    ]);
    const bundle = {
      app: 'ZEROHUBUIAL',
      exportedAt: new Date().toISOString(),
      version: 1,
      projects, nodes, chats,
      // Эзоҳ: калидҳои API дар содирот НАМЕОЯНД, зеро онҳо ҳассосанд.
      aiKeysMeta: keys.map((k) => ({ name: k.name, service: k.service, model: k.model }))
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    Utils.downloadBlob(blob, `zerohubuial-export-${Date.now()}.json`);
    Notify.success('Содирот омода шуд (калидҳои API дохил карда нашуданд).');
  },

  async importAll(file) {
    try {
      const text = await Utils.readFileAsText(file);
      const data = JSON.parse(text);
      if (data.app !== 'ZEROHUBUIAL') throw new Error('Ин файли содироти ZEROHUBUIAL нест.');
      for (const p of data.projects || []) await DB.put(DB.STORES.PROJECTS, p);
      for (const n of data.nodes || []) await DB.put(DB.STORES.NODES, n);
      for (const c of data.chats || []) await DB.put(DB.STORES.CHATS, c);
      Notify.success(`Воридот тайёр шуд: ${(data.projects || []).length} лоиҳа.`);
      document.dispatchEvent(new CustomEvent('zh:data-imported'));
    } catch (e) {
      Notify.error('Хатои воридот: ' + e.message);
    }
  },

  async exportProjectAsZip(projectId) {
    if (typeof JSZip === 'undefined') {
      Notify.error('Китобхонаи ZIP бор нашудааст (пайвасти интернет лозим аст).');
      return;
    }
    const project = await Projects.get(projectId);
    const nodes = await Files.allInProject(projectId);
    const zip = new JSZip();

    const pathById = {};
    const buildPath = (id) => {
      if (pathById[id]) return pathById[id];
      const n = nodes.find((x) => x.id === id);
      if (!n) return '';
      const p = n.parentId ? buildPath(n.parentId) + '/' + n.name : n.name;
      pathById[id] = p;
      return p;
    };
    nodes.forEach((n) => buildPath(n.id));

    nodes.filter((n) => n.type === 'file').forEach((n) => {
      zip.file(pathById[n.id], n.content || '');
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    Utils.downloadBlob(blob, `${(project.name || 'project').replace(/\s+/g, '-')}.zip`);
    Notify.success('Лоиҳа ҳамчун ZIP содир шуд.');
  }
};

window.ImportExport = ImportExport;
