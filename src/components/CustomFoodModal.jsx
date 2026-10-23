/* ---------------- components/CustomFoodModal.jsx ----------------
 * "+ What I Eat": log a food that is not in the built-in list, and optionally
 * save it to My Foods for next time. Also used (mode="edit") to edit a saved
 * custom food's definition without logging anything.
 *
 * Calories are optional. Unknown calories are allowed and labelled as such so
 * they can be filled in later; an approximate value can be marked as an
 * estimate. Nothing here presents a guess as a measured fact.
 */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismiss } from '../lib/dismiss.js';
import { X, Info } from 'lucide-react';
import {
  UNITS, MEAL_TYPES, NUTRITION_SOURCES, validateCustomFood, validateQuantity,
  explainCalculation, findDuplicateCustomFood,
} from '../lib/nutrition.js';

const inputStyle = { background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' };

function Field({ label, error, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px]" style={{ color: 'var(--text-faint)' }}>{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-[11px] font-bold" style={{ color: 'var(--danger)' }}>{error}</span>}
    </label>
  );
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function CustomFoodModal({
  mode = 'log',            // 'log' | 'edit'
  initial = {},            // { name, qty, unit, calories, protein, carbs, fat, fiber, source }
  editingFood = null,      // the saved custom food when mode === 'edit'
  customFoods = [],
  mealType,
  currentDate,
  onLog,                   // ({ value, qty, mealType, consumedAt, saveToMyFoods, duplicate }) => void
  onSaveDefinition,        // (value) => void   (edit mode)
  onClose,
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [qty, setQty] = useState(initial.qty != null && initial.qty !== '' ? String(initial.qty) : '');
  const [unit, setUnit] = useState(initial.unit && UNITS[initial.unit] ? initial.unit : 'g');
  const [calories, setCalories] = useState(initial.calories != null ? String(initial.calories) : '');
  const [unknownCal, setUnknownCal] = useState(mode === 'edit' && initial.calories == null && !!editingFood);
  const [isEstimate, setIsEstimate] = useState(initial.source === 'estimated');
  const [macros, setMacros] = useState({
    protein: initial.protein ? String(initial.protein) : '',
    carbs: initial.carbs ? String(initial.carbs) : '',
    fat: initial.fat ? String(initial.fat) : '',
    fiber: initial.fiber ? String(initial.fiber) : '',
  });
  const [meal, setMeal] = useState(mealType ?? 'snacks');
  const [time, setTime] = useState(nowTime());
  const [saveToMyFoods, setSaveToMyFoods] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useDismiss(true, onClose);

  const basis = UNITS[unit].basis;
  const perLabel = basis === 'per100' ? `per 100 ${UNITS[unit].short}` : `per 1 ${UNITS[unit].short}`;

  const validation = useMemo(() => validateCustomFood({
    name, unit, calories: unknownCal ? null : calories, isEstimate, ...macros,
  }), [name, unit, calories, unknownCal, isEstimate, macros]);
  const qtyError = mode === 'log' ? validateQuantity(qty, unit) : null;
  // Calories left blank without ticking "don't know" is almost always an
  // oversight, so ask rather than silently logging an unknown.
  const calMissing = !unknownCal && calories.trim() === '';
  const errors = { ...validation.errors };
  if (calMissing) errors.calories = 'Enter calories, or tick "I don\'t know yet"';
  const canSubmit = validation.ok && !qtyError && !calMissing;

  const duplicate = findDuplicateCustomFood(customFoods, name, unit, editingFood?.id ?? null);

  const submit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!canSubmit) return;
    if (mode === 'edit') {
      onSaveDefinition(validation.value);
      return;
    }
    const consumedAt = new Date(`${currentDate}T${time || '12:00'}:00`);
    onLog({
      value: validation.value,
      qty: Number(String(qty).replace(',', '.')),
      mealType: meal,
      consumedAt: Number.isNaN(consumedAt.getTime()) ? new Date() : consumedAt,
      saveToMyFoods,
      duplicate,
    });
  };

  const show = (k) => (submitted ? errors[k] : null);
  const mealLabel = MEAL_TYPES.find((m) => m.id === meal)?.label ?? 'meal';

  // Portalled to <body>: inside the page, the tab's entry animation creates a
  // stacking context that put this sheet under the phone's bottom tab bar.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Edit my food' : 'What I eat'}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 text-left animate-scale-in"
        style={{ background: 'var(--surface-solid)', border: '1px solid var(--border)' }}
        noValidate
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-black tracking-tight" style={{ color: 'var(--text)' }}>
              {mode === 'edit' ? 'Edit my food' : '+ What I Eat'}
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-dim)' }}>
              {mode === 'edit'
                ? 'Changes apply to future logs. Past days keep the values they were logged with.'
                : 'Add anything you ate, even if it is not in the list.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5" style={{ color: 'var(--text-faint)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5">
          <Field label="Food name" error={show('name')}>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pesarattu, Mom's chicken curry"
              maxLength={100}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            {mode === 'log' && (
              <Field label="How much" error={submitted ? qtyError : null}>
                <input
                  inputMode="decimal"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder={basis === 'per100' ? '150' : '1'}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              </Field>
            )}
            <Field label="Unit" error={show('unit')}>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              >
                {Object.entries(UNITS).map(([id, u]) => <option key={id} value={id}>{u.label}</option>)}
              </select>
            </Field>
          </div>

          <Field
            label={`Calories ${perLabel}`}
            error={show('calories')}
            hint={basis === 'per100'
              ? 'Check the pack label — it usually says "per 100 g".'
              : `Calories for one ${UNITS[unit].short}.`}
          >
            <input
              inputMode="decimal"
              value={unknownCal ? '' : calories}
              disabled={unknownCal}
              onChange={(e) => setCalories(e.target.value)}
              placeholder={unknownCal ? 'Unknown for now' : 'kcal'}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none disabled:opacity-50"
              style={inputStyle}
            />
          </Field>

          <div className="flex flex-col gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--text-dim)' }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={unknownCal} onChange={(e) => { setUnknownCal(e.target.checked); if (e.target.checked) setIsEstimate(false); }} />
              I don't know the calories yet (fill in later)
            </label>
            {!unknownCal && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isEstimate} onChange={(e) => setIsEstimate(e.target.checked)} />
                This is my estimate, not from a label
              </label>
            )}
          </div>

          <details className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
            <summary className="cursor-pointer text-[12px] font-bold" style={{ color: 'var(--text-dim)' }}>
              Protein, carbs, fat, fibre (optional, grams {perLabel})
            </summary>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {['protein', 'carbs', 'fat', 'fiber'].map((m) => (
                <Field key={m} label={m} error={show(m)}>
                  <input
                    inputMode="decimal"
                    value={macros[m]}
                    onChange={(e) => setMacros((prev) => ({ ...prev, [m]: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border px-2 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </Field>
              ))}
            </div>
            {show('macros') && <p role="alert" className="mt-1.5 text-[11px] font-bold" style={{ color: 'var(--danger)' }}>{errors.macros}</p>}
          </details>

          {mode === 'log' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Meal">
                  <select value={meal} onChange={(e) => setMeal(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle}>
                    {MEAL_TYPES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="Time eaten">
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none" style={inputStyle} />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--text-dim)' }}>
                <input type="checkbox" checked={saveToMyFoods} onChange={(e) => setSaveToMyFoods(e.target.checked)} />
                Save to My Foods for next time
              </label>
              {saveToMyFoods && duplicate && (
                <p className="flex items-start gap-1.5 text-[11.5px]" style={{ color: 'var(--text-faint)' }}>
                  <Info size={13} className="mt-0.5 shrink-0" />
                  “{duplicate.name}” ({UNITS[duplicate.unit]?.short}) is already in My Foods — it will be updated with these values.
                </p>
              )}
            </>
          )}

          {mode === 'edit' && duplicate && (
            <p className="text-[11.5px] font-bold" style={{ color: 'var(--danger)' }}>
              You already have “{duplicate.name}” in {UNITS[duplicate.unit]?.short} — rename this one or change the unit.
            </p>
          )}

          {/* Preview: exactly what will be stored, and how the number was worked out. */}
          {validation.ok && (mode === 'edit' || !qtyError) && !calMissing && (
            <div className="rounded-2xl border p-3.5" style={{ background: 'var(--primary-soft)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--primary)' }}>Preview</p>
              <p className="mt-1 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                {validation.value.name}
                {mode === 'log' && <> · {qty} {UNITS[unit].short} · {mealLabel}</>}
              </p>
              <p className="mt-0.5 text-[12px] font-mono" style={{ color: 'var(--text-dim)' }}>
                {mode === 'log'
                  ? explainCalculation(validation.value, Number(String(qty).replace(',', '.')))
                  : validation.value.calories == null ? 'Calories unknown' : `${validation.value.calories} kcal ${perLabel}`}
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-faint)' }}>{NUTRITION_SOURCES[validation.value.source]}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2.5">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border py-3 text-sm font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={mode === 'edit' && !!duplicate}
            className="flex-[2] rounded-xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--grad-primary-cta)' }}
          >
            {mode === 'edit' ? 'Save changes' : `Add to ${mealLabel}`}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
