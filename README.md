# SILLO 8 — Étage 1

> Le silo est tombé. Les morts marchent encore. Descendez.

Jeu web solo en français, jouable sur ordi et sur téléphone, en vue de dessus façon « jouet » :
cel-shading, contours bruns, murs coupés à mi-hauteur comme une maison de poupée.
Vous incarnez un survivant bricoleur (bonnet olive, veste moutarde, sacoche en cuir) qui
explore l'étage 1 d'un silo envahi de zombies.

Next.js 16 + React 19 pour l'interface, three.js pour la 3D (dans un seul composant), TypeScript.

## Jouer en local

```sh
npm ci
./tools/run.sh          # http://localhost:3000
```

Version page unique (sans serveur), pour la publier comme page web : `node tools/build-artifact.mjs sillo8.html`.

`?low=1` force le mode performance (sans ombres portées ni poussière, résolution réduite) ;
il est actif par défaut sur les écrans tactiles, `?low=0` le désactive.

## Objectifs de l'étage 1

1. **Explorer l'entrée** : la porte de sécurité est hors tension.
2. **Alimenter la génératrice** : 3 ferrailles, trouvées dehors (épaves) et dans la serre.
   On y entre par la porte de service, à l'ouest de l'entrée.
3. **Accéder au hub central** : la sécurité s'ouvre une fois le courant revenu.
4. **Réparer la communication** : fabriquer un module radio à l'atelier (2 ferrailles),
   puis l'installer dans la console de la salle de contrôle.
5. **Obtenir la clé d'accès de l'étage 2** : les notes des survivants mènent à un mur creux
   au fond des dortoirs ; la clé est dans la pièce cachée. Puis l'escalier de l'étage 2.

## Le bricoleur

| Outil | Effet |
|---|---|
| **Clé à molette** | Corps à corps silencieux, touche tous les zombies devant soi. |
| **Lance-clous** | Tir rapide, 16 clous par bande. La presse à clous de l'atelier transforme 1 ferraille en 16 clous. |
| **Lampe** | Éblouit les zombies dans un cône (ils se figent). Consomme la charge : piles de rechange, borne de recharge au poste de sécurité, amélioration à l'atelier. |
| **Carnet** | Les notes de survivants lues, l'objectif en cours, et le plan de l'étage (onglet PLAN) : pièces visitées, portes verrouillées, notes lues, objectif marqué d'une croix rouge. |

Soins : bandages (+30), trousses (+60), conserves (+15). Les zombies entendent les coups de
lance-clous et voient mieux qui se tient debout : s'accroupir aide à passer.

## Commandes

| Ordi | Manette | Téléphone | Action |
|---|---|---|---|
| WASD (ZQSD en AZERTY, automatique) | Stick gauche | Stick virtuel | Se déplacer |
| Souris | Stick droit | Visée assistée | Viser |
| Clic gauche | RT | FRAPPER / TIRER | Arme en main |
| Clic droit | LT | LAMPE | Éblouir |
| 1 / 2 | LB / RB | ⇄ | Clé à molette / lance-clous |
| R | X | R | Recharger le lance-clous |
| E | A | ✋ | Interagir, lire une note |
| J (ou Q / A) | Y | CARNET | Carnet |
| M | — | CARNET, onglet PLAN | Plan de l'étage (glisser pour déplacer, pincer / molette / + − pour zoomer) |
| Tab | Select | SAC | Sac |
| Maj | L3 | Stick poussé à fond | Courir |
| Ctrl ou C | B | ⤓ | S'accroupir |
| Molette | Croix haut/bas | — | Zoom |
| Échap | Start | ❚❚ | Pause |
| F5 / F9 | — | — | Sauvegarde manuelle / charger la plus récente |
| H / B | — | — | Se soigner / mettre une pile |

## Aide en jeu

- **Tutoriel léger** : en début de partie, de petites bulles (une à la fois, selon l'appareil) montrent
  comment se déplacer, examiner une note, relire le carnet ; le combat vient plus tard, quand un zombie
  approche. Les étapes vues sont mémorisées (`sillo8-tutorial`) ; Réglages → « Revoir le tutoriel ».
- **Flèche d'objectif** : un petit chevron au sol autour du bricoleur, vers l'objectif en cours (en passant
  par la bonne porte). Par défaut, il n'apparaît qu'après ~45 s sans progrès ; Réglages → toujours / jamais.
- **Astuce** : après ~3 min sans progrès, une indication sur l'objectif en cours.

Logique pure dans `game/tutorial.ts` (testée par `tests/unit/tutorial.test.ts`), chevron dans `game/render/guide.ts`.

## Son

Aucun fichier audio : tout est synthétisé avec la Web Audio API (`game/audio.ts`, `game/music.ts`, `game/synth.ts`),
démarré au premier geste. Boîte à musique mystérieuse en exploration, ambiance propre à chaque zone (vent, bourdonnement
une fois la génératrice relancée, gouttes, tuyaux), bruits inexpliqués rares et lointains ; une couche de tension discrète
monte quand des zombies en alerte sont tout près, et un battement de cœur sous 30 de vie. Le moteur émet des événements
(`engine.events`, déduits à chaque image par `game/sound.ts`) que le son écoute. Pour l'enquête :
`engine.audio.cue("radio_static", x, z)` (ou `engine.events.emit({ type: "cue", name, x, z })`).
Volumes et vibration dans les réglages.

## Sauvegardes

Trois emplacements : **Début d'étage** (en entrant dans l'étage), **Lieu sûr** (automatique, seulement
dans une pièce sûre et hors danger) et **Manuel** (F5, menu pause). « Continuer » reprend la plus récente ;
le menu permet aussi de choisir l'emplacement. Les anciennes sauvegardes sont migrées, jamais perdues.
Détails, champs `ext` pour les nouveaux systèmes et code de sauvegarde : `docs/SAUVEGARDES.md`.

## Vérifier

```sh
./tools/verify.sh   # types, Vitest, build, Playwright + captures dans docs/screenshots
```

Le rendu logiciel des machines sans GPU est lent : les tests Playwright arrêtent la boucle
et n'affichent que quelques images par capture.

## Structure

```
app/                 pages Next.js (aucune route serveur : le jeu tient dans le navigateur)
game/                logique en TypeScript pur : état, objectifs (progress.ts), plan (level.ts), plan du carnet
                     (plan.ts : pièces visitées, brouillard), collisions,
                     caméra, visée, entrées, combat, zombies, notes
game/render/         rendu three.js : matériaux toon, héros, zombies, effets, monde
game/render/sectors/ décor de chaque zone (extérieur, centre, aile ouest, aile est)
ui/                  interface React : HUD, sac, carnet, notes, menus, commandes tactiles
tests/unit           Vitest (dont journey.test.ts : l'étage 1 joué de bout en bout)
tests/e2e            Playwright (captures ordi et téléphone)
docs/MECHANICS.md    règles du bricoleur
```

## Licences

Voir [NOTICES.md](NOTICES.md).
