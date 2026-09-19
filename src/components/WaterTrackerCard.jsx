/* ---------------- components/WaterTrackerCard.jsx ---------------- */
import { useState } from 'react';
import { Droplet, Plus, Minus, Edit3, Sparkles, Check } from 'lucide-react';
import { normalizeWaterMl } from '../lib/calculations.js';

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
                <div className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-2xl p-5 flex flex-col justify-between hover:-translate-y-1 transition duration-300 shadow-[0_4px_18px_rgba(30,35,30,0.05)] relative overflow-hidden group h-full">
                    <div className="space-y-1 z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">
                            <Droplet size={12} className="text-water" />
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

                    <div className="h-1.5 w-full bg-[#EAF4FA] dark:bg-[#1D252E] rounded-full mt-4 overflow-hidden">
                        <div
                            className="h-full bg-water rounded-full transition-all duration-500"
                            style={{ width: `${progressVisual}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Variant B: Embedded Full Hydration Tracker Card (Placed under Daily Motivation) */}
            {variant === 'widget' && (
                <div className="bg-white dark:bg-[#1C211E] rounded-3xl p-6 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm space-y-4 text-left">
                    {/* Header */}
                    <div className="flex justify-between items-center pb-3 border-b border-[#EEEEEA] dark:border-[#2C332E]">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                <Droplet size={18} />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500 block">
                                    Hydration Tracker
                                </span>
                                <h4 className="text-base font-extrabold text-[#171817] dark:text-[#F4F5F2] leading-none mt-0.5">
                                    {currentMl.toLocaleString()} <span className="text-xs font-semibold text-[#858982]">/ {safeTarget.toLocaleString()} ml</span>
                                </h4>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleOpenEdit}
                            aria-label="Edit daily water target"
                            className="p-2 rounded-xl text-[#858982] hover:text-blue-500 hover:bg-blue-500/10 transition flex items-center gap-1 text-[11px] font-bold"
                            title="Edit Water Target"
                        >
                            <Edit3 size={15} /> Edit Target
                        </button>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-[#555954] dark:text-[#B3BAB4]">
                            <span>Progress ({percentage}%)</span>
                            <span className="text-[#858982] font-medium">
                                {remainingMl > 0 ? `${remainingMl.toLocaleString()} ml remaining` : (
                                    <span className="text-emerald-500 font-bold flex items-center gap-1">
                                        <Sparkles size={12} /> Target Met!
                                    </span>
                                )}
                            </span>
                        </div>

                        <div className="h-2.5 w-full bg-[#EAF4FA] dark:bg-[#1D252E] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressVisual}%` }}
                            />
                        </div>

                        <p className="text-[10px] text-[#858982] font-medium pt-0.5">{statusMessage}</p>
                    </div>

                    {/* Inline Custom Exact mL Text Input Logger */}
                    <form onSubmit={handleAddCustomMl} className="space-y-2 pt-2 border-t border-[#EEEEEA] dark:border-[#2C332E]">
                        <label htmlFor="widget-water-input" className="text-[10px] font-bold uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4] block">
                            Log Custom Water Amount
                        </label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    id="widget-water-input"
                                    type="number"
                                    min="1"
                                    max="3000"
                                    step="1"
                                    value={customMlInput}
                                    onChange={(e) => setCustomMlInput(e.target.value)}
                                    placeholder="Enter amount (e.g. 10, 330, 400)"
                                    className="w-full py-2.5 px-3 pr-10 text-xs font-bold rounded-2xl bg-[#F7F7F3] dark:bg-[#222823] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] outline-none focus:border-blue-500"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#858982] font-semibold">
                                    ml
                                </span>
                            </div>
                            <button
                                type="submit"
                                disabled={!customMlInput || parseInt(customMlInput, 10) <= 0}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl text-xs font-bold transition shadow-sm"
                            >
                                + Add
                            </button>
                        </div>

                        {/* Toast Feedback */}
                        {successToast && (
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl text-center flex items-center justify-center gap-1 animate-fade-in">
                                <Check size={12} /> {successToast}
                            </div>
                        )}
                    </form>

                    {/* Quick Preset Buttons */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => handleQuickAddMl(150)}
                            className="py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition font-bold text-[10px]"
                        >
                            +150 ml
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickAddMl(250)}
                            className="py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition font-bold text-[10px]"
                        >
                            +250 ml
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickAddMl(330)}
                            className="py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition font-bold text-[10px]"
                        >
                            +330 ml
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickAddMl(500)}
                            className="py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition font-bold text-[10px] shadow-sm"
                        >
                            +500 ml
                        </button>
                    </div>

                    {/* Undo button */}
                    <div className="flex justify-between items-center pt-2 border-t border-[#EEEEEA] dark:border-[#2C332E]">
                        <button
                            type="button"
                            onClick={() => onWaterChange(-250)}
                            disabled={currentMl <= 0}
                            className="text-[10px] font-bold text-red-500 hover:underline disabled:opacity-40 transition flex items-center gap-1"
                        >
                            <Minus size={12} /> Undo (-250 ml)
                        </button>
                        <span className="text-[10px] text-[#858982]">Target: {safeTarget.toLocaleString()} ml (~{glassesEquivalent} glasses)</span>
                    </div>
                </div>
            )}

            {/* Target Editor Modal */}
            {isEditingTarget && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center animate-fade-in">
                    <div className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center">
                        <h4 className="text-sm font-bold text-[#171817] dark:text-[#F4F5F2] mb-1">Custom Daily Water Target</h4>
                        <p className="text-[10px] text-[#858982] mb-3">
                            Auto-calculated target for your body weight ({weight} kg) is{' '}
                            <strong className="text-blue-500">{autoCalculatedTarget.toLocaleString()} ml</strong>.
                        </p>

                        <form onSubmit={handleSaveTarget} className="space-y-3">
                            <div>
                                <label htmlFor="embedded-water-target-input" className="sr-only">
                                    Daily Water Target in milliliters
                                </label>
                                <div className="relative">
                                    <input
                                        id="embedded-water-target-input"
                                        type="number"
                                        min={MIN_TARGET_ML}
                                        max={MAX_TARGET_ML}
                                        step={50}
                                        value={tempTarget}
                                        onChange={(e) => setTempTarget(e.target.value)}
                                        className="w-full text-center py-2.5 px-3 text-sm font-bold rounded-2xl bg-[#F7F7F3] dark:bg-[#222823] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] outline-none focus:border-blue-500"
                                        placeholder="2500"
                                        autoFocus
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#858982] font-semibold">
                                        ml
                                    </span>
                                </div>
                                {errorMsg && (
                                    <p className="text-[10px] text-red-500 font-medium mt-1.5">{errorMsg}</p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleResetToAutoTarget}
                                className="text-[10px] font-bold text-blue-500 hover:underline block mx-auto"
                            >
                                Reset to Auto Target ({autoCalculatedTarget} ml)
                            </button>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditingTarget(false)}
                                    className="flex-1 py-2 text-xs font-bold text-[#858982] hover:bg-[#F7F7F3] dark:hover:bg-[#222823] rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow"
                                >
                                    Save Goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
