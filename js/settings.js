// settings.js — мантиқи экрани ТАНЗИМОТ
'use strict';

const SettingsUI = {
  root: null,
  mount(root) { this.root = root; },

  render() {
    const theme = Settings.get('theme', 'dark');
    const aiGlobal = Settings.get('aiGlobalAccess', true);
    const h2apkUrl = Settings.get('h2apkServerUrl', '');

    this.root.innerHTML = `
      <div class="settings-group glass-panel">
        <h3>Намуди намоиш</h3>
        <div class="settings-row">
          <span>Режим</span>
          <div class="segmented">
            <button class="seg-btn ${theme === 'light' ? 'active' : ''}" data-theme="light">Рӯзона</button>
            <button class="seg-btn ${theme === 'dark' ? 'active' : ''}" data-theme="dark">Торик</button>
          </div>
        </div>
      </div>

      <div class="settings-group glass-panel">
        <h3>Зеҳни сунъӣ</h3>
        <div class="settings-row">
          <span>Дастрасии Зеҳни сунъӣ ба тамоми барнома</span>
          <label class="switch">
            <input type="checkbox" id="set-ai-global" ${aiGlobal ? 'checked' : ''}>
            <span class="switch__track"></span>
          </label>
        </div>
        <div class="settings-row settings-row--col">
          <span>Нишонии сервери H2APK (худмизбон)</span>
          <input type="text" id="set-h2apk-url" placeholder="http://localhost:8080" value="${Utils.escapeHtml(h2apkUrl)}">
          <p class="settings-hint">Барои сохтани воқеии APK, H2APK-ро бо роҳнамои build-server/README.md худ роҳандозӣ кунед.</p>
        </div>
      </div>

      <div class="settings-group glass-panel">
        <h3>Маълумот</h3>
        <button class="btn btn--ghost btn--block" id="set-export">Содироти тамоми маълумот (EXPORT)</button>
        <label class="btn btn--ghost btn--block file-btn">
          Воридоти маълумот (IMPORT)
          <input type="file" id="set-import" accept=".json" hidden>
        </label>
        <button class="btn btn--ghost btn--block" id="set-clear-chat">Тоза кардани таърихи чат</button>
        <button class="btn btn--ghost btn--block" id="set-clear-code">Тоза кардани таърихи кодҳо (undo/redo)</button>
        <button class="btn btn--danger btn--block" id="set-clear-all">Тоза кардани ҳамаи маълумоти маҳаллӣ</button>
      </div>

      <div class="settings-group glass-panel">
        <h3>Дар бораи барнома</h3>
        <p>ZEROHUBUIAL — платформаи вебие, ки дар он корбар лоиҳаи HTML/CSS/JS месозад
        ва баъд онро тавассути муҳаррики воқеии H2APK ба APK-и Android табдил медиҳад.
        Ҳамаи маълумоти лоиҳа дар дастгоҳи худи шумо (IndexedDB/localStorage) нигоҳ дошта мешавад.</p>
      </div>`;

    this.root.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.onclick = () => {
        Settings.set('theme', btn.dataset.theme);
        App.applyTheme();
        this.render();
      };
    });

    this.root.querySelector('#set-ai-global').onchange = (e) => {
      Settings.set('aiGlobalAccess', e.target.checked);
      Notify.info(e.target.checked ? 'Зеҳни сунъӣ дар тамоми барнома фаъол шуд.' : 'Зеҳни сунъӣ танҳо дар бахши иҷозатдодашуда фаъол хоҳад буд.');
    };

    this.root.querySelector('#set-h2apk-url').onchange = (e) => {
      Settings.set('h2apkServerUrl', e.target.value.trim());
      Notify.success('Нишонии сервери H2APK нигоҳ дошта шуд.');
    };

    this.root.querySelector('#set-export').onclick = () => ImportExport.exportAll();
    this.root.querySelector('#set-import').onchange = (e) => {
      if (e.target.files[0]) ImportExport.importAll(e.target.files[0]);
    };
    this.root.querySelector('#set-clear-chat').onclick = async () => {
      const ok = await Notify.confirmDialog('Тоза кардани чат', 'Тамоми таърихи чатҳо нест карда мешавад. Идома медиҳед?');
      if (!ok) return;
      const chats = await DB.getAll(DB.STORES.CHATS);
      for (const c of chats) { c.messages = []; await DB.put(DB.STORES.CHATS, c); }
      Notify.success('Таърихи чат тоза шуд.');
    };
    this.root.querySelector('#set-clear-code').onclick = async () => {
      Editor.undoStack = [Editor.getValue()];
      Editor.redoStack = [];
      Notify.success('Таърихи бекоркунии муҳаррир тоза шуд.');
    };
    this.root.querySelector('#set-clear-all').onclick = async () => {
      const ok = await Notify.confirmDialog('Тоза кардани ҳама маълумот', 'Ин амал ҳамаи лоиҳаҳо, файлҳо, калидҳо ва танзимотро бебозгашт нест мекунад. Мутмаин ҳастед?', 'НЕСТ КАРДАН');
      if (!ok) return;
      await DB.clearAll();
      Settings.clearAll();
      Notify.success('Ҳамаи маълумот тоза шуд.');
      setTimeout(() => location.reload(), 800);
    };
  }
};

window.SettingsUI = SettingsUI;
