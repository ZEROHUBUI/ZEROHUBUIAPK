// app.js — назорати марказии барнома: экранҳо, роутинг, ҳодисаҳо
'use strict';

const App = {
  currentProjectId: null,
  currentFileId: null,

  async init() {
    Notify.init();
    this._wireGlobalErrorReporting();
    await this._checkEnvironment();
    this.applyTheme();
    this._wireIntro();
    this._wireHeader();
    this._wireSideMenu();

    Router
      .on('/home', () => this.showView('home'))
      .on('/projects', () => this._safe(this._renderProjects))
      .on('/project/:id', (p) => this._safe(() => this._renderProjectDetail(p.id)))
      .on('/editor/:projectId/:fileId', (p) => this._safe(() => this._renderEditor(p.projectId, p.fileId)))
      .on('/ai-keys', () => this._safe(this._renderAiKeys))
      .on('/chat/:projectId', (p) => this._safe(() => this._renderProjectChat(p.projectId)))
      .on('/al-chat', () => this._safe(this._renderAlChat))
      .on('/settings', () => this._safe(() => { this.showView('settings'); SettingsUI.mount(document.getElementById('view-settings')); SettingsUI.render(); }))
      .on('/builder/:projectId', (p) => this._safe(() => this._renderBuilder(p.projectId)));

    document.addEventListener('zh:run-error', (e) => this._onRunError(e.detail.message));

    Router.start();
    this._maybeShowIntro();
  },

  // Иҷрои бехатари ҳар render — хатои воқеӣ ба toast мебарояд, на пинҳон мешавад
  async _safe(fn) {
    try {
      await fn.call(this);
    } catch (e) {
      console.error(e);
      Notify.error('Хатои экран: ' + (e && e.message ? e.message : String(e)));
    }
  },

  // Ҳар хатои JavaScript-и сабтнашуда ва Promise-и радшуда ба корбар нишон дода мешавад
  _wireGlobalErrorReporting() {
    window.addEventListener('error', (e) => {
      console.error(e.error || e.message);
      Notify.error('Хатои JavaScript: ' + (e.message || 'номаълум'));
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error(e.reason);
      const msg = (e.reason && e.reason.message) || String(e.reason);
      Notify.error('Хатои иҷронашуда: ' + msg);
    });
  },

  // Санҷиши муҳити воқеӣ: агар IndexedDB дастнорас бошад (масалан кушодан аз
  // file:// бе сервер), ба корбар роҳи ҳали равшан нишон дода мешавад — на
  // шикасти хомӯш.
  async _checkEnvironment() {
    const banner = () => {
      const el = document.createElement('div');
      el.className = 'env-warning glass-panel';
      el.innerHTML = `
        <strong>⚠ Барнома наметавонад маълумотро нигоҳ дорад.</strong>
        <p>Эҳтимол шумо ин файлро мустақим (file://) кушодаед. Лутфан онро аз
        сервери маҳаллӣ кушоед, масалан:</p>
        <code>npx serve .</code>
        <p>ё</p>
        <code>python3 -m http.server</code>
        <button class="btn btn--sm" id="env-warning-close">Фаҳмидам</button>`;
      document.body.appendChild(el);
      el.querySelector('#env-warning-close').onclick = () => el.remove();
    };

    if (typeof indexedDB === 'undefined' || !indexedDB) {
      banner();
      return;
    }
    try {
      await DB.getAll(DB.STORES.PROJECTS); // санҷиши воқеии кушодашавии база
    } catch (e) {
      console.error('IndexedDB дастнорас аст:', e);
      banner();
    }
  },

  applyTheme() {
    const theme = Settings.get('theme', 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  },

  showView(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('view--active'));
    const el = document.getElementById('view-' + name);
    if (el) el.classList.add('view--active');
    document.getElementById('side-menu').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('open');
  },

  // ---------- INTRO ----------
  _maybeShowIntro() {
    const seen = Settings.get('introSeen', false);
    const introScreen = document.getElementById('intro-screen');
    if (seen) { introScreen.hidden = true; return; }
    introScreen.hidden = false;
    const video = document.getElementById('intro-video');
    video.addEventListener('ended', () => this._finishIntro());
    video.addEventListener('error', () => this._finishIntro()); // assets/intro.mp4 то ҳол гузошта нашудааст
    video.play().catch(() => this._finishIntro());
  },

  _wireIntro() {
    document.getElementById('intro-skip').addEventListener('click', () => this._finishIntro());
  },

  _finishIntro() {
    Settings.set('introSeen', true);
    const introScreen = document.getElementById('intro-screen');
    introScreen.classList.add('fade-out');
    setTimeout(() => { introScreen.hidden = true; }, 400);
  },

  // ---------- HEADER / MENU ----------
  _wireHeader() {
    document.getElementById('menu-toggle').addEventListener('click', () => this._toggleMenu(true));
    document.getElementById('menu-overlay').addEventListener('click', () => this._toggleMenu(false));
    document.getElementById('theme-toggle').addEventListener('click', () => {
      const cur = Settings.get('theme', 'dark');
      Settings.set('theme', cur === 'dark' ? 'light' : 'dark');
      this.applyTheme();
    });
    document.getElementById('back-btn').addEventListener('click', () => Router.back());
  },

  _toggleMenu(open) {
    document.getElementById('side-menu').classList.toggle('open', open);
    document.getElementById('menu-overlay').classList.toggle('open', open);
  },

  _wireSideMenu() {
    document.querySelectorAll('[data-go]').forEach((btn) => {
      btn.addEventListener('click', () => Router.go(btn.dataset.go));
    });
  },

  // ---------- PROJECTS LIST ----------
  async _renderProjects() {
    this.showView('projects');
    const listEl = document.getElementById('projects-list');
    const projects = await Projects.list();
    listEl.innerHTML = projects.length ? '' : '<p class="empty-hint">Ҳанӯз лоиҳае нест. Тугмаи "+"-ро пахш кунед.</p>';
    for (const p of projects) {
      const stats = await Projects.stats(p.id);
      const card = document.createElement('div');
      card.className = 'project-card glass-panel';
      card.innerHTML = `
        <div class="project-card__main">
          <h3>${Utils.escapeHtml(p.name)}</h3>
          <p>${stats.fileCount} файл · ${stats.folderCount} папка · ${Utils.formatBytes(stats.size)}</p>
          <p class="project-card__date">${Utils.formatDate(p.updatedAt)}</p>
        </div>
        <button class="icon-btn project-card__menu" data-id="${p.id}">⋮</button>`;
      card.querySelector('.project-card__main').addEventListener('click', () => Router.go(`#/project/${p.id}`));
      card.querySelector('.project-card__menu').addEventListener('click', (e) => {
        e.stopPropagation();
        this._projectMenu(p);
      });
      listEl.appendChild(card);
    }
  },

  async _projectMenu(project) {
    const action = await this._pickOption(project.name, [
      { key: 'open', label: 'Кушодан' },
      { key: 'rename', label: 'Номи нав' },
      { key: 'export', label: 'Содирот ба ZIP' },
      { key: 'delete', label: 'Нест кардан', danger: true }
    ]);
    if (action === 'open') Router.go(`#/project/${project.id}`);
    if (action === 'rename') {
      const name = await Notify.promptDialog('Номи нави лоиҳа', project.name);
      if (name) { await Projects.rename(project.id, name); this._renderProjects(); }
    }
    if (action === 'export') ImportExport.exportProjectAsZip(project.id);
    if (action === 'delete') {
      const ok = await Notify.confirmDialog('Нест кардани лоиҳа', `Лоиҳаи "${project.name}" бо ҳамаи файлҳояш бебозгашт нест мешавад.`, 'НЕСТ КАРДАН');
      if (ok) { await Projects.remove(project.id); this._renderProjects(); Notify.success('Лоиҳа нест шуд.'); }
    }
  },

  // менюи интихобӣ (иваз мекунад menu-ро бо тугмаҳои шишагӣ)
  _pickOption(title, options) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal glass-panel action-sheet">
          <h3 class="modal__title">${Utils.escapeHtml(title)}</h3>
          <div class="action-sheet__list">
            ${options.map((o) => `<button class="action-sheet__item ${o.danger ? 'danger' : ''}" data-key="${o.key}">${o.label}</button>`).join('')}
          </div>
          <button class="btn btn--ghost btn--block" data-key="__cancel">БЕКОР</button>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      const close = (val) => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); resolve(val); };
      overlay.querySelectorAll('[data-key]').forEach((btn) => {
        btn.onclick = () => close(btn.dataset.key === '__cancel' ? null : btn.dataset.key);
      });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  },

  _wireNewProjectBtn() {
    document.getElementById('new-project-btn').addEventListener('click', async () => {
      const name = await Notify.promptDialog('Номи лоиҳаи нав', 'Лоиҳаи нав');
      if (!name) return;
      const p = await Projects.create(name);
      Notify.success('Лоиҳа сохта шуд.');
      Router.go(`#/project/${p.id}`);
    });
  },

  // ---------- PROJECT DETAIL (файлҳо/папкаҳо) ----------
  async _renderProjectDetail(projectId) {
    this.currentProjectId = projectId;
    this.showView('project');
    const project = await Projects.get(projectId);
    if (!project) { Router.go('#/projects'); return; }
    document.getElementById('project-title').textContent = project.name;
    this._treeParentStack = [null];
    await this._renderTreeLevel(projectId, null);

    document.getElementById('pt-new-folder').onclick = () => this._createNode(projectId, 'folder');
    document.getElementById('pt-new-file').onclick = () => this._createNode(projectId, 'file');
    document.getElementById('pt-ai').onclick = () => Router.go(`#/chat/${projectId}`);
    document.getElementById('pt-import').onclick = () => this._importFiles(projectId);
    document.getElementById('pt-build').onclick = () => Router.go(`#/builder/${projectId}`);
  },

  async _renderTreeLevel(projectId, parentId) {
    const treeEl = document.getElementById('project-tree');
    const kids = await Files.children(projectId, parentId);

    // хатти масир (breadcrumb)
    const crumbEl = document.getElementById('project-breadcrumb');
    const crumbs = [];
    let cursor = parentId;
    while (cursor) {
      const n = await Files.get(cursor);
      crumbs.unshift(n);
      cursor = n ? n.parentId : null;
    }
    crumbEl.innerHTML = `<span data-parent="" class="crumb">лоиҳа</span>` +
      crumbs.map((n) => `<span class="crumb-sep">/</span><span class="crumb" data-parent="${n.id}">${Utils.escapeHtml(n.name)}</span>`).join('');
    crumbEl.querySelectorAll('.crumb').forEach((c) => {
      c.onclick = () => this._renderTreeLevel(projectId, c.dataset.parent || null);
    });

    treeEl.innerHTML = kids.length ? '' : '<p class="empty-hint">Ин папка холист.</p>';
    for (const node of kids) {
      const row = document.createElement('div');
      row.className = 'tree-row glass-row';
      row.innerHTML = `
        <span class="tree-row__icon">${Utils.iconForNode(node.type, node.name)}</span>
        <span class="tree-row__name"></span>
        <button class="icon-btn tree-row__menu">⋮</button>`;
      row.querySelector('.tree-row__name').textContent = node.name;
      row.querySelector('.tree-row__name').addEventListener('click', () => {
        if (node.type === 'folder') this._renderTreeLevel(projectId, node.id);
        else Router.go(`#/editor/${projectId}/${node.id}`);
      });
      row.querySelector('.tree-row__menu').addEventListener('click', (e) => {
        e.stopPropagation();
        this._nodeMenu(node, parentId);
      });
      treeEl.appendChild(row);
    }
  },

  async _nodeMenu(node, currentParentId) {
    const opts = [{ key: 'open', label: 'Кушодан' }];
    if (node.type === 'folder') {
      opts.push({ key: 'new-file', label: 'Эҷоди файл' }, { key: 'new-folder', label: 'Эҷоди папка' });
    }
    opts.push(
      { key: 'rename', label: 'Номи нав' },
      { key: 'duplicate', label: 'Нусха гирифтан' },
      { key: 'move', label: 'Ҷойивазкунӣ' },
      { key: 'delete', label: 'Нест кардан', danger: true }
    );
    const action = await this._pickOption(node.name, opts);
    if (!action) return;

    if (action === 'open') {
      if (node.type === 'folder') this._renderTreeLevel(node.projectId, node.id);
      else Router.go(`#/editor/${node.projectId}/${node.id}`);
    }
    if (action === 'new-file') this._createNode(node.projectId, 'file', node.id);
    if (action === 'new-folder') this._createNode(node.projectId, 'folder', node.id);
    if (action === 'rename') {
      const name = await Notify.promptDialog('Номи нав', node.name);
      if (name) {
        try { await Files.rename(node.id, name); this._renderTreeLevel(node.projectId, currentParentId); }
        catch (e) { Notify.error(e.message); }
      }
    }
    if (action === 'duplicate') {
      try { await Files.duplicate(node.id); this._renderTreeLevel(node.projectId, currentParentId); Notify.success('Нусха гирифта шуд.'); }
      catch (e) { Notify.error(e.message); }
    }
    if (action === 'move') {
      const targetId = await this._pickFolder(node.projectId, node.id);
      if (targetId !== undefined) {
        try { await Files.move(node.id, targetId); this._renderTreeLevel(node.projectId, currentParentId); Notify.success('Ҷойивазкунӣ анҷом ёфт.'); }
        catch (e) { Notify.error(e.message); }
      }
    }
    if (action === 'delete') {
      const ok = await Notify.confirmDialog('Нест кардан', `"${node.name}"-ро бо тамоми мундариҷааш нест кунам?`, 'НЕСТ КАРДАН');
      if (ok) { await Files.delete(node.id); this._renderTreeLevel(node.projectId, currentParentId); Notify.success('Нест шуд.'); }
    }
  },

  async _pickFolder(projectId, excludeId) {
    const all = await Files.allInProject(projectId);
    const folders = all.filter((n) => n.type === 'folder' && n.id !== excludeId);
    const pathById = {};
    const buildPath = (id) => {
      if (pathById[id]) return pathById[id];
      const n = all.find((x) => x.id === id);
      if (!n) return '';
      const p = n.parentId ? buildPath(n.parentId) + '/' + n.name : n.name;
      pathById[id] = p;
      return p;
    };
    folders.forEach((f) => buildPath(f.id));
    const options = [{ key: 'root', label: '(реша)' }].concat(
      folders.map((f) => ({ key: f.id, label: pathById[f.id] }))
    );
    const result = await this._pickOption('Ба куҷо гузаронда шавад?', options);
    if (result === null) return undefined;
    return result === 'root' ? null : result;
  },

  async _createNode(projectId, type, parentId = null) {
    const label = type === 'folder' ? 'Номи папка' : 'Номи файл';
    const def = type === 'folder' ? '' : 'file.html';
    const name = await Notify.promptDialog(label, def);
    if (!name) return;
    try {
      if (type === 'folder') await Files.createFolder(projectId, parentId, name);
      else await Files.createFile(projectId, parentId, name, '');
      this._renderTreeLevel(projectId, parentId);
      Notify.success((type === 'folder' ? 'Папка' : 'Файл') + ' сохта шуд.');
    } catch (e) {
      Notify.error(e.message);
    }
  },

  async _importFiles(projectId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.html,.htm,.css,.js,.json,.txt,.svg,image/*,video/*,.zip';
    input.onchange = async () => {
      for (const file of Array.from(input.files)) {
        try {
          const content = Utils.isTextFile(file.name) ? await Utils.readFileAsText(file) : await Utils.readFileAsDataURL(file);
          await Files.createFile(projectId, null, file.name, content);
        } catch (e) {
          Notify.error(`Хатои ворид кардани ${file.name}: ${e.message}`);
        }
      }
      Notify.success('Файлҳо ворид карда шуданд.');
      this._renderTreeLevel(projectId, null);
    };
    input.click();
  },

  // ---------- EDITOR + RUN + CONSOLE ----------
  async _renderEditor(projectId, fileId) {
    this.currentProjectId = projectId;
    this.currentFileId = fileId;
    this.showView('editor');
    const node = await Files.get(fileId);
    if (!node) { Router.go(`#/project/${projectId}`); return; }

    Editor.mount(document.getElementById('editor-container'));
    await Editor.open(node);

    Run.mount(document.getElementById('run-container'));
    Console.mount(document.getElementById('console-container'));

    document.getElementById('editor-tab-code').onclick = () => this._editorTab('code');
    document.getElementById('editor-tab-run').onclick = () => this._editorTab('run');
    document.getElementById('editor-run-btn').onclick = async () => {
      await Editor.forceSave();
      this._editorTab('run');
      await Run.execute(projectId);
    };
    this._editorTab('code');
  },

  _editorTab(tab) {
    document.getElementById('editor-container').hidden = tab !== 'code';
    document.getElementById('run-panel').hidden = tab !== 'run';
    document.getElementById('editor-tab-code').classList.toggle('active', tab === 'code');
    document.getElementById('editor-tab-run').classList.toggle('active', tab === 'run');
  },

  async _onRunError(message) {
    const bar = document.getElementById('error-banner');
    bar.hidden = false;
    document.getElementById('error-banner-text').textContent = message;
    document.getElementById('error-fix-yes').onclick = () => this._askAiToFix(message);
    document.getElementById('error-fix-no').onclick = () => { bar.hidden = true; };
  },

  async _askAiToFix(errorMessage) {
    document.getElementById('error-banner').hidden = true;
    Notify.info('Зеҳни сунъӣ хатогиро таҳлил мекунад...');
    try {
      const node = await Files.get(this.currentFileId);
      await Chat.load(this.currentProjectId);
      const { reply, actions } = await Chat.sendProjectMessage(
        this.currentProjectId,
        `Дар файли "${node.name}" ин хатогӣ пайдо шуд: "${errorMessage}". Лутфан онро ислоҳ кун ва тавассути блоки zh-action (edit_file) тағйироти пешниҳодшударо пешниҳод кун.`
      );
      if (actions.length) {
        await this._confirmActions(this.currentProjectId, actions, reply);
      } else {
        Notify.warn('Зеҳни сунъӣ тағйироти мушаххас пешниҳод накард. Ҷавоб: ' + reply.slice(0, 200));
      }
    } catch (e) {
      Notify.error('Хатои Зеҳни сунъӣ: ' + e.message);
    }
  },

  async _confirmActions(projectId, actions, replyText) {
    for (const action of actions) {
      const ok = await Notify.confirmDialog(
        'Тағйироти пешниҳодшуда',
        `Зеҳни сунъӣ пешниҳод мекунад: ${action.action} → ${action.path || ''}`,
        'ҚАБУЛ КАРДАН', 'РАД КАРДАН'
      );
      if (ok) {
        try {
          await Chat.applyAction(projectId, action);
          Notify.success('Тағйирот татбиқ шуд.');
          if (action.path && this.currentFileId) {
            const node = await Files.get(this.currentFileId);
            if (node) await Editor.open(node);
          }
        } catch (e) {
          Notify.error('Хатои татбиқ: ' + e.message);
        }
      }
    }
  },

  // ---------- AI KEYS ----------
  async _renderAiKeys() {
    this.showView('ai-keys');
    await this._refreshAiKeysList();
    document.getElementById('ak-add-btn').onclick = () => this._addAiKeyForm();
  },

  async _refreshAiKeysList() {
    const listEl = document.getElementById('ai-keys-list');
    const keys = await AIKeys.list();
    listEl.innerHTML = keys.length ? '' : '<p class="empty-hint">Ягон калид илова нашудааст.</p>';
    for (const k of keys) {
      const row = document.createElement('div');
      row.className = 'key-row glass-panel';
      row.innerHTML = `
        <div class="key-row__main">
          <strong>${Utils.escapeHtml(k.name)}</strong>
          <span class="key-row__meta">${Utils.escapeHtml(k.service)} · ${Utils.escapeHtml(k.model || 'модели пешфарз')}</span>
        </div>
        <div class="key-row__actions">
          <label class="switch"><input type="checkbox" ${k.active ? 'checked' : ''} class="key-active"><span class="switch__track"></span></label>
          <button class="icon-btn key-test" title="Санҷиши пайвастшавӣ">🔌</button>
          <button class="icon-btn key-edit" title="Таҳрир">✏️</button>
          <button class="icon-btn key-del" title="Нест кардан">🗑️</button>
        </div>`;
      row.querySelector('.key-active').onchange = async () => { await AIKeys.toggleActive(k.id); };
      row.querySelector('.key-test').onclick = async () => {
        Notify.info('Санҷиши пайвастшавӣ...');
        const res = await AIKeys.testConnection(k.id);
        res.ok ? Notify.success('Пайвастшавӣ муваффақ буд.') : Notify.error('Хато: ' + res.error);
      };
      row.querySelector('.key-edit').onclick = () => this._addAiKeyForm(k);
      row.querySelector('.key-del').onclick = async () => {
        const ok = await Notify.confirmDialog('Нест кардани калид', `Калиди "${k.name}" нест карда шавад?`, 'НЕСТ КАРДАН');
        if (ok) { await AIKeys.remove(k.id); this._refreshAiKeysList(); }
      };
      listEl.appendChild(row);
    }
  },

  async _addAiKeyForm(existing) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal glass-panel">
        <h3 class="modal__title">${existing ? 'Таҳрири калид' : 'Калиди нав'}</h3>
        <label>Ном <input id="akf-name" type="text" value="${existing ? Utils.escapeHtml(existing.name) : ''}"></label>
        <label>Хизматрасонӣ
          <select id="akf-service">
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
            <option value="groq">Groq</option>
            <option value="gemini">Google Gemini</option>
            <option value="custom">Дигар (форматаи OpenAI-мувофиқ)</option>
          </select>
        </label>
        <label>API Key <input id="akf-key" type="password" value="${existing ? Utils.escapeHtml(existing.apiKey) : ''}"></label>
        <label>Модел (ихтиёрӣ — масалан: claude-sonnet-4-6, gpt-4o-mini, llama-3.3-70b-versatile, gemini-2.5-flash)
          <input id="akf-model" type="text" value="${existing ? Utils.escapeHtml(existing.model || '') : ''}">
        </label>
        <label>Base URL (танҳо агар лозим бошад — Groq/Gemini худашон пешфарз доранд)
          <input id="akf-baseurl" type="text" value="${existing ? Utils.escapeHtml(existing.baseUrl || '') : ''}">
        </label>
        <div class="modal__actions">
          <button class="btn btn--ghost" data-act="cancel">БЕКОР</button>
          <button class="btn btn--primary" data-act="save">НИГОҲ ДОШТАН</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    if (existing) overlay.querySelector('#akf-service').value = existing.service;
    const close = () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('[data-act="cancel"]').onclick = close;
    overlay.querySelector('[data-act="save"]').onclick = async () => {
      const data = {
        name: overlay.querySelector('#akf-name').value.trim() || 'Калид',
        service: overlay.querySelector('#akf-service').value,
        apiKey: overlay.querySelector('#akf-key').value.trim(),
        model: overlay.querySelector('#akf-model').value.trim(),
        baseUrl: overlay.querySelector('#akf-baseurl').value.trim()
      };
      if (!data.apiKey) { Notify.error('API Key-ро ворид кунед.'); return; }
      if (existing) await AIKeys.update(existing.id, data);
      else await AIKeys.add(data);
      close();
      this._refreshAiKeysList();
      Notify.success('Калид нигоҳ дошта шуд.');
    };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  },

  // ---------- CHAT (дохили лоиҳа) ----------
  async _renderProjectChat(projectId) {
    this.showView('chat');
    document.getElementById('chat-title').textContent = 'Зеҳни сунъӣ';
    await Chat.load(projectId);
    this._renderChatMessages();
    document.getElementById('chat-send').onclick = () => this._sendProjectChat(projectId);
    document.getElementById('chat-input').onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendProjectChat(projectId); }
    };
  },

  async _sendProjectChat(projectId) {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this._renderChatMessages();
    const sendBtn = document.getElementById('chat-send');
    sendBtn.disabled = true;
    try {
      const { reply, actions } = await Chat.sendProjectMessage(projectId, text);
      this._renderChatMessages();
      if (actions.length) await this._confirmActions(projectId, actions, reply);
    } catch (e) {
      Notify.error(e.message);
    } finally {
      sendBtn.disabled = false;
    }
  },

  _renderChatMessages(scopeEl = 'chat-messages') {
    const el = document.getElementById(scopeEl);
    el.innerHTML = Chat.history.map((m) => {
      const cleanText = (m.content || '').replace(ACTION_BLOCK_RE_GLOBAL(), '').trim();
      return `<div class="chat-msg chat-msg--${m.role}"><div class="chat-msg__bubble">${Utils.escapeHtml(cleanText)}</div></div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  },

  // ---------- AL CHAT (умумӣ) ----------
  async _renderAlChat() {
    this.showView('al-chat');
    await Chat.load('AL_CHAT');
    this._renderChatMessages('al-chat-messages');
    document.getElementById('al-chat-send').onclick = () => this._sendAlChat();
    document.getElementById('al-chat-input').onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendAlChat(); }
    };
  },

  async _sendAlChat() {
    const input = document.getElementById('al-chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this._renderChatMessages('al-chat-messages');
    try {
      await Chat.sendAlChatMessage(text);
      this._renderChatMessages('al-chat-messages');
    } catch (e) {
      Notify.error(e.message);
    }
  },

  // ---------- APK BUILDER ----------
  async _renderBuilder(projectId) {
    this.showView('builder');
    ApkBuilder.mount(document.getElementById('view-builder').querySelector('.builder-body'));
    await ApkBuilder.open(projectId);
  }
};

function ACTION_BLOCK_RE_GLOBAL() {
  return /```zh-action\s*([\s\S]*?)```/g;
}

window.addEventListener('DOMContentLoaded', () => {
  App.init();
  App._wireNewProjectBtn();
});
