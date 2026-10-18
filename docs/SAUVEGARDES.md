# SILLO 8 : sauvegardes

> Règle d'or : **une mise à jour du jeu ne doit jamais faire perdre une partie**, et une sauvegarde
> automatique ne doit jamais enfermer le joueur dans une boucle « je recharge, je meurs ».

## Les trois emplacements

| Emplacement | Clé du navigateur | Quand il s'écrit |
|---|---|---|
| **Début d'étage** | `sillo8-save-floor` | En entrant dans un étage (nouvelle descente). Jamais en cours d'étage. |
| **Lieu sûr** | `sillo8-save-safe` | Automatiquement, à chaque progrès (objectif, note, objet ramassé), toutes les 30 s et quand la page passe en arrière-plan, **seulement en lieu sûr**. |
| **Manuel** | `sillo8-save` | F5, ou « Sauvegarder » dans la pause. Les anciennes sauvegardes (v2) y sont déjà. |

- **Lieu sûr** = une pièce de `SAFE_ROOMS` (`game/level.ts` : entrée, poste de sécurité, infirmerie, pièce
  cachée, escalier) **et** hors danger (`game/safety.ts`) : aucun mordu en alerte à moins de 20 m, aucun
  mordu à moins de 7 m, pas de vie sous 30 en plein combat (coup reçu il y a moins de 12 s). Un progrès fait
  ailleurs reste « dû » et s'écrit au prochain lieu sûr.
- **Continuer** (menu) et **F9** chargent l'emplacement le plus récent ; « Choisir une sauvegarde » (menu et
  pause) liste les trois, avec date, lieu, temps de jeu et objectif.
- **Nouvelle descente** demande confirmation dès qu'une sauvegarde existe. Elle écrit « Début d'étage »,
  efface l'ancien « Lieu sûr » et laisse « Manuel » intact.
- Charger un emplacement ne déclenche pas de sauvegarde automatique immédiate.
- La mort n'écrit jamais rien.

Code : `game/save.ts` (emplacements, code), `game/migrate.ts` (versions), `game/safety.ts` (danger),
`Engine.saveGame / autosave / saveFloorStart / loadGame(slot?) / saveSlots()`.

## Format et migration

Chaque sauvegarde porte `game: "sillo8"` et `schema` (version du format, `SAVE_SCHEMA` = 3).
Au chargement : `migrateSave` (`game/migrate.ts`) applique les étapes `MIGRATIONS[v]` (v → v + 1) jusqu'à la
version courante, **puis** `validSnapshot` (`game/state.ts`) vérifie tout strictement (types, bornes, faits
cohérents, pièces connues). Une sauvegarde corrompue est refusée sans toucher à la partie en cours ; une
sauvegarde d'une version plus récente du jeu est signalée (« newer »), jamais écrasée.

- v2 → v3 : ajoute `visited` (s'il manque), `floor`, `saved_at`, `relations` (confiance, enfin sauvegardée),
  `flags` (faits de conversation), `recharge_spent` (borne), `ext`.

### Ajouter des données à la sauvegarde (autres agents : lisez ceci)

**Cas courant : un nouveau système (enquête, carnet, confiance détaillée…) → `ext`. Aucune migration à écrire.**

```ts
// Écrire (valeur JSON simple : objets, tableaux, chaînes, nombres finis, booléens, null ; profondeur ≤ 8)
state.setExt("investigation", { v: 1, cards: ["c1"], board: { links: [] } });

// Lire, avec vérification et repli : une donnée absente ou inattendue ne bloque jamais le chargement
const inv = state.getExt("investigation", (raw) => readInvestigation(raw), () => freshInvestigation());
```

- Une clé par système, en minuscules (`investigation`, `trust`, `survivors`…), 32 clés au plus.
- Mettez un numéro de version **dans** votre donnée (`v: 1`) et migrez-la vous-même dans votre fonction de
  lecture : le format global n'a pas à changer.
- Toute la sauvegarde tient en 256 Kio (`SAVE_LIMIT`).
- `setExt` déclenche les abonnés : la sauvegarde automatique « Lieu sûr » la prend en compte au prochain progrès.

**Cas rare : un champ au premier niveau de `SiloState` / `snapshot()`.** Il devient obligatoire pour la
validation : il faut augmenter `SAVE_SCHEMA`, ajouter l'étape `MIGRATIONS[ancienne]` qui donne sa valeur par
défaut, valider le champ dans `validSnapshot`, le relire dans `loadText`, et ajouter un test « ancienne → nouvelle »
dans `tests/unit/save.test.ts`. Sans cela, toutes les sauvegardes existantes deviendraient illisibles.

Autres données déjà prévues : `state.relations` (confiance −5 → 5 par survivant, `changeTrust(id, delta)`),
`state.flags` (faits posés par les conversations, `setFlag`, lus avec `state.knows(id)`).

## iPhone, iPad et effacement des données

Safari (iOS, iPadOS, macOS) **efface les données d'un site non ouvert depuis 7 jours** (stockage du
navigateur compris), sauf si le jeu a été **ajouté à l'écran d'accueil**. Un joueur qui revient après deux
semaines peut donc repartir de zéro. Le jeu demande au navigateur de garder ses données
(`navigator.storage.persist()`), sans garantie sur iPhone. La navigation privée n'est jamais conservée.

Parade simple : **Réglages → Sauvegarde → « Copier le code de sauvegarde »**. Le code (`SILLO8-…`, le JSON de
la sauvegarde la plus récente en base64) se colle dans des notes ou un message ; « Importer » le replace dans
l'emplacement « Manuel » (sur le même appareil ou un autre), daté de l'import pour que « Continuer » le
reprenne. Un code d'une ancienne version est migré à l'import ; les espaces et retours à la ligne ajoutés
par une messagerie sont ignorés.

À plus long terme : installation en application (PWA) pour protéger les sauvegardes sur iPhone.
