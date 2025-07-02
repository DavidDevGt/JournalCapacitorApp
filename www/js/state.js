/**
 * Ultra-Simple Global State Manager for Daily Journal
 * Reactive state management with computed values and subscriptions
 */

class State {
    constructor() {
        this.data = {
            app: {
                isInitialized: false,
                isLoading: false,
                currentView: 'journal',
                isOnline: navigator.onLine
            },
            ui: {
                isDarkMode: false,
                currentDate: (() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                })(),
                selectedMood: null,
                wordCount: 0,
                showSearch: false,
                searchQuery: ''
            },
            journal: {
                currentEntry: null,
                hasUnsavedChanges: false,
                lastSaved: null,
                isAutoSaving: false,
                photos: []
            },
            data: {
                entries: new Map(),
                stats: null,
                searchResults: []
            },
            settings: {
                autoSave: true,
                enableNotifications: true,
                theme: 'auto',
                language: 'es'
            }
        };
        
        this.subscribers = new Map();
        this.computedFns = new Map();
        this.setupComputed();
    }

    /**
     * Get nested property value using dot notation
     * @param {string} path - Property path (e.g., 'app.isLoading')
     * @returns {*} Property value
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.data);
    }

    /**
     * Set nested property value and notify subscribers
     * @param {string} path - Property path
     * @param {*} value - New value
     * @returns {State} This instance for chaining
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] ??= {}, this.data);
        const oldValue = target[lastKey];
        
        target[lastKey] = value;
        this.notify(path, value, oldValue);
        return this;
    }

    /**
     * Update multiple properties at once
     * @param {Object} changes - Key-value pairs to update
     * @returns {State} This instance for chaining
     */
    update(changes) {
        Object.entries(changes).forEach(([path, value]) => this.set(path, value));
        return this;
    }

    /**
     * Subscribe to property changes
     * @param {string} path - Property path to watch
     * @param {Function} callback - Function to call on change
     * @returns {Function} Unsubscribe function
     */
    on(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        this.subscribers.get(path).add(callback);
        
        return () => this.subscribers.get(path)?.delete(callback);
    }

    /**
     * Notify all subscribers of a property change
     * @param {string} path - Changed property path
     * @param {*} newValue - New value
     * @param {*} oldValue - Previous value
     */
    notify(path, newValue, oldValue) {
        // Notify direct subscribers
        this.subscribers.get(path)?.forEach(callback => {
            try {
                callback(newValue, oldValue);
            } catch (error) {
                console.error(`State subscriber error for ${path}:`, error);
            }
        });
        
        // Update computed values that depend on this path
        this.updateComputedValues(path);
    }

    /**
     * Define a computed property
     * @param {string} key - Computed property key
     * @param {Function} computeFn - Function to compute value
     * @param {string[]} dependencies - Paths this computed value depends on
     */
    defineComputed(key, computeFn, dependencies = []) {
        this.computedFns.set(key, { fn: computeFn, deps: dependencies });
        
        // Initial computation
        this.updateComputedValue(key);
        
        // Subscribe to dependencies
        dependencies.forEach(dep => {
            this.on(dep, () => this.updateComputedValue(key));
        });
    }

    /**
     * Update a specific computed value
     * @param {string} key - Computed property key
     */
    updateComputedValue(key) {
        const computed = this.computedFns.get(key);
        if (computed) {
            const newValue = computed.fn(this.data);
            this.set(key, newValue);
        }
    }

    /**
     * Update all computed values that depend on a changed path
     * @param {string} changedPath - Path that changed
     */
    updateComputedValues(changedPath) {
        this.computedFns.forEach((computed, key) => {
            if (computed.deps.includes(changedPath)) {
                this.updateComputedValue(key);
            }
        });
    }

    /**
     * Setup built-in computed properties
     */
    setupComputed() {
        this.defineComputed('canSave', 
            (data) => data.journal.hasUnsavedChanges && !data.journal.isAutoSaving, 
            ['journal.hasUnsavedChanges', 'journal.isAutoSaving']
        );
        
        this.defineComputed('status', (data) => {
            if (data.app.isLoading) return 'Cargando...';
            if (data.journal.isAutoSaving) return 'Guardando...';
            if (data.journal.hasUnsavedChanges) return 'Sin guardar';
            return 'Listo';
        }, ['app.isLoading', 'journal.isAutoSaving', 'journal.hasUnsavedChanges']);
    }
}

const state = new State();

state.on('journal.currentEntry', () => {
    state.set('journal.hasUnsavedChanges', true);
});

window.state = state;
export default state;