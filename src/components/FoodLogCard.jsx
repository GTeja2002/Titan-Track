/* ---------------- components/FoodLogCard.jsx ---------------- */

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Search, Utensils, RotateCcw, History, BookOpen, Pencil, Trash2, Star } from 'lucide-react';
import { FOOD_DB, QUICK_CHIPS, findFood, calculateProteinTarget } from '../lib/calculations.js';
import { MacroBar } from './shared/MacroBar.jsx';
import { portionsFor } from '../lib/portions.js';
import { frequentFoods, yesterdaysFoods } from '../lib/recentFoods.js';
import {
  MEAL_TYPES, UNITS, NUTRITION_SOURCES, defaultMealForTime, fromBuiltin, calcNutrition,
  createMealEntry, cloneMealEntry, completeEntryCalories, createCustomFood, sumEntries,
  groupByMeal, normalizeFoodName,
} from '../lib/nutrition.js';
import {
  addEntries, removeEntry, replaceEntry, upsertCustomFood, deleteCustomFood, liveCustomFoods,
  saveFavoriteMeal, removeFavoriteMeal,
} from '../lib/mealLog.js';
import { CustomFoodModal } from './CustomFoodModal.jsx';
import { useDismiss } from '../lib/dismiss.js';

const unitShort = (unit) => (unit === 'piece' ? 'pc' : UNITS[unit]?.short ?? unit ?? '');

/** Small label next to an entry whose numbers are not from a reference list. */
function SourceBadge({ entry }) {
  if (entry.calUnknown) return null;
  if (entry.source !== 'estimated') return null;
  return (
    <span title={NUTRITION_SOURCES.estimated} className="rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase" style={{ background: 'var(--warning-soft, #FFF3D6)', color: 'var(--warning, #A56212)' }}>
      est.
    </span>
  );
}

/** Inline "fill in calories" for an entry logged as unknown. */
function CompleteCalories({ entry, onSave }) {
  const [val, setVal] = useState('');
  const [isEstimate, setIsEstimate] = useState(false);
  const basis = entry.basis ?? (entry.unit === 'g' || entry.unit === 'ml' ? 'per100' : 'perServing');
  const per = basis === 'per100' ? `kcal/100${unitShort(entry.unit)}` : `kcal/${unitShort(entry.unit) || 'serving'}`;
  const save = () => {
    const next = completeEntryCalories(entry, val, { isEstimate });
    if (next) onSave(next);
  };
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
      <input
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={per}
        aria-label={`Calories for ${entry.name}, ${per}`}
        className="w-24 rounded-lg border px-2 py-1 outline-none"
        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
      />
      <label className="flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
        <input type="checkbox" checked={isEstimate} onChange={(e) => setIsEstimate(e.target.checked)} /> estimate
      </label>
      <button onClick={save} className="rounded-lg px-2 py-1 font-bold text-white" style={{ background: 'var(--primary)' }}>Save</button>
    </div>
  );
}

function MyFoodsModal({ foods, onEdit, onDelete, onClose, covered }) {
  useDismiss(!covered, onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="My foods" onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 text-left" style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-black" style={{ color: 'var(--text)' }}>My Foods</h3>
          <button onClick={onClose} aria-label="Close" style={{ color: 'var(--text-faint)' }}><X size={18} /></button>
        </div>
        {foods.length === 0 ? (
          <p className="py-6 text-center text-[13px]" style={{ color: 'var(--text-faint)' }}>
            Foods you add with “+ What I Eat” are saved here for next time.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {foods.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-bold" style={{ color: 'var(--text)' }}>{f.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                    {f.calories == null
                      ? 'Calories unknown'
                      : `${f.calories} kcal per ${f.basis === 'per100' ? `100 ${unitShort(f.unit)}` : unitShort(f.unit)}`}
                    {f.source === 'estimated' ? ' · estimate' : ''}
                  </p>
                </div>
                <button onClick={() => onEdit(f)} aria-label={`Edit ${f.name}`} className="rounded-lg p-1.5" style={{ color: 'var(--text-dim)' }}><Pencil size={14} /></button>
                <button
                  onClick={() => { if (window.confirm(`Remove “${f.name}” from My Foods? Days you already logged it keep their calories.`)) onDelete(f); }}
                  aria-label={`Delete ${f.name}`}
                  className="rounded-lg p-1.5"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}

export function FoodLogCard({ state, update }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [cal, setCal] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [meal, setMeal] = useState(() => defaultMealForTime());
  const [customModal, setCustomModal] = useState(null);   // null | { mode, initial, editingFood }
  const [myFoodsOpen, setMyFoodsOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const myFoods = useMemo(() => liveCustomFoods(state), [state]);

  // Everything the picker can offer, in one shape: your own foods first.
  const catalogue = useMemo(() => [
    ...myFoods.map((f) => ({ key: `c:${f.id}`, def: f, isCustom: true })),
    ...FOOD_DB.map((f) => ({ key: `b:${f.name}`, def: fromBuiltin(f), isCustom: false })),
  ], [myFoods]);

  const matched = useMemo(() => {
    const n = normalizeFoodName(name);
    if (!n) return null;
    return catalogue.find((c) => normalizeFoodName(c.def.name) === n)?.def ?? null;
  }, [name, catalogue]);

  const suggestions = useMemo(() => {
    const q = normalizeFoodName(name);
    if (!q) return catalogue;
    return catalogue.filter((c) => normalizeFoodName(c.def.name).includes(q));
  }, [name, catalogue]);

  const qtyLabel = matched ? (matched.basis === 'perServing' ? unitShort(matched.unit) === 'pc' ? 'Pieces' : `Qty (${unitShort(matched.unit)})` : `Qty (${matched.unit})`) : 'Qty';

  const hint = matched
    ? matched.calories == null
      ? 'Calories for this food are not known yet — it will be logged as unknown.'
      : matched.basis === 'perServing'
        ? `${matched.calories} kcal per ${unitShort(matched.unit)} — calories auto-fill.`
        : `${matched.calories} kcal per 100${matched.unit} — calories auto-fill.`
    : name
      ? `"${name.trim()}" isn't in the list — tap + to add it with “What I Eat”.`
      : 'Tap something you eat often, search, or use “+ What I Eat” for anything else.';

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2500);
  };

  const onQtyChange = (val) => {
    setQty(val);
    if (matched) {
      const c = calcNutrition(matched, parseFloat(val) || 0).cal;
      setCal(c ? String(c) : '');
    }
  };

  const logEntries = (entries) => {
    update((prev) => addEntries(prev, prev.currentDate, entries));
  };

  const resetInputs = () => { setName(''); setQty(''); setCal(''); };

  const addFood = () => {
    const n = name.trim();
    if (!n) {
      setCustomModal({ mode: 'log', initial: {} });
      return;
    }
    if (!matched) {
      // Not in any list: hand over to "+ What I Eat" so the unit and calorie
      // basis are chosen explicitly rather than guessed.
      const c = parseFloat(cal);
      setCustomModal({
        mode: 'log',
        initial: c > 0 ? { name: n, qty: 1, unit: 'serving', calories: c } : { name: n, qty: qty || '' },
      });
      return;
    }
    const q = parseFloat(qty);
    if (!(q > 0)) {
      flash('Enter how much you ate first.');
      return;
    }
    let entry = createMealEntry({ food: matched, qty: q, mealType: meal });
    // A calorie value typed over the auto-filled one is the user's own number.
    const typed = parseFloat(cal);
    if (typed > 0 && typed !== entry.cal) {
      entry = { ...entry, cal: Math.round(typed), calUnknown: false, source: 'user_entered' };
    }
    logEntries([entry]);
    resetInputs();
  };

  const quickAdd = (i) => {
    const c = QUICK_CHIPS[i];
    const food = findFood(c.food);
    if (!food) return;
    logEntries([createMealEntry({ food, qty: c.qty, mealType: meal })]);
  };

  const onCustomLog = ({ value, qty: q, mealType, consumedAt, saveToMyFoods, duplicate }) => {
    let def;
    if (saveToMyFoods) {
      def = duplicate
        ? { ...duplicate, ...value, updatedAt: new Date().toISOString() }
        : createCustomFood(value);
    } else {
      def = { id: null, ...value };
    }
    const entry = createMealEntry({ food: def, qty: q, mealType, consumedAt });
    update((prev) => {
      const withFood = saveToMyFoods ? upsertCustomFood(prev, def) : prev;
      return addEntries(withFood, prev.currentDate, [entry]);
    });
    setCustomModal(null);
    resetInputs();
    setMeal(mealType);
    flash(`Added ${value.name} to ${MEAL_TYPES.find((m) => m.id === mealType)?.label}.`);
  };

  const onSaveDefinition = (value) => {
    const original = customModal.editingFood;
    update((prev) => upsertCustomFood(prev, { ...original, ...value, updatedAt: new Date().toISOString() }));
    setCustomModal(null);
    flash(`Updated ${value.name}.`);
  };

  const log = state.logs[state.currentDate];
  const foods = log?.foods ?? [];
  const groups = groupByMeal(foods);
  const totals = sumEntries(foods);

  // One-tap repeats. Most people eat the same things on rotation, so the
  // fastest log is the one that already knows what you eat.
  // Favourite meals: log a saved set of items in one tap, into the meal
  // currently selected. Each item becomes a fresh entry with its own id.
  const favorites = state.favoriteMeals || [];
  const logFavorite = (fav) => {
    logEntries(fav.items.map((item) => cloneMealEntry(item, { mealType: meal })));
    flash(`Added ${fav.name}.`);
  };
  const saveAsFavorite = (mealId, mealLabel, entries) => {
    const name = window.prompt('Name this favourite meal', `My ${mealLabel.toLowerCase()}`);
    if (!name || !name.trim()) return;
    update((prev) => saveFavoriteMeal(prev, { name, mealType: mealId === 'other' ? null : mealId, entries }));
    flash(`Saved "${name.trim()}" to favourites.`);
  };
  const removeFavorite = (fav) => {
    if (window.confirm(`Remove "${fav.name}" from favourites?`)) update((prev) => removeFavoriteMeal(prev, fav.id));
  };

  const frequents = useMemo(
    () => frequentFoods(state.logs, state.currentDate, 6),
    [state.logs, state.currentDate]
  );
  const yesterday = useMemo(
    () => yesterdaysFoods(state.logs, state.currentDate),
    [state.logs, state.currentDate]
  );

  const logAgain = (item) => logEntries([cloneMealEntry(item, { mealType: meal })]);
  const repeatYesterday = () => {
    if (yesterday.length === 0) return;
    logEntries(yesterday.map((f) => cloneMealEntry(f)));
  };

  // Portion presets for whatever is currently matched, so a quantity is a tap
  // rather than a guess in grams. Built-in foods only: presets are keyed by
  // the built-in names.
  const builtinMatch = matched && matched.source === 'builtin' ? findFood(matched.name) : null;
  const portions = portionsFor(builtinMatch);
  const activeWeight = (log?.weight > 0) ? log.weight : (state.weight ?? 70);
  // General nutrition guideline targets (not a personalized medical plan)
  const proteinTarget = calculateProteinTarget(activeWeight, state.goal, state.activityLevel);
  const carbsTarget = Math.round(activeWeight * 4);
  const fatTarget = Math.round(activeWeight * 0.8);
  const fiberTarget = state.gender === 'female' ? 25 : 30;

  const mealSections = [...MEAL_TYPES, { id: 'other', label: 'Earlier entries' }].filter((m) => groups[m.id].length > 0);

  return (
    <div className="nutrition-panel h-full rounded-[var(--radius-card)] p-[var(--space-card)] flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
          <Utensils size={14} style={{ color: 'var(--primary)' }} />
          Food Log
          {foods.length > 0 && (
            <span className="ml-1 normal-case tracking-normal" style={{ color: 'var(--text-faint)' }}>
              · {foods.length} item{foods.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {foods.length > 0 && (
          <span className="text-sm font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            {totals.cal} kcal{totals.unknownCount > 0 ? '+' : ''}
          </span>
        )}
      </div>

      {totals.unknownCount > 0 && (
        <p className="-mt-2 mb-3 text-[11px]" style={{ color: 'var(--text-faint)' }}>
          {totals.unknownCount} item{totals.unknownCount > 1 ? 's' : ''} missing calories — today's total is incomplete.
        </p>
      )}

      {foods.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <MacroBar label="Protein" value={totals.protein} target={proteinTarget} color="var(--macro-protein)" gradient="var(--grad-protein)" />
          <MacroBar label="Carbs" value={totals.carbs} target={carbsTarget} color="var(--macro-carbs)" gradient="var(--grad-carbs)" />
          <MacroBar label="Fat" value={totals.fat} target={fatTarget} color="var(--macro-fat)" gradient="var(--grad-fat)" />
          <MacroBar label="Fiber" value={totals.fiber} target={fiberTarget} color="var(--macro-fiber)" gradient="var(--grad-fiber)" />
        </div>
      )}

      {/* Which meal new items go into. */}
      <div className="mb-3 grid grid-cols-2 min-[360px]:grid-cols-4 gap-1.5" role="radiogroup" aria-label="Meal">
        {MEAL_TYPES.map((m) => {
          const active = meal === m.id;
          return (
            <button
              key={m.id}
              role="radio"
              aria-checked={active}
              onClick={() => setMeal(m.id)}
              className="min-h-[40px] min-w-0 truncate rounded-full border px-1 text-[12.5px] font-bold transition active:scale-95"
              style={{
                background: active ? 'var(--primary)' : 'var(--surface)',
                borderColor: active ? 'var(--primary)' : 'var(--border)',
                color: active ? '#fff' : 'var(--text-dim)',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button
          onClick={() => setCustomModal({ mode: 'log', initial: name.trim() && !matched ? { name: name.trim() } : {} })}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-bold text-white transition active:scale-95"
          style={{ background: 'var(--grad-primary-cta)', boxShadow: '0 4px 14px var(--primary-glow)' }}
        >
          <Plus size={15} /> What I Eat
        </button>
        <button
          onClick={() => setMyFoodsOpen(true)}
          aria-label={myFoods.length ? `My Foods, ${myFoods.length} saved` : 'My Foods'}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3.5 text-[13.5px] font-bold transition active:scale-95"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)', background: 'var(--surface)' }}
        >
          <BookOpen size={14} /> My Foods
          {myFoods.length > 0 && (
            <span className="rounded-full px-1.5 text-[11px] font-black" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }} aria-hidden="true">
              {myFoods.length}
            </span>
          )}
        </button>
      </div>

      {favorites.length > 0 && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5" aria-label="Favourite meals">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
            <Star size={11} /> Favourites
          </span>
          {favorites.map((fav) => {
            const kcal = fav.items.reduce((n, it) => n + (it.cal || 0), 0);
            return (
              <span key={fav.id} className="flex items-center rounded-full border" style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)' }}>
                <button
                  type="button"
                  onClick={() => logFavorite(fav)}
                  className="min-h-[32px] pl-2.5 pr-1.5 text-[11.5px] font-bold"
                  style={{ color: 'var(--primary)' }}
                  title={fav.items.map((it) => it.name).join(', ')}
                >
                  + {fav.name} · {kcal} kcal
                </button>
                <button type="button" onClick={() => removeFavorite(fav)} aria-label={`Remove favourite ${fav.name}`} className="flex h-8 w-7 items-center justify-center" style={{ color: 'var(--primary)' }}>
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Your own rotation first, then the generic chips. Logging what you
          already eat should not require typing it again. */}
      {(frequents.length > 0 || yesterday.length > 0) && (
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
            <History size={11} /> Yours
          </span>
          {yesterday.length > 0 && (
            <button
              onClick={repeatYesterday}
              className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition hover:scale-105 active:scale-95"
              style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--primary)' }}
              title={yesterday.map((f) => f.name).join(', ')}
            >
              <RotateCcw size={11} />
              Repeat yesterday ({yesterday.length})
            </button>
          )}
          {frequents.map((f, i) => (
            <button
              key={`${f.name}-${f.qty}-${i}`}
              onClick={() => logAgain(f)}
              className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:scale-105 active:scale-95"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
              title={`Logged ${f.timesLogged}x in the last 30 days`}
            >
              + {f.name}{f.qty ? ` · ${f.qty}${unitShort(f.unit)}` : ''}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((c, i) => (
          <button
            key={c.label}
            onClick={() => quickAdd(i)}
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:scale-105 active:scale-95"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            + {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1.6fr_0.7fr_0.8fr_auto] items-end gap-2">
        <div className="relative col-span-3 sm:col-span-1">
          <label htmlFor="food-search" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Food</label>
          <input
            value={name}
            id="food-search"
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setIsSelectOpen(true)}
            onBlur={() => setTimeout(() => setIsSelectOpen(false), 200)}
            placeholder="Search or type..."
            autoComplete="off"
            className="w-full min-h-[44px] rounded-xl border bg-transparent px-3 text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          {/* z-50, not z-55: Tailwind's scale stops at 50 and the config does
              not extend zIndex, so z-55 compiled to nothing and left this menu
              at z-index:auto — the logged-food rows further down the card are
              later siblings, so they painted over it. The background is the
              solid surface token rather than .glass, whose translucent
              rgba(255,255,255,0.7) let that same content show through. */}
          {isSelectOpen && (
            <div
              className="absolute left-0 right-0 top-full mt-2 z-50 max-h-60 overflow-y-auto rounded-3xl border p-1.5 flex flex-col gap-0.5"
              style={{
                background: 'var(--surface-solid)',
                borderColor: 'var(--border)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
              }}
            >
              {suggestions.map(({ key, def, isCustom }) => (
                <div
                  key={key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setName(def.name);
                    setIsSelectOpen(false);
                    if (qty) {
                      const c = calcNutrition(def, parseFloat(qty) || 0).cal;
                      setCal(c ? String(c) : '');
                    }
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition duration-150 text-[var(--text)]"
                >
                  <div className="flex items-center gap-3">
                    {def.image ? (
                      <img src={def.image} alt={def.name} className="w-8 h-8 rounded-xl object-cover border border-white/5 shadow-sm shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
                        <Utensils size={13} style={{ color: 'var(--text-faint)' }} />
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold leading-normal">
                        {def.name}
                        {isCustom && <span className="ml-1.5 text-[9px] font-black uppercase" style={{ color: 'var(--primary)' }}>Mine</span>}
                      </span>
                      <span className="text-[9px] text-[var(--text-faint)] mt-0.5">
                        {def.basis === 'perServing' ? `Per ${unitShort(def.unit)}` : `Per 100${def.unit}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black font-mono text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded-full shrink-0">
                    {def.calories == null ? '? kcal' : `${def.calories} kcal`}
                  </span>
                </div>
              ))}
              {/* Always offered, so a missing food is never a dead end. */}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setIsSelectOpen(false); setCustomModal({ mode: 'log', initial: name.trim() ? { name: name.trim() } : {} }); }}
                className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold"
                style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
              >
                <Plus size={14} />
                {suggestions.length === 0 && name.trim()
                  ? `“${name.trim()}” isn't listed — add it with What I Eat`
                  : 'Not here? + What I Eat'}
              </button>
            </div>
          )}
          {matched?.image && (
            <div className="mt-1.5 flex items-center gap-2 animate-fade-in">
              <img src={matched.image} alt={matched.name} className="h-8 w-8 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-dim)' }}>{matched.name}</span>
            </div>
          )}
        </div>
        <div>
          <label htmlFor="food-qty" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{qtyLabel}</label>
          <input
            id="food-qty"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => onQtyChange(e.target.value)}
            placeholder="100"
            className="w-full min-h-[44px] rounded-xl border px-3 text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label htmlFor="food-cal" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Calories</label>
          <input
            id="food-cal"
            type="number"
            inputMode="decimal"
            min="0"
            value={cal}
            onChange={(e) => setCal(e.target.value)}
            placeholder="kcal"
            className="w-full min-h-[44px] rounded-xl border px-3 text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
        <button
          onClick={addFood}
          className="flex h-[44px] w-[52px] items-center justify-center rounded-xl text-white transition active:scale-95"
          style={{ background: 'var(--grad-primary-cta)', boxShadow: '0 4px 14px var(--primary-glow)' }}
          aria-label={`Add food to ${MEAL_TYPES.find((m) => m.id === meal)?.label}`}
        >
          <Plus size={18} />
        </button>
      </div>
      {/* Portion presets. Asking for a quantity in grams before anything can
          be logged is the main reason food tracking gets abandoned — almost
          nobody knows what 150g of poha looks like. One tap instead. */}
      {matched && portions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
            How much?
          </span>
          {portions.map((p) => {
            const active = parseFloat(qty) === p.qty;
            return (
              <button
                key={p.label}
                onClick={() => onQtyChange(String(p.qty))}
                className="rounded-full border px-2.5 py-1 text-[11px] font-bold transition hover:scale-105 active:scale-95"
                style={{
                  background: active ? 'var(--primary)' : 'var(--surface)',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                  color: active ? '#fff' : 'var(--text-dim)',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-2 mb-1 text-xs" style={{ color: matched ? 'var(--primary)' : 'var(--text-faint)' }}>{hint}</p>
      <p aria-live="polite" className="mb-3 min-h-[1rem] text-xs font-bold" style={{ color: 'var(--primary)' }}>{notice}</p>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto" style={{ maxHeight: 320 }}>
        {foods.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            <Search size={24} style={{ color: 'var(--text-faint)' }} />
            <p className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>Nothing logged yet — add what you ate above.</p>
          </div>
        ) : (
          mealSections.map((m) => {
            const sub = sumEntries(groups[m.id]);
            return (
              <section key={m.id} aria-label={m.label}>
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                  <span className="flex items-center gap-2">
                    {m.label}
                    <button
                      type="button"
                      onClick={() => saveAsFavorite(m.id, m.label, groups[m.id])}
                      aria-label={`Save ${m.label} as a favourite`}
                      className="flex min-h-[32px] items-center gap-1 rounded-full px-2 text-[10.5px] font-bold normal-case tracking-normal"
                      style={{ color: 'var(--primary)', background: 'var(--primary-soft)' }}
                    >
                      <Star size={11} /> Save
                    </button>
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{sub.cal} kcal{sub.unknownCount ? '+' : ''}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {groups[m.id].map((f) => (
                    <div key={f.id} className="rounded-xl border px-3 py-2 text-sm animate-slide-in" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2.5">
                        {f.image ? (
                          <img src={f.image} alt={f.name} className="h-8 w-8 shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--bg-2)' }}>
                            <Utensils size={13} style={{ color: 'var(--text-faint)' }} />
                          </div>
                        )}
                        <span className="flex-1 min-w-0 font-semibold leading-snug line-clamp-2 break-words">{f.name}</span>
                        <SourceBadge entry={f} />
                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                          {f.qty ? `${f.qty}${unitShort(f.unit)}` : ''}
                        </span>
                        <span className="text-xs font-bold" style={{ color: f.calUnknown ? 'var(--text-faint)' : 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                          {f.calUnknown ? '? kcal' : f.cal}
                        </span>
                        <button
                          onClick={() => update((prev) => removeEntry(prev, prev.currentDate, f.id))}
                          style={{ color: 'var(--text-faint)' }}
                          className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:text-[var(--danger)]"
                          aria-label={`Remove ${f.name}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                      {f.calUnknown && (
                        <CompleteCalories entry={f} onSave={(next) => update((prev) => replaceEntry(prev, prev.currentDate, next))} />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {customModal && (
        <CustomFoodModal
          mode={customModal.mode}
          initial={customModal.initial}
          editingFood={customModal.editingFood}
          customFoods={myFoods}
          mealType={meal}
          currentDate={state.currentDate}
          onLog={onCustomLog}
          onSaveDefinition={onSaveDefinition}
          onClose={() => setCustomModal(null)}
        />
      )}

      {myFoodsOpen && !customModal && (
        <MyFoodsModal
          covered={!!customModal}
          foods={myFoods}
          onEdit={(f) => setCustomModal({ mode: 'edit', initial: f, editingFood: f })}
          onDelete={(f) => update((prev) => deleteCustomFood(prev, f.id))}
          onClose={() => setMyFoodsOpen(false)}
        />
      )}
    </div>
  );
}
