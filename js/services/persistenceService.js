/**
 * PersistenceService - Helper for state persistence (sessionStorage)
 * Standardizes the "iPad Orientation Redraw" fix across all test pages.
 */
const PersistenceService = {
    /**
     * Save current state to sessionStorage
     * @param {string} key - Unique key for the page/context
     * @param {Object} state - The data to save
     * @param {string|number} sessionIdentifier - used to ensure we don't restore state from a different test run
     */
    save(key, state, sessionIdentifier = '') {
        try {
            const data = {
                state,
                sessionIdentifier,
                timestamp: Date.now()
            };
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('[PersistenceService] Save failed:', e);
        }
    },

    /**
     * Restore state from sessionStorage if sessionIdentifier matches
     * @param {string} key
     * @param {string|number} currentSessionIdentifier
     * @returns {Object|null} The saved state or null if not found/mismatched
     */
    restore(key, currentSessionIdentifier) {
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return null;

            const data = JSON.parse(raw);
            if (data.sessionIdentifier === currentSessionIdentifier) {
                return data.state;
            }
            return null;
        } catch (e) {
            console.warn('[PersistenceService] Restore failed:', e);
            return null;
        }
    },

    /**
     * Clear the saved state
     * @param {string} key
     */
    clear(key) {
        sessionStorage.removeItem(key);
    }
};

window.PersistenceService = PersistenceService;
