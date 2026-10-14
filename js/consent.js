// Consentement de base : le conteneur et sa balise Google ne chargent qu'après accord.
// La balise existante configure GA4 et sa page vue. Ne pas ajouter une seconde config.
// Les événements explicites sont relayés une seule fois par sendEvent ci-dessous.
(() => {
  'use strict';

  if (window.PSConsent) return;

  const CONTAINER_ID = 'GTM-MRVVN2H';
  const MEASUREMENT_ID = 'G-9ZKCR4JBBB';
  const DISABLE_KEY = 'ga-disable-' + MEASUREMENT_ID;
  const STORAGE_KEY = 'ps.analytics.v1';
  const CHOICE_LIFETIME = 180 * 24 * 60 * 60 * 1000;
  const MODEL_KEYS = [
    'page_path', 'content_id', 'content_name', 'content_type',
    'content_action', 'contact_method', 'form_id', 'placement'
  ];
  const CONTENT_ACTIONS = Object.freeze({
    portfolio: 'open_project',
    article: 'read_article',
    section: 'navigate_section',
    collection: 'open_collection',
    profile: 'view_profile'
  });
  const CONTACT_METHODS = new Set(['section', 'email', 'linkedin', 'form']);
  const PLACEMENTS = new Set([
    'header', 'hero', 'missions', 'archive', 'catalog',
    'project_navigation', 'project_source', 'about', 'contact'
  ]);

  let choice = readChoice();
  let containerLoaded = false;
  let banner = null;
  let restoreFocus = null;

  window.dataLayer = window.dataLayer || [];
  // Ce stub ne charge aucune bibliothèque et n'envoie aucune requête.
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window[DISABLE_KEY] = true;
  window.gtag('consent', 'default', consentState(false));
  window.gtag('set', {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    ads_data_redaction: true
  });

  function consentState(allowed) {
    return {
      analytics_storage: allowed ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    };
  }

  function readChoice() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      const age = stored ? Date.now() - stored.timestamp : NaN;
      if (stored && (stored.analytics === 'granted' || stored.analytics === 'denied') &&
          typeof stored.timestamp === 'number' && Number.isFinite(age) &&
          age >= 0 && age < CHOICE_LIFETIME) return stored.analytics;
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // Le choix reste utilisable en mémoire si le stockage est indisponible.
    }
    return null;
  }

  function rememberChoice() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        analytics: choice,
        timestamp: Date.now()
      }));
    } catch (_) {
      // Aucune mesure n'est accordée à cause d'une erreur de stockage.
    }
  }

  function loadContainer() {
    if (containerLoaded || choice !== 'granted') return;
    containerLoaded = true;
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + CONTAINER_ID;
    script.id = 'ps-google-tag-manager';
    document.head.appendChild(script);
  }

  function removeAnalyticsCookies() {
    try {
      const names = document.cookie.split(';').map((cookie) => cookie.split('=')[0].trim())
        .filter((name) => /^_ga(?:_[a-z0-9_]+)?$|^_gid$|^_gat(?:_[a-z0-9_]+)?$/i.test(name));
      const host = window.location.hostname;
      const domains = ['', host, '.' + host];
      // Une visite en www peut aussi avoir reçu le cookie sur le domaine principal.
      if (host === 'www.philippeszelag.fr') domains.push('philippeszelag.fr', '.philippeszelag.fr');
      names.forEach((name) => {
        domains.forEach((domain) => {
          document.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' +
            (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
        });
      });
    } catch (_) {
      // La désactivation GA4 et le consentement refusé restent en vigueur.
    }
  }

  function applyChoice(allowed) {
    choice = allowed ? 'granted' : 'denied';
    window[DISABLE_KEY] = !allowed;
    window.gtag('consent', 'update', consentState(allowed));
    rememberChoice();
    if (allowed) loadContainer();
    else removeAnalyticsCookies();
    closeBanner();
  }

  function closeBanner() {
    if (banner) banner.hidden = true;
    if (restoreFocus && typeof restoreFocus.focus === 'function') restoreFocus.focus();
    restoreFocus = null;
  }

  function createBanner() {
    if (banner) return;
    banner = document.createElement('section');
    banner.id = 'analytics-consent';
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', 'consent-title');
    banner.setAttribute('aria-describedby', 'consent-description');
    banner.setAttribute('tabindex', '-1');
    banner.hidden = true;

    const inner = document.createElement('div');
    inner.className = 'consent-inner';
    const copy = document.createElement('div');
    copy.className = 'consent-copy';
    const title = document.createElement('h2');
    title.id = 'consent-title';
    title.textContent = 'Votre choix pour la mesure d’audience';
    const description = document.createElement('p');
    description.id = 'consent-description';
    description.textContent = 'Avec votre accord, des statistiques m’aident à comprendre quels contenus sont consultés. Le site et le formulaire fonctionnent aussi sans cette mesure.';
    const privacy = document.createElement('a');
    privacy.className = 'consent-privacy';
    privacy.href = 'confidentialite.html';
    privacy.textContent = 'Confidentialité';
    copy.appendChild(title);
    copy.appendChild(description);
    copy.appendChild(privacy);

    const actions = document.createElement('div');
    actions.className = 'consent-actions';
    [ ['Accepter', true], ['Refuser', false] ].forEach(([label, allowed]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'consent-button';
      button.textContent = label;
      button.setAttribute('data-consent-choice', allowed ? 'accept' : 'refuse');
      button.addEventListener('click', () => applyChoice(allowed));
      actions.appendChild(button);
    });
    inner.appendChild(copy);
    inner.appendChild(actions);
    banner.appendChild(inner);
    document.body.appendChild(banner);
  }

  function openBanner(trigger) {
    if (!document.body) return;
    createBanner();
    restoreFocus = trigger || null;
    banner.hidden = false;
    if (trigger) banner.focus();
  }

  function safePagePath() {
    const path = window.location.pathname;
    // Les pages du site sont statiques. Aucun paramètre, fragment ou e-mail n'est envoyé.
    return typeof path === 'string' &&
      /^\/(?:index\.html|portfolio-item(?:_[a-z0-9_-]+)?\.html|confidentialite\.html|merci\.html)?$/i.test(path) &&
      path.length <= 200
      ? path : '/';
  }

  function safeContentName(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 120 &&
      !/[@\r\n]|https?:|(?:\+?\d[\s().-]*){8,}/i.test(value);
  }

  function eventParameters(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const params = { page_path: safePagePath() };
    if (payload.event === 'view_content') {
      const type = payload.content_type;
      if (typeof payload.content_id !== 'string' ||
          !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(payload.content_id) ||
          !safeContentName(payload.content_name) ||
          !Object.prototype.hasOwnProperty.call(CONTENT_ACTIONS, type) ||
          payload.content_action !== CONTENT_ACTIONS[type]) return null;
      params.content_id = payload.content_id;
      params.content_name = payload.content_name;
      params.content_type = type;
      params.content_action = CONTENT_ACTIONS[type];
    } else if (payload.event === 'contact_click') {
      if (!CONTACT_METHODS.has(payload.contact_method)) return null;
      params.contact_method = payload.contact_method;
    } else if (payload.event === 'generate_lead') {
      if (payload.form_id !== 'callback_form' || payload.contact_method !== 'form') return null;
      params.form_id = 'callback_form';
      params.contact_method = 'form';
    } else return null;
    if (PLACEMENTS.has(payload.placement)) params.placement = payload.placement;
    return params;
  }

  function sendEvent(payload) {
    if (choice !== 'granted') return false;
    const params = eventParameters(payload);
    if (!params) return false;

    // L'objet lisible permet l'inspection GTM, mais aucune balise GTM d'événement
    // ne doit y être reliée : la commande gtag suivante effectue l'unique envoi GA4.
    const debugEvent = { event: payload.event };
    MODEL_KEYS.forEach((key) => { debugEvent[key] = null; });
    Object.assign(debugEvent, params);
    window.dataLayer.push(debugEvent);

    const googleParams = Object.assign({}, params, { send_to: MEASUREMENT_ID });
    if (typeof payload.eventCallback === 'function') googleParams.event_callback = payload.eventCallback;
    if (typeof payload.eventTimeout === 'number' && Number.isFinite(payload.eventTimeout)) {
      googleParams.event_timeout = Math.max(50, Math.min(1000, payload.eventTimeout));
    }
    window.gtag('event', payload.event, googleParams);
    return true;
  }

  window.PSConsent = Object.freeze({
    analyticsAllowed: () => choice === 'granted',
    sendEvent,
    open: openBanner
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    const trigger = target && typeof target.closest === 'function'
      ? target.closest('[data-open-consent]') : null;
    if (!trigger) return;
    event.preventDefault();
    openBanner(trigger);
  });

  function initialiseBanner() {
    if (choice === null) openBanner();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialiseBanner, { once: true });
  } else initialiseBanner();

  if (choice === 'granted') {
    window[DISABLE_KEY] = false;
    window.gtag('consent', 'update', consentState(true));
    loadContainer();
  } else removeAnalyticsCookies();
})();
