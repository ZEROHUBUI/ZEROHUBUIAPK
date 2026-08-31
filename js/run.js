// run.js — воқеан иҷрокунандаи HTML+CSS+JS-и лоиҳа дар iframe-и sandbox-шуда.
// Ҳеҷ гуна маълумоти ҳассос (API Key ва ғ.) ба iframe дода намешавад.
'use strict';

const Run = {
  iframe: null,

  mount(container) {
    container.innerHTML = `<iframe id="run-frame" class="run-frame"
      sandbox="allow-scripts allow-forms allow-popups allow-modals"
      referrerpolicy="no-referrer"></iframe>`;
    this.iframe = container.querySelector('#run-frame');
    window.addEventListener('message', (e) => this._onMessage(e));
  },

  async execute(projectId) {
    if (!this.iframe) throw new Error('Экрани RUN омода нест.');
    Console.clear();
    Console.log('info', '▶ Омодасозии лоиҳа барои иҷро...');

    const nodes = await Files.allInProject(projectId);
    const byPath = {};
    const buildPath = async (n) => (n.parentId ? (await buildPath(await Files.get(n.parentId))) + '/' + n.name : n.name);
    for (const n of nodes.filter((x) => x.type === 'file')) {
      byPath[await buildPath(n)] = n;
    }

    const entry = byPath['index.html'] || Object.values(byPath).find((n) => n.name === 'index.html');
    if (!entry) {
      Console.log('error', 'Файли index.html дар лоиҳа ёфт нашуд. RUN имконнопазир аст.');
      Notify.error('index.html ёфт нашуд.');
      return;
    }

    let html = entry.content || '';

    // Тзвиҷи ин файлҳои <link>/<script src> — танҳо агар воқеан дар лоиҳа ёфт шаванд
    html = html.replace(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi, (match, href) => {
      const file = byPath[href] || byPath[href.replace(/^\.\//, '')];
      if (file && Utils.fileExtension(file.name) === 'css') {
        return `<style data-src="${Utils.escapeHtml(href)}">${file.content || ''}</style>`;
      }
      return match;
    });

    html = html.replace(/<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/gi, (match, src) => {
      const file = byPath[src] || byPath[src.replace(/^\.\//, '')];
      if (file && Utils.fileExtension(file.name) === 'js') {
        return `<script data-src="${Utils.escapeHtml(src)}">${file.content || ''}</` + `script>`;
      }
      return match;
    });

    const bridge = `
<script>
(function(){
  function send(type, args){
    try { parent.postMessage({ __zh_console: true, type: type, args: args.map(function(a){
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch(e){ return String(a); }
    }) }, '*'); } catch(e) {}
  }
  ['log','warn','error','info'].forEach(function(m){
    var orig = console[m];
    console[m] = function(){ send(m, Array.prototype.slice.call(arguments)); orig && orig.apply(console, arguments); };
  });
  window.onerror = function(msg, src, line, col){
    send('error', [msg + ' (сатр ' + line + ', сутун ' + col + ')']);
  };
  window.addEventListener('unhandledrejection', function(e){
    send('error', ['Promise рад шуд: ' + (e.reason && e.reason.message || e.reason)]);
  });
})();
<\/script>`;

    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => m + bridge);
    } else {
      html = bridge + html;
    }

    this.iframe.srcdoc = html;
    Console.log('info', '✔ Лоиҳа дар экрани алоҳида иҷро шуд.');
  },

  _onMessage(e) {
    const data = e.data;
    if (!data || !data.__zh_console) return;
    Console.log(data.type, data.args.join(' '));
  },

  stop() {
    if (this.iframe) this.iframe.srcdoc = 'about:blank';
    Console.log('info', '⏹ Иҷро қатъ шуд.');
  }
};

window.Run = Run;
