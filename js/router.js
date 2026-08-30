// router.js — роутери сабуки мабтанӣ бар hash
'use strict';

const Router = {
  routes: {},
  _current: null,

  on(pattern, handler) {
    this.routes[pattern] = handler;
    return this;
  },

  start() {
    window.addEventListener('hashchange', () => this._resolve());
    this._resolve();
  },

  go(hash) {
    if (location.hash === hash) { this._resolve(); return; }
    location.hash = hash;
  },

  back() {
    history.back();
  },

  _resolve() {
    const hash = location.hash || '#/home';
    const [path, query] = hash.slice(1).split('?');
    const parts = path.split('/').filter(Boolean);
    const params = {};
    if (query) {
      new URLSearchParams(query).forEach((v, k) => { params[k] = v; });
    }

    for (const pattern of Object.keys(this.routes)) {
      const pParts = pattern.split('/').filter(Boolean);
      if (pParts.length !== parts.length) continue;
      let match = true;
      const routeParams = { ...params };
      for (let i = 0; i < pParts.length; i++) {
        if (pParts[i].startsWith(':')) {
          routeParams[pParts[i].slice(1)] = decodeURIComponent(parts[i]);
        } else if (pParts[i] !== parts[i]) {
          match = false; break;
        }
      }
      if (match) {
        this._current = pattern;
        this.routes[pattern](routeParams);
        return;
      }
    }
    // роҳи ёфтнашуда — бозгашт ба хона
    if (hash !== '#/home') this.go('#/home');
  }
};

window.Router = Router;
