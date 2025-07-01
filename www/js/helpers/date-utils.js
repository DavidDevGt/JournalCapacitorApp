export function fromISODate(str) {
    if (!str) return new Date(NaN); // Maneja undefined/null
    if (str instanceof Date) return str; // Ya es Date
    if (typeof str === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const [year, month, day] = str.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        // Si es un string ISO completo
        return new Date(str);
    }
    return new Date(NaN); // Fallback para tipos inesperados
}

export function fromISODateTime(str) {
    return new Date(str);
}

export function parseDate(str, format = 'dd/mm/yyyy') {
    if (format === 'dd/mm/yyyy') {
        const [day, month, year] = str.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
    if (format === 'mm/dd/yyyy') {
        const [month, day, year] = str.split('/').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(str);
}

export function toISODate(date) {
    return date.toISOString().slice(0, 10);
}

export function toISODateTime(date) {
    return date.toISOString();
}

export function formatDate(date, locale = 'es-ES', options = {}, format) {
    locale = locale || 'es-ES';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (!d || isNaN(d)) return '';
    if (format === 'month') {
        const mes = d.toLocaleString(locale, { month: 'long' });
        const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
        return `${mesCapitalizado} ${d.getFullYear()}`;
    }
    const defaultOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString(locale, { ...defaultOptions, ...options });
}

export function formatDateTime(date, locale = 'es-ES', options = {}) {
    locale = locale || 'es-ES';
    const defaultOptions = { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString(locale, { ...defaultOptions, ...options });
}

export function formatTime(date, locale = 'es-ES', options = {}) {
    locale = locale || 'es-ES';
    const defaultOptions = { hour: '2-digit', minute: '2-digit' };
    return date.toLocaleTimeString(locale, { ...defaultOptions, ...options });
}

export function formatRelative(date, locale = 'es-ES') {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const now = new Date();
    const diffInSeconds = Math.floor((date - now) / 1000);
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
        { label: 'second', seconds: 1 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
        if (count >= 1) {
            return rtf.format(diffInSeconds < 0 ? -count : count, interval.label);
        }
    }
    
    return rtf.format(0, 'second');
}

export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}

export function addYears(date, years) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

export function subtractDays(date, days) {
    return addDays(date, -days);
}

export function subtractMonths(date, months) {
    return addMonths(date, -months);
}

export function subtractYears(date, years) {
    return addYears(date, -years);
}

export function isSameDay(date1, date2) {
    return toISODate(date1) === toISODate(date2);
}

export function isSameMonth(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() && 
           date1.getMonth() === date2.getMonth();
}

export function isSameYear(date1, date2) {
    return date1.getFullYear() === date2.getFullYear();
}

export function isBefore(date1, date2) {
    return date1 < date2;
}

export function isAfter(date1, date2) {
    return date1 > date2;
}

export function isBetween(date, startDate, endDate) {
    return date >= startDate && date <= endDate;
}

export function getDayOfWeek(date, locale = 'es-ES') {
    locale = locale || 'es-ES';
    return date.toLocaleDateString(locale, { weekday: 'long' });
}

export function getMonthName(date, locale = 'es-ES') {
    locale = locale || 'es-ES';
    return date.toLocaleDateString(locale, { month: 'long' });
}

export function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getLastDayOfMonth(date) {
    const lastDay = getDaysInMonth(date);
    return new Date(date.getFullYear(), date.getMonth(), lastDay);
}

export function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

export function diffInDays(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function diffInMonths(date1, date2) {
    const yearsDiff = date2.getFullYear() - date1.getFullYear();
    const monthsDiff = date2.getMonth() - date1.getMonth();
    return yearsDiff * 12 + monthsDiff;
}

export function diffInYears(date1, date2) {
    return date2.getFullYear() - date1.getFullYear();
}

export function getAge(birthDate, referenceDate = new Date()) {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

export function isValidDate(date) {
    return date instanceof Date && !isNaN(date);
}

export function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo o Sábado
}

export function isWeekday(date) {
    return !isWeekend(date);
}

export function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

export function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

export function startOfWeek(date, weekStartsOn = 1) { // 1 = Lunes
    const result = new Date(date);
    const day = result.getDay();
    const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
    result.setDate(result.getDate() - diff);
    return startOfDay(result);
}

export function endOfWeek(date, weekStartsOn = 1) {
    const result = startOfWeek(date, weekStartsOn);
    result.setDate(result.getDate() + 6);
    return endOfDay(result);
}

export function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfYear(date) {
    return new Date(date.getFullYear(), 0, 1);
}

export function endOfYear(date) {
    return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

export function getDateRange(startDate, endDate) {
    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
}

export function getWeekdays(startDate, endDate) {
    return getDateRange(startDate, endDate).filter(isWeekday);
}

export function getWeekends(startDate, endDate) {
    return getDateRange(startDate, endDate).filter(isWeekend);
}

export function getTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function convertToTimezone(date, timezone) {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

export const MILLISECONDS_IN_SECOND = 1000;
export const SECONDS_IN_MINUTE = 60;
export const MINUTES_IN_HOUR = 60;
export const HOURS_IN_DAY = 24;
export const DAYS_IN_WEEK = 7;
export const MONTHS_IN_YEAR = 12;

export const MILLISECONDS_IN_MINUTE = MILLISECONDS_IN_SECOND * SECONDS_IN_MINUTE;
export const MILLISECONDS_IN_HOUR = MILLISECONDS_IN_MINUTE * MINUTES_IN_HOUR;
export const MILLISECONDS_IN_DAY = MILLISECONDS_IN_HOUR * HOURS_IN_DAY;
export const MILLISECONDS_IN_WEEK = MILLISECONDS_IN_DAY * DAYS_IN_WEEK;