# atre-soundboard

Soundboard 100% front-end : une grille de pads qui déclenche des échantillons
audio à la souris, au doigt ou au clavier. Chaque pad montre le son en train de
jouer et peut se superposer à lui-même.

React 19 + TypeScript, Vite, Tailwind CSS v4, Web Audio API, Vitest.

## Démarrer

```bash
make install
make start
```

Le serveur de dev tourne sur http://localhost:5050.

## Ajouter un son

1. Déposer le fichier audio dans `sounds/src/`.
2. `make sounds` (nécessite `ffmpeg`) : réencode tout en mp3 mono dans
   `public/sounds/` et régénère `src/sounds.json`.
3. Ajuster `label`, `key` et `accent` dans `src/sounds.json`.

## Commandes

| Commande | Effet |
|---|---|
| `make install` | Installe les dépendances |
| `make start` | Serveur de dev |
| `make build` | Build de production |
| `make sounds` | Réencode les sons et régénère le manifest |
| `make test` | Tests |
| `make check` | build + lint + typecheck + knip + tests |

Voir [AGENTS.md](AGENTS.md) pour la stack, l'arborescence et les conventions.
