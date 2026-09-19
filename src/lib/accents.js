/* ---------------- lib/accents.js ----------------
 * The accent palette the user can pick from. Each id matches a
 * body[data-accent='…'] block in index.css, which re-points the primary
 * colour tokens; every component already reads from those tokens, so nothing
 * else needs to know a theme changed.
 */
export const ACCENTS = [
  { id: 'evergreen', label: 'Evergreen', swatch: '#1A5C4E' },
  { id: 'ocean', label: 'Ocean', swatch: '#1B5E7E' },
  { id: 'plum', label: 'Plum', swatch: '#6B4A7E' },
  { id: 'ember', label: 'Ember', swatch: '#B4542F' },
  { id: 'midnight', label: 'Midnight', swatch: '#2F3E7E' },
  { id: 'rose', label: 'Rose', swatch: '#A8446A' },
];

export const DEFAULT_ACCENT = 'evergreen';

export function isValidAccent(id) {
  return ACCENTS.some((a) => a.id === id);
}

/** 'evergreen' is the stylesheet's own default, so it carries no attribute. */
export function accentAttribute(id) {
  return isValidAccent(id) && id !== DEFAULT_ACCENT ? id : null;
}
