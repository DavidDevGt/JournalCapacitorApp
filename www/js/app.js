import db from './database.js';
import ui from './ui.js';
import journal from './journal.js';
import {
    initializeCapacitor,
    handleResize,
    setupPWAInstall,
    setupOfflineDetection,
    setupCapacitorListeners,
    generateMenuHTML,
    generateStatsHTML,
    generateAboutHTML,
    handleInitializationError,
    createModalWithCleanup,
    cleanupElement,
    debounce,
    validateEnvironment,
    getSettings,
    getSettingsAsync,
    saveSettings,
    showSettingsModal
} from './helpers.js';

// Constants
const CONSTANTS = {
    LOADING_DELAY: 1000,
    RESIZE_DEBOUNCE: 250,
    ORIENTATION_DELAY: 500,
    EMERGENCY_SPLASH_TIMEOUT: 3000,
    FADE_OUT_DURATION: 200,
    SPLASH_FADE_DURATION: 300
};

const SELECTORS = {
    MENU_BTN: '#menu-btn',
    MENU_OVERLAY: '#menu-overlay',
    CLOSE_MENU: '#close-menu',
    STATS_MENU_BTN: '#stats-menu-btn',
    SETTINGS_MENU_BTN: '#settings-menu-btn',
    EXPORT_MENU_BTN: '#export-menu-btn',
    ABOUT_MENU_BTN: '#about-menu-btn',
    CLOSE_STATS: '#close-stats',
    CLOSE_ABOUT: '#close-about',
    CLOSE_ICON: '#close-icon'
};

/**
 * Main application class for Daily Journal
 * Manages initialization, UI interactions, and cleanup
 */
class DailyJournalApp {
    #isInitialized = false;
    #activeModal = null;
    #eventListeners = new Map();
    #cleanupTasks = [];

    constructor() {
        // Bind methods to maintain context
        this.handleResize = debounce(() => handleResize(ui), CONSTANTS.RESIZE_DEBOUNCE);
        this.handleOrientation = () => {
            setTimeout(() => handleResize(ui), CONSTANTS.ORIENTATION_DELAY);
        };
        this.handleBeforeUnload = () => this.destroy();
        this.handleGlobalError = (event) => this.#logError('Global error:', event.error);
        this.handleUnhandledRejection = (event) => this.#logError('Unhandled promise rejection:', event.reason);
    }

    /**
     * Initialize the application
     * @returns {Promise<void>}
     */
    async init() {
        if (this.#isInitialized) {
            console.warn('App already initialized');
            return;
        }

        try {
            console.log('🚀 Initializing Daily Journal App...');
            
            await this.#validateAndSetupEnvironment();
            await this.#initializeModules();
            await this.#setupUI();
            await this.#finalizeInitialization();

        } catch (error) {
            console.error('❌ Error initializing app:', error);
            await this.#handleInitializationFailure(error);
        }
    }

    /**
     * Validate environment and setup basic requirements
     * @private
     */
    async #validateAndSetupEnvironment() {
        if (!validateEnvironment()) {
            throw new Error('Environment validation failed');
        }
        ui.showLoading();
    }

    /**
     * Initialize core modules (Capacitor, DB, etc.)
     * @private
     */
    async #initializeModules() {
        // Initialize Capacitor if available
        const capacitorModules = await initializeCapacitor();
        if (capacitorModules) {
            const cleanup = setupCapacitorListeners(capacitorModules, this, ui, journal);
            this.#addCleanupTask(cleanup);
        }

        // Initialize database
        await db.init();
        this.#exposeGlobalAPI('db', db);

        // Initialize UI
        ui.init();
        this.#exposeGlobalAPI('ui', ui);
        await ui.loadDarkModePreference();

        // Initialize journal
        await journal.init();
        this.#exposeGlobalAPI('journal', journal);

        // Expose settings functions
        this.#exposeGlobalAPI('getSettings', getSettings);
        this.#exposeGlobalAPI('getSettingsAsync', getSettingsAsync);
        this.#exposeGlobalAPI('saveSettings', saveSettings);
    }

    /**
     * Setup UI components and event listeners
     * @private
     */
    async #setupUI() {
        this.#setupCoreUI();
        this.#setupEventListeners();
        this.#setupPWAFeatures();
    }

    /**
     * Setup core UI components
     * @private
     */
    #setupCoreUI() {
        ui.setupCalendarNavigation();
        ui.setupSearch();
        ui.setupDarkMode();
        journal.setupKeyboardShortcuts();
        this.#setupMenu();
    }

    /**
     * Setup event listeners with proper cleanup tracking
     * @private
     */
    #setupEventListeners() {
        // Window resize and orientation
        this.#addEventListener(window, 'resize', this.handleResize);
        this.#addEventListener(window, 'orientationchange', this.handleOrientation);
        
        // App lifecycle
        this.#addEventListener(window, 'beforeunload', this.handleBeforeUnload);
        
        // Global error handling
        this.#addEventListener(window, 'error', this.handleGlobalError);
        this.#addEventListener(window, 'unhandledrejection', this.handleUnhandledRejection);
    }

    /**
     * Setup PWA features
     * @private
     */
    #setupPWAFeatures() {
        const pwaCleanup = setupPWAInstall();
        const offlineCleanup = setupOfflineDetection(ui);
        
        this.#addCleanupTask(pwaCleanup);
        this.#addCleanupTask(offlineCleanup);
    }

    /**
     * Finalize initialization
     * @private
     */
    async #finalizeInitialization() {
        return new Promise(resolve => {
            setTimeout(() => {
                ui.hideLoading();
                console.log('✅ Daily Journal App initialized successfully!');
                this.#isInitialized = true;
                resolve();
            }, CONSTANTS.LOADING_DELAY);
        });
    }

    /**
     * Handle initialization failure
     * @param {Error} error 
     * @private
     */
    async #handleInitializationFailure(error) {
        ui.hideLoading();
        handleInitializationError(error);
        // Don't set initialized to true on failure
    }

    /**
     * Setup menu functionality
     * @private
     */
    #setupMenu() {
        const menuBtn = document.querySelector(SELECTORS.MENU_BTN);
        if (!menuBtn) {
            console.warn('Menu button not found');
            return;
        }

        this.#addEventListener(menuBtn, 'click', () => this.showMenu());
    }

    /**
     * Show menu modal
     */
    showMenu() {
        this.#closeExistingModal(SELECTORS.MENU_OVERLAY);

        const menuHTML = generateMenuHTML();
        const modal = this.#createModalWithHandlers(menuHTML, (modal) => {
            const elements = this.#getMenuElements();
            const closeMenu = () => this.#closeModal(modal);

            // Setup menu event handlers
            const handlers = {
                [SELECTORS.CLOSE_MENU]: closeMenu,
                [SELECTORS.STATS_MENU_BTN]: () => { closeMenu(); this.showStats(); },
                [SELECTORS.SETTINGS_MENU_BTN]: () => { closeMenu(); this.showSettings(); },
                [SELECTORS.EXPORT_MENU_BTN]: () => { closeMenu(); journal.exportEntries(); },
                [SELECTORS.ABOUT_MENU_BTN]: () => { closeMenu(); this.showAbout(); }
            };

            this.#setupModalHandlers(elements, handlers, modal, closeMenu);
        });

        this.#activeModal = modal;
    }

    /**
     * Get menu elements
     * @returns {Object} Menu elements
     * @private
     */
    #getMenuElements() {
        return {
            [SELECTORS.CLOSE_MENU]: document.querySelector(SELECTORS.CLOSE_MENU),
            [SELECTORS.STATS_MENU_BTN]: document.querySelector(SELECTORS.STATS_MENU_BTN),
            [SELECTORS.SETTINGS_MENU_BTN]: document.querySelector(SELECTORS.SETTINGS_MENU_BTN),
            [SELECTORS.EXPORT_MENU_BTN]: document.querySelector(SELECTORS.EXPORT_MENU_BTN),
            [SELECTORS.ABOUT_MENU_BTN]: document.querySelector(SELECTORS.ABOUT_MENU_BTN)
        };
    }

    /**
     * Show statistics modal
     */
    async showStats() {
        try {
            this.#closeActiveModal();

            const stats = await journal.getWritingStats();
            if (!stats) {
                console.warn('No stats available');
                return;
            }

            const statsHTML = generateStatsHTML(stats);
            const modal = this.#createModalWithHandlers(statsHTML, (modal) => {
                const closeBtn = document.querySelector(SELECTORS.CLOSE_STATS);
                const closeStats = () => {
                    this.#closeModal(modal);
                    this.#activeModal = null;
                };

                this.#setupBasicModalHandlers(modal, closeStats, closeBtn);
            });

            this.#activeModal = modal;
        } catch (error) {
            console.error('Error showing stats:', error);
            ui.showError('Failed to load statistics');
        }
    }

    /**
     * Show settings modal
     */
    async showSettings() {
        try {
            this.#closeActiveModal();
            this.#activeModal = await showSettingsModal();
        } catch (error) {
            console.error('Error showing settings:', error);
            ui.showError('Failed to load settings');
        }
    }

    /**
     * Show about modal
     */
    showAbout() {
        this.#closeExistingModal(SELECTORS.MENU_OVERLAY);

        const aboutHTML = generateAboutHTML();
        const modal = this.#createModalWithHandlers(aboutHTML, (modal) => {
            const closeBtn = document.querySelector(SELECTORS.CLOSE_ABOUT);
            const closeIcon = document.querySelector(SELECTORS.CLOSE_ICON);
            
            const closeAbout = () => this.#closeModalWithAnimation(modal);

            // Setup close handlers
            const handlers = [closeBtn, closeIcon].filter(Boolean);
            handlers.forEach(btn => {
                this.#addEventListener(btn, 'click', closeAbout);
            });

            // Setup overlay click and escape key
            this.#addEventListener(modal, 'click', (e) => {
                if (e.target === modal) closeAbout();
            });

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeAbout();
                    this.#removeEventListener(document, 'keydown', handleEscape);
                }
            };
            this.#addEventListener(document, 'keydown', handleEscape);
        });
    }

    /**
     * Cleanup and destroy the application
     */
    destroy() {
        if (!this.#isInitialized) return;

        console.log('🧹 Cleaning up Daily Journal App...');

        // Close active modal
        this.#closeActiveModal();

        // Run all cleanup tasks
        this.#cleanupTasks.forEach(cleanup => {
            try {
                if (typeof cleanup === 'function') {
                    cleanup();
                }
            } catch (error) {
                console.warn('Cleanup task failed:', error);
            }
        });

        // Remove all event listeners
        this.#eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });

        // Cleanup modules
        if (journal && typeof journal.destroy === 'function') {
            journal.destroy();
        }

        // Clear references
        this.#eventListeners.clear();
        this.#cleanupTasks.length = 0;
        this.#isInitialized = false;

        console.log('✅ Daily Journal App cleaned up successfully');
    }

    // Private utility methods

    /**
     * Add event listener with cleanup tracking
     * @param {EventTarget} element 
     * @param {string} event 
     * @param {Function} handler 
     * @private
     */
    #addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.#eventListeners.set(`${event}_${Date.now()}_${Math.random()}`, {
            element,
            event,
            handler
        });
    }

    /**
     * Remove event listener
     * @param {EventTarget} element 
     * @param {string} event 
     * @param {Function} handler 
     * @private
     */
    #removeEventListener(element, event, handler) {
        element.removeEventListener(event, handler);
        // Remove from tracking
        for (const [key, listener] of this.#eventListeners.entries()) {
            if (listener.element === element && listener.event === event && listener.handler === handler) {
                this.#eventListeners.delete(key);
                break;
            }
        }
    }

    /**
     * Add cleanup task
     * @param {Function} cleanup 
     * @private
     */
    #addCleanupTask(cleanup) {
        if (typeof cleanup === 'function') {
            this.#cleanupTasks.push(cleanup);
        }
    }

    /**
     * Expose API globally with proper error handling
     * @param {string} name 
     * @param {*} api 
     * @private
     */
    #exposeGlobalAPI(name, api) {
        try {
            window[name] = api;
        } catch (error) {
            console.warn(`Failed to expose ${name} globally:`, error);
        }
    }

    /**
     * Close existing modal by selector
     * @param {string} selector 
     * @private
     */
    #closeExistingModal(selector) {
        const existing = document.querySelector(selector);
        if (existing) {
            cleanupElement(existing);
            existing.remove();
        }
    }

    /**
     * Close active modal
     * @private
     */
    #closeActiveModal() {
        if (this.#activeModal) {
            this.#closeModal(this.#activeModal);
            this.#activeModal = null;
        }
    }

    /**
     * Close modal
     * @param {HTMLElement} modal 
     * @private
     */
    #closeModal(modal) {
        if (modal) {
            cleanupElement(modal);
            modal.remove();
        }
    }

    /**
     * Close modal with animation
     * @param {HTMLElement} modal 
     * @private
     */
    #closeModalWithAnimation(modal) {
        if (modal) {
            modal.classList.add('animate-fadeOut');
            setTimeout(() => {
                this.#closeModal(modal);
            }, CONSTANTS.FADE_OUT_DURATION);
        }
    }

    /**
     * Create modal with proper cleanup handlers
     * @param {string} html 
     * @param {Function} setupCallback 
     * @returns {HTMLElement}
     * @private
     */
    #createModalWithHandlers(html, setupCallback) {
        return createModalWithCleanup(html, setupCallback);
    }

    /**
     * Setup basic modal handlers (close button and overlay click)
     * @param {HTMLElement} modal 
     * @param {Function} closeHandler 
     * @param {HTMLElement} closeBtn 
     * @private
     */
    #setupBasicModalHandlers(modal, closeHandler, closeBtn) {
        if (closeBtn) {
            this.#addEventListener(closeBtn, 'click', closeHandler);
        }
        this.#addEventListener(modal, 'click', (e) => {
            if (e.target === modal) closeHandler();
        });
    }

    /**
     * Setup modal handlers with multiple buttons
     * @param {Object} elements 
     * @param {Object} handlers 
     * @param {HTMLElement} modal 
     * @param {Function} closeHandler 
     * @private
     */
    #setupModalHandlers(elements, handlers, modal, closeHandler) {
        // Setup button handlers
        Object.entries(handlers).forEach(([selector, handler]) => {
            const element = elements[selector];
            if (element) {
                this.#addEventListener(element, 'click', handler);
            }
        });

        // Setup overlay click
        this.#addEventListener(modal, 'click', (e) => {
            if (e.target === modal) closeHandler();
        });
    }

    /**
     * Log error with consistent formatting
     * @param {string} message 
     * @param {Error} error 
     * @private
     */
    #logError(message, error) {
        console.error(message, error);
        // TODO: Implement proper error logging mechanism (e.g., send to server)
        // For now, just log to console
    }

    // Public getters for debugging/testing
    get isInitialized() {
        return this.#isInitialized;
    }

    get hasActiveModal() {
        return !!this.#activeModal;
    }
}

class AppBootstrap {
    static async initialize() {
        try {
            const app = new DailyJournalApp();
            window.app = app;

            await app.init();
            
            AppBootstrap.setupEmergencySplashHide();
            
            return app;
        } catch (error) {
            console.error('Failed to bootstrap application:', error);
            throw error;
        }
    }

    static setupEmergencySplashHide() {
        window.hideSplashEmergency = async () => {
            try {
                const { SplashScreen } = await import('@capacitor/splash-screen');
                await SplashScreen.hide({ fadeOutDuration: CONSTANTS.SPLASH_FADE_DURATION });
                console.log('🚨 Emergency splash screen hide executed');
            } catch (error) {
                console.warn('Emergency splash hide failed:', error);
            }
        };

        setTimeout(window.hideSplashEmergency, CONSTANTS.EMERGENCY_SPLASH_TIMEOUT);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AppBootstrap.initialize().catch(error => {
        console.error('Application bootstrap failed:', error);
        // Could show user-friendly error message here
    });
});

export default DailyJournalApp;