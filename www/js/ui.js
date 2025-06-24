import { Toast as CapacitorToast } from '@capacitor/toast';
import { VirtualScrollManager } from './components/VirtualScrollManager';
import { CalendarManager } from './components/CalendarManager';
import { NavigationManager } from './components/NavigationManager';

class UIManager {
    constructor() {
        this.currentView = 'today';
        this.currentDate = new Date();
        this.currentMonth = new Date();
        this.isInitialized = false;
        this.toastQueue = [];
        this.virtualScrollManager = new VirtualScrollManager(this);
        this.calendarManager = new CalendarManager(this);
        this.navigationManager = new NavigationManager(this);
    }

    init() {
        this.setupDateDisplay();
        // Inicializa el navigation manager
        this.navigationManager.setup();
        // Inicializa el virtual scroll manager
        this.virtualScrollManager.setup();
        // Inicializa el calendar manager
        this.calendarManager.setup();
        this.isInitialized = true;
    }

    // Delegated navigation methods
    switchView(viewName) {
        this.navigationManager.switchView(viewName);
    }

    slideIn(element, direction = 'right') {
        this.navigationManager.slideIn(element, direction);
    }

    slideOut(element, direction = 'left') {
        this.navigationManager.slideOut(element, direction);
    }

    renderEntriesList(entries) {
        this.virtualScrollManager.loadEntries(entries);
    }

    scrollToIndex(index) {
        this.virtualScrollManager.scrollToIndex(index);
    }

    scrollToDate(date) {
        this.virtualScrollManager.scrollToDate(date);
    }

    getVisibleEntries() {
        return this.virtualScrollManager.getVisibleEntries();
    }

    adjustItemHeight(minHeight = 150, maxHeight = 300) {
        this.virtualScrollManager.adjustItemHeight(minHeight, maxHeight);
    }

    getVirtualScrollDebugInfo() {
        return this.virtualScrollManager.getDebugInfo();
    }

    cleanup() {
        this.virtualScrollManager.destroy();
        // No need to remove navigation listeners as NavigationManager handles this
    }

    setupDateDisplay() {
        const dateEl = document.getElementById('current-date');
        if (dateEl) {
            dateEl.textContent = this.formatDate(this.currentDate, 'full');
        }
    }

    formatDate(date, format = 'short') {
        const options = {
            short: {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            },
            full: {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            },
            month: {
                year: 'numeric',
                month: 'long'
            }
        };
        return new Intl.DateTimeFormat('es-ES', options[format]).format(date);
    }

    formatDateForStorage(date) {
        return date.toISOString().split('T')[0];
    }

    selectDate(date) {
        console.log(`📅 Selecting date: ${date}`);

        this.currentDate = new Date(date);
        this.switchView('today');
        this.setupDateDisplay();

        if (window.stateManager) {
            const currentStateDate = window.stateManager.getState().currentDate;
            const newDateStr = this.formatDateForStorage(date);
            const currentStateStr = this.formatDateForStorage(currentStateDate);
            if (newDateStr !== currentStateStr) {
                window.stateManager.setCurrentDate(date);
            }
        }
        if (window.journal) {
            window.journal.loadEntryForDate(this.formatDateForStorage(date));
        }
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    async showToast(message, type = 'info', duration = 3000) {
        try {
            await CapacitorToast.show({
                text: message,
                duration: duration === 3000 ? 'short' : 'long',
                position: 'bottom'
            });
        } catch (error) {
            this.showCustomToast(message, type, duration);
        }
    }

    showCustomToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            setTimeout(() => {
                toast.classList.add('opacity-100');
            }, 10);
            setTimeout(() => {
                toast.classList.remove('opacity-100');
                setTimeout(() => {
                    if (container.contains(toast)) {
                        container.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }
    }

    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('hidden');
        }
    }

    createEntryCard(entry) {
        const date = new Date(entry.date);
        const formattedDate = this.formatDate(date, 'short');
        const preview = entry.content.substring(0, 180) + (entry.content.length > 180 ? '...' : '');
        const moodDisplay = entry.mood ? `<div class="mood-indicator flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center shadow-sm border border-blue-100 dark:border-blue-800/50">
            <span class="text-2xl">${entry.mood}</span>
        </div>` : '';
        const photoPath = entry.photo_path || entry.photoPath;
        const thumbnailPath = entry.thumbnail_path || entry.thumbnailPath || photoPath;
        
        const photoDisplay = thumbnailPath ?
            `<div class="entry-photo-card relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300 group cursor-pointer">
                <img src="${thumbnailPath}" 
                     alt="Foto de la entrada" 
                     class="w-20 h-20 object-cover opacity-0 transition-all duration-500 group-hover:scale-105" 
                     loading="lazy"
                     onload="this.style.opacity='1'"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="w-20 h-20 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600" style="display:none;">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl"></div>
            </div>` : '';
        return `
            <div class="entry-card-material group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer transform transition-all duration-300 hover:-translate-y-1" onclick="ui.selectDate(new Date('${entry.date}'))">
                <!-- Material Design accent line -->
                <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <!-- Card content -->
                <div class="relative p-6">
                    <!-- Header with date and metadata -->
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">${formattedDate}</h3>
                            <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                                <div class="flex items-center space-x-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span>${entry.word_count || entry.wordCount || 0} palabras</span>
                                </div>
                                ${entry.content.length > 180 ? `
                                <div class="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                    </svg>
                                    <span class="font-medium">Leer más</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Mood and photo section -->
                        <div class="flex items-center space-x-3 ml-4">
                            ${moodDisplay}
                            ${photoDisplay ? `<div onclick="event.stopPropagation(); ui.showImagePreview('${photoPath || thumbnailPath}')">${photoDisplay}</div>` : ''}
                        </div>
                    </div>
                    <!-- Content preview -->
                    <div class="relative">
                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-base line-clamp-3">
                            ${preview}
                        </p>
                        ${entry.content.length > 180 ? `
                        <div class="absolute bottom-0 right-0 h-6 w-20 bg-gradient-to-l from-white dark:from-gray-800 to-transparent"></div>
                        ` : ''}
                    </div>
                </div>
                <!-- Ripple effect overlay -->
                <div class="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500"></div>
                </div>
            </div>
        `;
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 500);
            });
        }
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.switchView('entries');
                setTimeout(() => {
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        searchInput.focus();
                    }
                }, 100);
            });
        }
    }

    updateDarkModeIcon() {
        const lightIcon = document.getElementById('light-mode-icon');
        const darkIcon = document.getElementById('dark-mode-icon');
        const isDark = document.documentElement.classList.contains('dark');
        if (lightIcon && darkIcon) {
            if (isDark) {
                lightIcon.classList.add('hidden');
                darkIcon.classList.remove('hidden');
            } else {
                lightIcon.classList.remove('hidden');
                darkIcon.classList.add('hidden');
            }
        }
    }

    setupDarkMode() {
        const toggle = document.getElementById('dark-mode-toggle');
        if (!toggle) return;
        this.updateDarkModeIcon();
        toggle.addEventListener('click', async () => {
            const isDark = document.documentElement.classList.toggle('dark');
            this.updateDarkModeIcon();
            if (window.db) {
                await window.db.setSetting('darkMode', isDark.toString());
            }
            try {
                const { StatusBar } = await import('@capacitor/status-bar');
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform()) {
                    await StatusBar.setStyle({
                        style: isDark ? 'Light' : 'Dark'
                    });
                    await StatusBar.setBackgroundColor({
                        color: isDark ? '#1a1a1a' : '#ffffff'
                    });
                }
            } catch (error) {
                console.warn('StatusBar not available:', error);
            }
        });
    }

    async loadDarkModePreference() {
        if (!window.db) return;
        try {
            const darkMode = await window.db.getSetting('darkMode', 'false');
            if (darkMode === 'true') {
                document.documentElement.classList.add('dark');
            }
            this.updateDarkModeIcon();
        } catch (error) {
            console.error('Error loading dark mode preference:', error);
        }
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
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showImagePreview(imageSrc) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="relative max-w-4xl max-h-full">
                <button class="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <img src="${imageSrc}" 
                     alt="Vista previa de imagen" 
                     class="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                     onclick="event.stopPropagation()">
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        document.body.appendChild(modal);
        requestAnimationFrame(() => {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
            });
        });
    }

    async loadAllEntries() {
        if (!window.db) return;
        try {
            this.showLoading();
            const entries = await window.db.getAllEntries();
            this.renderEntriesList(entries);
        } catch (error) {
            console.error('Error loading entries:', error);
            this.showToast('Error al cargar las entradas', 'error');
        } finally {
            this.hideLoading();
        }
    }

    setupCalendarNavigation() {
        if (this.calendarManager && typeof this.calendarManager.setupNavigation === 'function') {
            this.calendarManager.setupNavigation();
        }
    }
}

const ui = new UIManager();
export default ui;