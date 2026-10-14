# Mesure du site et demandes de contact

La mesure réutilise le conteneur `GTM-MRVVN2H` et son unique Google tag `G-9ZKCR4JBBB`.
La configuration de cette balise et son événement `page_view` restent dans GTM.
Le code du site n'ajoute aucune seconde configuration GA4 et aucun pixel Meta.

## Événements

| Événement GA4 | Déclenchement | Paramètres |
| --- | --- | --- |
| `view_content` | Clic vers une création/publication/section, ou ouverture des détails d'une mission | `content_id`, `content_name`, `content_type`, `content_action`, `placement`, `page_path` |
| `contact_click` | Contact par formulaire, e-mail, LinkedIn, ou accès à la section contact | `contact_method`, `placement`, `page_path` |
| `generate_lead` | Envoi accepté par le serveur FormSubmit | `form_id`, `contact_method`, `placement`, `page_path` |

Le clic contact n'est pas un lead. Une erreur de formulaire, un clic invalide, un champ honeypot rempli
ou un simple envoi automatique `form_submit` ne déclenchent pas `generate_lead`.
La consultation n'est pas recomptée au chargement de la fiche si elle a été suivie sur le clic.
Les fermetures de détails et les affichages initiaux ne sont pas comptés comme des ouvertures.

## Circuit technique sans doublons

1. `js/consent.js`, synchrone dans le `<head>`, initialise les paramètres de consentement avant GTM.
2. Après accord analytique, il charge une seule fois le conteneur existant.
3. `js/tracking.js` écoute uniquement les éléments annotés `data-track-content` ou `data-track-contact`.
4. `PSConsent.sendEvent` écrit un objet lisible dans le `dataLayer`, puis appelle une seule commande
   `gtag('event', ...)` à destination de la Google tag existante. Aucun `gtag('config', ...)` supplémentaire.

**Ne pas ajouter de balises GTM GA4 d'événement sur les mêmes objets tant que ce relais est actif** :
cela enverrait deux fois la même interaction. Si la gestion des événements doit être entièrement déplacée
dans GTM, retirer d'abord ce relais avant de publier les balises de remplacement.

Les liens internes et `mailto:` attendent au maximum 275 ms avant navigation, pour laisser le tag envoyer
l'événement. Les nouvelles fenêtres, les touches de modification et les ancres gardent leur comportement natif.

## Consentement et coordonnées

Sans accord, GTM ne charge pas et aucun événement explicite n'est envoyé. Accepter les statistiques n'accorde
ni `ad_storage`, ni `ad_user_data`, ni `ad_personalization`. Google signals et la personnalisation publicitaire
sont désactivés côté site. Le retrait du choix active `ga-disable-G-9ZKCR4JBBB`, bloque les événements et supprime
uniquement les cookies Analytics connus. Le formulaire fonctionne indépendamment de ce choix.

Les noms, e-mails et messages ne figurent ni dans les événements, ni dans le stockage de préférence.
Les champs d'événement suivent une liste autorisée ; les chemins excluent les paramètres et fragments.

L'audit public a observé la détection automatique de données utilisateur configurée dans la Google tag.
**Réglage de compte à terminer dans l'interface Google tag : désactiver “Allow user provided data capabilities”.**
Le code du site ne modifie pas la configuration publiée du compte GTM/GA4. Désactiver aussi la collecte
automatique des interactions de formulaire dans la mesure améliorée GA4 si seuls les événements explicites
ci-dessus sont souhaités. Ne pas marquer `form_submit` ou `contact_click` comme un lead confirmé.

Dans GA4, vérifier les événements dans Temps réel / DebugView avec consentement accordé. Ajouter les
dimensions personnalisées nécessaires (`content_id`, `content_type`, `placement`, `contact_method`, etc.)
pour leurs explorations. Marquer `generate_lead` comme événement clé si l'objectif est de suivre les conversions.

## Formulaire

Le formulaire est présent dans la section contact de chaque page. L'e-mail est obligatoire ; nom et message
facultatifs. `js/contact.js` transmet la demande à FormSubmit et affiche une confirmation après une réponse
HTTP réussie et `success: true`, sans demande explicite d'activation ou de vérification. Les erreurs
conservent les champs et ne déclenchent aucun lead. Les cas d'activation, vérification, limite de requêtes,
indisponibilité, réponse illisible, erreur réseau et délai dépassé ont des messages distincts, sans afficher
le contenu brut du prestataire ni les coordonnées. La requête partage seulement l'origine du site comme
referrer, et `_url` contient l'origine et le chemin, sans paramètres ni fragment.

Après un échec, le bouton « Continuer avec la vérification » permet au visiteur de choisir un envoi POST
natif vers la page du prestataire, avec les champs déjà remplis. Ce parcours permet d'afficher les étapes
de vérification ou d'activation et ne dépend pas de la requête AJAX. Aucun nouvel envoi n'est lancé
automatiquement : une requête dont la réponse a été perdue pourrait avoir été reçue. Le simple transfert
vers le parcours natif ne déclenche pas `generate_lead`.

Destination : `philippeszelag@gmail.com`. Lors du premier envoi réel, FormSubmit peut demander au propriétaire
de confirmer l'activation par e-mail. Les demandes reçues avant activation sont conservées par le prestataire
jusqu'à confirmation, dans la limite annoncée par son service. Aucun envoi réel ni activation n'a été simulé
pendant les tests de développement. La délivrabilité e-mail reste à vérifier après cette activation.

Sans JavaScript, `fetch` ou `AbortController`, le formulaire utilise l'envoi POST natif du prestataire ;
son succès n'est pas mesuré par le script du site. Le honeypot, les limites de longueur et les protections
du prestataire réduisent les soumissions indésirables.

## Validation

Les tests locaux simulent les réponses du prestataire et les interfaces DOM/stockage. Ils couvrent les
succès et erreurs, l'absence de consentement, le retrait, l'expiration du choix, le délai de navigation,
la déduplication, les soumissions en attente, les timeouts et l'exclusion des coordonnées. Ils ne génèrent
aucun e-mail, trafic de conversion réel ou demande vers le service.

Sources de référence :

- https://developers.google.com/tag-platform/gtagjs/configure
- https://developers.google.com/tag-platform/security/guides/privacy
- https://support.google.com/tagmanager/answer/13802165
- https://support.google.com/analytics/answer/14077171
- https://developers.google.com/analytics/devguides/collection/ga4/reference/events
- https://formsubmit.co/ajax-documentation
- https://formsubmit.co/help
