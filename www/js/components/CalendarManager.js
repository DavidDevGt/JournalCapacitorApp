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
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let entriesMap = new Map();
        if (window.db?.isInitialized) {
            const monthEntries = await window.db.getEntriesForMonth(year, month + 1);
            for (const e of monthEntries) {
                entriesMap.set(e.date, e);
            }
        }

        const today = new Date();
        const dateIterator = new Date(startDate);

        for (let i = 0; i < CalendarManager.WEEKS_TO_SHOW * CalendarManager.DAYS_IN_WEEK; i++) {
            frag.appendChild(this.#createDayElement(new Date(dateIterator), month, today, entriesMap));
            dateIterator.setDate(dateIterator.getDate() + 1);
        }

        this.#calendarGrid.appendChild(frag);
    }

    #createDayElement(date, month, today, entriesMap) {
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-day');
        dayEl.textContent = date.getDate();

        if (date.getMonth() !== month) {
            dayEl.classList.add('other-month');
        }
        if (this.#isSameDay(date, today)) {
            dayEl.classList.add('today');
        }

        const dateKey = this.#ui.formatDateForStorage(date);
        const entry = entriesMap.get(dateKey);
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
            if (date.getMonth() === month) {
                this.#ui.selectDate(new Date(date));
            }
        });

        return dayEl;
    }

    #isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
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
