import { Toast as CapacitorToast } from '@capacitor/toast';

class UIManager {
    constructor() {
        this.currentView = 'today';
        this.currentDate = new Date();
        this.currentMonth = new Date();
        this.isInitialized = false;
        this.toastQueue = [];
    }

    init() {
        this.setupNavigationListeners();
        this.setupDateDisplay();
        this.isInitialized = true;
    }

    setupNavigationListeners() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.bottom-nav-btn').dataset.view;
                this.switchView(view);
            });
        });
    }

    switchView(viewName) {
        if (this.currentView === viewName) return;

        const currentViewEl = document.getElementById(`${this.currentView}-view`);
        if (currentViewEl) {
            currentViewEl.classList.add('hidden');
        }

        const newViewEl = document.getElementById(`${viewName}-view`);
        if (newViewEl) {
            newViewEl.classList.remove('hidden');
            newViewEl.classList.add('animate-fade-in');
        }

        this.updateNavigationState(viewName);
        this.currentView = viewName;

        if (viewName === 'calendar') {
            this.renderCalendar();
        } else if (viewName === 'entries') {
            this.loadAllEntries();
        }
    }

    updateNavigationState(activeView) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            if (tab.dataset.view === activeView) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
            if (btn.dataset.view === activeView) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
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

    async renderCalendar() {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthEl = document.getElementById('current-month');

        if (!calendarGrid || !currentMonthEl) return;

        currentMonthEl.textContent = this.formatDate(this.currentMonth, 'month');

        // Clear calendar
        calendarGrid.innerHTML = '';

        // Add headers
        const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Get month data
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Get database info
        let monthEntries = [];
        if (window.db && window.db.isInitialized) {
            monthEntries = await window.db.getEntriesForMonth(year, month + 1);
        }

        const today = new Date();
        const currentDate = new Date(startDate);

        for (let i = 0; i < 42; i++) { // 6 weeks
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = currentDate.getDate();

            // Add classes based on day type
            if (currentDate.getMonth() !== month) {
                dayEl.classList.add('other-month');
            }

            if (this.isSameDay(currentDate, today)) {
                dayEl.classList.add('today');
            }

            // Check if this day has an entry
            const dateStr = this.formatDateForStorage(currentDate);
            const hasEntry = monthEntries.some(entry => entry.date === dateStr);
            if (hasEntry) {
                dayEl.classList.add('has-entry');

                // Add mood indicator if available
                const entryWithMood = monthEntries.find(entry => entry.date === dateStr && entry.mood);
                if (entryWithMood) {
                    const moodIndicator = document.createElement('span');
                    moodIndicator.className = 'absolute top-0 right-0 text-xs';
                    moodIndicator.textContent = entryWithMood.mood;
                    dayEl.style.position = 'relative';
                    dayEl.appendChild(moodIndicator);
                }
            }

            // Add click listener
            dayEl.addEventListener('click', () => {
                if (currentDate.getMonth() === month) {
                    this.selectDate(new Date(currentDate));
                }
            });

            calendarGrid.appendChild(dayEl);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    setupCalendarNavigation() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
                this.renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
                this.renderCalendar();
            });
        }
    }

    selectDate(date) {
        this.currentDate = new Date(date);
        this.switchView('today');
        this.setupDateDisplay();

        // Trigger entry loading for selected date
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
            // Fallback to custom toast
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

    async loadAllEntries() {
        const entriesList = document.getElementById('entries-list');
        if (!entriesList || !window.db) return;

        try {
            const entries = await window.db.getAllEntries(50);
            this.renderEntriesList(entries);
        } catch (error) {
            console.error('Error loading entries:', error);
            this.showToast('Error al cargar las entradas', 'error');
        }
    }

    renderEntriesList(entries) {
        const entriesList = document.getElementById('entries-list');
        if (!entriesList) return;

        if (entries.length === 0) {
            entriesList.innerHTML = `
                <div class="text-center py-12 text-notion-gray dark:text-notion-gray-dark">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    <h3 class="text-lg font-semibold mb-2">No hay entradas aún</h3>
                    <p>Comienza escribiendo tu primera entrada de diario</p>
                </div>
            `;
            return;
        }

        entriesList.innerHTML = entries.map(entry => this.createEntryCard(entry)).join('');
    }

    createEntryCard(entry) {
        const date = new Date(entry.date);
        const formattedDate = this.formatDate(date, 'short');
        const preview = entry.content.substring(0, 150) + (entry.content.length > 150 ? '...' : '');
        const moodDisplay = entry.mood ? `<span class="text-2xl">${entry.mood}</span>` : '';
        const photoDisplay = entry.photo_path || entry.photoPath ?
            `<div class="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>` : '';

        return `
            <div class="entry-card cursor-pointer" onclick="ui.selectDate(new Date('${entry.date}'))">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center space-x-3">
                        <div>
                            <h3 class="font-semibold text-lg">${formattedDate}</h3>
                            <p class="text-sm text-notion-gray dark:text-notion-gray-dark">
                                ${entry.word_count || entry.wordCount || 0} palabras
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${moodDisplay}
                        ${photoDisplay}
                    </div>
                </div>
                <p class="text-notion-text dark:text-notion-text-dark leading-relaxed">
                    ${preview}
                </p>
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

    async performSearch(query) {
        if (!window.db || query.trim().length < 2) {
            this.loadAllEntries();
            return;
        }

        try {
            const results = await window.db.searchEntries(query.trim());
            this.renderEntriesList(results);
        } catch (error) {
            console.error('Error searching entries:', error);
            this.showToast('Error en la búsqueda', 'error');
        }
    }

    setupDarkMode() {
        const toggle = document.getElementById('dark-mode-toggle');
        if (!toggle) return;

        toggle.addEventListener('click', async () => {
            const isDark = document.documentElement.classList.toggle('dark');

            // Save preference
            if (window.db) {
                await window.db.setSetting('darkMode', isDark.toString());
            }

            // Update status bar if available
            try {
                const { StatusBar } = await import('@capacitor/status-bar');
                await StatusBar.setStyle({
                    style: isDark ? 'Dark' : 'Light'
                });
            } catch (error) {
                // StatusBar not available
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

    slideIn(element, direction = 'right') {
        element.style.transform = direction === 'right' ? 'translateX(100%)' : 'translateX(-100%)';
        element.style.opacity = '0';
        element.classList.remove('hidden');

        requestAnimationFrame(() => {
            element.style.transition = 'all 0.3s ease-out';
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
        });
    }

    slideOut(element, direction = 'left') {
        element.style.transition = 'all 0.3s ease-out';
        element.style.transform = direction === 'left' ? 'translateX(-100%)' : 'translateX(100%)';
        element.style.opacity = '0';

        setTimeout(() => {
            element.classList.add('hidden');
            element.style.transform = '';
            element.style.opacity = '';
            element.style.transition = '';
        }, 300);
    }
}

const ui = new UIManager();

export default ui;
