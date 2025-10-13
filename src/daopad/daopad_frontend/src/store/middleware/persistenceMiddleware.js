/**
 * Redux persistence middleware
 * Automatically saves whitelisted state to localStorage
 * Provides state rehydration on app initialization
 */

const STORAGE_KEY = 'daopad_state';
const STORAGE_VERSION = 1; // Increment to invalidate old cache

// Whitelist of state slices to persist
const PERSIST_WHITELIST = ['auth', 'dao', 'preferences'];

// Blacklist of action types that shouldn't trigger persistence
const ACTION_BLACKLIST = [
    '@@INIT',
    '@@redux/INIT',
    'persist/PERSIST',
    'persist/REHYDRATE'
];

/**
 * Debounce function for throttling saves
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Check if action should trigger persistence
 */
function shouldPersist(action) {
    // Don't persist on blacklisted actions
    if (ACTION_BLACKLIST.some(prefix => action.type.startsWith(prefix))) {
        return false;
    }

    // Persist on fulfilled async actions and state updates
    return action.type.endsWith('/fulfilled') ||
           action.type.includes('update') ||
           action.type.includes('set') ||
           action.type.includes('add') ||
           action.type.includes('remove');
}

/**
 * Serialize state for storage
 */
function serializeState(state) {
    const persistedState = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        data: {}
    };

    PERSIST_WHITELIST.forEach(key => {
        if (state[key]) {
            persistedState.data[key] = state[key];
        }
    });

    return JSON.stringify(persistedState);
}

/**
 * Save state to localStorage
 */
const saveState = debounce((state) => {
    try {
        const serialized = serializeState(state);
        localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
        console.warn('[Persistence] Failed to save state:', error);
        // Handle quota exceeded error
        if (error.name === 'QuotaExceededError') {
            console.warn('[Persistence] Storage quota exceeded, clearing old data');
            localStorage.removeItem(STORAGE_KEY);
        }
    }
}, 1000); // Debounce saves by 1 second

/**
 * Persistence middleware
 */
export const persistenceMiddleware = store => next => action => {
    const result = next(action);

    // Save to localStorage after state changes
    if (shouldPersist(action)) {
        const state = store.getState();
        saveState(state);
    }

    return result;
};

/**
 * Load persisted state from localStorage
 * Call this when creating the store
 */
export function loadPersistedState() {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return undefined;

        const persisted = JSON.parse(serialized);

        // Check version compatibility
        if (persisted.version !== STORAGE_VERSION) {
            console.log('[Persistence] Version mismatch, clearing old state');
            localStorage.removeItem(STORAGE_KEY);
            return undefined;
        }

        // Check if state is too old (e.g., > 7 days)
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
        const age = Date.now() - persisted.timestamp;
        if (age > MAX_AGE) {
            console.log('[Persistence] State too old, clearing');
            localStorage.removeItem(STORAGE_KEY);
            return undefined;
        }

        // Migrate state if needed
        return migrateState(persisted.data);
    } catch (error) {
        console.warn('[Persistence] Failed to load persisted state:', error);
        localStorage.removeItem(STORAGE_KEY);
        return undefined;
    }
}

/**
 * Migrate state to current version
 * Add migration logic here when changing state structure
 */
function migrateState(state) {
    // Add migration logic as needed
    // Example:
    // if (!state.newField) {
    //     state.newField = defaultValue;
    // }
    return state;
}

/**
 * Clear persisted state
 * Useful for logout or testing
 */
export function clearPersistedState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[Persistence] State cleared');
    } catch (error) {
        console.warn('[Persistence] Failed to clear state:', error);
    }
}

/**
 * Get storage usage statistics
 */
export function getStorageStats() {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) {
            return {
                exists: false,
                size: 0,
                sizeFormatted: '0 B'
            };
        }

        const size = new Blob([serialized]).size;
        const sizeKB = (size / 1024).toFixed(2);
        const sizeMB = (size / 1024 / 1024).toFixed(2);

        return {
            exists: true,
            size,
            sizeFormatted: size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`,
            itemCount: Object.keys(JSON.parse(serialized).data || {}).length
        };
    } catch (error) {
        console.warn('[Persistence] Failed to get storage stats:', error);
        return null;
    }
}

/**
 * Export state for debugging
 */
export function exportState() {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return null;
        return JSON.parse(serialized);
    } catch (error) {
        console.warn('[Persistence] Failed to export state:', error);
        return null;
    }
}

/**
 * Import state for debugging/testing
 */
export function importState(state) {
    try {
        const serialized = JSON.stringify({
            version: STORAGE_VERSION,
            timestamp: Date.now(),
            data: state
        });
        localStorage.setItem(STORAGE_KEY, serialized);
        console.log('[Persistence] State imported successfully');
        return true;
    } catch (error) {
        console.warn('[Persistence] Failed to import state:', error);
        return false;
    }
}
