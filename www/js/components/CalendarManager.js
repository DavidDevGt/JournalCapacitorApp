export class CalendarManager {
    static DAY_HEADERS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    static WEEKS_TO_SHOW = 6;
    static DAYS_IN_WEEK = 7;

    #ui;
    #currentMonth;
    #navigationSetup = false;
    #prevBtn;
    #nextBtn;
    #calendarGrid;
    #currentMonthEl;

    constructor(uiManager) {
        this.#ui = uiManager;
        this.#currentMonth = new Date();
        this.#prevBtn = document.getElementById('prev-month');
        this.#nextBtn = document.getElementById('next-month');
        this.#calendarGrid = document.getElementById('calendar-grid');
        this.#currentMonthEl = document.getElementById('current-month');
    }

    setup() {
        this.#setupNavigation();
        this.render();
    }

    #setupNavigation() {
        if (this.#navigationSetup) return;
        this.#navigationSetup = true;

        const changeMonth = (delta) => {
            this.#currentMonth.setMonth(this.#currentMonth.getMonth() + delta);
            this.render();
        };

        this.#prevBtn?.addEventListener('click', () => changeMonth(-1));
        this.#nextBtn?.addEventListener('click', () => changeMonth(+1));
    }

    #normalizeDate(date) {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    }

    async render() {
        if (!this.#calendarGrid || !this.#currentMonthEl) return;

        this.#currentMonthEl.textContent = this.#ui.formatDate(this.#currentMonth, 'month');

        this.#calendarGrid.innerHTML = '';
        const frag = document.createDocumentFragment();

        for (const day of CalendarManager.DAY_HEADERS) {
            const dh = document.createElement('div');
            dh.classList.add('calendar-header');
            dh.textContent = day;
            frag.appendChild(dh);
        }

        const year = this.#currentMonth.getFullYear();
        const month = this.#currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const normalizedFirstDay = this.#normalizeDate(firstDay);
        const normalizedLastDay = this.#normalizeDate(lastDay);
        
        const startDate = new Date(normalizedFirstDay);
        const firstDayOfWeek = normalizedFirstDay.getDay(); // 0=Domingo
        startDate.setDate(startDate.getDate() - firstDayOfWeek);
        startDate.setHours(0, 0, 0, 0);

        let entriesMap = new Map();
        if (window.db?.isInitialized) {
            const monthEntries = await window.db.getEntriesForMonth(year, month + 1);
            for (const e of monthEntries) {
                const dbDateKey = e.date;
                entriesMap.set(dbDateKey, e);
                
                const entryDate = this.#normalizeDate(new Date(e.date));
                const formattedKey = this.#ui.formatDateForStorage(entryDate);
                
                console.log('[CalendarManager] Entry mapping:', {
                    originalDate: e.date,
                    dbDateKey,
                    formattedKey,
                    entryDate: entryDate.toISOString(),
                    content: e.content?.substring(0, 30) + '...'
                });
            }
        }

        const today = this.#normalizeDate(new Date());
        const dateIterator = new Date(startDate);

        for (let i = 0; i < CalendarManager.WEEKS_TO_SHOW * CalendarManager.DAYS_IN_WEEK; i++) {
            const currentDate = new Date(dateIterator);
            frag.appendChild(this.#createDayElement(currentDate, month, today, entriesMap));
            dateIterator.setDate(dateIterator.getDate() + 1);
            dateIterator.setHours(0, 0, 0, 0);
        }

        this.#calendarGrid.appendChild(frag);
    }

    #createDayElement(date, month, today, entriesMap) {
        const normalizedDate = this.#normalizeDate(date);
        
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-day');
        dayEl.textContent = normalizedDate.getDate();

        if (normalizedDate.getMonth() !== month) {
            dayEl.classList.add('other-month');
        }
        if (this.#isSameDay(normalizedDate, today)) {
            dayEl.classList.add('today');
        }

        const dateKey = this.#ui.formatDateForStorage(normalizedDate);
        
        const dateKeyISO = normalizedDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const entry = entriesMap.get(dateKey) || entriesMap.get(dateKeyISO);
        
        if (normalizedDate.getDate() === 3 && normalizedDate.getMonth() === 5) { // Si es 3 de junio
            console.log('[CalendarManager] Debug para día 3:', {
                normalizedDate: normalizedDate.toISOString(),
                dateKey,
                dateKeyISO,
                foundEntry: entry,
                availableKeys: Array.from(entriesMap.keys()),
                entryContent: entry?.content
            });
        }
        
        if (entry) {
            dayEl.classList.add('has-entry');
            if (entry.mood) {
                const mood = document.createElement('span');
                mood.className = 'absolute top-0 right-0 text-xs';
                mood.textContent = entry.mood;
                dayEl.style.position = 'relative';
                dayEl.appendChild(mood);
            }
        }

        dayEl.addEventListener('click', () => {
            if (normalizedDate.getMonth() === month) {
                console.log('[CalendarManager] Día seleccionado:', {
                    date: new Date(normalizedDate),
                    dateKey,
                    entry,
                    today: new Date(today),
                    month,
                    entriesMapKeys: Array.from(entriesMap.keys())
                });
                this.#ui.selectDate(new Date(normalizedDate));
            }
        });

        return dayEl;
    }

    #isSameDay(a, b) {
        // Crear copias para no mutar los originales
        const dateA = this.#normalizeDate(a);
        const dateB = this.#normalizeDate(b);
        
        return dateA.getFullYear() === dateB.getFullYear() &&
            dateA.getMonth() === dateB.getMonth() &&
            dateA.getDate() === dateB.getDate();
    }

    setCurrentMonth(date) {
        this.#currentMonth = new Date(date);
        this.render();
    }

    getCurrentMonth() {
        return new Date(this.#currentMonth);
    }

    goToToday() {
        this.#currentMonth = new Date();
        this.render();
    }

    goToPreviousMonth() {
        this.setCurrentMonth(new Date(this.#currentMonth.setMonth(this.#currentMonth.getMonth() - 1)));
    }

    goToNextMonth() {
        this.setCurrentMonth(new Date(this.#currentMonth.setMonth(this.#currentMonth.getMonth() + 1)));
    }
}

// Utiliza la función de helpers para formatear la fecha localmente
// (Asegúrate de que CalendarManager reciba el UIManager con la función corregida)