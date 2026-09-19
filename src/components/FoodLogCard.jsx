/* ---------------- components/FoodLogCard.jsx ---------------- */

import { useState, useMemo } from 'react';
import { Plus, X, Search, Utensils } from 'lucide-react';
import { FOOD_DB, QUICK_CHIPS, findFood, calcCal, calcMacros, calculateProteinTarget } from '../lib/calculations.js';
import { MacroBar } from './shared/MacroBar.jsx';

export function FoodLogCard({ state, update }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [cal, setCal] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const matched = useMemo(() => findFood(name), [name]);

  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return FOOD_DB; // show all available options by default
    return FOOD_DB.filter((f) => f.name.toLowerCase().includes(q));
  }, [name]);

  const qtyLabel = matched ? (matched.unit === 'piece' ? 'Pieces' : `Qty (${matched.unit})`) : 'Qty';

  const hint = matched
    ? matched.unit === 'piece'
      ? `${matched.calPerPiece} kcal per piece — calories auto-fill.`
      : `${matched.calPer100} kcal per 100${matched.unit} — calories auto-fill.`
    : name
      ? `"${name}" isn't in the database — enter calories manually.`
      : 'Search 30+ foods, tap a quick chip, or type anything and enter calories yourself.';

  const onQtyChange = (val) => {
    setQty(val);
    if (matched) {
      const q = parseFloat(val) || 0;
      setCal(String(calcCal(matched, q) || ''));
    }
  };

  const pushFood = (item) => {
    update((prev) => {
      const log = prev.logs[prev.currentDate];
      return { ...prev, logs: { ...prev.logs, [prev.currentDate]: { ...log, foods: [...log.foods, item] } } };
    });
    setName('');
    setQty('');
    setCal('');
  };

  const addFood = () => {
    const n = name.trim();
    const q = parseFloat(qty) || 0;
    let c = parseFloat(cal) || 0;
    if (!n) return;
    if (!c && matched) c = calcCal(matched, q);
    if (!c) return;
    const macros = matched ? calcMacros(matched, q) : { protein: 0, carbs: 0, fat: 0, fiber: 0 };
    pushFood({ name: n, qty: q, unit: matched?.unit ?? '', cal: c, image: matched?.image ?? null, ...macros });
  };

  const quickAdd = (i) => {
    const c = QUICK_CHIPS[i];
    const food = findFood(c.food);
    if (!food) return;
    pushFood({ name: c.food, qty: c.qty, unit: food.unit, cal: calcCal(food, c.qty), image: food.image ?? null, ...calcMacros(food, c.qty) });
  };

  const removeFood = (idx) => {
    update((prev) => {
      const log = prev.logs[prev.currentDate];
      const foods = [...log.foods];
      foods.splice(idx, 1);
      return { ...prev, logs: { ...prev.logs, [prev.currentDate]: { ...log, foods } } };
    });
  };

  const log = state.logs[state.currentDate];
  const foods = log?.foods ?? [];
  const totalCal = foods.reduce((s, f) => s + (f.cal || 0), 0);
  const activeWeight = (log?.weight > 0) ? log.weight : (state.weight ?? 70);
  const totalProtein = Number(foods.reduce((s, f) => s + (f.protein || 0), 0).toFixed(1));
  const totalCarbs = Number(foods.reduce((s, f) => s + (f.carbs || 0), 0).toFixed(1));
  const totalFat = Number(foods.reduce((s, f) => s + (f.fat || 0), 0).toFixed(1));
  const totalFiber = Number(foods.reduce((s, f) => s + (f.fiber || 0), 0).toFixed(1));
  // General nutrition guideline targets (not a personalized medical plan)
  const proteinTarget = calculateProteinTarget(activeWeight, state.goal, state.activityLevel);
  const carbsTarget = Math.round(activeWeight * 4);
  const fatTarget = Math.round(activeWeight * 0.8);
  const fiberTarget = state.gender === 'female' ? 25 : 30;

  return (
    <div className="glass h-full rounded-3xl p-6 flex flex-col" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
      <div className="mb-4 flex items-center justify-between">
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
          <span className="text-sm font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{totalCal} kcal</span>
        )}
      </div>

      {foods.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <MacroBar label="Protein" value={totalProtein} target={proteinTarget} color="var(--info)" />
          <MacroBar label="Carbs" value={totalCarbs} target={carbsTarget} color="var(--accent)" />
          <MacroBar label="Fat" value={totalFat} target={fatTarget} color="var(--danger)" />
          <MacroBar label="Fiber" value={totalFiber} target={fiberTarget} color="var(--primary)" />
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

      <div className="grid grid-cols-[1.6fr_0.7fr_0.8fr_auto] items-end gap-2">
        <div className="relative">
          <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Food</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setIsSelectOpen(true)}
            onBlur={() => setTimeout(() => setIsSelectOpen(false), 200)}
            placeholder="Search or type..."
            autoComplete="off"
            className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
          {/* z-50, not z-55: Tailwind's scale stops at 50 and the config does
              not extend zIndex, so z-55 compiled to nothing and left this menu
              at z-index:auto — the logged-food rows further down the card are
              later siblings, so they painted over it. The background is the
              solid surface token rather than .glass, whose translucent
              rgba(255,255,255,0.7) let that same content show through. */}
          {isSelectOpen && suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full mt-2 z-50 max-h-60 overflow-y-auto rounded-3xl border p-1.5 flex flex-col gap-0.5"
              style={{
                background: 'var(--surface-solid)',
                borderColor: 'var(--border)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
              }}
            >
              {suggestions.map((f) => (
                <div
                  key={f.name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setName(f.name);
                    setIsSelectOpen(false);
                    if (qty) {
                      const q = parseFloat(qty) || 0;
                      setCal(String(calcCal(f, q) || ''));
                    }
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-primary-soft hover:text-primary transition duration-150 text-[var(--text)]"
                >
                  <div className="flex items-center gap-3">
                    {f.image ? (
                      <img
                        src={f.image}
                        alt={f.name}
                        className="w-8 h-8 rounded-xl object-cover border border-white/5 shadow-sm shrink-0"
                      />
                    ) : (
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed"
                        style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
                      >
                        <Utensils size={13} style={{ color: 'var(--text-faint)' }} />
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold leading-normal">{f.name}</span>
                      <span className="text-[9px] text-[var(--text-faint)] mt-0.5">
                        {f.unit === 'piece' ? 'Unit: Per piece' : `Unit: Per 100${f.unit}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-center shrink-0">
                    <span className="text-[10px] font-black font-mono text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded-full">
                      {f.unit === 'piece'
                        ? `${f.calPerPiece} kcal`
                        : `${f.calPer100} kcal`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {matched?.image && (
            <div className="mt-1.5 flex items-center gap-2 animate-fade-in">
              <img
                src={matched.image}
                alt={matched.name}
                className="h-8 w-8 rounded-lg object-cover"
                style={{ border: '1px solid var(--border)' }}
              />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-dim)' }}>{matched.name}</span>
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>{qtyLabel}</label>
          <input
            type="number"
            value={qty}
            onChange={(e) => onQtyChange(e.target.value)}
            placeholder="100"
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>Cal</label>
          <input
            type="number"
            value={cal}
            onChange={(e) => setCal(e.target.value)}
            placeholder="kcal"
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: 'var(--bg-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
        <button
          onClick={addFood}
          className="flex items-center justify-center rounded-xl px-3.5 py-2.5 text-white transition hover:scale-105 active:scale-95"
          style={{ background: 'var(--primary)', boxShadow: '0 4px 14px var(--primary-glow)' }}
          aria-label="Add food"
        >
          <Plus size={18} />
        </button>
      </div>
      <p className="mt-2 mb-4 text-xs" style={{ color: matched ? 'var(--primary)' : 'var(--text-faint)' }}>{hint}</p>

      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 240 }}>
        {foods.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            <Search size={24} style={{ color: 'var(--text-faint)' }} />
            <p className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>Nothing logged yet — add what you ate above.</p>
          </div>
        ) : (
          foods.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm animate-slide-in" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {f.image ? (
                <img src={f.image} alt={f.name} className="h-8 w-8 shrink-0 rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--bg-2)' }}>
                  <Utensils size={13} style={{ color: 'var(--text-faint)' }} />
                </div>
              )}
              <span className="flex-1 font-semibold">{f.name}</span>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                {f.qty ? `${f.qty}${f.unit === 'piece' ? 'pc' : f.unit ? f.unit : ''}` : ''}
              </span>
              <span className="text-xs font-bold" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{f.cal}</span>
              <button onClick={() => removeFood(i)} style={{ color: 'var(--text-faint)' }} className="transition hover:scale-125 hover:text-[var(--danger)]" aria-label="Remove">
                <X size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ---------------- components/ActivityCard.js ---------------- */
