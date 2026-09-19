/* ---------------- lib/userLogger.js ----------------
 * User Registration & Login Logging Utility
 * Stores registered users & login history in localStorage with
 * optional Supabase cloud sync.
 */

import { pushStateToSupabase } from './supabaseClient.js';

const REGISTERED_USERS_KEY = 'titan_registered_users';
const LOGIN_HISTORY_KEY = 'titan_user_login_history';

/**
 * Returns object map of registered users keyed by lowercased email.
 */
export function getRegisteredUsers() {
    try {
        const raw = localStorage.getItem(REGISTERED_USERS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.error('Failed to load registered users:', err);
        return {};
    }
}

/**
 * Returns array of login event logs (newest first).
 */
export function getLoginHistory() {
    try {
        const raw = localStorage.getItem(LOGIN_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error('Failed to load login history:', err);
        return [];
    }
}

/**
 * Records a user login/signup event and updates master user directory.
 * @param {string} email User email address
 * @param {object} profileDetails Optional profile attributes (name, age, weight, etc.)
 */
export function recordUserLogin(email, profileDetails = {}) {
    if (!email || typeof email !== 'string') return;
    const lowerEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    // 1. Update Registered Users Map
    const users = getRegisteredUsers();
    const existing = users[lowerEmail] || null;

    const updatedUser = {
        email: lowerEmail,
        name: profileDetails.name || (existing ? existing.name : lowerEmail.split('@')[0]),
        firstSeen: existing ? existing.firstSeen : now,
        lastLogin: now,
        loginCount: (existing ? existing.loginCount || 0 : 0) + 1,
        isOnboarded: profileDetails.isOnboarded ?? (existing ? existing.isOnboarded : false),
        age: profileDetails.age ?? existing?.age ?? null,
        gender: profileDetails.gender ?? existing?.gender ?? null,
        height: profileDetails.height ?? existing?.height ?? null,
        weight: profileDetails.weight ?? existing?.weight ?? null,
        startWeight: profileDetails.startWeight ?? existing?.startWeight ?? null,
        goalWeight: profileDetails.goalWeight ?? existing?.goalWeight ?? null,
    };

    users[lowerEmail] = updatedUser;

    try {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    } catch (err) {
        console.error('Failed to save registered users:', err);
    }

    // 2. Append to Login Audit History Log (capped at 500 events)
    const history = getLoginHistory();
    const isNewUser = !existing;

    const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: lowerEmail,
        name: updatedUser.name,
        timestamp: now,
        type: isNewUser ? 'SIGNUP' : 'LOGIN',
        isOnboarded: updatedUser.isOnboarded,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    };

    history.unshift(logEntry);
    const cappedHistory = history.slice(0, 500);

    try {
        localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(cappedHistory));
    } catch (err) {
        console.error('Failed to save login history:', err);
    }

    // 3. Attempt Cloud Sync to Supabase under global registry key
    pushStateToSupabase('titan_global_user_directory', { users, lastUpdated: now });

    return updatedUser;
}

/**
 * Updates metadata for an already registered user (e.g. after onboarding or profile edit).
 */
export function updateUserDirectoryRecord(email, profileDetails = {}) {
    if (!email) return;
    const lowerEmail = email.trim().toLowerCase();
    const users = getRegisteredUsers();

    if (users[lowerEmail]) {
        users[lowerEmail] = {
            ...users[lowerEmail],
            ...profileDetails,
            updatedAt: new Date().toISOString()
        };
        try {
            localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
            pushStateToSupabase('titan_global_user_directory', { users, lastUpdated: new Date().toISOString() });
        } catch (err) {
            console.error('Failed to update user directory record:', err);
        }
    }
}

/**
 * Export user directory logs as CSV string.
 */
export function exportUserLogsCSV() {
    const users = getRegisteredUsers();
    const userList = Object.values(users);

    if (userList.length === 0) return 'Email,Name,First Seen,Last Login,Login Count,Onboarded\n';

    const headers = ['Email', 'Name', 'First Seen', 'Last Login', 'Login Count', 'Onboarded'];
    const rows = userList.map(u => [
        `"${u.email}"`,
        `"${u.name || ''}"`,
        `"${u.firstSeen || ''}"`,
        `"${u.lastLogin || ''}"`,
        u.loginCount || 1,
        u.isOnboarded ? 'Yes' : 'No'
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
