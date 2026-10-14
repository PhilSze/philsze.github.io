// Mesure des interactions explicites, uniquement après accord analytique.
// Aucun champ de formulaire, e-mail ou URL complète ne rejoint le dataLayer.
// PSConsent.sendEvent relaie chaque événement vers la balise Google existante.
// Ne pas ajouter de balises GTM GA4 pour ces mêmes événements : cela les doublerait.
(() => {
  'use strict';

  if (window.PSTracking) return;

  const CONTENT_ACTIONS = Object.freeze({
    portfolio: 'open_project',
    article: 'read_article',
    section: 'navigate_section',
    collection: 'open_collection',
    profile: 'view_profile'
  });
  const PLACEMENTS = new Set([
    'header', 'hero', 'missions', 'archive', 'catalog',
    'project_navigation', 'project_source', 'about', 'contact'
  ]);
  const CONTACT_METHODS = new Set(['section', 'email', 'linkedin', 'form']);
  const detailsStates = new WeakMap();
  const successfulSubmissions = new Set();

  document.querySelectorAll('details[data-track-content]').forEach((details) => {
    detailsStates.set(details, details.open);
  });

  function analyticsAllowed() {
    try {
      return window.PSConsent?.analyticsAllowed() === true;
    } catch (_) {
      return false;
    }
  }

  function push(payload) {
    if (!analyticsAllowed()) return false;
    try {
      if (typeof window.PSConsent?.sendEvent === 'function') {
        return window.PSConsent.sendEvent(payload) !== false;
      }
      if (!Array.isArray(window.dataLayer)) return false;
      window.dataLayer.push(payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  function placementFor(element) {
    const placement = element.getAttribute('data-placement');
    return PLACEMENTS.has(placement) ? placement : undefined;
  }

  function contentPayload(element) {
    const contentId = element.getAttribute('data-track-content');
    const contentName = element.getAttribute('data-content-name');
    const contentType = element.getAttribute('data-content-type');
    if (!contentId || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(contentId)) return null;
    if (!contentName || contentName.length > 120) return null;
    if (!Object.prototype.hasOwnProperty.call(CONTENT_ACTIONS, contentType)) return null;

    const payload = {
      event: 'view_content',
      page_path: window.location.pathname,
      content_id: contentId,
      content_name: contentName,
      content_type: contentType,
      content_action: CONTENT_ACTIONS[contentType]
    };
    const placement = placementFor(element);
    if (placement) payload.placement = placement;
    return payload;
  }

  function contactPayload(element) {
    const method = element.getAttribute('data-track-contact');
    if (!CONTACT_METHODS.has(method)) return null;
    const payload = {
      event: 'contact_click',
      page_path: window.location.pathname,
      contact_method: method
    };
    const placement = placementFor(element);
    if (placement) payload.placement = placement;
    return payload;
  }

  function navigationDestination(anchor, event) {
    if (!anchor || event.defaultPrevented) return null;
    if (event.button != null && event.button !== 0) return null;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return null;
    if (anchor.hasAttribute('download')) return null;

    const target = (anchor.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return null;
    const href = (anchor.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#')) return null;

    try {
      const destination = new URL(href, window.location.href);
      if (destination.protocol === 'mailto:') return destination.href;
      if ((destination.protocol === 'http:' || destination.protocol === 'https:') &&
          destination.origin === window.location.origin) return destination.href;
    } catch (_) {
      // Un lien invalide conserve le comportement natif du navigateur.
    }
    return null;
  }

  function pushBeforeNavigation(payload, destination, event) {
    let navigated = false;
    let fallbackTimer;
    const navigate = () => {
      if (navigated) return;
      navigated = true;
      window.clearTimeout(fallbackTimer);
      window.location.assign(destination);
    };

    event.preventDefault();
    // Le délai reste borné même si GTM est bloqué ou n'est pas encore chargé.
    fallbackTimer = window.setTimeout(navigate, 275);
    payload.eventCallback = navigate;
    payload.eventTimeout = 250;
    if (!push(payload)) navigate();
  }

  document.addEventListener('click', (event) => {
    if (!analyticsAllowed()) return;
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const contact = target.closest('[data-track-contact]');
    const content = target.closest('a[data-track-content]');
    const payload = contact ? contactPayload(contact) : content ? contentPayload(content) : null;
    if (!payload) return;

    const destination = navigationDestination(target.closest('a[href]'), event);
    if (destination) pushBeforeNavigation(payload, destination, event);
    else push(payload);
  });

  // "toggle" ne remonte pas : capture permet de suivre l'ouverture des détails.
  // Le clic sur le résumé et la fermeture ne créent pas d'événement supplémentaire.
  document.addEventListener('toggle', (event) => {
    const details = event.target;
    if (!details || details.tagName !== 'DETAILS' ||
        !details.hasAttribute('data-track-content')) return;
    const previouslyOpen = detailsStates.get(details);
    detailsStates.set(details, details.open);
    if (!details.open || previouslyOpen === true) return;
    const payload = contentPayload(details);
    if (payload) push(payload);
  }, true);

  window.PSTracking = Object.freeze({
    // À appeler après confirmation de l'envoi, jamais au clic sur "Envoyer".
    // submissionId est un identifiant temporaire local et n'est jamais transmis.
    generateLead(formId, submissionId) {
      if (formId !== 'callback_form') return false;
      const hasSubmissionId = typeof submissionId === 'string' && submissionId.length > 0;
      if (hasSubmissionId && successfulSubmissions.has(submissionId)) return false;
      const recorded = push({
        event: 'generate_lead',
        page_path: window.location.pathname,
        form_id: 'callback_form',
        contact_method: 'form',
        placement: 'contact'
      });
      if (recorded && hasSubmissionId) {
        successfulSubmissions.add(submissionId);
        if (successfulSubmissions.size > 1000) {
          successfulSubmissions.delete(successfulSubmissions.values().next().value);
        }
      }
      return recorded;
    }
  });
})();
