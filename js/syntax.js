// syntax.js — равшанкунии соддаи синтаксис (сатр ба сатр).
// Маҳдудият: назардошти воқеӣ, аммо коментҳои бисёрсатра пурра пайгирӣ намешаванд —
// ин маҳдудияти воқеии як highlighter-и сабук аст, на хатои пинҳонӣ.
'use strict';

const Syntax = {
  langFor(filename) {
    const ext = Utils.fileExtension(filename);
    const map = {
      html: 'html', htm: 'html', css: 'css', js: 'javascript',
      json: 'json', xml: 'xml', md: 'markdown'
    };
    return map[ext] || 'plain';
  },

  highlightLine(text, lang) {
    if (text === '') return '';
    switch (lang) {
      case 'javascript': return this._js(text);
      case 'css': return this._css(text);
      case 'html': case 'xml': return this._html(text);
      case 'json': return this._json(text);
      default: return Utils.escapeHtml(text);
    }
  },

  _wrap(cls, val) {
    return `<span class="tok-${cls}">${Utils.escapeHtml(val)}</span>`;
  },

  _js(text) {
    const rules = [
      { cls: 'comment', re: /\/\/.*$/ },
      { cls: 'string', re: /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { cls: 'keyword', re: /\b(const|let|var|function|return|if|else|for|while|do|break|continue|switch|case|default|class|extends|new|this|typeof|instanceof|try|catch|finally|throw|async|await|import|export|from|of|in|null|undefined|true|false|static|get|set|yield|delete|void)\b/ },
      { cls: 'number', re: /\b\d+(\.\d+)?\b/ },
      { cls: 'func', re: /\b[a-zA-Z_$][\w$]*(?=\s*\()/ }
    ];
    return this._apply(text, rules);
  },

  _css(text) {
    const rules = [
      { cls: 'comment', re: /\/\*.*?\*\// },
      { cls: 'string', re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { cls: 'selector', re: /^[.#]?[\w-]+(?=\s*\{)/ },
      { cls: 'property', re: /[\w-]+(?=\s*:)/ },
      { cls: 'number', re: /\b\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms)?\b/ }
    ];
    return this._apply(text, rules);
  },

  _html(text) {
    const rules = [
      { cls: 'comment', re: /<!--.*?-->/ },
      { cls: 'string', re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
      { cls: 'tag', re: /<\/?[a-zA-Z][\w-]*/ },
      { cls: 'attr', re: /\b[a-zA-Z-]+(?==)/ },
      { cls: 'punct', re: /\/?>/ }
    ];
    return this._apply(text, rules);
  },

  _json(text) {
    const rules = [
      { cls: 'prop', re: /"(?:\\.|[^"\\])*"(?=\s*:)/ },
      { cls: 'string', re: /"(?:\\.|[^"\\])*"/ },
      { cls: 'keyword', re: /\b(true|false|null)\b/ },
      { cls: 'number', re: /-?\b\d+(\.\d+)?\b/ }
    ];
    return this._apply(text, rules);
  },

  // Якҷоякунии қоидаҳо: пайдо кардани якумин ҷойгиршавии ҳар қоида дар матни боқимонда
  _apply(text, rules) {
    let out = '';
    let i = 0;
    while (i < text.length) {
      let best = null;
      for (const rule of rules) {
        const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : rule.re.flags + '');
        re.lastIndex = 0;
        const slice = text.slice(i);
        const m = slice.match(rule.re);
        if (m && m.index !== undefined) {
          if (!best || m.index < best.index) {
            best = { index: m.index, text: m[0], cls: rule.cls };
          }
        }
      }
      if (!best) {
        out += Utils.escapeHtml(text.slice(i));
        break;
      }
      if (best.index > 0) out += Utils.escapeHtml(text.slice(i, i + best.index));
      out += this._wrap(best.cls, best.text);
      i += best.index + best.text.length;
      if (best.text.length === 0) i++; // пешгирии давраи беохир
    }
    return out;
  }
};

window.Syntax = Syntax;
