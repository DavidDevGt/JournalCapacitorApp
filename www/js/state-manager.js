/**
 * Secure State Manager - Safe alternative to global variables
 * Provides controlled access to shared state between components
 */

class StateManager {
    #state = new Map();
    #subscribers = new Map();
    #nextId = 1;

    /**
     * Set state value
     * @param {string} key
     * @param {*} value
     * @param {boolean} notify - Whether to notify subscribers
     */
    setState(key, value, notify = true) {
        this.#state.set(key, value);
        if (notify) {
            this.#notifySubscribers(key, value);
        }
    }

    /**
     * Get state value
     * @param {string} key
     * @returns {*|null}
     */
    getState(key) {
        return this.#state.get(key) || null;
    }

    /**
     * Remove state value
     * @param {string} key
     */
    removeState(key) {
        this.#state.delete(key);
        this.#notifySubscribers(key, null);
    }

    /**
     * Subscribe to state changes
     * @param {string} key
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const id = this.#nextId++;
        if (!this.#subscribers.has(key)) {
            this.#subscribers.set(key, new Map());
        }
        this.#subscribers.get(key).set(id, callback);

        // Return unsubscribe function
        return () => {
            this.#subscribers.get(key)?.delete(id);
        };
    }

    /**
     * Notify subscribers about state change
     * @param {string} key
     * @param {*} value
     * @private
     */
    #notifySubscribers(key, value) {
        const keySubscribers = this.#subscribers.get(key);
        if (keySubscribers) {
            keySubscribers.forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.error(`[StateManager] Error in subscriber for ${key}:`, error);
                }
            });
        }
    }

    /**
     * Clear all state
     */
    clear() {
        this.#state.clear();
        this.#subscribers.clear();
        this.#nextId = 1;
    }

    /**
     * Get all state keys (for debugging)
     * @returns {string[]}
     */
    getStateKeys() {
        return Array.from(this.#state.keys());
    }
}

// Singleton instance
const stateManager = new StateManager();

// Export for module usage
export default stateManager;