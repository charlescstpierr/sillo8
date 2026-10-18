# SILLO 8 — mécaniques du bricoleur (contrat entre modules)

Rien ne vient de SILO 9 : pas de D9, pas d'ARC-3, pas de SCAN ÉCHO. Le héros est un survivant bricoleur.

## Armes (`game/combat.ts`)

| Arme | Touche | Effet |
|---|---|---|
| **Clé à molette** (arme 0, par défaut) | clic gauche / RT / FRAPPER | Coup au corps à corps : arc de 70° devant, portée 1,7 m, 26 dégâts, recul léger (stun 0,25 s), cadence 0,5 s, bruit 4 m. Touche tous les zombies de l'arc. |
| **Lance-clous** (arme 1) | clic gauche / RT / TIRER | Tir rapide : 16 dégâts, cadence 0,16 s, portée 16 m, bruit 10 m, chargeur 16 clous (`state.ammo`), réserve `state.reserve`. R recharge (1,1 s). |
| **Lampe — Éblouir** | clic droit / LT / LAMPE | Coût 15 de charge (`state.energy`, 0–100, 150 amélioré), cône 40°, 8 m : zombies figés 1,8 s (`horde.damage(id, 0, 1.8)`), cadence 1,2 s, silencieux. |

Changement d'arme : 1 / 2, molette de la manette LB/RB, bouton ⇄ au tactile. Le zoom reste à la molette de la souris.

## Ressources (`game/state.ts`)

- **Ferraille** = `components` : génératrice (3), module radio (2), amélioration de la lampe (3), presse à clous (1 → 16 clous). La ferraille des objectifs pas encore atteints (génératrice, radio) est **réservée** : la presse et le banc refusent d'y toucher, avec un message. On ne peut donc jamais se bloquer (test `tests/unit/noblock.test.ts`).
- **Clous** = `ammo` (chargeur, 16) + `reserve`.
- **Charge de lampe** = `energy` ; **piles** de rechange = `cells` (+40) ; borne de recharge au poste de sécurité : **une charge par visite**, réarmée quand on quitte le poste (jauge éteinte et voyant rouge tant qu'elle est vide).
- **Bandages** (+30), **trousses** = `medkits` (+60), **conserves** = `cans` (+15). H soigne au mieux (`heal()`), B met une pile.

## Carnet d'indices (`game/notes.ts`)

- Les notes sont des interactables (`def.note`). E → `state.readNote(id, note.clue)` puis la fiche de lecture (mode UI `"note"`, identifiant dans `ui.character`).
- Le **carnet** (touche J ou Q/A, bouton CARNET) liste les notes lues : mode UI `"journal"`.
- La note `note_storage` (clue) donne le fait `secret_clue` → l'interactable **Mur creux** (`secret_wall`) apparaît ; E → `state.openSecretWall()` → `secret_revealed` → la pièce cachée s'ouvre → clé d'accès.

## Objectifs de l'étage 1

1. Explorer l'entrée. 2. Alimenter la génératrice (3 ferrailles, porte de service à l'ouest de l'entrée). 3. Accéder au hub central.
4. Réparer la communication (module radio à l'établi, puis console radio). 5. Obtenir la clé d'accès (note de Lila → mur creux → pièce cachée). Puis l'escalier de l'étage 2.
