// chat.js — чати воқеии Зеҳни сунъӣ дар дохили лоиҳа, ва AL CHAT (чат-мудири умумӣ).
// Ягон амали тағйирдиҳанда (сохтан/тағйир/несткунии файл) бе тасдиқи корбар иҷро намешавад.
'use strict';

const ACTION_BLOCK_RE = /```zh-action\s*([\s\S]*?)```/g;

const Chat = {
  el: null,
  scope: null,     // projectId барои чати лоиҳа, ё 'AL_CHAT' барои чат-мудири умумӣ
  history: [],

  mount(container) {
    this.el = container;
  },

  async load(scope) {
    this.scope = scope;
    const existing = (await DB.getAllByIndex(DB.STORES.CHATS, 'byScope', scope))[0];
    if (existing) {
      this.history = existing.messages || [];
    } else {
      this.history = [];
      await DB.put(DB.STORES.CHATS, { id: Utils.uid('chat'), scope, messages: [] });
    }
  },

  async _persist() {
    const rec = (await DB.getAllByIndex(DB.STORES.CHATS, 'byScope', this.scope))[0];
    if (rec) {
      rec.messages = this.history;
      await DB.put(DB.STORES.CHATS, rec);
    }
  },

  async clearHistory(scope) {
    const rec = (await DB.getAllByIndex(DB.STORES.CHATS, 'byScope', scope))[0];
    if (rec) {
      rec.messages = [];
      await DB.put(DB.STORES.CHATS, rec);
    }
    if (this.scope === scope) this.history = [];
  },

  async buildProjectContext(projectId) {
    const project = await Projects.get(projectId);
    const nodes = await Files.allInProject(projectId);
    const tree = nodes.map((n) => ({ path: null, type: n.type, name: n.name, id: n.id, parentId: n.parentId }));
    // сохтани роҳҳои пурра
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
    const files = nodes.filter((n) => n.type === 'file').map((n) => ({
      path: pathById[n.id],
      content: (n.content || '').slice(0, 4000)
    }));
    return { projectName: project ? project.name : '', fileTree: Object.values(pathById), files };
  },

  systemPromptForProject(ctx) {
    return `Ту дастёри Зеҳни сунъӣ дар дохили лоиҳаи "${ctx.projectName}" дар ZEROHUBUIAL ҳастӣ.
Контексти лоиҳа:
Файлҳо: ${ctx.fileTree.join(', ') || '(холӣ)'}

Мазмуни файлҳо (кӯтоҳшуда):
${ctx.files.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n')}

Агар корбар хоҳад, ки файл/папка сохта, тағйир дода ё нест карда шавад, дар охири ҷавоби худ як блоки зерин илова кун (ин пешниҳод аст, на иҷрои фаврӣ — корбар бояд тасдиқ кунад):
\`\`\`zh-action
{"action":"create_file|create_folder|edit_file|delete_node|rename_node","path":"pages/about.html","content":"...","newName":"..."}
\`\`\`
Дар матни оддии ҷавоб бо забони тоҷикӣ ҷавоб деҳ.`;
  },

  systemPromptForAlChat() {
    return `Номи ту ZEROHUBUIAL аст, шахсияти намоишии ту "Азиззода Валиҷон" номида мешавад.
Ту чат-мудири умумии барномаи ZEROHUBUIAL ҳастӣ — платформае, ки корбар дар он вебсайти
HTML/CSS/JS месозад ва баъд ба APK-и воқеии Android табдил медиҳад. Бо забони тоҷикӣ ва
муфид ҷавоб деҳ.`;
  },

  async sendProjectMessage(projectId, userText) {
    this.history.push({ role: 'user', content: userText, ts: Date.now() });
    await this._persist();

    const ctx = await this.buildProjectContext(projectId);
    const messages = [
      { role: 'user', content: this.systemPromptForProject(ctx) },
      ...this.history.slice(-12).map((m) => ({ role: m.role, content: m.content }))
    ];

    const result = await AI.sendWithRotation(messages);
    const reply = result.text || '(ҷавоби холӣ)';
    const actions = this._extractActions(reply);
    this.history.push({ role: 'assistant', content: reply, actions, ts: Date.now() });
    await this._persist();
    return { reply, actions };
  },

  async sendAlChatMessage(userText) {
    this.history.push({ role: 'user', content: userText, ts: Date.now() });
    await this._persist();
    const messages = [
      { role: 'user', content: this.systemPromptForAlChat() },
      ...this.history.slice(-12).map((m) => ({ role: m.role, content: m.content }))
    ];
    const result = await AI.sendWithRotation(messages);
    const reply = result.text || '(ҷавоби холӣ)';
    this.history.push({ role: 'assistant', content: reply, ts: Date.now() });
    await this._persist();
    return { reply };
  },

  _extractActions(text) {
    const actions = [];
    let m;
    ACTION_BLOCK_RE.lastIndex = 0;
    while ((m = ACTION_BLOCK_RE.exec(text))) {
      try { actions.push(JSON.parse(m[1].trim())); } catch { /* блоки нодуруст — сарфи назар */ }
    }
    return actions;
  },

  // Иҷрои амал ФАҚАТ пас аз тасдиқи корбар
  async applyAction(projectId, action) {
    const findByPath = async (path) => {
      const nodes = await Files.allInProject(projectId);
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
      const found = nodes.find((n) => pathById[n.id] === path);
      return found || null;
    };

    const splitPath = (path) => {
      const parts = path.split('/').filter(Boolean);
      const name = parts.pop();
      return { parts, name };
    };

    const ensureFolders = async (parts) => {
      let parentId = null;
      for (const part of parts) {
        const kids = await Files.children(projectId, parentId);
        let found = kids.find((k) => k.type === 'folder' && k.name === part);
        if (!found) found = await Files.createFolder(projectId, parentId, part);
        parentId = found.id;
      }
      return parentId;
    };

    switch (action.action) {
      case 'create_file': {
        const { parts, name } = splitPath(action.path);
        const parentId = await ensureFolders(parts);
        return Files.createFile(projectId, parentId, name, action.content || '');
      }
      case 'create_folder': {
        const { parts, name } = splitPath(action.path);
        const parentId = await ensureFolders(parts);
        return Files.createFolder(projectId, parentId, name);
      }
      case 'edit_file': {
        const node = await findByPath(action.path);
        if (!node) throw new Error(`Файли "${action.path}" ёфт нашуд.`);
        return Files.updateContent(node.id, action.content || '');
      }
      case 'delete_node': {
        const node = await findByPath(action.path);
        if (!node) throw new Error(`"${action.path}" ёфт нашуд.`);
        return Files.delete(node.id);
      }
      case 'rename_node': {
        const node = await findByPath(action.path);
        if (!node) throw new Error(`"${action.path}" ёфт нашуд.`);
        return Files.rename(node.id, action.newName);
      }
      default:
        throw new Error(`Амали номаълум: ${action.action}`);
    }
  }
};

window.Chat = Chat;
