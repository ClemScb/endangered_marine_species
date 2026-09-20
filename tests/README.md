# Tests

Deux bancs d'essai qui chargent réellement `index.html` dans un DOM simulé.
Ils ne remplacent pas un passage en navigateur, mais ils rattrapent les
régressions silencieuses — trois bugs ont déjà été trouvés ainsi.

## Lancer

```
npm install jsdom
node tests/page.test.js
node tests/carte.test.js
```

## Ce qui est couvert

**`page.test.js`** — le registre rend bien ses 37 lignes, l'échelle ses 7
degrés, les filtres leurs puces ; les portraits s'affichent et changent ;
`ouvrirFiche()` lève les filtres en cours, retrouve la ligne, la déplie et la
surligne ; les liens de vérification sont présents ; aucune coordonnée ne s'est
glissée dans les tableaux `faits`.

**`carte.test.js`** — Leaflet est remplacé par un double. Vérifie que les 93
marqueurs sont créés, que le nœud de chaque bulle est **mémorisé** (sans quoi
`update()` la reconstruit en boucle, la photo clignote et le clic ne se forme
jamais), que la photo survit à plusieurs `update()`, que le crédit Wikimedia
s'affiche, et qu'un clic sur le nom ouvre bien la fiche de la bonne espèce.

## Limites

jsdom n'implémente ni `matchMedia`, ni `canvas`, ni `scrollIntoView` : les
tests les bouchent. Le rendu visuel, le fond de carte et la géolocalisation ne
sont pas testables ici.
