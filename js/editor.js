// editor.js — муҳаррири воқеии код: рақами сатр (танҳо барои сатри воқеӣ, на барои
// хатти визуалии печондашуда), равшанкунии синтаксис, ҷустуҷӯ/ивазкунӣ, нигоҳдории автоматӣ.
'use strict';

const Editor = {
  root: null,
  gutterEl: null,
  highlightEl: null,
  textareaEl: null,
  currentNode: null,
  lang: 'plain',
  autosaveTimer: null,
  undoStack: [],
  redoStack: [],
  _lastSavedValue: '',

  mount(rootEl) {
    this.root = rootEl;
    this.root.innerHTML = `
      <div class="editor-toolbar">
        <span class="editor-filename" id="editor-filename">—</span>
        <div class="editor-toolbar__actions">
          <button class="icon-btn" id="editor-search-btn" title="Ҷустуҷӯ">🔍</button>
          <button class="icon-btn" id="editor-undo-btn" title="Бекор кардан">↩️</button>
          <button class="icon-btn" id="editor-redo-btn" title="Баргардондан">↪️</button>
        </div>
      </div>
      <div class="editor-search-bar" id="editor-search-bar" hidden>
        <input type="text" id="editor-search-input" placeholder="Ҷустуҷӯ...">
        <input type="text" id="editor-replace-input" placeholder="Иваз бо...">
        <button class="btn btn--xs" id="editor-replace-one">Иваз</button>
        <button class="btn btn--xs" id="editor-replace-all">Ҳама</button>
        <button class="icon-btn" id="editor-search-close">✕</button>
      </div>
      <div class="editor-wrap">
        <div class="editor-gutter" id="editor-gutter"></div>
        <div class="editor-surface">
          <pre class="editor-highlight" id="editor-highlight" aria-hidden="true"><code></code></pre>
          <textarea class="editor-textarea" id="editor-textarea" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
        </div>
      </div>`;

    this.gutterEl = this.root.querySelector('#editor-gutter');
    this.highlightEl = this.root.querySelector('#editor-highlight code');
    this.textareaEl = this.root.querySelector('#editor-textarea');

    this.textareaEl.addEventListener('input', () => this._onInput());
    this.textareaEl.addEventListener('scroll', () => this._syncScroll());
    this.textareaEl.addEventListener('keydown', (e) => this._onKeydown(e));
    window.addEventListener('resize', Utils.debounce(() => this._render(), 150));

    this.root.querySelector('#editor-search-btn').onclick = () => this._toggleSearch();
    this.root.querySelector('#editor-search-close').onclick = () => this._toggleSearch(false);
    this.root.querySelector('#editor-undo-btn').onclick = () => this.undo();
    this.root.querySelector('#editor-redo-btn').onclick = () => this.redo();
    this.root.querySelector('#editor-search-input').addEventListener('input', () => this._doSearch());
    this.root.querySelector('#editor-replace-one').onclick = () => this._replace(false);
    this.root.querySelector('#editor-replace-all').onclick = () => this._replace(true);
  },

  async open(node) {
    this.currentNode = node;
    this.lang = Syntax.langFor(node.name);
    this.textareaEl.value = node.content || '';
    this._lastSavedValue = this.textareaEl.value;
    this.undoStack = [this.textareaEl.value];
    this.redoStack = [];
    this.root.querySelector('#editor-filename').textContent = node.name;
    this._render();
  },

  getValue() {
    return this.textareaEl ? this.textareaEl.value : '';
  },

  _onInput() {
    this._render();
    this._pushUndo();
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this._autosave(), 600);
  },

  _pushUndo: (function () {
    let t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(() => {
        const v = this.textareaEl.value;
        if (this.undoStack[this.undoStack.length - 1] !== v) {
          this.undoStack.push(v);
          if (this.undoStack.length > 200) this.undoStack.shift();
          this.redoStack = [];
        }
      }, 400);
    };
  })(),

  undo() {
    if (this.undoStack.length <= 1) return;
    this.redoStack.push(this.undoStack.pop());
    const v = this.undoStack[this.undoStack.length - 1];
    this.textareaEl.value = v;
    this._render();
    this._autosave();
  },

  redo() {
    if (!this.redoStack.length) return;
    const v = this.redoStack.pop();
    this.undoStack.push(v);
    this.textareaEl.value = v;
    this._render();
    this._autosave();
  },

  async _autosave() {
    if (!this.currentNode) return;
    const val = this.textareaEl.value;
    if (val === this._lastSavedValue) return;
    try {
      await Files.updateContent(this.currentNode.id, val);
      this._lastSavedValue = val;
      this.currentNode.content = val;
      document.dispatchEvent(new CustomEvent('zh:file-saved', { detail: { node: this.currentNode } }));
    } catch (e) {
      Notify.error('Хатои нигоҳдорӣ: ' + e.message);
    }
  },

  async forceSave() {
    clearTimeout(this.autosaveTimer);
    await this._autosave();
  },

  _onKeydown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = this.textareaEl;
      const start = ta.selectionStart, end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
      this._onInput();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); this.undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); this.redo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); this._toggleSearch(true); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); this.forceSave(); Notify.success('Захира шуд.'); }
  },

  _render() {
    const text = this.textareaEl.value;
    const lines = text.split('\n');

    // Равшанкунии синтаксис — ҳар сатри воқеӣ ҳамчун як <div> (ки метавонад
    // визуалӣ печонда шавад, аммо як сатри воқеӣ мемонад)
    this.highlightEl.innerHTML = lines
      .map((line) => `<div class="hl-line">${Syntax.highlightLine(line, this.lang) || '&nbsp;'}</div>`)
      .join('');

    // Гутер: рақами сатр — баландии ҳар ҳуҷра баробар ба баландии сатри воқеии
    // печондашуда карда мешавад, то рақами нав барои хатти визуалӣ сохта нашавад.
    const lineEls = this.highlightEl.querySelectorAll('.hl-line');
    let gutterHtml = '';
    lineEls.forEach((el, idx) => {
      const h = el.getBoundingClientRect().height || el.offsetHeight;
      gutterHtml += `<div class="gutter-line" style="height:${h}px">${idx + 1}</div>`;
    });
    this.gutterEl.innerHTML = gutterHtml;
    this._syncScroll();
  },

  _syncScroll() {
    const top = this.textareaEl.scrollTop;
    const left = this.textareaEl.scrollLeft;
    this.highlightEl.parentElement.scrollTop = top;
    this.highlightEl.parentElement.scrollLeft = left;
    this.gutterEl.scrollTop = top;
  },

  _toggleSearch(force) {
    const bar = this.root.querySelector('#editor-search-bar');
    const show = force !== undefined ? force : bar.hidden;
    bar.hidden = !show;
    if (show) this.root.querySelector('#editor-search-input').focus();
  },

  _doSearch() {
    const q = this.root.querySelector('#editor-search-input').value;
    if (!q) return;
    const idx = this.textareaEl.value.indexOf(q, this.textareaEl.selectionEnd || 0);
    const foundIdx = idx === -1 ? this.textareaEl.value.indexOf(q) : idx;
    if (foundIdx !== -1) {
      this.textareaEl.focus();
      this.textareaEl.setSelectionRange(foundIdx, foundIdx + q.length);
    }
  },

  _replace(all) {
    const q = this.root.querySelector('#editor-search-input').value;
    const rep = this.root.querySelector('#editor-replace-input').value;
    if (!q) return;
    if (all) {
      this.textareaEl.value = this.textareaEl.value.split(q).join(rep);
    } else {
      const start = this.textareaEl.selectionStart, end = this.textareaEl.selectionEnd;
      const sel = this.textareaEl.value.slice(start, end);
      if (sel === q) {
        this.textareaEl.value = this.textareaEl.value.slice(0, start) + rep + this.textareaEl.value.slice(end);
      } else {
        this._doSearch();
      }
    }
    this._onInput();
  }
};

window.Editor = Editor;
