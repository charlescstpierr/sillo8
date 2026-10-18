// Ce que l'enquête sauvegarde : `state.ext.investigation` = { v: 1, cards, traces… } (API setExt / getExt
// de SiloState). Une ancienne sauvegarde sans cette entrée, ou une entrée illisible, donne un carnet d'enquête
// vide. Pas de dépendance au moteur ni au contenu : un identifiant inconnu (contenu modifié depuis) est gardé.

/** Clé de l'enquête dans `state.ext`. */
export const INQUIRY_KEY = "investigation";

export interface InquiryRecord {
  /** Version du format. */
  v: 1;
  /** Cartes obtenues, dans l'ordre. */
  cards: string[];
  /** Traces UV vues. */
  traces: string[];
  /** Déductions faites (contradictions et phrases). */
  deductions: string[];
  /** Pensées déjà montrées (chacune une seule fois). */
  thoughts: string[];
  /** Détails cachés révélés en gros plan (identifiant de l'objet). */
  revealed: string[];
  /** Événements étranges déjà joués. */
  events: string[];
  /** Déblocages « type:id » (word:mensonge, examinable:okafor_drawer, door:…, dialogue:…, fact:…). */
  unlocked: string[];
  /** Palier d'aide atteint par déduction (1 à 3). */
  hints: Record<string, number>;
}

/** Bornes de la sauvegarde. */
const LIMITS: Record<Exclude<keyof InquiryRecord, "hints" | "v">, [count: number, length: number]> = {
  cards: [256, 40],
  traces: [128, 40],
  deductions: [128, 40],
  thoughts: [512, 40],
  revealed: [128, 40],
  events: [128, 40],
  unlocked: [256, 80],
};

export const RECORD_KEYS = Object.keys(LIMITS) as (keyof typeof LIMITS)[];

export function emptyRecord(): InquiryRecord {
  return { v: 1, cards: [], traces: [], deductions: [], thoughts: [], revealed: [], events: [], unlocked: [], hints: {} };
}

export function cloneRecord(r: InquiryRecord): InquiryRecord {
  const copy = emptyRecord();
  for (const key of RECORD_KEYS) copy[key] = [...r[key]];
  copy.hints = { ...r.hints };
  return copy;
}

/**
 * Valide un enregistrement lu dans une sauvegarde. Les listes absentes sont tolérées (versions futures ou
 * passées du format), les clés inconnues refusées.
 */
export function validRecord(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if ("v" in data && data.v !== 1) return false;
  for (const key of Object.keys(data)) if (key !== "hints" && key !== "v" && !(key in LIMITS)) return false;
  for (const key of RECORD_KEYS) {
    if (!(key in data)) continue;
    const list = data[key];
    const [count, length] = LIMITS[key];
    if (!Array.isArray(list) || list.length > count) return false;
    const seen = new Set<string>();
    for (const item of list) {
      if (typeof item !== "string" || item.length === 0 || item.length > length || seen.has(item)) return false;
      seen.add(item);
    }
  }
  if ("hints" in data) {
    const hints = data.hints;
    if (typeof hints !== "object" || hints === null || Array.isArray(hints)) return false;
    const entries = Object.entries(hints as Record<string, unknown>);
    if (entries.length > 128) return false;
    for (const [id, tier] of entries) {
      if (id.length === 0 || id.length > 40 || typeof tier !== "number" || !Number.isInteger(tier) || tier < 0 || tier > 3) return false;
    }
  }
  return true;
}

/** Lit un enregistrement validé (listes manquantes = vides). */
export function readRecord(value: unknown): InquiryRecord {
  const record = emptyRecord();
  if (!validRecord(value)) return record;
  const data = value as Partial<InquiryRecord>;
  for (const key of RECORD_KEYS) record[key] = [...(data[key] ?? [])];
  record.hints = { ...(data.hints ?? {}) };
  return record;
}

/** Ce que l'enquête demande à l'état de la partie (SiloState). */
export interface ExtHost {
  ext: Record<string, unknown>;
  getExt<T>(key: string, read: (raw: unknown) => T | null, fallback: () => T): T;
}

/**
 * L'enregistrement d'enquête de la partie, modifiable sur place (il vit dans `state.ext`) :
 * complété s'il lui manque des listes, remplacé par un vide s'il est illisible.
 */
export function recordOf(state: ExtHost): InquiryRecord {
  return state.getExt<InquiryRecord>(
    INQUIRY_KEY,
    (raw) => {
      if (!validRecord(raw)) return null;
      const r = raw as Partial<InquiryRecord>;
      for (const key of RECORD_KEYS) if (!Array.isArray(r[key])) (r as Record<string, unknown>)[key] = [];
      if (!r.hints) r.hints = {};
      r.v = 1;
      return r as InquiryRecord;
    },
    () => {
      const fresh = emptyRecord();
      state.ext[INQUIRY_KEY] = fresh;
      return fresh;
    },
  );
}

/** Ajoute un identifiant à une liste, une seule fois et dans les bornes. Vrai si ajouté. */
export function addOnce(record: InquiryRecord, key: keyof typeof LIMITS, id: string): boolean {
  const list = record[key];
  const [count, length] = LIMITS[key];
  if (!id || id.length > length || list.includes(id) || list.length >= count) return false;
  list.push(id);
  return true;
}

/** Résumé court qui change à chaque progrès d'enquête (déclenche la sauvegarde automatique). */
export function recordKey(r: InquiryRecord): string {
  return `${r.cards.length}.${r.traces.length}.${r.deductions.length}.${r.revealed.length}.${r.unlocked.length}`;
}
