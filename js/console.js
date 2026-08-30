// console.js — панели воқеии консол барои натиҷаи RUN
'use strict';

const Console = {
  el: null,

  mount(container) {
    container.innerHTML = `
      <div class="console-header">
        <span>Консол</span>
        <button class="icon-btn" id="console-clear-btn" title="Тоза кардан">🧹</button>
      </div>
      <div class="console-body" id="console-body"></div>`;
    this.el = container.querySelector('#console-body');
    container.querySelector('#console-clear-btn').onclick = () => this.clear();
  },

  clear() {
    if (this.el) this.el.innerHTML = '';
  },

  log(type, message) {
    if (!this.el) return;
    const row = document.createElement('div');
    row.className = `console-line console-line--${type}`;
    const icons = { log: '›', warn: '⚠', error: '✖', info: 'ℹ' };
    row.innerHTML = `<span class="console-line__icon">${icons[type] || '›'}</span><span class="console-line__text"></span>`;
    row.querySelector('.console-line__text').textContent = message;
    this.el.appendChild(row);
    this.el.scrollTop = this.el.scrollHeight;

    if (type === 'error') {
      document.dispatchEvent(new CustomEvent('zh:run-error', { detail: { message } }));
    }
  }
};

window.Console = Console;
