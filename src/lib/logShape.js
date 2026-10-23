/* ---------------- lib/logShape.js ----------------
 * The shape of one day's log. Lives on its own (not in useAppState.js) so
 * pure modules can create a day without importing React.
 */
export function createEmptyLogShape(weight = 0) {
  return { foods: [], walk: 0, gym: 0, weight: weight || 0, water: 0 };
}
