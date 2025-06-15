import { formatDate } from './helpers.js';
import db from './database.js';

export async function renderCalendar(currentMonth, selectDate) {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthEl = document.getElementById('current-month');
    if (!calendarGrid || !currentMonthEl) return;

    currentMonthEl.textContent = formatDate(currentMonth, 'month');

    calendarGrid.innerHTML = '';

    const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-header';
        header.textContent = day;
        calendarGrid.appendChild(header);
    });

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    let monthEntries = [];
    if (db && db.isInitialized) {
        monthEntries = await db.getEntriesForMonth(year, month + 1);
    }

    const today = new Date();
    const cellDate = new Date(startDate);

    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        cell.textContent = cellDate.getDate();

        if (cellDate.getMonth() !== month) {
            cell.classList.add('calendar-cell--disabled');
        }

        if (
            cellDate.getDate() === today.getDate() &&
            cellDate.getMonth() === today.getMonth() &&
            cellDate.getFullYear() === today.getFullYear()
        ) {
            cell.classList.add('calendar-cell--today');
        }

        if (monthEntries.some(e => e.date === formatDate(cellDate, 'short'))) {
            cell.classList.add('calendar-cell--entry');
        }

        cell.addEventListener('click', () => {
            selectDate(cellDate.toISOString().split('T')[0]);
        });

        calendarGrid.appendChild(cell);
        cellDate.setDate(cellDate.getDate() + 1);
    }
}

export function setupCalendarNavigation(onPrev, onNext) {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) prevBtn.addEventListener('click', onPrev);
    if (nextBtn) nextBtn.addEventListener('click', onNext);
}
