// Migration des sauvegardes : chaque version du format sait se « traduire » vers la suivante.
// Une mise à jour du jeu ne doit jamais faire perdre une partie : on migre, puis on valide (state.ts).
//
// Règles pour changer le format (voir docs/SAUVEGARDES.md) :
// 1. Données d'un nouveau système (confiance, enquête…) : les ranger dans `ext` (aucune migration à écrire).
// 2. Nouveau champ au premier niveau : augmenter SAVE_SCHEMA et ajouter une étape dans MIGRATIONS qui
//    donne au champ sa valeur par défaut ; ajouter un test « ancienne sauvegarde → nouvelle ».
// Ce module ne dépend de rien d'autre du jeu (pas d'import circulaire avec state.ts).

/** Version actuelle du format de sauvegarde. */
export const SAVE_SCHEMA = 3;

type Data = Record<string, unknown>;

/** Étape de migration : reçoit une sauvegarde de version `v`, rend une sauvegarde de version `v + 1`. */
export const MIGRATIONS: Record<number, (data: Data) => Data> = {
  // v2 (octobre 2026) → v3 : emplacements, confiance, faits de conversation, borne, étage, extensions.
  2: (data) => ({
    ...data,
    schema: 3,
    // Les sauvegardes antérieures au plan du carnet n'avaient pas les pièces visitées.
    visited: Array.isArray(data.visited) ? data.visited : [],
    floor: 1,
    saved_at: 0,
    relations: {},
    flags: [],
    recharge_spent: false,
    ext: {},
  }),
};

/**
 * Amène une sauvegarde lue (JSON déjà analysé) au format courant. Rend null si elle n'est pas une
 * sauvegarde de SILLO 8, ou si elle vient d'une version plus récente du jeu (« newer »).
 * La validation détaillée reste à faire ensuite (validSnapshot).
 */
export function migrateSave(raw: unknown): Data | "newer" | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  let data = raw as Data;
  if (data.game !== "sillo8" || typeof data.schema !== "number" || !Number.isInteger(data.schema)) return null;
  if (data.schema > SAVE_SCHEMA) return "newer";
  while ((data.schema as number) < SAVE_SCHEMA) {
    const step = MIGRATIONS[data.schema as number];
    if (!step) return null;
    data = step(data);
  }
  return data;
}

// ——— Extensions (`ext`) ———

/** Limites des extensions : nombre de clés, longueur d'une clé, profondeur des objets. */
export const EXT_LIMITS = { keys: 32, keyLength: 40, depth: 8 } as const;

/** Vrai si `value` est une donnée JSON simple (objets, tableaux, chaînes, nombres finis, booléens, null). */
export function plainJson(value: unknown, depth = 0): boolean {
  if (depth > EXT_LIMITS.depth) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => plainJson(item, depth + 1));
  if (typeof value === "object") {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return false;
    return Object.entries(value as Data).every(([key, item]) => key !== "__proto__" && plainJson(item, depth + 1));
  }
  return false;
}

/** Valide l'objet `ext` d'une sauvegarde : clés courtes, valeurs JSON simples. Le contenu appartient à chaque système. */
export function validExt(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (keys.length > EXT_LIMITS.keys) return false;
  for (const key of keys) if (!/^[a-z][a-z0-9_]*$/.test(key) || key.length > EXT_LIMITS.keyLength) return false;
  return plainJson(value);
}
