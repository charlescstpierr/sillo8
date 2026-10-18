# SILO 9 : La Descente — version toon vue de dessus

Jeu web solo en français, jouable sur ordi et sur téléphone. Vous descendez dans un silo
post-apocalyptique, récupérez le noyau de contrôle et choisissez entre MÈRE et N-7.

Remake en Next.js + three.js du FPS Godot [SILO 9 : La Descente](https://github.com/charlescstpierr/silo9-)
(branche `feat/astra-art-animation`) : même histoire, mêmes règles, mais vue de dessus stylisée
(cel-shading, contours, look « jouet », murs coupés façon maison de poupée).

> **État : étape 1.** Refuge et secteur 01, caméra, opérateur animé, contrôles, rendu toon,
> infobulles et objectifs. Les secteurs 02 à 04, les robots, le SCAN ÉCHO, les dialogues
> complets et les fins arrivent dans les étapes suivantes.

## Jouer en local

```sh
npm ci
./tools/run.sh          # http://localhost:3000
```

Ajoutez `?low=1` à l'adresse pour le mode performance (sans ombres portées ni poussière, résolution réduite).
Il est activé par défaut sur les écrans tactiles ; `?low=0` le désactive.

## Commandes

| Ordi | Manette | Téléphone | Action |
|---|---|---|---|
| WASD (ZQSD en AZERTY, automatique) | Stick gauche | Stick virtuel | Se déplacer |
| Souris | Stick droit | Visée assistée | Viser (l'opérateur se tourne vers le curseur) |
| Clic gauche | RT | TIR | Tirer au D9 |
| Clic droit | LT | ARC | Décharge ARC-3 *(étape 3)* |
| R | X | R | Recharger le D9 |
| E | A | ✋ | Interagir |
| Q en QWERTY, A en AZERTY | Y | ÉCHO | SCAN ÉCHO *(étape 5)* |
| Maj | L3 | Stick poussé à fond | Courir |
| Ctrl ou C | B | ⤓ | S'accroupir |
| Molette | Croix haut/bas | — | Zoom |
| Tab | Select | — | Inventaire *(étape 6)* |
| Échap | Start | ❚❚ | Pause |
| F5 / F9 | — | — | Sauvegarder / charger |
| H / B | — | — | Trousse / cellule d'énergie |
| F3 | — | — | Images par seconde |

Les touches de déplacement utilisent la position physique des touches : ZQSD fonctionne
sur un clavier AZERTY sans réglage, et la touche du SCAN ÉCHO reste à gauche de « avancer ».

## Règles conservées

Le scan et l'ARC-3 partagent la batterie. L'ascenseur recharge gratuitement ; l'établi
améliore la batterie (150) pour 3 composants et le relais en demande 3. La sauvegarde
(`localStorage`) garde le même schéma que l'original et sa validation stricte.

## Vérifier

```sh
./tools/verify.sh   # types, Vitest, build, Playwright + captures dans docs/screenshots
```

## Structure

```
app/            pages Next.js (le jeu est chargé côté client)
game/           logique en TypeScript pur : état, dialogue, plan, collisions, caméra, visée, entrées
game/render/    rendu three.js : matériaux toon, opérateur, décor, contours
ui/             interface React : HUD papier, infobulle, objectifs, commandes tactiles
tests/unit      Vitest
tests/e2e       Playwright (captures ordi et téléphone)
tools/          run.sh, verify.sh, compose_poses.py
```

## Licences

Voir [NOTICES.md](NOTICES.md).
