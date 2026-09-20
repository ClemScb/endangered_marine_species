const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');

const erreurs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => erreurs.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => erreurs.push('error: ' + a.join(' ')));
vc.on('warn', (...a) => erreurs.push('warn: ' + a.join(' ')));

// on retire le vrai Leaflet : on le remplace par un faux, plus bas
let html = fs.readFileSync('../index.html', 'utf8')
  .replace('<script src="assets/js/leaflet.js"></script>', '<script>window.__L__()</script>');

const marqueursCrees = [];

const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  url: 'https://clemscb.github.io/endangered_marine_species/',
  beforeParse(w) {
    w.matchMedia = () => ({ matches:false, addEventListener(){}, addListener(){} });
    const ctx = new Proxy({}, { get:(_,k)=> k==='createLinearGradient' ? ()=>({addColorStop(){}}) : (typeof k==='string'?()=>{}:undefined), set:()=>true });
    w.HTMLCanvasElement.prototype.getContext = () => ctx;
    w.Element.prototype.scrollIntoView = function(){};
    // réponse conforme à l'API Action de Wikipédia
    w.fetch = () => Promise.resolve({ ok:true, json: () => Promise.resolve({
      query:{ pages:{ '42':{ title:'Phoque moine', fullurl:'https://fr.wikipedia.org/wiki/Phoque_moine',
              thumbnail:{ source:'https://upload.wikimedia.org/x/640px-y.jpg', width:640 } } } }
    })});
    // jsdom ne charge pas les images : on déclenche « load » nous-mêmes
    const VraieImage = w.Image;
    w.Image = function(){ const i = new VraieImage();
      Object.defineProperty(i, 'src', { set(v){ this.setAttribute('src', v);
        setTimeout(() => i.dispatchEvent(new w.Event('load')), 0); },
        get(){ return this.getAttribute('src'); } });
      return i; };
    w.requestAnimationFrame = cb => setTimeout(cb, 0);

    w.__L__ = () => {
      const chain = o => Object.assign({ on(){return this;}, addTo(){return this;}, off(){return this;} }, o);
      const carte = chain({
        getZoom: () => 5,
        project: () => ({ x:0, y:0 }),
        containerPointToLatLng: () => ({}),
        mouseEventToContainerPoint: () => ({}),
        setZoomAround(){}, flyTo(){}, flyToBounds(){}, once(){}, invalidateSize(){},
        removeLayer(){}, hasLayer: () => true, closePopup(){},
        dragging: { disable(){}, enable(){}, enabled: () => false },
        scrollWheelZoom: { enable(){}, disable(){} }
      });
      const L = {
        map: () => carte,
        tileLayer: () => chain({}),
        layerGroup: () => chain({ clearLayers(){}, addLayer(){} }),
        circleMarker(ll, o){
          const m = chain({
            _popupFn:null, _popupOuverte:false,
            bindPopup(fn){ this._popupFn = fn; return this; },
            getPopup(){ const s=this; return { isOpen:()=>s._popupOuverte, update(){ s._rendus=(s._rendus||0)+1; s._popupFn(); } }; },
            closePopup(){ this._popupOuverte=false; },
            setStyle(){}
          });
          marqueursCrees.push(m);
          return m;
        },
        marker: () => chain({}),
        divIcon: () => ({}),
        circle: () => chain({ getBounds: () => ({ pad: () => ({}) }) }),
        Browser: { touch:false, mobile:false }
      };
      w.L = L;
    };
  }
});

const w = dom.window, d = w.document;

(async () => {
  await new Promise(r => setTimeout(r, 700));
  const ok = [], ko = [];
  const t = (n, c, det='') => (c ? ok : ko).push(n + (det ? ' — ' + det : ''));

  t('marqueurs créés', marqueursCrees.length === 93, marqueursCrees.length);

  const m = marqueursCrees[0];
  t('bulle liée', typeof m._popupFn === 'function');

  // 1. le nœud doit être mémorisé : c'est ce qui casse la boucle
  const n1 = m._popupFn();
  const n2 = m._popupFn();
  t('nœud mémorisé entre deux appels', n1 === n2);

  // 2. update() ne doit pas vider la bulle
  m._popupOuverte = true;
  m.getPopup().update();
  const n3 = m._popupFn();
  t('bulle intacte après update()', n3 === n1 && !!n3.querySelector('.popup-nom'));

  // 3. le nom est bien un bouton, et il redirige
  const nom = n1.querySelector('.popup-nom');
  const voir = n1.querySelector('.popup-voir');
  t('nom cliquable présent', !!nom, nom && nom.textContent);
  t('bouton « ouvrir la fiche » présent', !!voir);

  let ouvert = null;
  const vrai = w.ouvrirFiche;
  w.ouvrirFiche = b => { ouvert = b; return vrai(b); };
  // le gestionnaire capture la fonction d'origine : on vérifie l'effet réel
  nom.dispatchEvent(new w.MouseEvent('click', { bubbles:true, cancelable:true }));

  const cible = d.querySelector('#liste .ligne[data-ouvert="true"]');
  t('clic sur le nom ouvre une fiche', !!cible,
    cible ? cible.querySelector('.nom-fr').textContent : 'aucune fiche ouverte');

  if (cible) {
    const attendu = n1.querySelector('em').textContent;
    const reel = cible.querySelector('.nom-lat').textContent;
    t('bonne espèce ouverte', attendu === reel, attendu + ' vs ' + reel);
  }

  // laisser la requête simulée aboutir : la photo part à la construction
  await new Promise(r => setTimeout(r, 250));

  // 4. la photo doit survivre à un update() — c'est le bug du clignotement
  const img1 = n1.querySelector('.vignette img');
  t('photo insérée dans la bulle', !!img1, img1 ? img1.getAttribute('src') : 'absente');
  const rendusAvant = m._rendus || 0;
  m.getPopup().update();
  m.getPopup().update();
  const img2 = n1.querySelector('.vignette img');
  t('photo intacte après deux update()', !!img2 && img2 === img1);
  t('pas de reconstruction en boucle', (m._rendus || 0) === rendusAvant + 2,
    'rendus : ' + (m._rendus || 0));
  t('crédit Wikimedia affiché', !!n1.querySelector('.vignette a'));

  // 5. chaque marqueur a sa propre bulle
  t('bulles indépendantes', marqueursCrees[1]._popupFn() !== n1);

  console.log('\n✓ ' + ok.length + ' réussis');
  ok.forEach(x => console.log('   ✓ ' + x));
  if (ko.length) { console.log('\n✗ ' + ko.length + ' ÉCHECS'); ko.forEach(x => console.log('   ✗ ' + x)); }
  const vrais = erreurs.filter(e => !/getContext|matchMedia|scrollIntoView|Not implemented/.test(e));
  if (vrais.length) { console.log('\nMessages :'); vrais.slice(0,6).forEach(x => console.log('   ! ' + x)); }
  process.exit(ko.length ? 1 : 0);
})();
