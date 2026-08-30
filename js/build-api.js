// build-api.js — пайвастшавии ВОҚЕӢ ба муҳаррики берунии H2APK.
//
// МУҲИМ — ХОНДАН ҲАТМӢ:
// Аз рӯи README-и расмии H2APK (https://github.com/HashShin/H2APK) чор endpoint-и
// зерин ВОҚЕАН вуҷуд доранд ва дар ин файл истифода мешаванд:
//   POST /api/build         — оғози сохтмон (JSON body)
//   GET  /api/status/{id}   — ҳолати сохтмон
//   GET  /api/log/{id}      — SSE стрими лог
//   GET  /api/download/{id} — боргирии APK
//
// Он чизе, ки то ҳол ВОҚЕАН тасдиқ карда НАШУДААСТ: номи дақиқи майдонҳои JSON
// дар бадани дархости /api/build (масалан appName ё app_name) ва шакли дақиқи
// ҷавоби /api/status, зеро дидани дарахти пурраи коди сервер (internal/app)
// тавассути браузери GitHub манъ буд ва JS-бандли фронтенди зинда низ дастнорас буд.
//
// Аз ин рӯ: майдонҳои зерин дар "buildFormToPayload()" бар ПОЯИ номҳои воқеии
// майдонҳои формаи зиндаи H2APK (h2apk.hashcode.win) навишта шудаанд, аммо ҳамчун
// "беҳтарин тахмини мустанад" қайд мешаванд — на ҳамчун далели 100% тасдиқшуда.
// Агар сервер хатои валидатсия баргардонад, он хатои ВОҚЕӢ бетағйир ба корбар
// нишон дода мешавад (на пинҳон карда мешавад ва на бо мушовараи қалбакӣ иваз
// мешавад). Барои тасдиқи ниҳоӣ, H2APK-ро худ бо `go build` созед ва аз UI-и
// худи он дар DevTools → Network дархости воқеиро бинед — ин ба build-server/README.md
// низ навишта шудааст.
'use strict';

const BuildAPI = {
  baseUrl() {
    return Settings.get('h2apkServerUrl', '').replace(/\/+$/, '');
  },

  isConfigured() {
    return !!this.baseUrl();
  },

  async startBuild(payload) {
    const base = this.baseUrl();
    if (!base) {
      throw new Error('Сервери H2APK танзим нашудааст. Дар ТАНЗИМОТ нишонии сервери H2APK-и худмизбон (масалан http://localhost:8080)-ро ворид кунед.');
    }
    let res;
    try {
      res = await fetch(base + '/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (netErr) {
      throw new Error(`Пайваст шудан ба сервери сохтмон имконнопазир аст: ${netErr.message}. Мутмаин шавед, ки H2APK дар "${base}" фаъол аст.`);
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) {
      throw new Error(`Хатои воқеии сервери H2APK (HTTP ${res.status}): ${data.error || data.message || text || 'бе тафсил'}`);
    }
    if (!data.id && !data.build_id && !data.buildId) {
      throw new Error('Сервер ҷавоб дод, аммо ID-и сохтмон дар он ёфт нашуд. Формати ҷавоби воқеии сервер бо интизории ин барнома мувофиқат намекунад — тафсилоти пурраи ҷавоб: ' + text);
    }
    return data.id || data.build_id || data.buildId;
  },

  async getStatus(buildId) {
    const base = this.baseUrl();
    const res = await fetch(`${base}/api/status/${encodeURIComponent(buildId)}`);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(`Хатои санҷиши ҳолат (HTTP ${res.status}): ${data.error || text}`);
    return data;
  },

  // SSE стрими лог — воқеӣ, бе фоизи қалбакӣ. onStage/onDone/onError фарохонда мешаванд
  // бо матни воқеии сатри лог, ки барномаи болоӣ онро ба марҳилаҳо мувофиқат мекунад.
  streamLog(buildId, { onLine, onError, onOpen }) {
    const base = this.baseUrl();
    if (!base) { onError && onError(new Error('Сервери H2APK танзим нашудааст.')); return null; }
    const es = new EventSource(`${base}/api/log/${encodeURIComponent(buildId)}`);
    es.onopen = () => onOpen && onOpen();
    es.onmessage = (e) => onLine && onLine(e.data);
    es.onerror = () => {
      onError && onError(new Error('Пайвастшавии SSE ба сервери H2APK қатъ шуд ё хато дод.'));
      es.close();
    };
    return es;
  },

  downloadUrl(buildId) {
    return `${this.baseUrl()}/api/download/${encodeURIComponent(buildId)}`;
  },

  // "Беҳтарин тахмини мустанад" — тибқи майдонҳои воқеии формаи зиндаи H2APK.
  // Агар сервер номи дигари майдонро талаб кунад, хатои воқеӣ инро ошкор мекунад.
  buildFormToPayload(form) {
    const payload = {
      appName: form.appName,
      packageId: form.packageId,
      version: form.version,
      versionCode: Number(form.versionCode) || 1,
      inputType: form.inputType // 'html' | 'url' | 'upload'
    };
    if (form.inputType === 'url') payload.url = form.url;
    if (form.inputType === 'html') {
      payload.html = form.html || '';
      payload.css = form.css || '';
      payload.js = form.js || '';
    }
    if (form.themeColor) payload.themeColor = form.themeColor;
    if (form.iconDataUrl) payload.icon = form.iconDataUrl;
    payload.pullToRefresh = !!form.pullToRefresh;
    payload.hideScrollbars = !!form.hideScrollbars;
    payload.transparentNavBar = !!form.transparentNavBar;
    payload.pinchZoom = !!form.pinchZoom;
    payload.disableCopy = !!form.disableCopy;
    if (form.splash && form.splash.enabled) {
      payload.splash = {
        durationSeconds: Number(form.splash.duration) || 2,
        backgroundColor: form.splash.background || '#000000',
        animation: form.splash.animation || 'fade'
      };
    }
    if (form.release) {
      payload.release = true;
      payload.minSdk = Number(form.minSdk) || undefined;
      payload.targetSdk = Number(form.targetSdk) || undefined;
      payload.allowHttp = !!form.allowHttp;
      // Калиди имзо — танҳо агар корбар худаш дод; вагарна аз H2APK хоҳиш мекунем
      // имзои худкорро истифода барад (агар дастгирӣ кунад).
      if (form.keystoreBase64) {
        payload.keystoreBase64 = form.keystoreBase64;
        payload.keystorePassword = form.keystorePassword;
        payload.keyAlias = form.keyAlias;
        payload.keyPassword = form.keyPassword || form.keystorePassword;
      }
    }
    return payload;
  }
};

window.BuildAPI = BuildAPI;
