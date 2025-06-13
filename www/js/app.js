// Main application entry point for Daily Journal App
import db from './database.js';
import ui from './ui.js';
import journal from './journal.js';

class DailyJournalApp {
    constructor() {
        this.isInitialized = false;
        this.activeModal = null;
        this.resizeHandler = null;
        this.orientationHandler = null;
    }

    async init() {
        try {
            console.log('🚀 Initializing Daily Journal App...');

            // Show loading screen
            ui.showLoading();

            // Initialize Capacitor
            await this.initializeCapacitor();

            // Initialize database
            console.log('📊 Initializing database...');
            await db.init();
            window.db = db; // Make db globally available

            // Initialize UI
            console.log('🎨 Initializing UI...');
            ui.init();
            window.ui = ui; // Make ui globally available

            // Load dark mode preference
            await ui.loadDarkModePreference();

            // Initialize journal functionality
            console.log('📖 Initializing journal...');
            await journal.init();
            window.journal = journal; // Make journal globally available

            // Setup additional UI components
            this.setupAdditionalUI();            // Hide loading screen
            setTimeout(() => {
                ui.hideLoading();
                console.log('✅ Daily Journal App initialized successfully!');
            }, 1000);

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeCapacitor() {
        try {
            // Import Capacitor core
            const { Capacitor } = await import('@capacitor/core');
            const { App } = await import('@capacitor/app');
            const { StatusBar } = await import('@capacitor/status-bar');
            const { Keyboard } = await import('@capacitor/keyboard');

            console.log(`📱 Platform: ${Capacitor.getPlatform()}`);

            // Configure status bar
            if (Capacitor.isNativePlatform()) {
                await StatusBar.setStyle({ style: 'Dark' });
                await StatusBar.setBackgroundColor({ color: '#ffffff' });
            }

            // Handle app state changes
            App.addListener('appStateChange', ({ isActive }) => {
                console.log('App state changed. Is active:', isActive);
                if (isActive && this.isInitialized) {
                    // App became active - refresh current entry
                    journal.loadTodayEntry();
                } else if (!isActive && journal.hasUnsavedChanges) {
                    // App became inactive - save current work
                    journal.saveEntry(true);
                }
            });

            // Handle back button on Android
            App.addListener('backButton', ({ canGoBack }) => {
                if (!canGoBack) {
                    App.exitApp();
                } else {
                    // Handle navigation within the app
                    if (ui.currentView !== 'today') {
                        ui.switchView('today');
                    } else {
                        App.exitApp();
                    }
                }
            });

            // Handle keyboard events
            if (Capacitor.isNativePlatform()) {
                Keyboard.addListener('keyboardWillShow', (info) => {
                    document.body.style.paddingBottom = `${info.keyboardHeight}px`;
                });

                Keyboard.addListener('keyboardWillHide', () => {
                    document.body.style.paddingBottom = '0px';
                });
            }

            // Handle URL open (for deep linking)
            App.addListener('appUrlOpen', (event) => {
                console.log('App opened with URL:', event.url);
                this.handleDeepLink(event.url);
            });

        } catch (error) {
            console.warn('Some Capacitor features are not available:', error);
            // Continue with web-only features
        }
    }    setupAdditionalUI() {
        // Setup calendar navigation
        ui.setupCalendarNavigation();

        // Setup search functionality
        ui.setupSearch();

        // Setup dark mode toggle
        ui.setupDarkMode();

        // Setup keyboard shortcuts
        journal.setupKeyboardShortcuts();

        // Setup menu functionality
        this.setupMenu();

        // Setup settings
        this.setupSettings();

        // Handle window resize for responsive design - store reference for cleanup
        this.resizeHandler = this.debounce(() => {
            this.handleResize();
        }, 250);
        window.addEventListener('resize', this.resizeHandler);

        // Handle orientation change - store reference for cleanup
        this.orientationHandler = () => {
            setTimeout(() => {
                this.handleResize();
            }, 500);
        };
        window.addEventListener('orientationchange', this.orientationHandler);

        // Setup PWA install prompt
        this.setupPWAInstall();

        // Setup offline detection
        this.setupOfflineDetection();
    }

    setupMenu() {
        const menuBtn = document.getElementById('menu-btn');
        if (!menuBtn) return;

        menuBtn.addEventListener('click', () => {
            this.showMenu();
        });
    }    showMenu() {
        // Close existing menu to prevent memory leaks
        const existingMenu = document.getElementById('menu-overlay');
        if (existingMenu) {
            this.cleanupMenuListeners(existingMenu);
            existingMenu.remove();
        }

        // Create a simple menu overlay
        const menuHTML = `
            <div id="menu-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center sm:justify-center">
                <div class="bg-white dark:bg-gray-800 w-full sm:w-96 sm:rounded-lg p-6 space-y-4 animate-slide-up">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold">Menú</h3>
                        <button id="close-menu" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <button id="stats-menu-btn" class="menu-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                            <span>Estadísticas</span>
                        </div>
                    </button>

                    <button id="settings-menu-btn" class="menu-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span>Configuración</span>
                        </div>
                    </button>

                    <button id="export-menu-btn" class="menu-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span>Exportar datos</span>
                        </div>
                    </button>

                    <button id="about-menu-btn" class="menu-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-center space-x-3">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>Acerca de</span>
                        </div>
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', menuHTML);

        // Setup close functionality with proper cleanup
        const overlay = document.getElementById('menu-overlay');
        const closeBtn = document.getElementById('close-menu');
        const statsBtn = document.getElementById('stats-menu-btn');
        const settingsBtn = document.getElementById('settings-menu-btn');
        const exportBtn = document.getElementById('export-menu-btn');
        const aboutBtn = document.getElementById('about-menu-btn');

        const closeMenu = () => {
            if (overlay) {
                this.cleanupMenuListeners(overlay);
                overlay.remove();
            }
        };

        // Store references for cleanup
        const handleCloseClick = () => closeMenu();
        const handleOverlayClick = (e) => {
            if (e.target === overlay) closeMenu();
        };
        const handleStatsClick = () => { closeMenu(); this.showStats(); };
        const handleSettingsClick = () => { closeMenu(); this.showSettings(); };
        const handleExportClick = () => { closeMenu(); journal.exportEntries(); };
        const handleAboutClick = () => { closeMenu(); this.showAbout(); };

        if (closeBtn) {
            closeBtn.addEventListener('click', handleCloseClick);
            closeBtn._cleanup = () => closeBtn.removeEventListener('click', handleCloseClick);
        }

        if (overlay) {
            overlay.addEventListener('click', handleOverlayClick);
            overlay._cleanup = () => overlay.removeEventListener('click', handleOverlayClick);
        }

        if (statsBtn) {
            statsBtn.addEventListener('click', handleStatsClick);
            statsBtn._cleanup = () => statsBtn.removeEventListener('click', handleStatsClick);
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', handleSettingsClick);
            settingsBtn._cleanup = () => settingsBtn.removeEventListener('click', handleSettingsClick);
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', handleExportClick);
            exportBtn._cleanup = () => exportBtn.removeEventListener('click', handleExportClick);
        }

        if (aboutBtn) {
            aboutBtn.addEventListener('click', handleAboutClick);
            aboutBtn._cleanup = () => aboutBtn.removeEventListener('click', handleAboutClick);
        }
    }

    cleanupMenuListeners(menuElement) {
        if (!menuElement) return;
        
        const elementsWithCleanup = menuElement.querySelectorAll('*');
        elementsWithCleanup.forEach(element => {
            if (element._cleanup && typeof element._cleanup === 'function') {
                element._cleanup();
            }
        });
        
        if (menuElement._cleanup && typeof menuElement._cleanup === 'function') {
            menuElement._cleanup();
        }
    }    setupSettings() {
        // Settings are handled through the menu system
        // All settings functionality is managed in showSettings() method
        console.log('Settings system initialized - accessible through menu');
    }async showStats() {
        // Close existing modal
        if (this.activeModal) {
            this.cleanupMenuListeners(this.activeModal);
            this.activeModal.remove();
        }

        const stats = await journal.getWritingStats();
        if (!stats) return;

        const statsHTML = `
            <div id="stats-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold">Estadísticas</h3>
                        <button id="close-stats" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${stats.totalEntries}</div>
                            <div class="text-sm text-blue-800 dark:text-blue-200">Entradas totales</div>
                        </div>
                        
                        <div class="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-green-600 dark:text-green-400">${stats.totalWords.toLocaleString()}</div>
                            <div class="text-sm text-green-800 dark:text-green-200">Palabras escritas</div>
                        </div>
                        
                        <div class="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${stats.currentStreak}</div>
                            <div class="text-sm text-purple-800 dark:text-purple-200">Racha actual (días)</div>
                        </div>
                        
                        <div class="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                            <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">${stats.averageWordsPerEntry}</div>
                            <div class="text-sm text-orange-800 dark:text-orange-200">Promedio palabras/entrada</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', statsHTML);

        const modal = document.getElementById('stats-modal');
        const closeBtn = document.getElementById('close-stats');
        this.activeModal = modal;

        const closeStats = () => {
            if (modal) {
                this.cleanupMenuListeners(modal);
                modal.remove();
                this.activeModal = null;
            }
        };

        const handleCloseClick = () => closeStats();
        const handleModalClick = (e) => {
            if (e.target === modal) closeStats();
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', handleCloseClick);
            closeBtn._cleanup = () => closeBtn.removeEventListener('click', handleCloseClick);
        }

        if (modal) {
            modal.addEventListener('click', handleModalClick);
            modal._cleanup = () => modal.removeEventListener('click', handleModalClick);
        }
    }    showSettings() {
        // Close existing modal
        if (this.activeModal) {
            this.cleanupMenuListeners(this.activeModal);
            this.activeModal.remove();
        }

        const settingsHTML = `
            <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold">Configuración</h3>
                        <button id="close-settings" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <span>Recordatorios diarios</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="notifications-toggle" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-2">Hora del recordatorio</label>
                            <input type="time" id="notification-time" value="20:00" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>

                        <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
                            <label class="block text-sm font-medium mb-2">Importar datos</label>
                            <input type="file" id="import-file" accept=".json" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', settingsHTML);
        this.activeModal = document.getElementById('settings-modal');

        // Setup settings functionality
        this.setupSettingsModal();
    }

    async setupSettingsModal() {
        const modal = document.getElementById('settings-modal');
        const closeBtn = document.getElementById('close-settings');
        const notificationsToggle = document.getElementById('notifications-toggle');
        const notificationTime = document.getElementById('notification-time');
        const importFile = document.getElementById('import-file');

        const closeSettings = () => {
            if (modal) modal.remove();
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeSettings);
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeSettings();
            });
        }

        // Load current settings
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

        // Setup event listeners
        if (notificationsToggle) {
            notificationsToggle.addEventListener('change', (e) => {
                journal.toggleNotifications(e.target.checked);
            });
        }

        if (notificationTime) {
            notificationTime.addEventListener('change', (e) => {
                journal.setNotificationTime(e.target.value);
            });
        }

        if (importFile) {
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    journal.importEntries(file);
                    closeSettings();
                }
            });
        }
    }

    showAbout() {
        const existingMenu = document.getElementById('menu-overlay');
        if (existingMenu) existingMenu.remove();

        const aboutHTML = `
            <div id="about-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6 animate-fadeIn">
                <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg text-center transform animate-slideUp border border-gray-200 dark:border-gray-700 space-y-6">
                
                <!-- Botón cerrar en esquina -->
                <button id="close-icon" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none focus:outline-none">
                    &times;
                </button>
                
                <!-- Header con icono y gradiente -->
                <div class="mt-4">
                    <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <img src="icon-192.png" alt="Daily Journal Icon" class="w-12 h-12">
                    </div>
                    <h3 class="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Daily Journal
                    </h3>
                    <div class="flex items-center justify-center gap-2">
                    <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                        v1.0.0
                    </span>
                    </div>
                </div>
                
                <!-- Contenido principal -->
                <div class="space-y-6 text-center">
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mx-auto max-w-prose">
                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                            Una aplicación minimalista de diario personal con estética tipo Notion para capturar tus pensamientos diarios.
                        </p>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 justify-center">
                    <span class="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-xs font-medium">
                        Capacitor
                    </span>
                    <span class="px-3 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 rounded-full text-xs font-medium">
                        Tailwind CSS
                    </span>
                    <span class="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">
                        JavaScript
                    </span>
                    </div>
                    
                    <div class="text-center pt-4 border-t border-gray-200 dark:border-gray-600">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Desarrollado con ❤️ por
                    </p>
                    <p class="font-semibold text-gray-800 dark:text-gray-200 mt-1 mb-4">
                        DavidDevGt
                    </p>
                    </div>
                </div>
                
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', aboutHTML);

        const closeBtn = document.getElementById('close-about');
        const closeIcon = document.getElementById('close-icon');
        const modal = document.getElementById('about-modal');

        const closeAbout = () => {
            if (modal) {
                modal.classList.add('animate-fadeOut');
                setTimeout(() => modal.remove(), 200);
            }
        };

        if (closeBtn) closeBtn.addEventListener('click', closeAbout);
        if (closeIcon) closeIcon.addEventListener('click', closeAbout);
        if (modal) modal.addEventListener('click', e => e.target === modal && closeAbout());

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeAbout();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

    }

    handleDeepLink(url) {
        // Handle deep linking (e.g., journal://entry/2024-01-15)
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol === 'journal:') {
                const path = urlObj.pathname;
                if (path.startsWith('/entry/')) {
                    const date = path.replace('/entry/', '');
                    ui.selectDate(new Date(date));
                }
            }
        } catch (error) {
            console.error('Error handling deep link:', error);
        }
    }

    handleResize() {
        // Handle responsive layout changes
        const isMobile = window.innerWidth < 640;

        // Adjust calendar view for mobile
        if (ui.currentView === 'calendar' && isMobile) {
            ui.renderCalendar();
        }
    }

    setupPWAInstall() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Show install button or banner
            console.log('PWA install prompt available');
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            deferredPrompt = null;
        });
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            ui.showToast('Conexión restaurada', 'success');
        });

        window.addEventListener('offline', () => {
            ui.showToast('Sin conexión - trabajando offline', 'warning');
        });
    }

    handleInitializationError(error) {
        console.error('Initialization error:', error);

        // Show error to user
        const errorHTML = `
            <div class="fixed inset-0 bg-red-100 dark:bg-red-900 flex items-center justify-center p-4">
                <div class="text-center">
                    <div class="text-6xl mb-4">⚠️</div>
                    <h2 class="text-xl font-bold mb-2">Error al inicializar</h2>
                    <p class="text-red-800 dark:text-red-200 mb-4">
                        Ha ocurrido un error al cargar la aplicación. Por favor, recarga la página.
                    </p>
                    <button onclick="location.reload()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        Recargar
                    </button>
                </div>
            </div>
        `;

        document.body.innerHTML = errorHTML;
    }

    // Utility methods
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }    // Cleanup on page unload
    destroy() {
        // Cleanup all active modals
        if (this.activeModal) {
            this.cleanupMenuListeners(this.activeModal);
            this.activeModal.remove();
            this.activeModal = null;
        }

        // Remove global event listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        if (this.orientationHandler) {
            window.removeEventListener('orientationchange', this.orientationHandler);
        }

        if (journal) {
            journal.destroy();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new DailyJournalApp();
    window.app = app; // Make app globally available

    await app.init();

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        app.destroy();
    });
});

// Handle window errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
