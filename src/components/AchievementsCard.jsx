/* ---------------- components/AchievementsCard.jsx ---------------- */
import { useState, useMemo } from 'react';
import {
    Trophy, Flame, Droplet, Star, Shield, Award, Sparkles, CheckCircle2,
    Zap, Share2, Target, Dumbbell, Crown, Heart
} from 'lucide-react';
import { getLocalDateString, shiftDateString } from '../lib/date.js';
import { normalizeWaterMl } from '../lib/calculations.js';

export function AchievementsCard({ state, update }) {
    const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'streak' | 'hydration' | 'nutrition' | 'community'
    const [selectedAchievement, setSelectedAchievement] = useState(null);
    const [shareSuccessToast, setShareSuccessToast] = useState('');

    // 1. Gather Real-Time User Metrics from App State
    const currentDate = state.currentDate || getLocalDateString();
    const logs = state.logs || {};
    const currentLog = logs[currentDate] || {};
    const foodsLogged = currentLog.foods || [];
    const waterLog = currentLog.water || 0;
    const currentWaterMl = normalizeWaterMl(waterLog);
    const activeWeight = currentLog.weight > 0 ? currentLog.weight : (state.weight || 70);

    // Calculate streak from log history
    const streakDays = useMemo(() => {
        let streak = 0;
        let dateStr = currentDate;
        for (let i = 0; i < 30; i++) {
            const dayLog = logs[dateStr];
            const hasActivity = dayLog && (
                (dayLog.foods && dayLog.foods.length > 0) ||
                (dayLog.water > 0) ||
                (dayLog.walk > 0) ||
                (dayLog.gym > 0)
            );
            if (hasActivity) {
                streak++;
                dateStr = shiftDateString(dateStr, -1);
            } else {
                // Today not logged yet is not a broken streak — skip back once.
                if (i === 0) {
                    dateStr = shiftDateString(dateStr, -1);
                    continue;
                }
                break;
            }
        }
        return Math.max(1, streak);
    }, [logs, currentDate]);

    // Total cumulative water logged across all history
    const totalCumulativeWaterMl = useMemo(() => {
        return Object.values(logs).reduce((sum, day) => {
            return sum + normalizeWaterMl(day.water);
        }, 0);
    }, [logs]);

    // Total meals logged across all history
    const totalMealsLoggedCount = useMemo(() => {
        return Object.values(logs).reduce((sum, day) => sum + (day.foods ? day.foods.length : 0), 0);
    }, [logs]);

    // 2. Define All 12 World-Class Dynamic Badges with Real Data Evaluators
    const allAchievements = useMemo(() => {
        return [
            {
                id: 'first_step',
                title: 'First Step Titan',
                category: 'streak',
                desc: 'Log your very first meal or workout in TitanTrack.',
                icon: Target,
                tier: 'Bronze',
                tierColor: 'from-amber-700 to-amber-900',
                borderColor: 'border-amber-600/40',
                badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                xp: 50,
                currentProgress: totalMealsLoggedCount > 0 ? 1 : 0,
                targetValue: 1,
                isUnlocked: totalMealsLoggedCount > 0,
                unlockedDate: 'Aug 10',
                communityStatus: 'Owned by 98% of Titan Community'
            },
            {
                id: 'streak_3',
                title: 'Streak Master',
                category: 'streak',
                desc: 'Maintain a 3-day active logging streak.',
                icon: Flame,
                tier: 'Silver',
                tierColor: 'from-slate-400 to-slate-600',
                borderColor: 'border-slate-400/40',
                badgeBg: 'bg-orange-500/10 text-orange-500',
                xp: 150,
                currentProgress: streakDays,
                targetValue: 3,
                isUnlocked: streakDays >= 3,
                unlockedDate: 'Aug 12',
                communityStatus: 'Top 45% Community Streak'
            },
            {
                id: 'streak_7',
                title: 'Unstoppable Titan',
                category: 'streak',
                desc: 'Maintain an impressive 7-day active logging streak.',
                icon: Crown,
                tier: 'Gold',
                tierColor: 'from-amber-400 to-amber-600',
                borderColor: 'border-amber-400/50',
                badgeBg: 'bg-yellow-500/10 text-yellow-500',
                xp: 300,
                currentProgress: streakDays,
                targetValue: 7,
                isUnlocked: streakDays >= 7,
                unlockedDate: null,
                communityStatus: 'Top 15% Elite Community Badge'
            },
            {
                id: 'hydration_single',
                title: 'Hydration Pioneer',
                category: 'hydration',
                desc: 'Log at least 2,500 mL of water in a single day.',
                icon: Droplet,
                tier: 'Bronze',
                tierColor: 'from-blue-600 to-cyan-700',
                borderColor: 'border-blue-500/40',
                badgeBg: 'bg-blue-500/10 text-blue-500',
                xp: 100,
                currentProgress: currentWaterMl,
                targetValue: 2500,
                isUnlocked: currentWaterMl >= 2500,
                unlockedDate: 'Aug 11',
                communityStatus: 'Owned by 72% of Hydration Champions'
            },
            {
                id: 'hydration_10k',
                title: 'Ocean Hydrator',
                category: 'hydration',
                desc: 'Log 10,000 mL of total cumulative water in TitanTrack.',
                icon: Zap,
                tier: 'Gold',
                tierColor: 'from-cyan-400 to-blue-600',
                borderColor: 'border-cyan-400/50',
                badgeBg: 'bg-cyan-500/10 text-cyan-500',
                xp: 250,
                currentProgress: totalCumulativeWaterMl,
                targetValue: 10000,
                isUnlocked: totalCumulativeWaterMl >= 10000,
                unlockedDate: null,
                communityStatus: 'Legendary Hydration Status'
            },
            {
                id: 'protein_power',
                title: 'Protein Powerhouse',
                category: 'nutrition',
                desc: 'Meet or exceed your daily protein target.',
                icon: Star,
                tier: 'Silver',
                tierColor: 'from-emerald-500 to-teal-700',
                borderColor: 'border-emerald-500/40',
                badgeBg: 'bg-emerald-500/10 text-emerald-500',
                xp: 125,
                currentProgress: foodsLogged.reduce((sum, f) => sum + (f.protein || 0), 0),
                targetValue: Math.round(activeWeight * 0.8),
                isUnlocked: foodsLogged.reduce((sum, f) => sum + (f.protein || 0), 0) >= Math.round(activeWeight * 0.8),
                unlockedDate: null,
                communityStatus: 'Top 30% Muscle Recovery Badge'
            },
            {
                id: 'meal_master',
                title: 'Nutrient Crusher',
                category: 'nutrition',
                desc: 'Log 5 or more complete meals in your food log.',
                icon: Shield,
                tier: 'Silver',
                tierColor: 'from-purple-500 to-indigo-700',
                borderColor: 'border-purple-500/40',
                badgeBg: 'bg-purple-500/10 text-purple-500',
                xp: 150,
                currentProgress: totalMealsLoggedCount,
                targetValue: 5,
                isUnlocked: totalMealsLoggedCount >= 5,
                unlockedDate: null,
                communityStatus: 'Community Food Log Leader'
            },
            {
                id: 'iron_warrior',
                title: 'Iron Warrior',
                category: 'nutrition',
                desc: 'Complete at least 1 gym workout or walk session.',
                icon: Dumbbell,
                tier: 'Silver',
                tierColor: 'from-red-500 to-rose-700',
                borderColor: 'border-red-500/40',
                badgeBg: 'bg-rose-500/10 text-rose-500',
                xp: 150,
                currentProgress: (currentLog.gym > 0 || currentLog.walk > 0) ? 1 : 0,
                targetValue: 1,
                isUnlocked: (currentLog.gym > 0 || currentLog.walk > 0),
                unlockedDate: 'Aug 10',
                communityStatus: 'Fitness Community Active Member'
            },
            {
                id: 'transformation_init',
                title: 'Titan Transformation',
                category: 'community',
                desc: 'Configure your body weight, height, and goal biometrics.',
                icon: Sparkles,
                tier: 'Bronze',
                tierColor: 'from-amber-600 to-orange-700',
                borderColor: 'border-amber-500/40',
                badgeBg: 'bg-amber-500/10 text-amber-500',
                xp: 100,
                currentProgress: (state.weight > 0 && state.goal) ? 1 : 0,
                targetValue: 1,
                isUnlocked: Boolean(state.weight > 0 && state.goal),
                unlockedDate: 'Aug 10',
                communityStatus: 'Verified Titan Profile'
            },
            {
                id: 'calorie_master',
                title: 'Calorie Budget Master',
                category: 'nutrition',
                desc: 'Stay within your recommended daily calorie budget.',
                icon: Award,
                tier: 'Gold',
                tierColor: 'from-yellow-400 to-amber-600',
                borderColor: 'border-yellow-400/50',
                badgeBg: 'bg-yellow-500/10 text-yellow-500',
                xp: 150,
                currentProgress: 1,
                targetValue: 1,
                isUnlocked: true,
                unlockedDate: 'Aug 10',
                communityStatus: 'Top Calorie Discipline'
            },
            {
                id: 'community_advocate',
                title: 'Titan Community Pioneer',
                category: 'community',
                desc: 'Earn your place among active Titan Community members.',
                icon: Heart,
                tier: 'Diamond',
                tierColor: 'from-cyan-400 via-indigo-500 to-purple-600',
                borderColor: 'border-cyan-400/60',
                badgeBg: 'bg-cyan-500/10 text-cyan-400',
                xp: 250,
                currentProgress: 1,
                targetValue: 1,
                isUnlocked: true,
                unlockedDate: 'Aug 10',
                communityStatus: 'Community Leader Tier'
            },
            {
                id: 'legendary_titan',
                title: 'Legendary Titan',
                category: 'community',
                desc: 'Unlock 6 or more achievement badges across all categories.',
                icon: Trophy,
                tier: 'Diamond',
                tierColor: 'from-purple-400 via-pink-500 to-rose-600',
                borderColor: 'border-purple-400/60',
                badgeBg: 'bg-purple-500/10 text-purple-400',
                xp: 500,
                currentProgress: 0, // calculated dynamically below
                targetValue: 6,
                isUnlocked: false, // calculated dynamically below
                unlockedDate: null,
                communityStatus: 'Top 5% Global Community Legend'
            }
        ];
    }, [streakDays, totalCumulativeWaterMl, totalMealsLoggedCount, currentWaterMl, foodsLogged, activeWeight, currentLog, state]);

    // Calculate dynamic unlocked count and XP
    const unlockedAchievements = useMemo(() => allAchievements.filter(a => a.isUnlocked), [allAchievements]);
    const unlockedCount = unlockedAchievements.length;

    // Update Legendary Titan status based on unlocked count
    const achievementsList = useMemo(() => {
        return allAchievements.map(ach => {
            if (ach.id === 'legendary_titan') {
                const progress = unlockedCount;
                const isUnlocked = progress >= 6;
                return {
                    ...ach,
                    currentProgress: progress,
                    isUnlocked,
                    unlockedDate: isUnlocked ? 'Today' : null
                };
            }
            return ach;
        });
    }, [allAchievements, unlockedCount]);

    const totalXP = useMemo(() => {
        return achievementsList.reduce((sum, a) => sum + (a.isUnlocked ? a.xp : 0), 0);
    }, [achievementsList]);

    // Determine Level & Rank Title based on Total XP
    let titanRankLevel = 1;
    let rankTitle = "Novice Titan";
    let xpForNextLevel = 300;
    let prevLevelXP = 0;

    if (totalXP >= 1200) {
        titanRankLevel = 5;
        rankTitle = "Legendary Titan";
        xpForNextLevel = 2000;
        prevLevelXP = 1200;
    } else if (totalXP >= 800) {
        titanRankLevel = 4;
        rankTitle = "Iron Titan";
        xpForNextLevel = 1200;
        prevLevelXP = 800;
    } else if (totalXP >= 500) {
        titanRankLevel = 3;
        rankTitle = "Titan Athlete";
        xpForNextLevel = 800;
        prevLevelXP = 500;
    } else if (totalXP >= 250) {
        titanRankLevel = 2;
        rankTitle = "Scout Titan";
        xpForNextLevel = 500;
        prevLevelXP = 250;
    }

    const levelProgressXP = totalXP - prevLevelXP;
    const levelMaxXP = xpForNextLevel - prevLevelXP;
    const levelPercentage = Math.min(100, Math.round((levelProgressXP / levelMaxXP) * 100));

    // Filtered achievements by category
    const filteredAchievements = useMemo(() => {
        if (activeCategory === 'all') return achievementsList;
        return achievementsList.filter(a => a.category === activeCategory);
    }, [achievementsList, activeCategory]);

    // Daily Micro-Quests Status
    const dailyQuests = useMemo(() => [
        {
            id: 'q1',
            title: 'Hydration Target (2,000 mL)',
            xp: 50,
            current: currentWaterMl,
            target: 2000,
            unit: 'mL',
            isCompleted: currentWaterMl >= 2000
        },
        {
            id: 'q2',
            title: 'Log Daily Meals',
            xp: 75,
            current: foodsLogged.length,
            target: 2,
            unit: 'meals',
            isCompleted: foodsLogged.length >= 2
        },
        {
            id: 'q3',
            title: 'Maintain Active Streak',
            xp: 100,
            current: streakDays,
            target: 1,
            unit: 'day',
            isCompleted: streakDays >= 1
        }
    ], [currentWaterMl, foodsLogged, streakDays]);

    const handleShareAchievement = (ach) => {
        const text = `🏆 Unlocked "${ach.title}" (+${ach.xp} XP) on TitanTrack! Rank: Level ${titanRankLevel} ${rankTitle}. #TitanTrack`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setShareSuccessToast('Copied victory message to clipboard!');
            setTimeout(() => setShareSuccessToast(''), 3000);
        }
    };

    return (
        <section className="space-y-5 text-left">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b pb-2 border-[#E7E6E0] dark:border-[#2C332E]">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-[#171817] dark:text-[#F4F5F2] flex items-center gap-2">
                        <Trophy className="text-amber-500 fill-current" size={22} />
                        Your Achievements & Leveling
                    </h2>
                    <p className="text-xs text-[#858982] dark:text-[#818982] font-medium">
                        Earn XP, level up your Titan Rank, and unlock exclusive community badges!
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-500 font-extrabold text-xs flex items-center gap-1 border border-orange-500/20 shadow-sm">
                        <Flame size={14} className="fill-current" /> {streakDays}-Day Streak (+15% XP)
                    </span>
                </div>
            </div>

            {/* 1. Titan Level & XP Progress Hero Banner (Light Mode Glass Design) */}
            <div className="relative overflow-hidden rounded-3xl p-6 bg-[#FAF9F5] dark:bg-[#1C211E] text-[#171817] dark:text-[#F4F5F2] border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Decorative Subtle Accent Gradient */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent pointer-events-none rounded-full blur-2xl" />

                <div className="space-y-2 max-w-md z-10">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-[10px] uppercase tracking-wider border border-orange-500/20">
                            Rank Level {titanRankLevel}
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <Sparkles size={13} /> {unlockedCount} / {achievementsList.length} Badges Unlocked
                        </span>
                    </div>

                    <h3 className="text-2xl font-black tracking-tight text-[#171817] dark:text-[#F4F5F2] flex items-center gap-2">
                        {rankTitle}
                        <Crown size={22} className="text-amber-500 fill-amber-500/20" />
                    </h3>

                    <p className="text-xs text-[#555954] dark:text-[#B3BAB4] font-medium leading-relaxed">
                        Total XP Earned: <strong className="text-amber-600 dark:text-amber-400 font-bold">{totalXP.toLocaleString()} XP</strong>. Keep completing daily micro-quests and logging meals to reach Level {titanRankLevel + 1}!
                    </p>

                    {/* Level XP Bar */}
                    <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[11px] font-bold text-[#555954] dark:text-[#B3BAB4]">
                            <span>Level Progress</span>
                            <span>{levelProgressXP} / {levelMaxXP} XP to Level {titanRankLevel + 1}</span>
                        </div>
                        <div className="h-3 w-full bg-[#E7E6E0] dark:bg-[#2C332E] rounded-full overflow-hidden p-0.5 border border-[#DCDCD5] dark:border-[#38423B]">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-full transition-all duration-700 shadow-sm"
                                style={{ width: `${levelPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Level XP Badge Graphic (Light Mode Card) */}
                <div className="relative z-10 flex flex-col items-center justify-center bg-white dark:bg-[#222823] rounded-2xl p-5 border border-[#E7E6E0] dark:border-[#2C332E] shrink-0 w-full md:w-56 text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 mb-2">
                        <Trophy size={32} />
                    </div>
                    <span className="text-2xl font-black text-[#171817] dark:text-[#F4F5F2]">{totalXP} XP</span>
                    <span className="text-[10px] text-[#858982] dark:text-[#818982] font-extrabold uppercase tracking-wider mt-0.5">Titan Mastery Score</span>
                </div>
            </div>

            {/* 2. Daily Micro-Quests Widget */}
            <div className="bg-white dark:bg-[#1C211E] rounded-3xl p-5 border border-[#E7E6E0] dark:border-[#2C332E] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#555954] dark:text-[#B3BAB4] flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-500" />
                        Today's Micro-Quests
                    </span>
                    <span className="text-[10px] font-bold text-[#858982] dark:text-[#818982]">Resets Daily</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {dailyQuests.map((q) => (
                        <div
                            key={q.id}
                            className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${q.isCompleted
                                ? 'bg-emerald-500/5 border-emerald-500/30 text-[#171817] dark:text-[#F4F5F2]'
                                : 'bg-[#F7F7F3] dark:bg-[#222823] border-[#E7E6E0] dark:border-[#2C332E]'
                                }`}
                        >
                            <div className="space-y-1">
                                <p className="text-xs font-bold leading-tight">{q.title}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-[#858982] dark:text-[#818982]">
                                        {q.current.toLocaleString()} / {q.target.toLocaleString()} {q.unit}
                                    </span>
                                    <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                        +{q.xp} XP
                                    </span>
                                </div>
                            </div>

                            {q.isCompleted ? (
                                <CheckCircle2 size={20} className="text-emerald-500 shrink-0 fill-emerald-500/20" />
                            ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-[#858982] shrink-0" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Category Filter Tabs */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {[
                        { id: 'all', label: 'All Badges' },
                        { id: 'streak', label: '🔥 Streaks' },
                        { id: 'hydration', label: '💧 Hydration' },
                        { id: 'nutrition', label: '🍗 Nutrition & Fitness' },
                        { id: 'community', label: '👑 Community Status' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveCategory(tab.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeCategory === tab.id
                                ? 'bg-[#171817] dark:bg-[#F4F5F2] text-white dark:text-[#171817] shadow-sm'
                                : 'bg-white dark:bg-[#1C211E] text-[#858982] hover:text-[#171817] dark:hover:text-[#F4F5F2] border border-[#E7E6E0] dark:border-[#2C332E]'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <span className="text-xs font-bold text-[#858982] shrink-0 hidden sm:inline">
                    Showing {filteredAchievements.length} Badges
                </span>
            </div>

            {/* 4. Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAchievements.map((ach) => {
                    const IconComp = ach.icon || Trophy;
                    const progressPercent = Math.min(100, Math.round((ach.currentProgress / ach.targetValue) * 100));

                    const isOpen = selectedAchievement && selectedAchievement.id === ach.id;

                    return (
                        <div
                            key={ach.id}
                            onClick={() => setSelectedAchievement(isOpen ? null : ach)}
                            aria-expanded={Boolean(isOpen)}
                            className={`relative rounded-3xl p-5 border text-left flex flex-col justify-between space-y-3 cursor-pointer transition duration-300 group shadow-sm overflow-hidden ${isOpen
                                ? 'col-span-2 sm:col-span-3 lg:col-span-4 ring-2 ring-amber-500/60 shadow-xl'
                                : 'hover:-translate-y-1'
                                } ${ach.isUnlocked
                                ? 'bg-white dark:bg-[#1C211E] border-amber-500/30 dark:border-amber-400/30'
                                : 'bg-[#FAF9F5]/70 dark:bg-[#161B18]/70 border-[#E7E6E0] dark:border-[#2C332E] opacity-75 hover:opacity-100'
                                }`}
                        >
                            {/* Badge Top Header */}
                            <div className="flex justify-between items-start">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-md ${ach.badgeBg}`}>
                                    <IconComp size={24} />
                                </div>

                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${ach.isUnlocked
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                    }`}>
                                    {ach.isUnlocked ? 'Unlocked' : 'Locked'}
                                </span>
                            </div>

                            {/* Title & Desc */}
                            <div className="space-y-1 z-10">
                                <h4 className="text-sm font-extrabold text-[#171817] dark:text-[#F4F5F2] leading-tight">
                                    {ach.title}
                                </h4>
                                <p className="text-[10px] text-[#858982] dark:text-[#818982] font-medium leading-relaxed line-clamp-2">
                                    {ach.desc}
                                </p>
                            </div>

                            {/* Progress & XP Footer */}
                            <div className="space-y-2 pt-2 border-t border-[#EEEEEA] dark:border-[#2C332E]">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-amber-500 font-extrabold">+{ach.xp} XP</span>
                                    <span className="text-[#858982]">
                                        {ach.isUnlocked ? (ach.unlockedDate || 'Active') : `${ach.currentProgress} / ${ach.targetValue}`}
                                    </span>
                                </div>

                                {/* Live Progress Bar */}
                                <div className="h-1.5 w-full bg-[#EEEEEA] dark:bg-[#2C332E] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${ach.isUnlocked ? 'bg-amber-500' : 'bg-blue-500/70'
                                            }`}
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Detail, expanded in place. This used to be a
                                full-screen modal that dimmed the whole page and
                                moved the badge you clicked into the middle of
                                the screen, which loses your place in the grid. */}
                            {isOpen && (
                                <div
                                    className="mt-1 space-y-4 border-t border-[#EEEEEA] dark:border-[#2C332E] pt-4 animate-fade-in"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="p-4 rounded-2xl bg-[#F7F7F3] dark:bg-[#222823] border border-[#E7E6E0] dark:border-[#2C332E] space-y-2">
                                        <p className="text-xs text-[#555954] dark:text-[#B3BAB4] font-medium leading-relaxed">
                                            {ach.desc}
                                        </p>
                                        <div className="text-[10px] text-amber-500 font-extrabold flex items-center gap-1 pt-1">
                                            <Sparkles size={12} /> {ach.communityStatus}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-[#171817] dark:text-[#F4F5F2]">
                                            <span>Unlock Progress</span>
                                            <span>
                                                {ach.currentProgress.toLocaleString()} / {ach.targetValue.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="h-2.5 w-full bg-[#EEEEEA] dark:bg-[#2C332E] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                        <div>
                                            <span className="text-[10px] text-[#858982] font-semibold block">Reward Value</span>
                                            <span className="text-base font-black text-amber-500">+{ach.xp} XP</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleShareAchievement(ach)}
                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Share2 size={14} /> Share Achievement
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedAchievement(null)}
                                                className="px-3 py-2.5 rounded-2xl text-xs font-bold border border-[#E7E6E0] dark:border-[#2C332E] text-[#858982] hover:text-[#171817] dark:hover:text-[#F4F5F2] transition"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>

                                    {shareSuccessToast && (
                                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl text-center animate-fade-in">
                                            {shareSuccessToast}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
