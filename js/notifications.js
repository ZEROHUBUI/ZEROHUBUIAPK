// notifications.js — системаи огоҳиномаҳо (toast)
'use strict';

const Notify = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type} glass-panel`;
    const icons = { info: 'ℹ️', success: '✅', error: '⛔', warn: '⚠️' };
    el.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span class="toast__msg"></span>`;
    el.querySelector('.toast__msg').textContent = message;
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--show'));
    setTimeout(() => {
      el.classList.remove('toast--show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 5000); },
  warn(msg) { this.show(msg, 'warn', 4500); },
  info(msg) { this.show(msg, 'info'); },

  // Диалоги тасдиқ — иваз мекунад window.confirm бо намуди шишагӣ
  confirmDialog(title, message, confirmLabel = 'ҚАБУЛ', cancelLabel = 'БЕКОР') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal glass-panel">
          <h3 class="modal__title"></h3>
          <p class="modal__msg"></p>
          <div class="modal__actions">
            <button class="btn btn--ghost" data-act="cancel"></button>
            <button class="btn btn--primary" data-act="confirm"></button>
          </div>
        </div>`;
      overlay.querySelector('.modal__title').textContent = title;
      overlay.querySelector('.modal__msg').textContent = message;
      overlay.querySelector('[data-act="cancel"]').textContent = cancelLabel;
      overlay.querySelector('[data-act="confirm"]').textContent = confirmLabel;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      const close = (val) => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(val);
      };
      overlay.querySelector('[data-act="cancel"]').onclick = () => close(false);
      overlay.querySelector('[data-act="confirm"]').onclick = () => close(true);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    });
  },

  // Диалоги вуруди матн — иваз мекунад window.prompt
  promptDialog(title, defaultValue = '') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal glass-panel">
          <h3 class="modal__title"></h3>
          <input type="text" class="modal__input" />
          <div class="modal__actions">
            <button class="btn btn--ghost" data-act="cancel">БЕКОР</button>
            <button class="btn btn--primary" data-act="confirm">ҚАБУЛ</button>
          </div>
        </div>`;
      overlay.querySelector('.modal__title').textContent = title;
      const input = overlay.querySelector('.modal__input');
      input.value = defaultValue;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => { overlay.classList.add('show'); input.focus(); input.select(); });
      const close = (val) => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(val);
      };
      overlay.querySelector('[data-act="cancel"]').onclick = () => close(null);
      overlay.querySelector('[data-act="confirm"]').onclick = () => close(input.value.trim());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') close(input.value.trim());
        if (e.key === 'Escape') close(null);
      });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    });
  }
};

window.Notify = Notify;
