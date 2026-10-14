// Le formulaire reste utilisable sans JavaScript grâce à son action HTML.
(() => {
  'use strict';

  const form = document.getElementById('callback-form');
  if (!form) return;

  const pageUrl = () => window.location.origin + window.location.pathname;
  const sourceInput = form.elements.namedItem('_url');
  if (sourceInput) sourceInput.value = pageUrl();
  if (typeof window.fetch !== 'function') return;

  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('callback-status');
  if (!button || !status) return;

  const idleLabel = button.textContent;
  let pending = false;

  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.dataset.state = error ? 'error' : 'success';
    status.setAttribute('role', error ? 'alert' : 'status');
    if (error) status.focus();
  };

  const submissionId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'callback-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;

    ['email', 'name', 'message'].forEach((field) => {
      const input = form.elements.namedItem(field);
      if (input) input.value = input.value.trim();
    });
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const honeypot = form.elements.namedItem('_honey');
    if (honeypot && honeypot.value.trim()) {
      setStatus('Votre demande n’a pas pu être envoyée. Veuillez réessayer ou m’écrire par e-mail.', true);
      return;
    }

    pending = true;
    button.disabled = true;
    button.textContent = 'Envoi en cours…';
    form.setAttribute('aria-busy', 'true');
    status.setAttribute('role', 'status');
    status.dataset.state = 'pending';
    status.textContent = 'Votre demande est en cours d’envoi.';

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await window.fetch('https://formsubmit.co/ajax/philippeszelag@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
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
      const result = await response.json();
      if (!response.ok || !result || (result.success !== true && result.success !== 'true')) {
        throw new Error('Submission rejected');
      }

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
      setStatus(
        error && error.name === 'AbortError'
          ? 'L’envoi a pris trop de temps. Réessayez ou écrivez-moi directement par e-mail.'
          : 'Votre demande n’a pas pu être envoyée. Réessayez ou écrivez-moi directement par e-mail.',
        true
      );
    } finally {
      window.clearTimeout(timeout);
      pending = false;
      button.disabled = false;
      button.textContent = idleLabel;
      form.removeAttribute('aria-busy');
    }
  });
})();
