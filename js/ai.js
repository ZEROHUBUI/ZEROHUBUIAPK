// ai.js — фиристодани дархости воқеӣ ба хизматрасонии Зеҳни сунъии интихобшуда.
// Дархост мустақиман аз браузери корбар меравад; калид ба сервери ZEROHUBUIAL намеравад.
'use strict';

const AI = {
  // Фиристодани як дархости оддӣ ба хизматрасонии мушаххас
  async send(keyConfig, messages, opts = {}) {
    const { service, apiKey, model, baseUrl } = keyConfig;
    if (!apiKey) throw new Error('API Key холӣ аст.');

    if (service === 'anthropic') return this._sendAnthropic(apiKey, model, messages, baseUrl, opts);
    if (service === 'openai') return this._sendOpenAI(apiKey, model, messages, baseUrl, opts);
    if (service === 'groq') return this._sendOpenAI(apiKey, model, messages, baseUrl || 'https://api.groq.com/openai', opts); // Groq форматаи OpenAI-ро истифода мебарад
    if (service === 'gemini') return this._sendGemini(apiKey, model, messages, baseUrl, opts);
    if (service === 'custom') return this._sendOpenAI(apiKey, model, messages, baseUrl, opts); // формати OpenAI-мувофиқ фарз мешавад
    throw new Error(`Хизматрасонии номаълум: ${service}`);
  },

  async _sendAnthropic(apiKey, model, messages, baseUrl, opts) {
    const url = (baseUrl || 'https://api.anthropic.com') + '/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: opts.maxTokens || 1024,
        messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      })
    });
    const data = await this._parseJsonSafe(res);
    if (!res.ok) throw this._toError(res, data);
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return { text, raw: data };
  },

  async _sendOpenAI(apiKey, model, messages, baseUrl, opts) {
    const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        max_tokens: opts.maxTokens || 1024,
        messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      })
    });
    const data = await this._parseJsonSafe(res);
    if (!res.ok) throw this._toError(res, data);
    const text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    return { text, raw: data };
  },

  async _sendGemini(apiKey, model, messages, baseUrl, opts) {
    const base = (baseUrl || 'https://generativelanguage.googleapis.com') + '/v1beta';
    const mdl = model || 'gemini-2.5-flash';
    const url = `${base}/models/${encodeURIComponent(mdl)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: { maxOutputTokens: opts.maxTokens || 1024 }
      })
    });
    const data = await this._parseJsonSafe(res);
    if (!res.ok) throw this._toError(res, data);
    const cand = data.candidates && data.candidates[0];
    const text = cand && cand.content && cand.content.parts ? cand.content.parts.map((p) => p.text || '').join('') : '';
    if (!text && cand && cand.finishReason) {
      throw new Error(`Gemini ҷавоб надод (сабаб: ${cand.finishReason}).`);
    }
    return { text, raw: data };
  },

  async _parseJsonSafe(res) {
    try { return await res.json(); } catch { return null; }
  },

  _toError(res, data) {
    const msg = (data && (data.error?.message || data.message)) || `Хатои сервер (HTTP ${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.isQuota = res.status === 429 || /quota|rate.?limit|insufficient/i.test(msg);
    return err;
  },

  // Фиристодан бо системаи навбатии калидҳо: агар хатои квота бошад, ба калиди
  // навбатӣ мегузарад ва контексти чат гум намешавад (ҳамон messages истифода мешаванд).
  async sendWithRotation(messages, opts = {}) {
    const tried = [];
    let lastErr = null;
    // то 5 маротиба кӯшиш — то шумораи калидҳои фаъол
    for (let i = 0; i < 5; i++) {
      const key = await AIKeys.nextAvailable(tried);
      if (!key) break;
      try {
        const result = await this.send(key, messages, opts);
        return { ...result, usedKey: key };
      } catch (e) {
        lastErr = e;
        tried.push(key.id);
        if (e.isQuota) {
          await AIKeys.markQuotaBlocked(key.id);
          continue; // ба калиди навбатӣ мегузарем
        }
        // хатои оддӣ — ба калиди дигар нагузар (тибқи талабот)
        throw e;
      }
    }
    throw lastErr || new Error('Ягон калиди фаъоли Зеҳни сунъӣ мавҷуд нест. Дар бахши "КАЛИДҲОИ ЗЕҲНИ СУНЪӢ" калид илова кунед.');
  }
};

window.AI = AI;
