// utils.js — ёридиҳандаҳои умумӣ
'use strict';

const Utils = {
  uid(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  },

  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  debounce(fn, wait = 300) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes === 0) return '0 Б';
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  },

  formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('tg-TJ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  fileExtension(name) {
    const parts = String(name).split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  },

  iconForNode(type, name) {
    if (type === 'folder') return '📁';
    const ext = Utils.fileExtension(name);
    const map = {
      html: '🌐', htm: '🌐', css: '🎨', js: '⚙️', json: '🧩',
      xml: '📰', md: '📝', txt: '📄', png: '🖼️', jpg: '🖼️',
      jpeg: '🖼️', gif: '🖼️', svg: '🖼️', mp4: '🎬'
    };
    return map[ext] || '📄';
  },

  isTextFile(name) {
    const ext = Utils.fileExtension(name);
    return ['html', 'htm', 'css', 'js', 'json', 'xml', 'md', 'txt', 'svg'].includes(ext);
  },

  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsText(file);
    });
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
};

window.Utils = Utils;
