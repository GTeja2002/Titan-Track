/* ---------------- components/UserDirectoryModal.jsx ---------------- */
import { useState, useMemo } from 'react';
import { Users, Search, Download, X, Calendar, Clock, ShieldCheck, UserCheck, Activity, RefreshCw } from 'lucide-react';
import { getRegisteredUsers, getLoginHistory, exportUserLogsCSV } from '../lib/userLogger.js';

export function UserDirectoryModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'history'
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const registeredUsers = useMemo(() => {
        return Object.values(getRegisteredUsers());
    }, [isOpen, refreshKey]);

    const loginHistory = useMemo(() => {
        return getLoginHistory();
    }, [isOpen, refreshKey]);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return registeredUsers;
        return registeredUsers.filter(
            (u) => (u.email && u.email.toLowerCase().includes(term)) || (u.name && u.name.toLowerCase().includes(term))
        );
    }, [registeredUsers, searchTerm]);

    const filteredHistory = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return loginHistory;
        return loginHistory.filter(
            (h) => (h.email && h.email.toLowerCase().includes(term)) || (h.name && h.name.toLowerCase().includes(term))
        );
    }, [loginHistory, searchTerm]);

    const handleExportCSV = () => {
        const csvContent = exportUserLogsCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `titantrack_user_audit_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-[#EEEEEA] dark:border-[#2C332E] flex items-center justify-between bg-[#FAF9F5] dark:bg-[#161B18]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary-soft flex items-center justify-center text-primary">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-[#171817] dark:text-[#F4F5F2] flex items-center gap-2">
                                User Directory & Audit Logs
                            </h2>
                            <p className="text-xs text-[#858982] dark:text-[#818982]">
                                Registered users and login activity history
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setRefreshKey((k) => k + 1)}
                            className="p-2 rounded-xl border border-[#E7E6E0] dark:border-[#2C332E] hover:bg-black/5 dark:hover:bg-white/5 text-[#555954] dark:text-[#B3BAB4] transition"
                            title="Refresh"
                        >
                            <RefreshCw size={16} />
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary/90 transition"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-[#858982] hover:text-[#171817] dark:hover:text-[#F4F5F2] hover:bg-black/5 dark:hover:bg-white/5 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tab & Search Bar */}
                <div className="p-4 border-b border-[#EEEEEA] dark:border-[#2C332E] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#1C211E]">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('directory')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'directory'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-[#F7F7F3] dark:bg-[#222823] text-[#555954] dark:text-[#B3BAB4] hover:bg-[#EEEEEA]'
                                }`}
                        >
                            <UserCheck size={14} /> Registered Users ({registeredUsers.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === 'history'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-[#F7F7F3] dark:bg-[#222823] text-[#555954] dark:text-[#B3BAB4] hover:bg-[#EEEEEA]'
                                }`}
                        >
                            <Clock size={14} /> Login History ({loginHistory.length})
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858982]" />
                        <input
                            type="text"
                            placeholder="Search user or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[#F7F7F3] dark:bg-[#222823] border border-[#E7E6E0] dark:border-[#2C332E] text-[#171817] dark:text-[#F4F5F2] outline-none focus:border-primary"
                        />
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {activeTab === 'directory' ? (
                        filteredUsers.length === 0 ? (
                            <div className="py-12 text-center text-xs text-[#858982]">No registered users found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-[#EEEEEA] dark:border-[#2C332E] text-[10px] uppercase font-bold text-[#858982] tracking-wider">
                                            <th className="pb-3 px-2">User / Name</th>
                                            <th className="pb-3 px-2">Email</th>
                                            <th className="pb-3 px-2">First Login</th>
                                            <th className="pb-3 px-2">Last Login</th>
                                            <th className="pb-3 px-2 text-center">Logins</th>
                                            <th className="pb-3 px-2 text-center">Onboarded</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#EEEEEA] dark:divide-[#2C332E]">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.email} className="hover:bg-[#F7F7F3] dark:hover:bg-[#222823]/50 transition">
                                                <td className="py-3 px-2 font-bold text-[#171817] dark:text-[#F4F5F2]">
                                                    {user.name || 'User'}
                                                </td>
                                                <td className="py-3 px-2 text-[#555954] dark:text-[#B3BAB4]">{user.email}</td>
                                                <td className="py-3 px-2 text-[#858982] text-[11px]">
                                                    {user.firstSeen ? new Date(user.firstSeen).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                                </td>
                                                <td className="py-3 px-2 text-[#858982] text-[11px]">
                                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                                </td>
                                                <td className="py-3 px-2 text-center font-extrabold text-primary">
                                                    {user.loginCount || 1}
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${user.isOnboarded
                                                                ? 'bg-success-soft text-success'
                                                                : 'bg-amber-500/10 text-amber-500'
                                                            }`}
                                                    >
                                                        {user.isOnboarded ? 'Complete' : 'Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        filteredHistory.length === 0 ? (
                            <div className="py-12 text-center text-xs text-[#858982]">No login history recorded.</div>
                        ) : (
                            <div className="space-y-3">
                                {filteredHistory.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3 rounded-2xl bg-[#F7F7F3] dark:bg-[#222823] border border-[#E7E6E0] dark:border-[#2C332E] flex items-center justify-between text-xs"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${item.type === 'SIGNUP' ? 'bg-primary-soft text-primary' : 'bg-success-soft text-success'
                                                    }`}
                                            >
                                                {item.type === 'SIGNUP' ? 'NEW' : 'LOG'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#171817] dark:text-[#F4F5F2] flex items-center gap-2">
                                                    {item.name} <span className="text-[10px] text-[#858982] font-normal">({item.email})</span>
                                                </div>
                                                <div className="text-[10px] text-[#858982] mt-0.5">
                                                    {new Date(item.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-[#1C211E] border border-[#E7E6E0] dark:border-[#2C332E] text-[#555954] dark:text-[#B3BAB4]">
                                            {item.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
