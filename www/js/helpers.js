// helpers.js - Versión refactorizada

const LOCALE = 'es-ES'
const SHORT_OPTS = {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
}
const OPTIONS = {
    short: SHORT_OPTS,
    full: SHORT_OPTS,
    month: { year: 'numeric', month: 'long' }
}

// Funciones de fecha y formato existentes
export const formatDate = (date, fmt = 'short') =>
    new Intl.DateTimeFormat(LOCALE, OPTIONS[fmt] || OPTIONS.short).format(date)

export const formatDateForStorage = date =>
    date.toISOString().slice(0, 10)

export const isSameDay = (a, b) =>
    a.toDateString() === b.toDateString()

export const debounce = (fn, ms = 0) => {
    let t
    return (...args) => {
        clearTimeout(t)
        t = setTimeout(() => fn(...args), ms)
    }
}

export const formatFileSize = bytes => {
    if (!bytes) return '0 Bytes'
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
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

// Funciones de modal existentes
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

export const addEventListenerWithCleanup = (element, event, handler) => {
    element.addEventListener(event, handler);
    element._cleanup = element._cleanup || [];
    element._cleanup.push(() => element.removeEventListener(event, handler));
};

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

        console.log(`📱 Platform: ${Capacitor.getPlatform()}`);

        if (Capacitor.isNativePlatform()) {
            const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

            if (isDarkMode) {
                await StatusBar.setStyle({ style: 'Light' }); // Texto claro para fondo oscuro
                await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
            } else {
                await StatusBar.setStyle({ style: 'Dark' }); // Texto oscuro para fondo claro
                await StatusBar.setBackgroundColor({ color: '#ffffff' });
            }
            await Keyboard.setResizeMode({ mode: 'none' });
        }

        return { Capacitor, App, StatusBar, Keyboard };
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
        console.log('PWA install prompt available');
    };

    const appInstalledHandler = () => {
        console.log('PWA was installed');
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

export const setupElementCleanup = (element, cleanupHandlers = []) => {
    element._cleanup = element._cleanup || [];
    element._cleanup.push(...cleanupHandlers);

    const cleanupAll = () => {
        if (element._cleanup) {
            element._cleanup.forEach(cleanup => cleanup());
            element._cleanup = [];
        }
    };

    return cleanupAll;
};

// Menu HTML generator
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

// Stats modal HTML generator
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

// Settings modal HTML generator
export const generateSettingsHTML = () => `
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


// About modal HTML generator
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
            <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium mb-4">
                v1.0.0
            </span>
            </div>
        </div>
        
        <div class="space-y-6 text-center">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mx-auto max-w-prose">
                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Una aplicación minimalista de diario personal con estética tipo Notion para capturar tus pensamientos diarios.
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

export const setupCapacitorListeners = (capacitorModules, app, ui, journal) => {
    const { Capacitor, App, StatusBar, Keyboard } = capacitorModules;

    const listeners = [];

    listeners.push(
        App.addListener('appStateChange', ({ isActive }) => {
            console.log('App state changed. Is active:', isActive);
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
            console.log('App opened with URL:', event.url);
            handleDeepLink(event.url, ui);
        })
    );

    return () => {
        listeners.forEach(listener => listener.remove());
    };
};