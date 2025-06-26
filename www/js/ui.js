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
        this.navigationManager.setup();
        this.virtualScrollManager.setup();
        this.calendarManager.setup();
        this.isInitialized = true;
    }

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
        // Usar hora local para evitar desfase por zona horaria
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    selectDate(date) {
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

    const moodDisplay = entry.mood ? `
    <div class="mood-indicator flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-2xl flex items-center justify-center shadow-lg border border-amber-200/60 dark:border-amber-700/60 hover:scale-110 transition-transform duration-200">
        <span class="text-2xl filter drop-shadow-sm">${entry.mood}</span>
    </div>` : '';

    const photoPath = entry.photo_path || entry.photoPath;
    const thumbnailPath = entry.thumbnail_path || entry.thumbnailPath || photoPath;

    const wordCount = entry.content ? entry.content.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
    
    const wordCountDisplay = wordCount > 0 ? `
    <div class="flex items-center gap-2 text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-600/40">
        <span class="material-icons text-sm">edit_note</span>
        <span class="text-xs font-medium">${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'}</span>
    </div>` : `
    <div class="flex items-center gap-2 text-slate-500 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-600/30">
        <span class="material-icons text-sm">article</span>
        <span class="text-xs font-medium">Sin contenido</span>
    </div>`;

    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    const readingTimeDisplay = wordCount > 0 ? `
    <div class="flex items-center gap-1.5 text-slate-500">
        <span class="material-icons text-sm">schedule</span>
        <span class="text-xs">${readingTime} min</span>
    </div>` : '';

    const imageDisplay = thumbnailPath ? `
    <div class="relative group/image">
        <img src="${thumbnailPath}" alt="Foto adjunta" class="w-12 h-12 object-cover rounded-2xl border border-slate-600/70 shadow-lg transition-all duration-300 group-hover/image:scale-105" />
        <div class="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-2 border-slate-800 shadow-sm">
            <div class="absolute inset-0.5 bg-white/20 rounded-full animate-pulse"></div>
        </div>
        <div class="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-200"></div>
    </div>` : '';

    return `
    <div class="journal-card group relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-3xl shadow-xl border border-slate-700/60 p-6 mb-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:border-slate-600/80 hover:from-slate-800 hover:to-slate-900 focus-within:ring-2 focus-within:ring-blue-500/60 focus-within:ring-offset-2 focus-within:ring-offset-slate-900">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <div class="relative flex items-start justify-between mb-5">
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-slate-200 bg-gradient-to-r from-slate-700/80 to-slate-600/80 px-3 py-1.5 rounded-full border border-slate-600/60 shadow-sm backdrop-blur-sm">
                    ${formattedDate}
                </span>
                ${readingTimeDisplay}
            </div>
            <div class="flex items-center gap-3">
                ${moodDisplay}
                ${imageDisplay}
                <button class="entry-menu-btn opacity-70 hover:opacity-100 focus:opacity-100 transition-all duration-200 p-2.5 rounded-2xl hover:bg-slate-700/60 focus:bg-slate-700/60 hover:scale-110 focus:scale-110 group/btn" title="Más opciones">
                    <span class="material-icons text-lg text-slate-400 group-hover/btn:text-slate-200 transition-colors duration-200">more_vert</span>
                </button>
            </div>
        </div>
        
        <div class="relative mb-6">
            <p class="text-slate-100 leading-relaxed text-sm md:text-base line-clamp-4 group-hover:text-white transition-colors duration-300 font-light tracking-wide">
                ${preview}
            </p>
            <div class="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-800/95 to-transparent pointer-events-none opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
        </div>
        
        <div class="relative flex items-center justify-between pt-4 border-t border-slate-700/50 group-hover:border-slate-600/60 transition-colors duration-300">
            ${wordCountDisplay}
            
            <button class="entry-view-btn flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:from-blue-700 focus:to-blue-800 text-white text-xs font-bold rounded-2xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 focus:scale-105 focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-2 focus:ring-offset-slate-900 group/viewbtn">
                <span class="material-icons text-sm group-hover/viewbtn:scale-110 transition-transform duration-200">visibility</span>
                <span>Ver entrada</span>
            </button>
        </div>
        
        <div class="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent"></div>
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