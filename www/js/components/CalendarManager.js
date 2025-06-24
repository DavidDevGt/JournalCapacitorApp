export class CalendarManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.currentMonth = new Date();
    }

    setup() {
        this.setupNavigation();
    }

    setupNavigation() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
                this.render();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
                this.render();
            });
        }
    }

    async render() {
        const calendarGrid = document.getElementById('calendar-grid');
        const currentMonthEl = document.getElementById('current-month');

        if (!calendarGrid || !currentMonthEl) return;

        currentMonthEl.textContent = this.ui.formatDate(this.currentMonth, 'month');

        calendarGrid.innerHTML = '';
        
        // Add day headers
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

        // Load entries for this month
        let monthEntries = [];
        if (window.db && window.db.isInitialized) {
            monthEntries = await window.db.getEntriesForMonth(year, month + 1);
        }

        const today = new Date();
        const currentDate = new Date(startDate);

        // Generate calendar days
        for (let i = 0; i < 42; i++) { // 6 weeks
            const dayEl = this.createDayElement(currentDate, month, today, monthEntries);
            calendarGrid.appendChild(dayEl);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    createDayElement(currentDate, month, today, monthEntries) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = currentDate.getDate();

        // Style for other months
        if (currentDate.getMonth() !== month) {
            dayEl.classList.add('other-month');
        }

        // Highlight today
        if (this.isSameDay(currentDate, today)) {
            dayEl.classList.add('today');
        }

        // Check for entries
        const dateStr = this.ui.formatDateForStorage(currentDate);
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

        // Add click handler
        dayEl.addEventListener('click', () => {
            if (currentDate.getMonth() === month) {
                this.ui.selectDate(new Date(currentDate));
            }
        });

        return dayEl;
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    setCurrentMonth(date) {
        this.currentMonth = new Date(date);
        this.render();
    }

    getCurrentMonth() {
        return new Date(this.currentMonth);
    }

    goToToday() {
        this.currentMonth = new Date();
        this.render();
    }

    goToPreviousMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.render();
    }

    goToNextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.render();
    }
}