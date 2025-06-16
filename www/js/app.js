import db from './database.js';
import ui from './ui.js';
import journal from './journal.js';
import {
    initializeCapacitor,
    handleDeepLink,
    handleResize,
    setupPWAInstall,
    setupOfflineDetection,
    setupCapacitorListeners,
    generateMenuHTML,
    generateStatsHTML,
    generateSettingsHTML,
    generateAboutHTML,
    handleInitializationError,
    createModalWithCleanup,
    setupElementCleanup,
    cleanupElement,
    debounce,
    validateEnvironment
} from './helpers.js';

class DailyJournalApp {
    constructor() {
        this.isInitialized = false;
        this.activeModal = null;
        this.resizeHandler = null;
        this.orientationHandler = null;
        this.capacitorCleanup = null;
        this.pwaClenup = null;
        this.offlineCleanup = null;
    }

    async init() {
        try {
            console.log('🚀 Initializing Daily Journal App...');

            if (!validateEnvironment()) {
                throw new Error('Environment validation failed');
            }

            ui.showLoading();

            const capacitorModules = await initializeCapacitor();
            if (capacitorModules) {
                this.capacitorCleanup = setupCapacitorListeners(
                    capacitorModules,
                    this,
                    ui,
                    journal
                );
            }

            await db.init();
            window.db = db;

            ui.init();
            window.ui = ui;

            await ui.loadDarkModePreference();

            await journal.init();
            window.journal = journal;

            this.setupAdditionalUI();

            setTimeout(() => {
                ui.hideLoading();
                console.log('✅ Daily Journal App initialized successfully!');
            }, 1000);

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Error initializing app:', error);
            handleInitializationError(error);
        }
    }

    setupAdditionalUI() {
        ui.setupCalendarNavigation();
        ui.setupSearch();
        ui.setupDarkMode();
        journal.setupKeyboardShortcuts();
        this.setupMenu();
        this.setupSettings();

        this.resizeHandler = debounce(() => {
            handleResize(ui);
        }, 250);
        window.addEventListener('resize', this.resizeHandler);

        this.orientationHandler = () => {
            setTimeout(() => {
                handleResize(ui);
            }, 500);
        };
        window.addEventListener('orientationchange', this.orientationHandler);

        this.pwaCleanup = setupPWAInstall();
        this.offlineCleanup = setupOfflineDetection(ui);
    }

    setupMenu() {
        const menuBtn = document.getElementById('menu-btn');
        if (!menuBtn) return;

        menuBtn.addEventListener('click', () => {
            this.showMenu();
        });
    }

    showMenu() {
        const existingMenu = document.getElementById('menu-overlay');
        if (existingMenu) {
            cleanupElement(existingMenu);
            existingMenu.remove();
        }

        const menuHTML = generateMenuHTML();
        const modal = createModalWithCleanup(menuHTML, (modal) => {
            const overlay = modal;
            const closeBtn = document.getElementById('close-menu');
            const statsBtn = document.getElementById('stats-menu-btn');
            const settingsBtn = document.getElementById('settings-menu-btn');
            const exportBtn = document.getElementById('export-menu-btn');
            const aboutBtn = document.getElementById('about-menu-btn');

            const closeMenu = () => {
                if (overlay) {
                    cleanupElement(overlay);
                    overlay.remove();
                }
            };

            const handlers = [
                () => closeBtn?.removeEventListener('click', closeMenu),
                () => overlay?.removeEventListener('click', (e) => e.target === overlay && closeMenu()),
                () => statsBtn?.removeEventListener('click', () => { closeMenu(); this.showStats(); }),
                () => settingsBtn?.removeEventListener('click', () => { closeMenu(); this.showSettings(); }),
                () => exportBtn?.removeEventListener('click', () => { closeMenu(); journal.exportEntries(); }),
                () => aboutBtn?.removeEventListener('click', () => { closeMenu(); this.showAbout(); })
            ];

            closeBtn?.addEventListener('click', closeMenu);
            overlay?.addEventListener('click', (e) => e.target === overlay && closeMenu());
            statsBtn?.addEventListener('click', () => { closeMenu(); this.showStats(); });
            settingsBtn?.addEventListener('click', () => { closeMenu(); this.showSettings(); });
            exportBtn?.addEventListener('click', () => { closeMenu(); journal.exportEntries(); });
            aboutBtn?.addEventListener('click', () => { closeMenu(); this.showAbout(); });

            setupElementCleanup(modal, handlers);
        });
    }

    setupSettings() {
        console.log('Settings system initialized - accessible through menu');
    }

    async showStats() {
        if (this.activeModal) {
            cleanupElement(this.activeModal);
            this.activeModal.remove();
        }

        const stats = await journal.getWritingStats();
        if (!stats) return;

        const statsHTML = generateStatsHTML(stats);
        const modal = createModalWithCleanup(statsHTML, (modal) => {
            const closeBtn = document.getElementById('close-stats');

            const closeStats = () => {
                if (modal) {
                    cleanupElement(modal);
                    modal.remove();
                    this.activeModal = null;
                }
            };

            const handlers = [
                () => closeBtn?.removeEventListener('click', closeStats),
                () => modal?.removeEventListener('click', (e) => e.target === modal && closeStats())
            ];

            closeBtn?.addEventListener('click', closeStats);
            modal?.addEventListener('click', (e) => e.target === modal && closeStats());

            setupElementCleanup(modal, handlers);
        });

        this.activeModal = modal;
    }

    showSettings() {
        if (this.activeModal) {
            cleanupElement(this.activeModal);
            this.activeModal.remove();
        }

        const settingsHTML = generateSettingsHTML();
        const modal = createModalWithCleanup(settingsHTML, (modal) => {
            this.setupSettingsModal(modal);
        });

        this.activeModal = modal;
    }

    async setupSettingsModal(modal) {
        const closeBtn = document.getElementById('close-settings');
        const notificationsToggle = document.getElementById('notifications-toggle');
        const notificationTime = document.getElementById('notification-time');
        const importFile = document.getElementById('import-file');

        const closeSettings = () => {
            if (modal) {
                cleanupElement(modal);
                modal.remove();
                this.activeModal = null;
            }
        };

        if (db.isInitialized) {
            const notificationsEnabled = await db.getSetting('notificationsEnabled', 'true');
            const savedTime = await db.getSetting('notificationTime', '20:00');

            if (notificationsToggle) {
                notificationsToggle.checked = notificationsEnabled === 'true';
            }

            if (notificationTime) {
                notificationTime.value = savedTime;
            }
        }

        const handlers = [
            () => closeBtn?.removeEventListener('click', closeSettings),
            () => modal?.removeEventListener('click', (e) => e.target === modal && closeSettings()),
            () => notificationsToggle?.removeEventListener('change', (e) => journal.toggleNotifications(e.target.checked)),
            () => notificationTime?.removeEventListener('change', (e) => journal.setNotificationTime(e.target.value)),
            () => importFile?.removeEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    journal.importEntries(file);
                    closeSettings();
                }
            })
        ];

        closeBtn?.addEventListener('click', closeSettings);
        modal?.addEventListener('click', (e) => e.target === modal && closeSettings());
        notificationsToggle?.addEventListener('change', (e) => journal.toggleNotifications(e.target.checked));
        notificationTime?.addEventListener('change', (e) => journal.setNotificationTime(e.target.value));
        importFile?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                journal.importEntries(file);
                closeSettings();
            }
        });

        setupElementCleanup(modal, handlers);
    }

    showAbout() {
        const existingMenu = document.getElementById('menu-overlay');
        if (existingMenu) {
            cleanupElement(existingMenu);
            existingMenu.remove();
        }

        const aboutHTML = generateAboutHTML();
        const modal = createModalWithCleanup(aboutHTML, (modal) => {
            const closeBtn = document.getElementById('close-about');
            const closeIcon = document.getElementById('close-icon');

            const closeAbout = () => {
                if (modal) {
                    modal.classList.add('animate-fadeOut');
                    setTimeout(() => {
                        cleanupElement(modal);
                        modal.remove();
                    }, 200);
                }
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeAbout();
                    document.removeEventListener('keydown', handleEscape);
                }
            };

            const handlers = [
                () => closeBtn?.removeEventListener('click', closeAbout),
                () => closeIcon?.removeEventListener('click', closeAbout),
                () => modal?.removeEventListener('click', (e) => e.target === modal && closeAbout()),
                () => document.removeEventListener('keydown', handleEscape)
            ];

            closeBtn?.addEventListener('click', closeAbout);
            closeIcon?.addEventListener('click', closeAbout);
            modal?.addEventListener('click', e => e.target === modal && closeAbout());
            document.addEventListener('keydown', handleEscape);

            setupElementCleanup(modal, handlers);
        });
    }

    destroy() {
        if (this.activeModal) {
            cleanupElement(this.activeModal);
            this.activeModal.remove();
            this.activeModal = null;
        }

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }

        if (this.orientationHandler) {
            window.removeEventListener('orientationchange', this.orientationHandler);
        }

        if (this.capacitorCleanup) {
            this.capacitorCleanup();
        }

        if (this.pwaCleanup) {
            this.pwaCleanup();
        }

        if (this.offlineCleanup) {
            this.offlineCleanup();
        }

        if (journal) {
            journal.destroy();
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new DailyJournalApp();
    window.app = app;

    await app.init();

    window.addEventListener('beforeunload', () => {
        app.destroy();
    });
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

window.hideSplashEmergency = async () => {
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({ fadeOutDuration: 300 });
        console.log('🚨 Emergency splash screen hide executed');
    } catch (error) {
        console.warn('Emergency splash hide failed:', error);
    }
};
setTimeout(window.hideSplashEmergency, 3000);