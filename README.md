# Le Registre

Un site qui recense les espèces menacées en partant de la proximité géographique :
plutôt que de montrer des animaux lointains, il montre ce qui vit et disparaît à
moins de 250 km de chez vous.

Site statique, sans build, sans dépendance externe au chargement. Un fichier HTML,
deux polices, une bibliothèque cartographique. Tout est dans le dépôt.

---

## 1. Mise en ligne sur GitHub Pages

1. Placez le contenu de ce dossier **à la racine** de votre dépôt.
   Le fichier doit s'appeler `index.html`, sinon Pages ne sert rien.
2. `Settings` → `Pages` → Source : `Deploy from a branch`,
   branche `main`, dossier `/ (root)`.
3. Attendez une à deux minutes. L'adresse est affichée sur la même page.

Le fichier `.nojekyll` est présent et nécessaire : sans lui, Jekyll ignore
certains fichiers et la mise en page peut casser.

## 2. Adresses du site

Déjà renseignées dans `index.html`, `robots.txt` et `sitemap.xml` :

- Site publié : <https://clemscb.github.io/endangered_marine_species/>
- Dépôt : <https://github.com/ClemScb/endangered_marine_species>

Si vous renommez le dépôt ou branchez un nom de domaine, il faut les reprendre
aux quatre endroits : `<link rel="canonical">`, `og:url`, `og:image` et
`twitter:image` dans `index.html`, plus `robots.txt` et `sitemap.xml`.

**Vérifiez l'aperçu de partage** une fois en ligne, sur
<https://www.opengraph.xyz>. C'est le canal principal d'un site comme celui-ci.

## 3. Le fond de carte

Le point le plus fragile du projet, à connaître avant que ça casse.

En haut du second bloc `<script>` d'`index.html` :

```js
const FOND = {
  cleCarto: ""   // vide = fond Esri
};
```

**Par défaut (`cleCarto` vide)** le site utilise le fond sombre d'Esri
(`World_Dark_Gray_Base`). Il fonctionne sans clé et sans inscription, mais c'est
un service ancien qu'Esri signale comme obsolète : il peut être coupé sans
préavis.

**Recommandé :** prenez une clé CARTO gratuite sur
[carto.com/basemaps/apikey](https://carto.com/basemaps/apikey). Une minute, pas
de compte à créer, cinq millions de tuiles par mois. Collez-la dans `cleCarto`,
le basculement est automatique. La clé est publique par nature : elle part dans
le navigateur, il n'y a rien à protéger.

Si les tuiles ne chargent pas, le site affiche un message sur la carte au lieu
de laisser un rectangle vide. Les points et les distances, eux, restent exacts :
ils ne dépendent pas du fond.

Dans tous les cas, **l'attribution doit rester visible**. Les deux fournisseurs
l'exigent dans leurs conditions.

## 4. Modifier les données

Tout est dans `index.html`, en clair, sans base de données.

- **`ESPECES`** (premier `<script>`) — le registre. Un objet par espèce :
  nom français, binôme latin, statut UICN, milieu, région, texte, pressions,
  faits. Les liens de vérification vers l'UICN, GBIF et Wikipédia sont
  construits automatiquement à partir du binôme latin.
- **`MED`** (second `<script>`) — les espèces de la carte et leurs sites.
  Format : `[latitude, longitude, "Nom du lieu"]`.
- **`VILLES`** — les points de départ proposés. Format : `["Nom", lat, lon]`.
- **`DEGRES`** — les effectifs affichés sur l'échelle UICN.

### Passer à des données réelles

Les statuts et effectifs livrés sont des **instantanés d'illustration**. Les
espèces et les lieux sont réels, les chiffres sont plausibles mais non sourcés
un par un. Pour un site de référence, branchez :

- **UICN Liste rouge v4** — `https://api.iucnredlist.org/api/v4`, jeton gratuit
  sur demande, authentification par en-tête `Bearer`. Endpoint
  `/taxa/scientific_name` pour récupérer la catégorie et l'année d'évaluation.
- **GBIF** — `https://api.gbif.org/v1/occurrence/search`, sans jeton.
  Exemple pour le bassin méditerranéen :
  `?taxonKey=XXXX&decimalLatitude=30,46&decimalLongitude=-6,37&hasCoordinate=true`

**Une réserve importante :** pour les espèces très braconnées — corail rouge,
grande nacre, sites de mise bas du phoque moine — les biologistes floutent
délibérément les coordonnées publiques. Certains points GBIF reviendront
volontairement imprécis. C'est voulu. Ne le « corrigez » pas, et dites-le dans
l'interface.

## 5. Vie privée

Le site ne dépose aucun cookie, ne charge aucune ressource tierce au démarrage
et n'envoie rien nulle part.

- **Polices auto-hébergées.** Elles ne passent pas par `fonts.gstatic.com`,
  donc aucune adresse IP de visiteur n'est transmise à Google. C'était le point
  visé par le jugement du tribunal de Munich de janvier 2022 sur le RGPD.
- **Leaflet est dans le dépôt.** Pas de CDN, donc pas de point de panne ni de
  fuite de métadonnées.
- **Géolocalisation.** Le bouton « utiliser ma position » appelle l'API du
  navigateur. La position reste dans la page, sert uniquement au calcul de
  distances, et n'est jamais transmise. C'est écrit sous le bouton.
- **Tuiles de carte.** Seule exception : afficher le fond implique des requêtes
  vers Esri ou CARTO, qui voient l'adresse IP du visiteur. Inévitable sans
  auto-héberger les tuiles. À mentionner si vous ajoutez une page de
  confidentialité.

La géolocalisation exige HTTPS. GitHub Pages est en HTTPS : elle fonctionne en
ligne, mais pas si vous ouvrez le fichier en `file://` depuis votre disque.

## 6. Mesure d'audience, si vous en voulez

Rien n'est installé. Pour savoir si l'angle « près de chez moi » fonctionne
vraiment, prenez un outil sans cookie et sans bandeau de consentement :

```html
<!-- GoatCounter — gratuit pour les projets non commerciaux -->
<script data-goatcounter="https://VOTRE-CODE.goatcounter.com/count"
        async src="//gs.goatcounter.com/count.js"></script>
```

À coller juste avant `</body>`. [Plausible](https://plausible.io) et
[Umami](https://umami.is) sont des alternatives, auto-hébergeables.

Les événements qui valent la peine d'être suivis : quelle ville est choisie,
quel rayon, et quelles fiches d'espèces sont ouvertes.

## 7. Accessibilité

- Lien d'évitement vers le contenu principal.
- Navigation au clavier sur toute la page, contour de focus visible.
- `prefers-reduced-motion` respecté : le champ de points s'arrête, les
  transitions sont neutralisées.
- La carte est décorative au sens strict : **la liste de proximité contient les
  mêmes informations en texte**, accessible au lecteur d'écran. Si vous
  modifiez la carte, gardez cette liste synchronisée.
- Contrastes vérifiés sur le texte courant. Si vous changez la palette,
  revérifiez : le gris-bleu `--brume` est à la limite basse.

## 8. Structure

```
.
├── index.html              tout le site : structure, styles, données, logique
├── 404.html
├── README.md
├── LICENSE                 MIT pour le code, CC BY-SA 4.0 pour les textes
├── .nojekyll               indispensable sur GitHub Pages
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/
    │   ├── leaflet.css
    │   └── images/         flèches et marqueurs de Leaflet
    ├── js/
    │   └── leaflet.js      1.9.4, BSD 2-Clause
    ├── fonts/
    │   ├── archivo-var.woff2          variable, axes wght + wdth
    │   └── newsreader-italic.woff2    italique seule, pour les binômes latins
    └── img/
        ├── favicon.svg, favicon-32.png, apple-touch-icon.png, icon-512.png
        └── og.png          bannière de partage 1200×630
```

## 9. Ce qui reste à faire

- Sourcer chaque chiffre individuellement, ou brancher l'API UICN.
- Ouvrir le registre au-delà de la Méditerranée.
- Rendre le champ de points du héros cliquable : chaque point mène à son espèce.
- Traduire, au minimum en anglais.

---

Les corrections d'erreurs factuelles sont bienvenues. Ouvrez une *issue* avec la
source, c'est le plus utile.
