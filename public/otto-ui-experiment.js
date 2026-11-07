(() => {
  'use strict';
  const VARIANT_KEY = 'ottoCtaVariantV1';
  const METRICS_KEY = 'ottoUiExperimentV1';

  function variant() {
    try {
      const saved = localStorage.getItem(VARIANT_KEY);
      if (saved === 'A' || saved === 'B') return saved;
      const assigned = Math.random() < 0.5 ? 'A' : 'B';
      localStorage.setItem(VARIANT_KEY, assigned);
      return assigned;
    } catch {
      return 'A';
    }
  }

  const assigned = variant();
  document.documentElement.dataset.ottoCtaVariant = assigned;

  function record(label, path) {
    const event = { variant: assigned, label: String(label || '').trim().slice(0, 120), path, at: Date.now() };
    try {
      const current = JSON.parse(localStorage.getItem(METRICS_KEY) || '{"clicks":[]}');
      current.clicks = Array.isArray(current.clicks) ? current.clicks.slice(-99) : [];
      current.clicks.push(event);
      localStorage.setItem(METRICS_KEY, JSON.stringify(current));
    } catch {}
    window.dispatchEvent(new CustomEvent('otto:cta', { detail: event }));
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button, a');
    if (!button) return;
    const className = String(button.className || '');
    const isPrimary = button.matches('[data-main-a1], [data-onboard], [data-start-lesson], [data-complete], .btn-primary, .otto-exam-button, .otto-primary-button') ||
      /bg-slate-900|bg-teal-6|bg-teal-7/.test(className);
    if (!isPrimary) return;
    record(button.textContent, location.pathname);
  }, true);

  window.OttoUiExperiment = {
    variant: assigned,
    getLocalMetrics() {
      try { return JSON.parse(localStorage.getItem(METRICS_KEY) || '{"clicks":[]}'); }
      catch { return { clicks: [] }; }
    },
  };
})();
