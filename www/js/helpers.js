import { formatDate, toISODate, fromISODate } from './helpers/date-utils.js';

const LOCALE = 'es-ES'
const SHORT_OPTS = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
}
const OPTIONS = {
    short: SHORT_OPTS,
    full: SHORT_OPTS,
    month: { year: 'numeric', month: 'long' }
}

export const formatDateForStorage = toISODate;

export const isSameDay = (a, b) =>
    toISODate(fromISODate(a)) === toISODate(fromISODate(b));

export const debounce = (fn, ms = 0) => {
    let t
    return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn(...args), ms)
    }
}

export const sanitizeHTML = str => {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

export const escapeHTML = str => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
};

export const createModal = (id, content, className = '') => {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = `fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${className}`;
    modal.innerHTML = content;
    document.body.appendChild(modal);
    return modal;
};

export const removeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        return true;
    }
    return false;
};

export const createCloseButton = (className = '') => `
    <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${className}">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
    </button>
`;

export const createStatCard = (value, label, color) => `
    <div class="bg-${color}-50 dark:bg-${color}-900 p-4 rounded-lg">
        <div class="text-2xl font-bold text-${color}-600 dark:text-${color}-400">${value}</div>
        <div class="text-sm text-${color}-800 dark:text-${color}-200">${label}</div>
    </div>
`;

export const createMenuItemHTML = (icon, text, id) => `
    <button id="${id}" class="menu-item w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <div class="flex items-center space-x-3">
            ${icon}
            <span>${text}</span>
        </div>
    </button>
`;

export const cleanupElement = (element) => {
    if (element._cleanup) {
        element._cleanup.forEach(cleanup => cleanup());
        element._cleanup = [];
    }
};

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const validateEnvironment = () => !!(document && window && localStorage);


export const initializeCapacitor = async () => {
    try {
        const { Capacitor } = await import('@capacitor/core');
        const { App } = await import('@capacitor/app');
        const { StatusBar } = await import('@capacitor/status-bar');
        const { Keyboard } = await import('@capacitor/keyboard');
        const { SplashScreen } = await import('@capacitor/splash-screen');

        if (Capacitor.isNativePlatform()) {
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

            // Configure status bar based on theme
            if (isDarkMode) {
                await StatusBar.setStyle({ style: 'Light' }); // Texto claro para fondo oscuro
                await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
            } else {
                await StatusBar.setStyle({ style: 'Dark' }); // Texto oscuro para fondo claro
                await StatusBar.setBackgroundColor({ color: '#ffffff' });
            }
            // Configure keyboard
            await Keyboard.setResizeMode({ mode: 'none' });
            // Hide splash screen after initialization
            setTimeout(async () => {
                try {
                    await SplashScreen.hide({
                        fadeOutDuration: 500
                    });
                } catch (error) {
                    console.warn('Could not hide splash screen manually, auto-hide will handle it:', error);
                }
            }, 1500);
        }

        return { Capacitor, App, StatusBar, Keyboard, SplashScreen };
    } catch (error) {
        console.warn('Some Capacitor features are not available:', error);
        return null;
    }
};

export const handleDeepLink = (url, ui) => {
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
};

export const handleResize = (ui) => {
    const isMobile = window.innerWidth < 640;
    if (ui.currentView === 'calendar' && isMobile) {
        ui.renderCalendar();
    }
};

export const setupPWAInstall = () => {
    let deferredPrompt;

    const beforeInstallHandler = (e) => {
        e.preventDefault();
        deferredPrompt = e;
    };

    const appInstalledHandler = () => {
        deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', beforeInstallHandler);
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
        window.removeEventListener('beforeinstallprompt', beforeInstallHandler);
        window.removeEventListener('appinstalled', appInstalledHandler);
    };
};

export const setupOfflineDetection = (ui) => {
    const onlineHandler = () => ui.showToast('Conexión restaurada', 'success');
    const offlineHandler = () => ui.showToast('Sin conexión - trabajando offline', 'warning');

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
    };
};

export const createModalWithCleanup = (modalHTML, setupCallback) => {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.querySelector('#' + modalHTML.match(/id="([^"]+)"/)[1]);

    if (setupCallback) {
        setupCallback(modal);
    }

    return modal;
};

export const generateMenuHTML = () => `
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
            
            ${createMenuItemHTML(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
            `, 'Estadísticas', 'stats-menu-btn')}

            ${createMenuItemHTML(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            `, 'Configuración', 'settings-menu-btn')}

            ${createMenuItemHTML(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            `, 'Exportar datos', 'export-menu-btn')}

            ${createMenuItemHTML(`
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            `, 'Acerca de', 'about-menu-btn')}
        </div>
    </div>
`;

export const generateStatsHTML = (stats) => `
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
                ${createStatCard(stats.totalEntries, 'Entradas totales', 'blue')}
                ${createStatCard(stats.totalWords.toLocaleString(), 'Palabras escritas', 'green')}
                ${createStatCard(stats.currentStreak, 'Racha actual (días)', 'purple')}
                ${createStatCard(stats.averageWordsPerEntry, 'Promedio palabras/entrada', 'orange')}
            </div>
        </div>
    </div>
`;

export const generateSettingsHTML = () => `
    <div id="settings-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">Configuración</h3>
                <button data-close-modal class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
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
                    <label class="block text-sm font-medium mb-4">Hora del recordatorio</label>
                    <input 
                        type="time" 
                        id="notification-time" 
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        Recibirás un recordatorio diario a esta hora
                    </p>
                </div>

                <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h4 class="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Análisis de Emociones</h4>
                    
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <div>
                                <span class="text-sm">Detección automática</span>
                                <p class="text-xs text-gray-500 dark:text-gray-400">Detecta tu estado de ánimo mientras escribes</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-mood-toggle" class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2">Sensibilidad de detección</label>
                            <select 
                                id="auto-mood-sensitivity" 
                                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="low">Baja</option>
                                <option value="medium" selected>Media</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <label class="block text-sm font-medium mb-4">Importar datos</label>
                    <input 
                        type="file" 
                        id="import-file" 
                        accept=".json" 
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        Restaurar desde un archivo de respaldo
                    </p>
                </div>
            </div>
        </div>
    </div>
`;


export const generateAboutHTML = () => `
    <div id="about-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6 animate-fadeIn">
        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg text-center transform animate-slideUp border border-gray-200 dark:border-gray-700 space-y-6">
        
        <button id="close-icon" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none focus:outline-none">
            &times;
        </button>
        
        <div class="mt-4 mb-2">
            <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <img src="icon-192.png" alt="Daily Journal Icon" class="w-12 h-12">
            </div>
            <h3 class="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Daily Journal
            </h3>
            <div class="flex items-center justify-center gap-2">
            <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium mb-1">
                v1.0.0
            </span>
            </div>
        </div>
        
        <div class="space-y-6 text-center">
            <div class="bg-gray-50 dark:bg-gray-700  p-4 mx-auto max-w-prose">
                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Una aplicación minimalista para capturar tus pensamientos diarios.
                </p>
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
    </div>
`;

export const handleInitializationError = (error) => {
    console.error('Initialization error:', error);

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
};

export const generateExportConfirmHTML = () => `
    <div id="export-confirm-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6 animate-fadeIn">
        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg text-center transform animate-slideUp border border-gray-200 dark:border-gray-700 space-y-6">
        
            <button id="close-export-confirm" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none focus:outline-none transition-colors duration-200">
                &times;
            </button>
            
            <div class="mt-4 mb-2">
                <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg rounded-full bg-white dark:bg-gradient-to-br dark:from-indigo-500 dark:to-violet-600">
                    <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="3" fill="#fff" class="dark:fill-none" stroke="#444" stroke-width="2" class="dark:stroke-white"/>
                        <path d="M12 8v5m0 0l-2-2m2 2l2-2" stroke="#444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="dark:stroke-white"/>
                        <path d="M8 16h8" stroke="#444" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <h3 class="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-900 to-violet-900 dark:from-indigo-600 dark:to-violet-600 bg-clip-text text-transparent">
                    Exportar Diario
                </h3>
            </div>
            
            <div class="space-y-6 text-center">
                <div class="bg-white dark:bg-gray-700 p-4 mx-auto max-w-prose border border-gray-200 dark:border-gray-600 shadow-sm">
                    <p class="text-gray-900 dark:text-gray-300 leading-relaxed">
                        Se creará un archivo de respaldo completo con todas tus entradas, configuraciones y datos del diario. Este proceso puede tardar unos segundos.
                    </p>
                </div>
                
                <div class="flex flex-row gap-4 pt-4 justify-center items-center">
                    <button id="cancel-export-btn" class="flex-1 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50 transform hover:scale-[1.02] active:scale-[0.98] min-w-[120px] max-w-[180px] shadow-sm">
                        Cancelar
                    </button>
                    <button id="confirm-export-btn" class="flex-1 py-3 
                        bg-indigo-100 text-indigo-900 
                        dark:bg-indigo-700 dark:text-white 
                        hover:bg-indigo-200 dark:hover:bg-indigo-800 
                        font-semibold text-lg 
                        transition-all duration-200 focus:outline-none 
                        focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
                        shadow-sm hover:shadow-md transform hover:scale-[1.03] active:scale-[0.98] 
                        flex items-center justify-center gap-2 min-w-[120px] max-w-[180px]">
                        
                        <svg class="w-5 h-5 text-inherit" fill="none" viewBox="0 0 24 24">
                            <path d="M12 8v5m0 0l-2-2m2 2l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>

                        <span class="drop-shadow-sm">Exportar</span>
                    </button>

                </div>
            </div>
        </div>
    </div>
`;


export const setupCapacitorListeners = (capacitorModules, app, ui, journal) => {
    const { Capacitor, App, StatusBar, Keyboard } = capacitorModules;

    const listeners = [];

    listeners.push(
        App.addListener('appStateChange', ({ isActive }) => {
            if (isActive && app.isInitialized) {
                journal.loadTodayEntry();
            } else if (!isActive && journal.hasUnsavedChanges) {
                journal.saveEntry(true);
            }
        })
    );

    listeners.push(
        App.addListener('backButton', ({ canGoBack }) => {
            if (!canGoBack) {
                App.exitApp();
            } else {
                if (ui.currentView !== 'today') {
                    ui.switchView('today');
                } else {
                    App.exitApp();
                }
            }
        })
    );

    if (Capacitor.isNativePlatform()) {
        listeners.push(
            Keyboard.addListener('keyboardWillShow', (info) => {
                document.body.style.paddingBottom = `${info.keyboardHeight}px`;
            })
        );

        listeners.push(
            Keyboard.addListener('keyboardWillHide', () => {
                document.body.style.paddingBottom = '0px';
            })
        );
    }

    listeners.push(
        App.addListener('appUrlOpen', (event) => {
            handleDeepLink(event.url, ui);
        })
    );

    return () => {
        listeners.forEach(listener => listener.remove());
    };
};

export const showSplashScreen = async () => {
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.show({
            showDuration: 2000,
            fadeInDuration: 200,
            fadeOutDuration: 500,
            autoHide: true
        });
    } catch (error) {
        console.warn('Could not show splash screen:', error);
    }
};

export const hideSplashScreen = async () => {
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide({
            fadeOutDuration: 500
        });
    } catch (error) {
        console.warn('Could not hide splash screen:', error);
    }
};

export const getDailyPrompt = () => {
    const prompts = [
        "¿Qué te hizo sonreír hoy?",
        "¿Qué aprendiste sobre ti mismo?",
        "¿Por qué tres cosas estás agradecido?",
        "¿Cómo te sentiste al despertar hoy?",
        "¿Qué te preocupó hoy?",
        "¿Qué pensamiento no pudiste sacar de tu mente?",
        "¿Qué harías diferente si pudieras repetir el día?",
        "¿Qué momento de paz tuviste hoy?",
        "¿Qué meta pequeña podrías fijarte para mañana?"
    ];

    const HISTORY_KEY = 'dailyPromptHistory';
    const HISTORY_LIMIT = 5;

    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const availablePrompts = prompts.filter(p => !history.includes(p));
    const promptsToUse = availablePrompts.length > 0 ? availablePrompts : prompts;

    const selectedPrompt = promptsToUse[Math.floor(Math.random() * promptsToUse.length)];

    const newHistory = availablePrompts.length > 0
        ? [...history, selectedPrompt].slice(-HISTORY_LIMIT)
        : [selectedPrompt];

    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    return selectedPrompt;
};

// Settings management for auto mood detection and notifications
export const getSettings = () => {
    const defaultSettings = {
        notifications: true,
        notificationTime: '20:00',
        darkMode: 'auto',
        sentimentAnalysis: true,
        autoMoodDetection: true,
        autoMoodSensitivity: 'medium' // low, medium, high
    };

    const saved = localStorage.getItem('journal-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
};

// Async version that syncs with database
export const getSettingsAsync = async () => {
    const settings = getSettings();

    // If database is available, sync notification settings
    if (window.db && window.db.isInitialized) {
        try {
            const dbNotificationsEnabled = await window.db.getSetting('notificationsEnabled', 'true');
            const dbNotificationTime = await window.db.getSetting('notificationTime', '20:00');

            settings.notifications = dbNotificationsEnabled === 'true';
            settings.notificationTime = dbNotificationTime;
        } catch (error) {
            console.warn('Could not load notification settings from database:', error);
        }
    }

    return settings;
};

export const saveSettings = (settings) => {
    localStorage.setItem('journal-settings', JSON.stringify(settings));
    return settings;
};

export const applyTheme = (darkMode) => {
    if (darkMode === 'dark' || (darkMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

// Show settings modal with event handling
export const showSettingsModal = async () => {
    const settings = await getSettingsAsync();

    const settingsHTML = generateSettingsHTML();
    const modal = createModalWithCleanup(settingsHTML, (modal) => {
        // Get elements
        const notificationsToggle = document.getElementById('notifications-toggle');
        const notificationTime = document.getElementById('notification-time');
        const autoMoodToggle = document.getElementById('auto-mood-toggle');
        const autoMoodSensitivity = document.getElementById('auto-mood-sensitivity');
        const importFile = document.getElementById('import-file');

        // Set current values from settings
        if (notificationsToggle) {
            notificationsToggle.checked = settings.notifications;
        }
        if (notificationTime) {
            notificationTime.value = settings.notificationTime;
        }
        if (autoMoodToggle) {
            autoMoodToggle.checked = settings.autoMoodDetection;
        }
        if (autoMoodSensitivity) {
            autoMoodSensitivity.value = settings.autoMoodSensitivity;
        }

        // Function to save current settings automatically and sync notifications
        const saveCurrentSettings = async () => {
            const newSettings = {
                notifications: notificationsToggle?.checked || false,
                notificationTime: notificationTime?.value || '20:00',
                autoMoodDetection: autoMoodToggle?.checked || false,
                autoMoodSensitivity: autoMoodSensitivity?.value || 'medium'
            };

            // Save to localStorage
            saveSettings(newSettings);

            // Sync notifications with journal system if available
            if (window.journal) {
                try {
                    // Update database settings for notifications
                    if (window.db) {
                        await window.db.setSetting('notificationsEnabled', newSettings.notifications.toString());
                        await window.db.setSetting('notificationTime', newSettings.notificationTime);
                    }

                    // Update notification scheduling
                    if (newSettings.notifications) {
                        await window.journal.scheduleNotifications();
                    } else {
                        await window.journal.toggleNotifications(false);
                    }
                } catch (error) {
                    console.warn('Error syncing notifications:', error);
                }
            }

            // Show brief confirmation
            if (window.ui) {
                window.ui.showToast('✓ Guardado', 'success', 1000);
            }
        };

        // Auto-save event listeners
        if (notificationsToggle) {
            notificationsToggle.addEventListener('change', saveCurrentSettings);
        }

        if (notificationTime) {
            notificationTime.addEventListener('change', saveCurrentSettings);
        }

        if (autoMoodToggle) {
            autoMoodToggle.addEventListener('change', saveCurrentSettings);
        }

        if (autoMoodSensitivity) {
            autoMoodSensitivity.addEventListener('change', saveCurrentSettings);
        }

        // Import file handler
        if (importFile) {
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && window.journal) {
                    window.journal.importEntries(file);
                    closeModal();
                }
            });
        }

        // Close modal handler
        const closeBtn = modal.querySelector('[data-close-modal]');
        const closeModal = () => {
            cleanupElement(modal);
            document.body.removeChild(modal);
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    });

    return modal;
};

export { formatDate, fromISODate };