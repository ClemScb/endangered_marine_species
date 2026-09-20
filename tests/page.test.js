const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = '../index.html';

const erreurs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => erreurs.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => erreurs.push('console.error: ' + a.join(' ')));
vc.on('warn', (...a) => erreurs.push('console.warn: ' + a.join(' ')));

// Leaflet a besoin d'APIs absentes de jsdom : on ne charge que le 1er script.
let html = fs.readFileSync(path, 'utf8');
html = html.replace('<script src="assets/js/leaflet.js"></script>', '');
const dm = html.indexOf('/* ╔═══════════════════════════════════════════════════════════════╗');
const fin = html.indexOf('</script>', dm);
html = html.slice(0, dm) + html.slice(fin);

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  url: 'https://clemscb.github.io/endangered_marine_species/',
  beforeParse(w) {
    // jsdom n'a ni matchMedia ni canvas : sans ces bouchons, le script
    // s'interrompt sur le champ de points et rien d'autre ne s'exécute.
    w.matchMedia = () => ({ matches:false, addEventListener(){}, addListener(){} });
    const ctx = new Proxy({}, {
      get: (_, k) => k === 'createLinearGradient'
        ? () => ({ addColorStop(){} })
        : (typeof k === 'string' ? () => {} : undefined),
      set: () => true
    });
    w.HTMLCanvasElement.prototype.getContext = () => ctx;
    w.Element.prototype.scrollIntoView = function(){};
  }
});
const w = dom.window, d = w.document;

// pas de réseau dans le bac à sable : la photo échoue proprement
w.fetch = () => Promise.resolve({ ok: false });
w.requestAnimationFrame = cb => setTimeout(cb, 0);

setTimeout(() => {
  if(erreurs.length){ console.log('Messages de la page :'); erreurs.slice(0,10).forEach(x=>console.log('   ! '+x)); console.log(); }
  const ok = [], ko = [];
  const t = (nom, cond, detail='') => (cond ? ok : ko).push(nom + (detail ? ' — ' + detail : ''));

  const lignes = d.querySelectorAll('#liste .ligne');
  t('registre rendu', lignes.length === 37, lignes.length + ' lignes');

  t('échelle rendue', d.querySelectorAll('#echelle-grille .degre').length === 7);
  t('puces de filtre', d.querySelectorAll('#filtres .puce').length === 18,
    d.querySelectorAll('#filtres .puce').length + ' puces');

  t('portrait affiché', !!d.querySelector('#portrait-texte .zoom-nom'));
  t('courbe tracée', !!d.querySelector('#portrait-visuel svg polyline'));
  t('pastilles', d.querySelectorAll('#portrait-pastilles button').length === 5);

  // changement de portrait
  const n0 = d.querySelector('#portrait-texte .zoom-nom');
  if(n0){
    const avant = n0.textContent;
    d.getElementById('portrait-suivant').click();
    const apres = d.querySelector('#portrait-texte .zoom-nom').textContent;
    t('bouton « une autre espèce »', avant !== apres, avant.trim() + ' → ' + apres.trim());
  } else t('bouton « une autre espèce »', false, 'portrait absent');

  // ouvrirFiche, le cœur de la demande
  t('ouvrirFiche exposée', typeof w.ouvrirFiche === 'function');
  if (typeof w.ouvrirFiche === 'function') {
    // on filtre d'abord, pour vérifier que les filtres sont bien levés
    d.getElementById('q').value = 'zzzz';
    d.getElementById('q').dispatchEvent(new w.Event('input'));
    t('recherche filtrante', d.querySelectorAll('#liste .ligne').length === 0);

    const r = w.ouvrirFiche('Pinna nobilis');
    t('ouvrirFiche renvoie vrai', r === true);
    const cible = d.querySelector('#liste [data-id="pinna-nobilis"]');
    t('ligne retrouvée après filtre', !!cible);
    t('fiche dépliée', cible && cible.dataset.ouvert === 'true');
    t('champ de recherche vidé', d.getElementById('q').value === '');
    t('surlignage appliqué', cible && cible.classList.contains('surligne'));

    t('espèce absente refusée', w.ouvrirFiche('Bestia inventata') === false);
  }

  // liens de vérification dans la fiche
  const f = d.querySelector('#liste [data-id="pinna-nobilis"] .sources');
  t('liens de vérification', f && f.querySelectorAll('a').length === 3);

  // les faits ne doivent plus contenir de coordonnées
  const faits = [...d.querySelectorAll('#liste .fait dt')].map(x => x.textContent);
  t('aucune coordonnée dans les faits', !faits.some(x => /^\d+\.\d+$/.test(x)),
    faits.filter(x => /^\d+\.\d+$/.test(x)).join(', '));

  console.log('\n✓ ' + ok.length + ' réussis');
  ok.forEach(x => console.log('   ✓ ' + x));
  if (ko.length) { console.log('\n✗ ' + ko.length + ' ÉCHECS'); ko.forEach(x => console.log('   ✗ ' + x)); }
  if (erreurs.length) { console.log('\nMessages de la page :'); erreurs.slice(0, 8).forEach(x => console.log('   ! ' + x)); }
  process.exit(ko.length ? 1 : 0);
}, 700);
