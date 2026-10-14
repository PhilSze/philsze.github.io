// Le formulaire reste utilisable sans JavaScript grâce à son action HTML.
(() => {
  'use strict';

  const form = document.getElementById('callback-form');
  if (!form) return;

  const pageUrl = () => window.location.origin + window.location.pathname;
  const sourceInput = form.elements.namedItem('_url');
  if (sourceInput) sourceInput.value = pageUrl();
  if (typeof window.fetch !== 'function' || typeof window.AbortController !== 'function') return;

  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('callback-status');
  const verificationButton = document.getElementById('callback-verification');
  if (!button || !status) return;

  const idleLabel = button.textContent;
  let pending = false;

  const setStatus = (message, state = 'success') => {
    status.textContent = message;
    status.dataset.state = state;
    status.setAttribute('role', state === 'error' ? 'alert' : 'status');
    if (state === 'error') status.focus();
  };

  const errorMessages = {
    activation: 'Le formulaire n’est pas encore activé. Vous pouvez continuer avec la vérification ou m’écrire directement par e-mail.',
    captcha: 'Une vérification est nécessaire avant l’envoi. Utilisez « Continuer avec la vérification » pour poursuivre.',
    rate_limit: 'Trop de tentatives ont été effectuées. Patientez quelques minutes avant de réessayer, ou écrivez-moi par e-mail.',
    unavailable: 'Le service de contact est temporairement indisponible. Réessayez plus tard ou écrivez-moi directement par e-mail.',
    validation: 'Le formulaire n’a pas été accepté. Vérifiez les informations saisies ou continuez avec la vérification.',
    rejected: 'Votre demande n’a pas été acceptée. Réessayez, continuez avec la vérification ou écrivez-moi directement par e-mail.',
    invalid_response: 'Nous n’avons pas pu confirmer l’envoi. Vous pouvez réessayer, continuer avec la vérification ou m’écrire directement par e-mail.',
    network: 'La connexion n’a pas permis de confirmer l’envoi. Réessayez, continuez avec la vérification ou écrivez-moi directement par e-mail.',
    timeout: 'L’envoi a pris trop de temps et n’a pas pu être confirmé. Réessayez, continuez avec la vérification ou écrivez-moi directement par e-mail.'
  };

  const submissionError = (code) => {
    const error = new Error('Contact request not confirmed');
    error.code = code;
    return error;
  };

  const classifyResponse = (response, result) => {
    // Seuls les motifs explicites servent à choisir notre texte. La réponse
    // brute du fournisseur n’est jamais affichée, enregistrée ou transmise.
    const message = result && typeof result.message === 'string'
      ? result.message.toLowerCase().replace(/\s+/g, ' ').slice(0, 1000)
      : '';
    const activation = /\bactivate\s+(?:your|the|this)\s+form\b/.test(message)
      || /\bform\b.{0,60}\b(?:not|must|needs?|pending|awaiting)\b.{0,40}\bactivat(?:e|ed|ion)\b/.test(message)
      || /\bactivat(?:e|ion)\b.{0,70}\b(?:e-?mail|inbox)\b/.test(message)
      || /\b(?:e-?mail|inbox)\b.{0,70}\bactivat(?:e|ion)\b/.test(message)
      || /\bactivation\b.{0,25}\b(?:required|pending|needed)\b/.test(message)
      || /\b(?:confirm|verify)\s+your\s+e-?mail(?:\s+address)?\b/.test(message)
      || /\bcheck\s+your\s+(?:e-?mail|inbox)\b.{0,80}\b(?:confirm|activate)\b.{0,30}\b(?:form|e-?mail|address)\b/.test(message);
    const captcha = /\b(?:recaptcha|captcha)\b.{0,60}\b(?:required|missing|invalid|failed|failure|challenge)\b/.test(message)
      || /\b(?:complete|verify|solve)\b.{0,40}\b(?:recaptcha|captcha)\b/.test(message)
      || /\b(?:recaptcha|captcha)\b.{0,40}\bnot\b.{0,20}\b(?:completed|verified)\b/.test(message);
    if (activation) return 'activation';
    if (captcha) return 'captcha';
    if (response.status === 429) return 'rate_limit';
    if (response.status >= 500) return 'unavailable';
    if (response.status === 422) return 'validation';
    if (!response.ok) return 'rejected';
    if (!result || typeof result !== 'object' || Array.isArray(result)) return 'invalid_response';
    if (result.success === true || result.success === 'true') return null;
    if (result.success === false || result.success === 'false') return 'rejected';
    return 'invalid_response';
  };

  const restoreButtons = () => {
    pending = false;
    button.disabled = false;
    button.textContent = idleLabel;
    if (verificationButton) verificationButton.disabled = false;
    form.removeAttribute('aria-busy');
  };

  const submissionId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'callback-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  };

  form.addEventListener('submit', async (event) => {
    if (pending) {
      event.preventDefault();
      return;
    }

    ['email', 'name', 'message'].forEach((field) => {
      const input = form.elements.namedItem(field);
      if (input) input.value = input.value.trim();
    });
    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    const honeypot = form.elements.namedItem('_honey');
    if (honeypot && honeypot.value.trim()) {
      event.preventDefault();
      setStatus('Votre demande n’a pas pu être envoyée. Veuillez réessayer ou m’écrire par e-mail.', 'error');
      return;
    }

    if (sourceInput) sourceInput.value = pageUrl();
    pending = true;
    button.disabled = true;
    if (verificationButton) verificationButton.disabled = true;
    form.setAttribute('aria-busy', 'true');

    if (verificationButton && event.submitter === verificationButton) {
      // Ce POST est déclenché uniquement par un second clic du visiteur.
      // La page du fournisseur gère sa vérification et aucun Lead n’est compté ici.
      setStatus('Ouverture de la page de vérification…', 'pending');
      return;
    }

    event.preventDefault();
    button.textContent = 'Envoi en cours…';
    if (verificationButton) verificationButton.hidden = true;
    setStatus('Votre demande est en cours d’envoi.', 'pending');

    let timeout;

    try {
      const controller = new window.AbortController();
      timeout = window.setTimeout(() => controller.abort(), 15000);
      const response = await window.fetch('https://formsubmit.co/ajax/philippeszelag@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'strict-origin',
        signal: controller.signal,
        body: JSON.stringify({
          email: form.elements.namedItem('email').value,
          name: form.elements.namedItem('name').value,
          message: form.elements.namedItem('message').value,
          _subject: 'Demande de rappel depuis philippeszelag.fr',
          _honey: '',
          _url: pageUrl()
        })
      });
      const body = await response.text();
      let result = null;
      try { result = JSON.parse(body); } catch (_) { /* Réponse non JSON. */ }
      const errorCode = classifyResponse(response, result);
      if (errorCode) throw submissionError(errorCode);

      form.reset();
      if (sourceInput) sourceInput.value = pageUrl();
      setStatus('Votre demande a bien été transmise. Merci !');

      // L’événement ne contient jamais les coordonnées ou le message du visiteur.
      try {
        window.PSTracking?.generateLead?.('callback_form', submissionId());
      } catch (_) {
        // Une indisponibilité du suivi ne change pas le résultat de l’envoi.
      }
    } catch (error) {
      const errorCode = error && error.name === 'AbortError'
        ? 'timeout'
        : error && error.code && errorMessages[error.code] ? error.code : 'network';
      setStatus(errorMessages[errorCode], 'error');
      if (verificationButton) verificationButton.hidden = false;
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      restoreButtons();
    }
  });

  // Les boutons redeviennent utilisables si le visiteur revient du fournisseur.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      restoreButtons();
      if (status.dataset.state === 'pending') status.textContent = '';
    }
  });
})();
