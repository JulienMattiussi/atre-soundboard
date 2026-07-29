# atre-soundboard

Application **100% front-end** : une **grille de pads** déclenche des échantillons
audio, à la souris, au doigt ou au clavier. Chaque pad porte une couleur
d'accent, une touche, et **montre le son en train de jouer** : flash à l'impact,
puis le pad **se remplit** de sa couleur d'accent sur toute sa hauteur, de gauche
à droite, pendant la durée exacte de l'échantillon. Interface en **français**.
Partage la stack et les conventions de `hidden-word`.

Le point clé : la lecture passe par la **Web Audio API**, pas par des balises
`<audio>`. Les balises introduisent une latence au déclenchement et ne savent pas
relancer proprement un son déjà en cours. Ici chaque mp3 est décodé **une fois**
en `AudioBuffer`, puis chaque déclenchement crée un `AudioBufferSourceNode`
jetable : instantané.

Chaque pad est un **interrupteur** : un appui lance le son, un second l'arrête.
Le moteur sait empiler plusieurs voix sur un même son (`playing` est un `Set` par
identifiant), mais `toggle()` ne l'exploite pas. Si un jour on veut la
superposition, c'est `toggle` qu'il faut changer, pas le moteur.

Hébergement visé : **Vercel Hobby**. Aucune Function, aucune base, aucun secret.
Les mp3 sont des assets statiques servis par le CDN, ce qui garde le coût à zéro.

---

## Stack technique

| Outil | Usage |
|---|---|
| React 19 + TypeScript | UI |
| Vite | Build / dev server (port **5050**) |
| Tailwind CSS v4 | Styles (via `@tailwindcss/vite`, pas de config JS) |
| Web Audio API | Décodage et lecture des échantillons |
| Vitest + Testing Library | Tests unitaires et composants |
| Prettier | Formatage |
| ESLint (typescript-eslint) | Linting |
| Knip | Détection des fichiers / exports / dépendances inutilisés |
| ffmpeg | Encodage des sons (hors runtime, via `make sounds`) |

Zéro dépendance runtime en dehors de React.

---

## Arborescence

```
public/
├── atre.png                  # Logo, sert de titre de page
├── favicon.svg               # Enceinte de face, dans l'orange du logo (#fa471c)
├── og.png                    # Carte Open Graph 1200x630 (générée, versionnée)
├── apple-touch-icon.png      # 180x180 rastérisé depuis favicon.svg (générée)
├── robots.txt
├── site.webmanifest
└── sounds/                   # mp3 servis par le CDN (versionnés, générés)
sounds/
└── src/                      # Fichiers d'origine (ogg / wav / mp3), source de vérité
docs/
└── screenshot.png            # Capture pour le README
scripts/
├── encode-sounds.mjs         # sounds/src/ -> public/sounds/ + src/sounds.json
├── og-template.html          # Gabarit de og.png (chemins relatifs, ouvrable en file://)
└── icon-template.html        # Gabarit de apple-touch-icon.png
src/
├── audio/
│   └── engine.ts             # SoundboardEngine : contexte, décodage, voix, volume
├── components/
│   ├── Pad.tsx               # Un pad (keycap, label, durée, flash, progression)
│   └── Toolbar.tsx           # Volume général + bouton stop
├── lib/                      # Logique pure, zéro React (entièrement testée)
│   ├── format.ts             # formatDuration
│   └── sounds.ts             # parseSounds (valide le manifest) + buildKeyMap
├── App.tsx                   # En-tête, statut, grille de pads, pied de page
├── useSoundboard.ts          # Pont React <-> moteur + raccourcis clavier globaux
├── sounds.json               # Manifest des pads (la seule chose à éditer)
├── types.ts                  # Type Sound
├── index.css                 # Import Tailwind + thème + styles des pads
└── main.tsx                  # Point d'entrée
tests/
├── setup.ts                  # Setup Testing Library (jest-dom)
├── unit/                     # Vitest - logique pure (format, sounds)
└── component/                # Vitest + Testing Library (App, avec AudioContext simulé)
```

---

## Le moteur audio, en détail

`src/audio/engine.ts` concentre tout ce qui est non évident. Les points à
connaître avant d'y toucher :

- **Le geste utilisateur est obligatoire.** Les navigateurs refusent de démarrer
  un `AudioContext` actif sans interaction. Le travail est donc coupé en deux :
  `prefetch()` télécharge les mp3 dès le montage (un `fetch` ne demande aucun
  geste), et `unlock()` crée le contexte puis décode, appelé depuis le premier
  clic ou la première touche. Résultat : au premier appui les octets sont déjà
  là, il ne reste que le décodage.
- **`unlock()` mémoïse sa promesse** dans `unlocking`. Sans ça, un second appui
  pendant le décodage initial voyait `this.ctx` déjà rempli, rendait la main tout
  de suite, et appelait `play()` sur un `buffers` encore vide : le son était
  perdu silencieusement. Les appels concurrents doivent attendre le **même**
  décodage. Couvert par le test « keeps a trigger fired while the sounds are
  still decoding ».
- **`trigger()` débloque avant de jouer.** Le tout premier déclenchement attend
  le décodage au lieu d'être avalé, donc le premier clic produit bien un son.
- **`decodeAudioData` neutralise l'`ArrayBuffer`** qu'on lui passe. On décode
  toujours une copie (`bytes.slice(0)`) pour que les octets restent réutilisables
  si le décodage doit être retenté.
- **L'état est un instantané immuable.** `useSyncExternalStore` compare les
  références : toute mutation doit produire un nouvel objet, sinon React ne
  rerend pas. D'où le `setState({ ...this.state, ...patch })`.
- **`triggers` est un compteur strictement croissant par son.** Il sert de clé
  React sur les éléments animés : une nouvelle clé remonte l'élément, donc les
  animations CSS repartent de zéro même si le pad jouait déjà.
- **La progression est du CSS pur.** `animation: pad-progress var(--duration)`
  fait passer la largeur de 0 à 100% sur un élément pleine hauteur, la durée
  venant du manifest. Aucun `requestAnimationFrame`, aucun rerender par frame :
  tous les pads peuvent jouer en même temps sans rien coûter. Corollaire : la
  durée du manifest doit correspondre au fichier, sinon le remplissage se
  désynchronise du son. C'est `make sounds` qui garantit ça.
- **`dispose()` vide `buffers`.** Les `AudioBuffer` appartiennent au contexte
  fermé ; les réutiliser sur un nouveau contexte est indéfini. Le double montage
  de `StrictMode` passe donc par un vrai redécodage. Le garde `this.ctx !== ctx`
  en fin de `decodeAll` évite qu'un décodage en vol écrase l'état après un
  `dispose()`.
- **Un son qui échoue est simplement absent de `buffers`.** Son pad reste inerte,
  les autres continuent de marcher. L'état passe en `error` seulement si aucun
  son n'a pu être chargé.

### Clavier

- **Chaque pad a sa touche**, écrite en dur dans le manifest. Convention : la
  **première lettre du label** (MAMI -> M, OPA -> O). `make sounds` applique cette
  règle aux nouveaux sons et retombe sur une lettre libre en cas de collision.
- On lit `event.key` et non `event.code`, pour coller à ce qui est imprimé sur les
  keycaps d'un clavier AZERTY.
- **Espace coupe tout**, toujours, globalement. Un pad qui a le focus ne réagit
  donc qu'à **Entrée** : sans ça, Espace sur un pad focalisé le rejouerait au lieu
  de couper, en contradiction avec le raccourci annoncé. Le `preventDefault()` du
  handler global supprime aussi l'activation par défaut du bouton.
- Le handler global ignore `event.repeat` (garder une touche enfoncée ne mitraille
  pas) et laisse passer les combinaisons avec Ctrl / Cmd / Alt.

### Interface

- **`--brand-size`** (`index.css`, layer base) donne sa taille à l'icône, au logo
  et au bouton stop : 3,5rem en mobile, 6rem à partir de 40rem. C'est ce jeton
  seul qui garantit leur alignement, ne pas le contourner en dur.
- **Le bouton stop est un carré** de `--brand-size`, construit comme un pad :
  keycap `Espace` en haut à droite, libellé centré, compteur de voix en bas à
  droite. Les deux badges sont en `position: absolute` pour que le libellé reste
  centré quel que soit le compteur.
- **Les raccourcis clavier sont masqués sous 40rem** (pads et bouton stop) : pas
  de clavier sur téléphone, et ça libère la place dans un carré de 56px.
- **Survol d'un pad en lecture** : un voile sombre plus une grosse icône de
  haut-parleur barré annoncent que le clic va couper. Le tout est derrière
  `@media (hover: hover)`, donc absent sur tactile où il n'aurait aucun sens.
  Attention en test automatisé : Chrome headless rapporte `hover: none`, ce bloc
  n'y est jamais évalué sans forcer `--blink-settings=availableHoverTypes=2`.
- **Ordre de superposition dans un pad** : remplissage 0, textes 2, voile 3,
  icône barrée 4, flash d'impact 5. Le voile est un `::after` du pad, donc peint
  après ses enfants de même z-index.

### Référencement et carte Open Graph

- **Les crawlers refusent les `og:image` relatives.** `index.html` porte donc des
  jetons `%SITE_URL%` (canonique, `og:url`, `og:image`, JSON-LD) résolus au build
  par le plugin `inject-site-url` de `vite.config.ts`. Il lit `SITE_URL`, sinon
  `VERCEL_PROJECT_PRODUCTION_URL`, sinon retombe sur `localhost`. Ne pas écrire
  d'URL absolue en dur dans `index.html`.
- **`public/og.png` est généré mais versionné**, comme les mp3 : Vercel ne peut
  pas le rendre au build. `make og` le régénère depuis
  `scripts/og-template.html` avec le Chrome local (`--screenshot`). Le gabarit
  référence ses images en relatif (`../public/...`) pour rester ouvrable en
  `file://`, donc sans serveur de dev. Même chose pour `apple-touch-icon.png`,
  nécessaire parce que iOS ignore les favicons SVG.
- **Après un changement de branding ou de sons**, relancer `make og` et penser à
  la capture `docs/screenshot.png` du README, qui n'est pas automatisée.
- Les données structurées sont un `WebApplication` schema.org inline. Si tu y
  touches, vérifie que le JSON reste valide : personne ne le compile.

### Pourquoi tout est en mp3 mono

Safari et iOS ne lisent ni l'Ogg Vorbis ni le WebM. Les sources peuvent être dans
n'importe quel format lisible par ffmpeg (mp3, ogg, wav, opus, m4a, flac, aac,
webm) ; `make sounds` les réencode toutes en mp3 mono 44,1 kHz (`-q:a 5`) vers
`public/sounds/`. Le mono suffit pour des échantillons de voix et divise le poids
par deux.

---

## Ajouter ou modifier un son

1. Déposer le fichier (n'importe quel format audio courant) dans `sounds/src/`.
2. `make sounds` : réencode tout en mp3 dans `public/sounds/` et régénère
   `src/sounds.json`. Le script **préserve** `label`, `key` et `accent` des
   entrées existantes, et attribue les valeurs par défaut aux nouvelles.
3. Ajuster `label`, `key` et `accent` dans `src/sounds.json` si besoin.

`parseSounds` valide le manifest au démarrage et **jette** en cas d'entrée
invalide (id ou touche en double, accent hors format hexa 6 chiffres, chemin
absolu, durée non positive). C'est volontaire : un manifest cassé doit se voir
tout de suite, pas produire un pad muet.

---

## Contraintes techniques

- **100% front-end** : aucun appel serveur, pas de backend, pas d'upload.
- **Pas de SSR** : Vite SPA. Ne pas introduire Next.js ou Remix.
- **`public/sounds/` est versionné** même si généré : Vercel n'a pas ffmpeg au
  build, les mp3 doivent donc être présents dans le dépôt.
- **Alias `@/`** pointe vers `src/`. Toujours l'utiliser pour les imports
  internes, jamais de chemins relatifs `../../`.
- **Tailwind v4** : `@import 'tailwindcss'` dans le CSS, pas de
  `tailwind.config.js`.
- **TypeScript strict** : `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess` activés. Ne pas les désactiver.

---

## Règles de développement

### Structure
- `src/lib/` : logique pure, zéro import React.
- `src/audio/` : le moteur audio, indépendant de React (branché via
  `subscribe` / `getState`).
- `src/components/` : présentation. Aucun accès direct au moteur.
- **Taille des fichiers** : viser < ~300 lignes ; au-delà, découper.

### Qualité du code
- **Factoriser, ne pas dupliquer** : extraire les helpers réutilisables.
- **Pas de code mort** : tout export doit être utilisé ou testé. `make knip`
  doit rester vert.
- **Commentaires utiles seulement** : expliquer le pourquoi / le non-évident ;
  ne jamais paraphraser le code. En pratique `src/` n'en contient aucun, le
  pourquoi vit dans ce fichier.

### Tests
- **Logique pure entièrement testée** (`src/lib/`).
- **Tests de composants** sur les interactions clés via Testing Library. jsdom
  n'a pas de Web Audio : `tests/component/App.test.tsx` simule `AudioContext` et
  `fetch`.

### Accessibilité
- Tout cliquable est un bouton/lien avec libellé accessible ; champs avec label
  ou `aria-label` ; focus clavier visible ; ne jamais coder l'information par la
  seule couleur (chaque pad porte son label et sa durée en texte, la couleur
  n'est qu'un renfort).
- `prefers-reduced-motion` neutralise flash et progression animée.

### Qualité (avant de considérer une tâche terminée)
- `make check` doit passer (build + lint + typecheck + knip + tests).

---

## Commandes (Makefile)

| Commande | Effet |
|---|---|
| `make install` | Installe les dépendances |
| `make start` | Serveur de dev (http://localhost:5050) |
| `make build` | Build de production |
| `make sounds` | Réencode `sounds/src/` en mp3 et régénère le manifest |
| `make og` | Régénère `og.png` et `apple-touch-icon.png` (nécessite Chrome) |
| `make lint` | ESLint |
| `make knip` | Détecte fichiers / exports / dépendances inutilisés |
| `make format` | Formate avec Prettier |
| `make typecheck` | Vérifie les types |
| `make test` | Tests unitaires et composants |
| `make fix` | Format + lint |
| `make check` | build + lint + typecheck + knip + tests |

---

## Conventions globales du dépôt

- **Code en anglais** : commentaires, identifiants, noms de variables et de
  fonctions. Seules les valeurs affichées à l'utilisateur sont en français.
- **Commits** : pas de trailer `Co-Authored-By`. Auteur = le compte git de
  YavaDeus uniquement. Vaut aussi pour les descriptions de pull request.
- **Typographie** : ne jamais introduire de tiret long (em-dash ou en-dash) dans
  le code, les chaînes, les commentaires ou la doc. Utiliser un tiret ASCII `-`,
  deux-points, parenthèses, ou reformuler.
