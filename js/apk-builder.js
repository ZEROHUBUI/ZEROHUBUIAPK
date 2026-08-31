// apk-builder.js — мантиқи экрани "ТАБДИЛ БА APK". Ҳеҷ фоизи қалбакӣ,
// ҳеҷ APK-и қалбакӣ. Танҳо марҳилаҳои воқеӣ ва хатоҳои воқеии сервер.
'use strict';

const STAGES = [
  'Омодасозии лоиҳа',
  'Фиристодани лоиҳа',
  'Сохтани бастаи Android',
  'Тавлиди APK',
  'Имзогузорӣ',
  'Тайёр'
];

const ApkBuilder = {
  root: null,
  projectId: null,
  currentBuildId: null,
  es: null,

  mount(root) { this.root = root; },

  async open(projectId) {
    this.projectId = projectId;
    const project = await Projects.get(projectId);
    const configured = BuildAPI.isConfigured();

    this.root.innerHTML = `
      <div class="builder-form glass-panel">
        ${configured ? '' : `<div class="builder-warning">⚠ Сервери H2APK ҳанӯз дар ТАНЗИМОТ танзим нашудааст. Пеш аз сохтани APK, нишонии сервери H2APK-и худмизбонро илова кунед.</div>`}
        <label>1. НОМИ БАРНОМА
          <input type="text" id="bf-appname" value="${Utils.escapeHtml(project.name)}">
        </label>
        <label>2. PACKAGE NAME
          <input type="text" id="bf-package" placeholder="com.zerohubui.app" value="com.zerohubui.${(project.name || 'app').toLowerCase().replace(/[^a-z0-9]/g, '')}">
        </label>
        <div class="builder-row">
          <label>3. НУСХА
            <input type="text" id="bf-version" value="1.0.0">
          </label>
          <label>4. VERSION CODE
            <input type="number" id="bf-versioncode" value="1" min="1">
          </label>
        </div>
        <label>5. ИКОНКА (PNG)
          <input type="file" id="bf-icon" accept="image/png">
        </label>
        <label class="builder-check"><input type="checkbox" id="bf-release"> Сохтани нусхаи Play Store (имзои шахсӣ)</label>
        <div id="bf-release-fields" hidden>
          <label>Файли Keystore (.jks/.keystore)
            <input type="file" id="bf-keystore">
          </label>
          <div class="builder-row">
            <label>Пароли Keystore <input type="password" id="bf-ks-pass"></label>
            <label>Alias <input type="text" id="bf-ks-alias"></label>
          </div>
          <label>Пароли калид (агар аз пароли Keystore фарқ кунад)
            <input type="password" id="bf-key-pass">
          </label>
        </div>
        <p class="builder-hint">Агар имзои шахсӣ надиҳед, сервер (агар дастгирӣ кунад) имзои худкор истифода мебарад.</p>
        <button class="btn btn--primary btn--block" id="bf-submit">СОХТАНИ APK</button>
      </div>
      <div class="builder-progress glass-panel" id="bf-progress" hidden>
        <h3>Пешрафти сохтмон</h3>
        <ol class="builder-stages" id="bf-stages"></ol>
        <div class="builder-log" id="bf-log"></div>
        <div class="builder-result" id="bf-result"></div>
        <button class="btn btn--ghost" id="bf-cancel">Қатъ кардан</button>
      </div>`;

    this.root.querySelector('#bf-release').addEventListener('change', (e) => {
      this.root.querySelector('#bf-release-fields').hidden = !e.target.checked;
    });
    this.root.querySelector('#bf-submit').addEventListener('click', () => this._submit());
    this.root.querySelector('#bf-cancel').addEventListener('click', () => this._cancel());
  },

  _renderStages(activeIdx, failedIdx = -1) {
    const el = this.root.querySelector('#bf-stages');
    el.innerHTML = STAGES.map((s, i) => {
      let cls = '';
      if (failedIdx === i) cls = 'stage--failed';
      else if (i < activeIdx) cls = 'stage--done';
      else if (i === activeIdx) cls = 'stage--active';
      return `<li class="${cls}">${s}</li>`;
    }).join('');
  },

  _log(msg) {
    const el = this.root.querySelector('#bf-log');
    if (!el) return;
    const row = document.createElement('div');
    row.textContent = msg;
    el.appendChild(row);
    el.scrollTop = el.scrollHeight;
  },

  async _submit() {
    if (!BuildAPI.isConfigured()) {
      Notify.error('Аввал дар ТАНЗИМОТ нишонии сервери H2APK-ро ворид кунед.');
      return;
    }
    const appName = this.root.querySelector('#bf-appname').value.trim();
    const packageId = this.root.querySelector('#bf-package').value.trim();
    if (!appName) { Notify.error('Номи барномаро ворид кунед.'); return; }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(packageId)) {
      Notify.error('Package name дуруст нест. Мисол: com.zerohubui.app'); return;
    }

    const nodes = await Files.allInProject(this.projectId);
    const indexNode = nodes.find((n) => n.type === 'file' && n.name === 'index.html' && !n.parentId);
    if (!indexNode) { Notify.error('index.html дар решаи лоиҳа ёфт нашуд.'); return; }
    const cssNode = nodes.find((n) => n.type === 'file' && n.name === 'style.css' && !n.parentId);
    const jsNode = nodes.find((n) => n.type === 'file' && n.name === 'script.js' && !n.parentId);

    const release = this.root.querySelector('#bf-release').checked;
    const form = {
      appName, packageId,
      version: this.root.querySelector('#bf-version').value.trim() || '1.0.0',
      versionCode: this.root.querySelector('#bf-versioncode').value,
      inputType: 'html',
      html: indexNode.content || '',
      css: cssNode ? cssNode.content : '',
      js: jsNode ? jsNode.content : '',
      release
    };

    const iconFile = this.root.querySelector('#bf-icon').files[0];
    if (iconFile) form.iconDataUrl = await Utils.readFileAsDataURL(iconFile);

    if (release) {
      const ksFile = this.root.querySelector('#bf-keystore').files[0];
      if (ksFile) {
        const dataUrl = await Utils.readFileAsDataURL(ksFile);
        form.keystoreBase64 = dataUrl.split(',')[1];
        form.keystorePassword = this.root.querySelector('#bf-ks-pass').value;
        form.keyAlias = this.root.querySelector('#bf-ks-alias').value;
        form.keyPassword = this.root.querySelector('#bf-key-pass').value;
      }
    }

    const payload = BuildAPI.buildFormToPayload(form);

    this.root.querySelector('.builder-form').hidden = true;
    this.root.querySelector('#bf-progress').hidden = false;
    this.root.querySelector('#bf-result').innerHTML = '';
    this._renderStages(0);
    this._log('Омодасозии лоиҳа барои фиристодан...');

    try {
      this._renderStages(1);
      this._log('Фиристодан ба сервери H2APK: ' + BuildAPI.baseUrl());
      const buildId = await BuildAPI.startBuild(payload);
      this.currentBuildId = buildId;
      this._log('Сохтмон оғоз шуд. ID: ' + buildId);
      this._renderStages(2);
      this._watch(buildId);
    } catch (e) {
      this._renderStages(1, 1);
      this._log('ХАТО: ' + e.message);
      Notify.error(e.message);
      this._showResult(false, e.message);
    }
  },

  _watch(buildId) {
    this.es = BuildAPI.streamLog(buildId, {
      onOpen: () => this._log('Пайваст ба стрими лог барқарор шуд.'),
      onLine: (line) => {
        this._log(line);
        if (/dex|d8/i.test(line)) this._renderStages(3);
        if (/sign|apksigner|имзо/i.test(line)) this._renderStages(4);
        if (/done|finish|тайёр|success/i.test(line)) this._onSuccess(buildId);
        if (/fail|error|хато/i.test(line)) this._onFail(line);
      },
      onError: (err) => {
        this._log('Хатои стрим: ' + err.message + ' — гузариш ба санҷиши даврии ҳолат.');
        this._poll(buildId);
      }
    });
  },

  async _poll(buildId) {
    try {
      const status = await BuildAPI.getStatus(buildId);
      const st = (status.status || status.state || '').toLowerCase();
      this._log('Ҳолат: ' + JSON.stringify(status));
      if (st.includes('done') || st.includes('success')) { this._onSuccess(buildId); return; }
      if (st.includes('fail') || st.includes('error')) { this._onFail(status.error || 'Хатои сохтмон'); return; }
      setTimeout(() => this._poll(buildId), 2500);
    } catch (e) {
      this._onFail(e.message);
    }
  },

  _onSuccess(buildId) {
    if (this.es) { this.es.close(); this.es = null; }
    this._renderStages(5);
    this._showResult(true, null, buildId);
    Notify.success('APK бомуваффақият сохта шуд.');
  },

  _onFail(message) {
    if (this.es) { this.es.close(); this.es = null; }
    this._renderStages(4, 4);
    this._log('ХАТО: ' + message);
    this._showResult(false, message);
    Notify.error('Сохтмон бо хато анҷом ёфт: ' + message);
  },

  _showResult(success, errorMsg, buildId) {
    const el = this.root.querySelector('#bf-result');
    if (success) {
      el.innerHTML = `<a class="btn btn--primary" href="${BuildAPI.downloadUrl(buildId)}" target="_blank" rel="noopener">Боргирии APK</a>`;
    } else {
      el.innerHTML = `<div class="builder-error">${Utils.escapeHtml(errorMsg || 'Хатои номаълум')}</div>`;
    }
  },

  _cancel() {
    if (this.es) { this.es.close(); this.es = null; }
    this.root.querySelector('.builder-form').hidden = false;
    this.root.querySelector('#bf-progress').hidden = true;
  }
};

window.ApkBuilder = ApkBuilder;
