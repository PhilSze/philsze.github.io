# Site personnel de Philippe Szelag

Site statique servi par GitHub Pages sur `https://philippeszelag.fr/`.

## Accueil, version octobre 2026

Le positionnement met en avant le conseil senior Paid Social, la stratégie média,
l’activation et l’analyse de performance. Les exemples de missions sont descriptifs
et anonymisés. L’employeur actuel n’est pas affiché dans l’intitulé public.

- `index.html` : contenu, navigation et métadonnées de l’accueil.
- `img/philippe-portrait-2026.webp` : portrait récent, optimisé pour le chargement.
- `css/home.css` : styles de l’accueil et adaptations mobile.
- `js/home.js` : navigation mobile ; le contenu reste accessible sans JavaScript.
- `portfolio-item_*.html` : dix projets créatifs, avec leurs contenus et URL historiques.
- `portfolio-item.html` : vue d’ensemble des dix créations.
- `css/portfolio.css` : styles des fiches projet ; ils complètent les styles partagés de `css/home.css`.
- `css/style.css` et `js/index.js` : anciens fichiers conservés, désormais inutilisés.
- `CNAME` : domaine personnalisé existant, à conserver.

Aucune compilation ni installation de dépendances n’est nécessaire. Les fichiers
peuvent être servis avec un serveur HTTP statique. Les archives gardent leurs URL.

Le conteneur Google Tag Manager déjà présent (`GTM-MRVVN2H`) est conservé et chargé
après accord pour la mesure d'audience. Les événements de contenu, de contact et
de demande envoyée réutilisent sa Google tag existante. Le formulaire de contact
transmet les demandes via FormSubmit. Voir `tracking/README.md` pour les paramètres,
les réglages de compte restants et la validation de réception.

## Intégration

Fusionner les changements dans la branche configurée comme source dans
**Settings > Pages** du dépôt. Vérifier le déploiement GitHub Pages et le domaine
personnalisé après intégration. Cette révision n’ajoute aucun hébergement tiers.
