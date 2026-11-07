(() => {
  'use strict';

  const MODE_KEY = 'ottoSpeechModeV1';
  const CLIENT_VERSION = 'otto-start-v8-a1';
  const SPELLING_SEQUENCE = /((?:\b[A-ZÄÖÜẞ]\b\s*[–—-]\s*)+\b[A-ZÄÖÜẞ]\b)/u;
  const LETTER_NAMES = {
    A:'A',B:'Be',C:'Ce',D:'De',E:'E',F:'Ef',G:'Ge',H:'Ha',I:'I',J:'Jot',K:'Ka',L:'El',M:'Em',
    N:'En',O:'O',P:'Pe',Q:'Ku',R:'Er',S:'Es',T:'Te',U:'U',V:'Vau',W:'Weh',X:'Iks',Y:'Ypsilon',Z:'Zett',
    'Ä':'Ä','Ö':'Ö','Ü':'Ü','ẞ':'Eszett','ß':'Eszett'
  };
  const MALE_HINTS = ['conrad','stefan','killian','klaus','ralf','bernd','kasper','hans','michael','christoph','markus','male'];
  const FEMALE_HINTS = ['katja','hedda','anna','petra','vicki','amala','seraphina','female'];

  let activeAudio = null;
  let activeUtterance = null;
  let requestId = 0;
  let serverVoiceUnavailableUntil = 0;
  const sessionAudioCache = new Map();

  const synth = window.speechSynthesis;
  const nativeSpeak = synth?.speak ? synth.speak.bind(synth) : null;
  const nativeCancel = synth?.cancel ? synth.cancel.bind(synth) : null;

  function savedMode() {
    try {
      const value = localStorage.getItem(MODE_KEY);
      if (value === 'normal' || value === 'slow') return value;
    } catch {}
    return null;
  }

  function suggestedMode() {
    try {
      if (location.pathname.startsWith('/otto-start')) {
        const state = JSON.parse(localStorage.getItem('ottoStartLearningPathV2') || '{}');
        return Number(state.currentLesson || 1) <= 7 ? 'slow' : 'normal';
      }
    } catch {}
    return 'normal';
  }

  function currentMode() {
    return savedMode() || suggestedMode();
  }

  function setMode(mode) {
    const next = mode === 'slow' ? 'slow' : 'normal';
    try { localStorage.setItem(MODE_KEY, next); } catch {}
    syncControls();
    window.dispatchEvent(new CustomEvent('otto:speech-mode', { detail: { mode: next } }));
  }

  async function loadVoices(timeoutMs = 2200) {
    if (!synth?.getVoices) return [];
    const current = synth.getVoices() || [];
    if (current.length) return current;
    return await new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { synth.removeEventListener?.('voiceschanged', onChange); } catch {}
        resolve(synth.getVoices?.() || []);
      };
      const onChange = () => {
        const voices = synth.getVoices?.() || [];
        if (voices.length) finish();
      };
      try { synth.addEventListener?.('voiceschanged', onChange); } catch {}
      window.setTimeout(finish, timeoutMs);
    });
  }

  function rankGermanVoice(voice) {
    const name = String(voice?.name || '').toLowerCase();
    const lang = String(voice?.lang || '').replace('_','-').toLowerCase();
    if (!lang.startsWith('de-') && lang !== 'de') return -9999;
    let score = 0;
    if (lang === 'de-de') score += 100;
    else if (lang.startsWith('de-')) score += 55;
    else score += 30;
    if (MALE_HINTS.some((hint) => name.includes(hint))) score += 180;
    if (FEMALE_HINTS.some((hint) => name.includes(hint))) score -= 20;
    if (name.includes('natural') || name.includes('online') || name.includes('neural')) score += 45;
    if (name.includes('microsoft')) score += 24;
    if (name.includes('google')) score += 18;
    if (voice.localService === false) score += 8;
    if (voice.default) score += 2;
    return score;
  }

  function pickGermanVoice(voices = []) {
    return voices
      .map((voice) => ({ voice, score: rankGermanVoice(voice) }))
      .filter((entry) => entry.score > -9999)
      .sort((a, b) => b.score - a.score)[0]?.voice || null;
  }

  function looksMale(voice) {
    const name = String(voice?.name || '').toLowerCase();
    return MALE_HINTS.some((hint) => name.includes(hint));
  }

  function stop() {
    requestId += 1;
    if (activeAudio) {
      try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
      activeAudio = null;
    }
    try { nativeCancel?.(); } catch {}
    activeUtterance = null;
  }

  function ttsUrl(text, options = {}) {
    const clean = String(text || '').trim();
    const kind = options.kind === 'letter' || /^[A-ZÄÖÜẞß]$/iu.test(clean) ? 'letter' : 'text';
    const q = new URLSearchParams({
      text: clean,
      mode: options.mode === 'slow' ? 'slow' : 'normal',
      kind,
      v: CLIENT_VERSION,
    });
    return `/api/otto-tts?${q.toString()}`;
  }

  async function serverSpeak(text, options = {}, waitForEnd = false, token = requestId) {
    if (token !== requestId) return false;
    if (Date.now() < serverVoiceUnavailableUntil || typeof Audio === 'undefined') return false;
    const clean = String(text || '').trim();
    if (!clean) return false;
    const url = ttsUrl(clean, options);
    const cached = sessionAudioCache.get(url);
    const audio = cached || new Audio();
    if (token !== requestId) return false;
    activeAudio = audio;
    audio.preload = 'auto';
    audio.playsInline = true;
    audio.volume = 1;
    if (!cached) audio.src = url;
    else {
      try { audio.pause(); audio.currentTime = 0; } catch {}
    }
    return await new Promise((resolve) => {
      let settled = false;
      const eventName = waitForEnd ? 'ended' : 'playing';
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        audio.removeEventListener(eventName, onSuccess);
        audio.removeEventListener('error', onError);
        if (ok && token === requestId) sessionAudioCache.set(url, audio);
        else if (activeAudio === audio) activeAudio = null;
        resolve(ok);
      };
      const onSuccess = () => finish(true);
      const onError = () => {
        sessionAudioCache.delete(url);
        if (token === requestId) serverVoiceUnavailableUntil = Date.now() + 60_000;
        finish(false);
      };
      audio.addEventListener(eventName, onSuccess, { once: true });
      audio.addEventListener('error', onError, { once: true });
      const timer = window.setTimeout(() => {
        sessionAudioCache.delete(url);
        if (token === requestId) serverVoiceUnavailableUntil = Date.now() + 30_000;
        finish(false);
      }, waitForEnd ? 25_000 : 6500);
      try {
        const p = audio.play();
        p?.catch?.(() => finish(false));
      } catch { finish(false); }
    });
  }

  async function browserSpeak(text, options = {}, waitForEnd = false, token = requestId) {
    if (token !== requestId) return false;
    if (!nativeSpeak || !window.SpeechSynthesisUtterance) return false;
    const voices = await loadVoices();
    if (token !== requestId) return false;
    const voice = pickGermanVoice(voices);
    if (!voice) return false;
    const raw = String(text || '').trim();
    const kind = options.kind === 'letter' || /^[A-ZÄÖÜẞß]$/iu.test(raw) ? 'letter' : 'text';
    const spoken = kind === 'letter' ? (LETTER_NAMES[raw] || LETTER_NAMES[raw.toLocaleUpperCase('de-DE')] || raw) : raw;
    if (!spoken) return false;
    if (token !== requestId) return false;
    try { nativeCancel?.(); } catch {}
    return await new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = 'de-DE';
      utterance.voice = voice;
      utterance.rate = options.mode === 'slow' ? 0.70 : 0.86;
      utterance.pitch = looksMale(voice) ? 0.96 : 1.0;
      utterance.volume = 1;
      activeUtterance = utterance;
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (activeUtterance === utterance) activeUtterance = null;
        resolve(ok);
      };
      utterance.onstart = () => { if (!waitForEnd) finish(true); };
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);
      if (token !== requestId) { finish(false); return; }
      try { nativeSpeak(utterance); } catch { finish(false); }
      window.setTimeout(() => { if (!settled && !synth?.speaking) finish(false); }, waitForEnd ? Math.max(3000, spoken.length * 260) : 1800);
    });
  }

  async function speakChunk(text, options = {}, waitForEnd = false, token = requestId) {
    if (token !== requestId) return false;
    let ok = await serverSpeak(text, options, waitForEnd, token);
    if (token !== requestId) return false;
    if (!ok) ok = await browserSpeak(text, options, waitForEnd, token);
    return token === requestId && ok;
  }

  function spellingParts(text) {
    const match = SPELLING_SEQUENCE.exec(String(text || ''));
    if (!match) return null;
    const spelling = match[1];
    const letters = spelling.split(/[–—-]/u).map((value) => value.trim().toLocaleUpperCase('de-DE')).filter(Boolean);
    return {
      prefix: String(text).slice(0, match.index).trim(),
      letters,
      suffix: String(text).slice(match.index + spelling.length).replace(/^\s*[.!?,;:]\s*/, '').trim(),
    };
  }

  const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

  async function playSpelling(text, options = {}) {
    const clean = String(text || '').trim();
    const parsed = spellingParts(clean);
    if (!parsed) return play(clean, options);
    const mode = options.mode === 'normal' || options.mode === 'slow' ? options.mode : currentMode();
    const id = ++requestId;
    if (activeAudio) { try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {} activeAudio = null; }
    try { nativeCancel?.(); } catch {}

    if (parsed.prefix) {
      if (!(await speakChunk(parsed.prefix, { mode }, true, id)) || id !== requestId) return false;
      await delay(180);
    }
    for (let index = 0; index < parsed.letters.length; index += 1) {
      if (id !== requestId) return false;
      if (!(await speakChunk(parsed.letters[index], { mode: 'slow', kind: 'letter' }, true, id))) return false;
      if (index < parsed.letters.length - 1) await delay(210);
    }
    if (parsed.suffix) {
      await delay(180);
      if (!(await speakChunk(parsed.suffix, { mode }, true, id)) || id !== requestId) return false;
    }
    return true;
  }

  async function play(text, options = {}) {
    const clean = String(text || '').trim();
    if (!clean) return false;
    if (SPELLING_SEQUENCE.test(clean)) return playSpelling(clean, options);
    const mode = options.mode === 'slow' || options.mode === 'normal' ? options.mode : currentMode();
    const kind = options.kind === 'letter' || /^[A-ZÄÖÜẞß]$/iu.test(clean) ? 'letter' : 'text';
    const id = ++requestId;

    if (activeAudio) { try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {} activeAudio = null; }
    try { nativeCancel?.(); } catch {}

    const ok = await speakChunk(clean, { mode, kind }, false, id);
    return id === requestId && ok;
  }

  function playNumbers(text, options = {}) {
    return play(text, options);
  }

  window.OttoSpeech = {
    play,
    playSpelling,
    playNumbers,
    stop,
    setMode,
    getMode: currentMode,
    ttsUrl,
    isNeuralPreferred: true,
  };

  // Compatibility bridge: all existing German speechSynthesis calls in OTTO A1 use this one voice layer.
  if (synth && nativeSpeak) {
    try {
      synth.speak = (utterance) => {
        const text = String(utterance?.text || '').trim();
        if (!text) return nativeSpeak(utterance);
        const lang = String(utterance?.lang || '').toLowerCase();
        if (lang && !lang.startsWith('de')) return nativeSpeak(utterance);
        void play(text, { mode: currentMode() });
      };
      synth.cancel = () => stop();
    } catch {
      // Some embedded browsers expose non-writable SpeechSynthesis methods.
    }
  }

  function controlMarkup() {
    const mode = currentMode();
    return `<div class="otto-speech-speed" role="group" aria-label="Скорость немецкой речи">
      <span>Темп</span>
      <button type="button" data-otto-speech-mode="normal" class="${mode === 'normal' ? 'is-active' : ''}" aria-pressed="${mode === 'normal'}">🔊 Нормально</button>
      <button type="button" data-otto-speech-mode="slow" class="${mode === 'slow' ? 'is-active' : ''}" aria-pressed="${mode === 'slow'}">🐢 Медленнее</button>
    </div>`;
  }

  function syncControls() {
    const mode = currentMode();
    document.querySelectorAll('[data-otto-speech-mode]').forEach((button) => {
      const active = button.getAttribute('data-otto-speech-mode') === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function enhanceStartUI() {
    if (!location.pathname.startsWith('/otto-start')) return;
    const screen = document.querySelector('#app .screen');
    if (!screen) return;

    if (screen.querySelector('[data-speak], [data-letter]') && !screen.querySelector('.otto-speech-speed')) {
      const holder = document.createElement('div');
      holder.innerHTML = controlMarkup();
      const control = holder.firstElementChild;
      const anchor = screen.querySelector('.lesson-top, .topbar');
      if (anchor?.nextSibling) anchor.parentNode.insertBefore(control, anchor.nextSibling);
      else screen.prepend(control);
    }

    if (screen.querySelector('.settings') && !screen.querySelector('.otto-ai-voice-note')) {
      const note = document.createElement('div');
      note.className = 'otto-ai-voice-note';
      note.innerHTML = '<b>Голос Отто</b><p>Основная немецкая озвучка создаётся нейросинтезом. Если она временно недоступна, приложение автоматически использует немецкий голос устройства.</p>';
      screen.querySelector('.settings').after(note);
    }
    syncControls();
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-otto-speech-mode]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    setMode(button.getAttribute('data-otto-speech-mode'));
  }, true);

  try { synth?.getVoices?.(); } catch {}
  if (synth?.addEventListener) synth.addEventListener('voiceschanged', syncControls);
  const appRoot = document.querySelector('#app');
  if (appRoot) new MutationObserver(() => queueMicrotask(enhanceStartUI)).observe(appRoot, { childList: true, subtree: true });
  enhanceStartUI();
})();
