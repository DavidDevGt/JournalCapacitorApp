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
        this.setupGestureNavigation();
        this.isInitialized = true;
    }

    setupNavigationListeners() {        // Navigation event listeners
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Material Design bottom navigation
        document.querySelectorAll('.material-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.target.closest('.material-tab').dataset.view;
                this.switchView(view);
                this.triggerRippleEffect(e.target.closest('.material-tab'), e);
            });
        });
    } triggerRippleEffect(tab, event) {
        const ripple = tab.querySelector('.material-tab-ripple');
        if (!ripple) return;

        // Reset ripple
        ripple.style.width = '0';
        ripple.style.height = '0';

        // Get click position relative to tab
        const rect = tab.getBoundingClientRect();
        let x, y;

        // Handle different event types (click, touch, keyboard)
        if (event.type === 'click' || event.type === 'touchstart') {
            const clientX = event.clientX || (event.touches && event.touches[0]?.clientX);
            const clientY = event.clientY || (event.touches && event.touches[0]?.clientY);

            if (clientX !== undefined && clientY !== undefined) {
                x = clientX - rect.left;
                y = clientY - rect.top;
            } else {
                // Fallback to center if no coordinates available
                x = rect.width / 2;
                y = rect.height / 2;
            }
        } else {
            // For keyboard navigation, center the ripple
            x = rect.width / 2;
            y = rect.height / 2;
        }

        // Position ripple at interaction point
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.transform = 'translate(-50%, -50%)';

        // Calculate ripple size based on tab dimensions
        const maxDimension = Math.max(rect.width, rect.height);
        const rippleSize = Math.min(maxDimension * 0.8, 48); // Max 48px as per Material Design

        // Trigger ripple animation
        requestAnimationFrame(() => {
            ripple.style.width = rippleSize + 'px';
            ripple.style.height = rippleSize + 'px';
        });

        // Reset after animation
        setTimeout(() => {
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.left = '50%';
            ripple.style.top = '50%';
            ripple.style.transform = 'translate(-50%, -50%)';
        }, 300);
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
    } updateNavigationState(activeView) {
        // Update top navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            if (tab.dataset.view === activeView) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update Material Design bottom navigation
        document.querySelectorAll('.material-tab').forEach(tab => {
            if (tab.dataset.view === activeView) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
            }
        });

        // Backwards compatibility: keep old bottom-nav-btn support if exists
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

                const entryWithMood = monthEntries.find(entry => entry.date === dateStr && entry.mood);
                if (entryWithMood) {
                    const moodIndicator = document.createElement('span');
                    moodIndicator.className = 'absolute top-0 right-0 text-xs';
                    moodIndicator.textContent = entryWithMood.mood;
                    dayEl.style.position = 'relative';
                    dayEl.appendChild(moodIndicator);
                }
            }
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
        const moodDisplay = entry.mood ? `<span class="text-2xl">${entry.mood}</span>` : '';        // Generate photo display with actual thumbnail
        const photoPath = entry.photo_path || entry.photoPath;
        const thumbnailPath = entry.thumbnail_path || entry.thumbnailPath || photoPath; const photoDisplay = thumbnailPath ?
            `<div class="entry-thumbnail-large bg-gray-100 dark:bg-gray-600 flex-shrink-0 thumbnail-loading" title="Ver foto completa">
                <img src="${thumbnailPath}" 
                     alt="Foto de la entrada" 
                     class="opacity-0 transition-opacity duration-300" 
                     loading="lazy"
                     onload="this.style.opacity='1'; this.parentElement.classList.remove('thumbnail-loading')"
                     onerror="this.parentElement.classList.remove('thumbnail-loading'); this.parentElement.classList.add('thumbnail-error'); this.parentElement.innerHTML='<div class=&quot;w-full h-full flex items-center justify-center&quot;><svg class=&quot;w-6 h-6 text-gray-400&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; viewBox=&quot;0 0 24 24&quot;><path stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot; stroke-width=&quot;2&quot; d=&quot;M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z&quot;></path></svg></div>'"
                     onclick="event.stopPropagation(); ui.showImagePreview('${photoPath || thumbnailPath}')">
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
    } setupDarkMode() {
        const toggle = document.getElementById('dark-mode-toggle');
        if (!toggle) return;

        this.updateDarkModeIcon();

        toggle.addEventListener('click', async () => {
            const isDark = document.documentElement.classList.toggle('dark');

            this.updateDarkModeIcon();

            // Save preference
            if (window.db) {
                await window.db.setSetting('darkMode', isDark.toString());
            }

            // Update status bar and splash screen for native platforms
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
                // StatusBar not available
                console.warn('StatusBar not available:', error);
            }
        });
    } async loadDarkModePreference() {
        if (!window.db) return;

        try {
            const darkMode = await window.db.getSetting('darkMode', 'false');
            if (darkMode === 'true') {
                document.documentElement.classList.add('dark');
            }
            // Actualizar icono después de cargar la preferencia
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

    setupGestureNavigation() {
        const views = ['today', 'calendar', 'entries'];
        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartY = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;

            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                const currentIndex = views.indexOf(this.currentView);

                if (deltaX > 50 && currentIndex > 0) {
                    this.switchView(views[currentIndex - 1]);
                } else if (deltaX < -50 && currentIndex < views.length - 1) {
                    this.switchView(views[currentIndex + 1]);
                }
            }
        });
    }
}

const ui = new UIManager();
export default ui;
