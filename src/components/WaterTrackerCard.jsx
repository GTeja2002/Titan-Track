/* ---------------- components/WaterTrackerCard.jsx ---------------- */
import { useState } from 'react';
import { Droplet, Minus, Edit3 } from 'lucide-react';
import { normalizeWaterMl } from '../lib/calculations.js';

/** Quick-add amounts; the last one renders as the filled primary button. */
const QUICK_ADD_ML = [150, 250, 330, 500];

const MIN_TARGET_ML = 500;
const MAX_TARGET_ML = 10000;

export default function WaterTrackerCard({
    water = 0,
    target = 2500,
    weight = 70,
    onWaterChange,
    onTargetChange,
    variant = 'overview' // 'overview' | 'widget'
}) {
    const [customMlInput, setCustomMlInput] = useState('');
    const [isEditingTarget, setIsEditingTarget] = useState(false);
    const [tempTarget, setTempTarget] = useState(target.toString());
    const [errorMsg, setErrorMsg] = useState('');
    const [successToast, setSuccessToast] = useState('');

    const currentMl = normalizeWaterMl(water);

    // Auto-calculated target based on weight (35ml per kg)
    const autoCalculatedTarget = Math.round(weight * 35);
    const safeTarget = Math.max(MIN_TARGET_ML, typeof target === 'number' && !isNaN(target) ? target : autoCalculatedTarget);

    const percentage = Math.round((currentMl / safeTarget) * 100);
    const progressVisual = Math.min(percentage, 100);
    const remainingMl = Math.max(0, safeTarget - currentMl);

    // Equivalent glasses count for reference
    const glassesEquivalent = (currentMl / 250).toFixed(1).replace(/\.0$/, '');

    // Status message calculation
    let statusMessage = "Start your hydration journey";
    if (percentage >= 100) {
        statusMessage = percentage > 100 ? "Hydration target exceeded! 💧" : "Hydration Goal Achieved! 🎉";
    } else if (percentage >= 80) {
        statusMessage = "Almost at your target! 💧";
    } else if (percentage >= 50) {
        statusMessage = "Halfway there! 💧";
    } else if (percentage > 0) {
        statusMessage = "Keep drinking water 💧";
    }

    // Handle custom exact mL input submission
    const handleAddCustomMl = (e) => {
        e?.preventDefault();
        const mlToAdd = parseInt(customMlInput, 10);
        if (isNaN(mlToAdd) || mlToAdd <= 0) return;

        // Send exact mL delta directly
        onWaterChange(mlToAdd);
        setCustomMlInput('');

        setSuccessToast(`Logged ${mlToAdd.toLocaleString()} ml!`);
        setTimeout(() => setSuccessToast(''), 3000);
    };

    const handleQuickAddMl = (mlToAdd) => {
        onWaterChange(mlToAdd);
        setSuccessToast(`Added ${mlToAdd.toLocaleString()} ml!`);
        setTimeout(() => setSuccessToast(''), 2500);
    };

    // Undo shares the same delta path but must not announce itself as an
    // addition of a negative amount.
    const handleUndoMl = (mlToRemove) => {
        const actual = Math.min(mlToRemove, currentMl);
        if (actual <= 0) return;
        onWaterChange(-actual);
        setSuccessToast(`Removed ${actual.toLocaleString()} ml`);
        setTimeout(() => setSuccessToast(''), 2500);
    };

    const handleOpenEdit = () => {
        setTempTarget(safeTarget.toString());
        setErrorMsg('');
        setIsEditingTarget(true);
    };

    const handleSaveTarget = (e) => {
        e?.preventDefault();
        const parsed = parseInt(tempTarget, 10);
        if (isNaN(parsed) || parsed < MIN_TARGET_ML || parsed > MAX_TARGET_ML) {
            setErrorMsg(`Target must be between ${MIN_TARGET_ML.toLocaleString()} ml and ${MAX_TARGET_ML.toLocaleString()} ml.`);
            return;
        }
        setErrorMsg('');
        onTargetChange(parsed);
        setIsEditingTarget(false);
    };

    const handleResetToAutoTarget = () => {
        onTargetChange(autoCalculatedTarget);
        setTempTarget(autoCalculatedTarget.toString());
        setIsEditingTarget(false);
    };

    return (
        <>
            {/* Variant A: Clean Overview Summary Card (Today's Overview Grid) */}
            {variant === 'overview' && (
                <div
                    className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition duration-300 shadow-[0_4px_18px_rgba(30,35,30,0.05)] relative overflow-hidden group h-full"
                    style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, var(--m-water-soft), transparent 58%)' }}
                >
                    <div className="space-y-1 z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">
                            <Droplet size={12} style={{ color: 'var(--m-water-ink)' }} />
                            Water
                        </span>

                        <div className="text-2xl font-black tracking-tight text-[#171817] dark:text-[#F4F5F2]">
                            {currentMl.toLocaleString()}{' '}
                            <span className="text-xs font-semibold text-[#858982] dark:text-[#818982]">
                                / {safeTarget.toLocaleString()} ml
                            </span>
                        </div>

                        <span className="text-[10px] block text-[#858982] dark:text-[#818982] font-medium">
                            {remainingMl > 0 ? `Remaining: ${remainingMl.toLocaleString()} ml` : statusMessage}
                        </span>
                    </div>

                    <div className="h-1.5 w-full rounded-full mt-4 overflow-hidden" style={{ background: 'var(--m-water-soft)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressVisual}%`, background: 'var(--grad-water)' }}
                        />
                    </div>
                </div>
            )}

            {/* Variant B: the full hydration panel, to the supplied design. */}
            {variant === 'widget' && (
                <div className="hydration-card rounded-[26px] p-5 text-left">
                    {/* Header: disc, label, reading, edit target */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span
                                className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl shrink-0"
                                style={{ background: 'var(--surface-solid)', boxShadow: '0 4px 14px var(--m-water-glow)' }}
                            >
                                <Droplet size={26} style={{ color: 'var(--m-water)' }} className="fill-current" />
                            </span>
                            <div>
                                <span className="block text-[11px] font-black uppercase tracking-[0.08em]" style={{ color: 'var(--m-water-ink)' }}>
                                    Hydration Tracker
                                </span>
                                <div className="mt-0.5 flex items-baseline gap-1.5">
                                    <span className="text-[26px] font-black leading-none tracking-tight" style={{ color: 'var(--text)' }}>
                                        {currentMl.toLocaleString()}
                                    </span>
                                    <span className="text-[15px] font-semibold" style={{ color: 'var(--text-dim)' }}>
                                        / {safeTarget.toLocaleString()} ml
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleOpenEdit}
                            className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold transition hover:scale-[1.03] active:scale-95 shrink-0"
                            style={{
                                background: 'var(--surface-solid)',
                                color: 'var(--m-water-ink)',
                                border: '1px solid var(--m-water-edge)',
                            }}
                        >
                            <Edit3 size={13} />
                            Edit Target
                        </button>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--m-water-track)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressVisual}%`, background: 'var(--grad-water)' }}
                        />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[13px]">
                        <span className="font-bold" style={{ color: 'var(--text)' }}>Progress ({percentage}%)</span>
                        <span className="font-medium" style={{ color: 'var(--text-dim)' }}>
                            {remainingMl > 0 ? `${remainingMl.toLocaleString()} ml remaining` : statusMessage}
                        </span>
                    </div>

                    {/* Custom amount */}
                    <span className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-dim)' }}>
                        Log Custom Water Amount
                    </span>

                    <form onSubmit={handleAddCustomMl} className="mt-2 flex items-center gap-2.5">
                        <div className="relative flex-1">
                            <input
                                type="number"
                                min="1"
                                value={customMlInput}
                                onChange={(e) => setCustomMlInput(e.target.value)}
                                placeholder="Enter amount (e.g. 10, 330, 400)"
                                aria-label="Custom water amount in millilitres"
                                className="w-full rounded-xl py-2.5 pl-3.5 pr-10 text-[13px] outline-none transition"
                                style={{
                                    background: 'var(--surface-solid)',
                                    border: '1px solid var(--m-water-edge)',
                                    color: 'var(--text)',
                                }}
                            />
                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold" style={{ color: 'var(--text-faint)' }}>
                                ml
                            </span>
                        </div>
                        <button
                            type="submit"
                            className="rounded-xl px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-105 active:scale-95 shrink-0"
                            style={{ background: 'var(--grad-water)', boxShadow: '0 6px 16px var(--m-water-glow)' }}
                        >
                            + Add
                        </button>
                    </form>

                    {/* Quick amounts. The largest is the filled button, so there
                        is one obvious primary action in the row. */}
                    <div className="mt-2.5 grid grid-cols-4 gap-2">
                        {QUICK_ADD_ML.map((ml, i) => {
                            const primary = i === QUICK_ADD_ML.length - 1;
                            return (
                                <button
                                    key={ml}
                                    type="button"
                                    onClick={() => handleQuickAddMl(ml)}
                                    className="rounded-xl py-2.5 text-[12.5px] font-bold transition hover:scale-[1.03] active:scale-95"
                                    style={primary
                                        ? { background: 'var(--grad-water)', color: '#fff', boxShadow: '0 6px 16px var(--m-water-glow)' }
                                        : { background: 'var(--m-water-soft)', color: 'var(--m-water-ink)' }}
                                >
                                    +{ml} ml
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer: undo and the target reference */}
                    <div className="mt-3.5 flex items-center justify-between gap-3 text-[12px]">
                        <button
                            type="button"
                            onClick={() => handleUndoMl(250)}
                            disabled={currentMl <= 0}
                            className="flex items-center gap-1.5 font-bold transition disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-90"
                            style={{ color: 'var(--danger)' }}
                        >
                            <Minus size={13} />
                            Undo (&minus;250 ml)
                        </button>
                        <span className="font-medium" style={{ color: 'var(--text-dim)' }}>
                            Target: {safeTarget.toLocaleString()} ml (&asymp;{glassesEquivalent} glasses)
                        </span>
                    </div>

                    {successToast && (
                        <p className="mt-2.5 text-[11px] font-bold text-center rounded-xl py-1.5 animate-fade-in"
                            style={{ background: 'var(--m-water-soft)', color: 'var(--m-water-ink)' }}>
                            {successToast}
                        </p>
                    )}

                    {/* Target editor */}
                    {isEditingTarget && (
                        <form onSubmit={handleSaveTarget} className="mt-3 rounded-2xl p-3.5 animate-fade-in"
                            style={{ background: 'var(--surface-solid)', border: '1px solid var(--m-water-edge)' }}>
                            <label className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                Daily target (ml)
                            </label>
                            <input
                                type="number"
                                value={tempTarget}
                                onChange={(e) => setTempTarget(e.target.value)}
                                min={MIN_TARGET_ML}
                                max={MAX_TARGET_ML}
                                autoFocus
                                className="mt-1.5 w-full rounded-xl px-3 py-2 text-[13px] outline-none"
                                style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            />
                            {errorMsg && <p className="mt-1.5 text-[11px] font-bold" style={{ color: 'var(--danger)' }}>{errorMsg}</p>}
                            <div className="mt-2.5 flex gap-2">
                                <button type="button" onClick={handleResetToAutoTarget}
                                    className="flex-1 rounded-xl py-2 text-[12px] font-bold transition"
                                    style={{ background: 'var(--chip-bg)', color: 'var(--text-dim)' }}>
                                    Auto ({autoCalculatedTarget.toLocaleString()} ml)
                                </button>
                                <button type="button" onClick={() => setIsEditingTarget(false)}
                                    className="flex-1 rounded-xl py-2 text-[12px] font-bold transition"
                                    style={{ background: 'var(--chip-bg)', color: 'var(--text-dim)' }}>
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="flex-1 rounded-xl py-2 text-[12px] font-bold text-white transition"
                                    style={{ background: 'var(--grad-water)' }}>
                                    Save
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}
