# SILLO 8 — Étage 1

> Le silo est tombé. Les morts marchent encore. Descendez.

Jeu web solo en français, jouable sur ordi et sur téléphone, en vue de dessus façon « jouet » :
cel-shading, contours bruns, murs coupés à mi-hauteur comme une maison de poupée.
Vous incarnez une survivante bricoleuse (bonnet olive, veste moutarde, sacoche en cuir) qui
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
| **Carnet** | Les notes de survivants lues, et l'objectif en cours. |

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
| Tab | Select | SAC | Sac |
| Maj | L3 | Stick poussé à fond | Courir |
| Ctrl ou C | B | ⤓ | S'accroupir |
| Molette | Croix haut/bas | — | Zoom |
| Échap | Start | ❚❚ | Pause |
| F5 / F9 | — | — | Sauvegarder / charger |
| H / B | — | — | Se soigner / mettre une pile |

## Son

Aucun fichier audio : tout est synthétisé avec la Web Audio API (`game/audio.ts`, `game/music.ts`, `game/synth.ts`),
démarré au premier geste. Boîte à musique mystérieuse en exploration, ambiance propre à chaque zone (vent, bourdonnement
une fois la génératrice relancée, gouttes, tuyaux), bruits inexpliqués rares et lointains ; une couche de tension discrète
monte quand des zombies en alerte sont tout près, et un battement de cœur sous 30 de vie. Le moteur émet des événements
(`engine.events`, déduits à chaque image par `game/sound.ts`) que le son écoute. Pour l'enquête :
`engine.audio.cue("radio_static", x, z)` (ou `engine.events.emit({ type: "cue", name, x, z })`).
Volumes et vibration dans les réglages.

## Vérifier

```sh
./tools/verify.sh   # types, Vitest, build, Playwright + captures dans docs/screenshots
```

Le rendu logiciel des machines sans GPU est lent : les tests Playwright arrêtent la boucle
et n'affichent que quelques images par capture.

## Structure

```
app/                 pages Next.js, route optionnelle /api/dialogue
game/                logique en TypeScript pur : état, objectifs (progress.ts), plan, collisions,
                     caméra, visée, entrées, combat, zombies, notes
game/render/         rendu three.js : matériaux toon, héroïne, zombies, effets, monde
game/render/sectors/ décor de chaque zone (extérieur, centre, aile ouest, aile est)
ui/                  interface React : HUD, sac, carnet, notes, menus, commandes tactiles
tests/unit           Vitest (dont journey.test.ts : l'étage 1 joué de bout en bout)
tests/e2e            Playwright (captures ordi et téléphone)
docs/MECHANICS.md    règles du bricoleur
```

## Licences

Voir [NOTICES.md](NOTICES.md).
