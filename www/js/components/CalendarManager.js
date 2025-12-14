import { formatDate, formatDateForStorage, fromISODate } from '../helpers.js';
import registry from '../registry.js';

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
    
    // Cache para optimización
    #cachedEntries = new Map();
    #lastFetchedMonth = null;
    #dayElementPool = [];
    #headerElements = null;
    #cacheTimestamp = null;
    #cacheVersion = 0;
    #maxCacheAge = 5 * 60 * 1000; // 5 minutos
    #renderInProgress = false;
    #currentRenderId = 0;

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
        this.#preCreateHeaderElements();
        this.render();
    }

    #setupNavigation() {
        if (this.#navigationSetup) return;
        this.#navigationSetup = true;

        const changeMonth = (delta) => {
            // Cancelar render anterior si está en progreso
            if (this.#renderInProgress) {
                this.#currentRenderId++;
                this.#renderInProgress = false;
            }
            
            this.#currentMonth.setMonth(this.#currentMonth.getMonth() + delta);
            this.render();
        };

        this.#prevBtn?.addEventListener('click', () => changeMonth(-1));
        this.#nextBtn?.addEventListener('click', () => changeMonth(+1));
    }

    // Pre-crear elementos de encabezado para evitar recrearlos
    #preCreateHeaderElements() {
        if (this.#headerElements) return;
        
        this.#headerElements = document.createDocumentFragment();
        for (const day of CalendarManager.DAY_HEADERS) {
            const dh = document.createElement('div');
            dh.classList.add('calendar-header');
            dh.textContent = day;
            this.#headerElements.appendChild(dh);
        }
    }

    #normalizeDate(date) {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
    }

    // Optimización: cachear entradas por mes con validación robusta
    async #getEntriesForMonth(year, month) {
        const monthKey = `${year}-${month}`;
        const now = Date.now();
        
        // Verificar si el cache es válido
        const isCacheValid = this.#isCacheValid(monthKey, now);
        
        if (isCacheValid && this.#cachedEntries.size > 0) {
            return this.#cachedEntries;
        }

        // Limpiar cache antes de nueva carga
        this.#clearCacheData();
        
        try {
            if (!registry.db?.isInitialized) {
                this.#updateCacheMetadata(monthKey, now);
                return this.#cachedEntries;
            }

            const monthEntries = await registry.db.getEntriesForMonth(year, month);
            
            if (!Array.isArray(monthEntries)) {
                console.warn('getEntriesForMonth no devolvió un array:', monthEntries);
                this.#updateCacheMetadata(monthKey, now);
                return this.#cachedEntries;
            }
            
            // Crear un mapa más eficiente con validación de datos
            for (const entry of monthEntries) {
                if (!this.#isValidEntry(entry)) {
                    console.warn('Entrada inválida encontrada:', entry);
                    continue;
                }
                
                try {
                    const entryDate = this.#normalizeDate(fromISODate(entry.date));
                    
                    // Verificar que la fecha es válida
                    if (isNaN(entryDate.getTime())) {
                        console.warn('Fecha inválida en entrada:', entry);
                        continue;
                    }
                    
                    const formattedKey = formatDateForStorage(entryDate);
                    const isoKey = entryDate.toISOString().split('T')[0];
                    
                    // Almacenar con múltiples claves para acceso rápido
                    this.#cachedEntries.set(entry.date, entry);
                    this.#cachedEntries.set(formattedKey, entry);
                    this.#cachedEntries.set(isoKey, entry);
                } catch (dateError) {
                    console.warn('Error procesando fecha de entrada:', entry, dateError);
                    continue;
                }
            }
            
            this.#updateCacheMetadata(monthKey, now);
            
        } catch (error) {
            console.error('Error cargando entradas del mes:', error);
            this.#updateCacheMetadata(monthKey, now);
        }
        
        return this.#cachedEntries;
    }

    // Validar si el cache es válido
    #isCacheValid(monthKey, currentTime) {
        return this.#lastFetchedMonth === monthKey && 
               this.#cacheTimestamp && 
               (currentTime - this.#cacheTimestamp) < this.#maxCacheAge;
    }

    // Validar estructura de entrada
    #isValidEntry(entry) {
        return entry && 
               typeof entry === 'object' && 
               typeof entry.date === 'string' && 
               entry.date.trim().length > 0;
    }

    // Actualizar metadatos del cache
    #updateCacheMetadata(monthKey, timestamp) {
        this.#lastFetchedMonth = monthKey;
        this.#cacheTimestamp = timestamp;
        this.#cacheVersion++;
    }

    // Limpiar datos del cache
    #clearCacheData() {
        this.#cachedEntries.clear();
    }

    // Pool de elementos para reutilización con validación
    #getDayElement() {
        if (this.#dayElementPool.length > 0) {
            const el = this.#dayElementPool.pop();
            
            // Verificar que el elemento sea válido
            if (!el || !el.nodeType || el.nodeType !== Node.ELEMENT_NODE) {
                console.warn('Elemento inválido en pool, creando nuevo');
                return this.#createNewDayElement();
            }
            
            try {
                // Limpiar el elemento para reutilización
                el.textContent = '';
                el.className = 'calendar-day';
                el.style.position = '';
                el.innerHTML = '';
                
                // Remover todos los event listeners clonando el elemento
                const cleanEl = el.cloneNode(false);
                cleanEl.className = 'calendar-day';
                return cleanEl;
            } catch (error) {
                console.warn('Error limpiando elemento del pool:', error);
                return this.#createNewDayElement();
            }
        }
        
        return this.#createNewDayElement();
    }

    #createNewDayElement() {
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-day');
        return dayEl;
    }

    #returnDayElement(element) {
        // Validar elemento antes de agregarlo al pool
        if (!element || 
            !element.nodeType || 
            element.nodeType !== Node.ELEMENT_NODE ||
            this.#dayElementPool.length >= 50) {
            return;
        }
        
        try {
            // Verificar que el elemento no esté conectado al DOM
            if (!element.parentNode) {
                this.#dayElementPool.push(element);
            }
        } catch (error) {
            console.warn('Error devolviendo elemento al pool:', error);
        }
    }

    async render() {
        if (!this.#calendarGrid || !this.#currentMonthEl) return;

        // Prevenir renders concurrentes
        if (this.#renderInProgress) {
            console.log('Render cancelado - ya hay uno en progreso');
            return;
        }

        this.#renderInProgress = true;
        const renderId = ++this.#currentRenderId;

        // Usar requestAnimationFrame para mejorar rendimiento
        requestAnimationFrame(async () => {
            try {
                this.#currentMonthEl.textContent = formatDate(this.#currentMonth, 'es-ES', {}, 'month');

                // Limpiar grid y devolver elementos al pool de forma segura
                const existingDays = this.#calendarGrid.querySelectorAll('.calendar-day');
                existingDays.forEach(day => {
                    try {
                        this.#returnDayElement(day);
                    } catch (error) {
                        console.warn('Error devolviendo elemento al pool:', error);
                    }
                });
                
                this.#calendarGrid.innerHTML = '';
                const frag = document.createDocumentFragment();

                // Clonar headers pre-creados de forma segura
                if (this.#headerElements) {
                    try {
                        frag.appendChild(this.#headerElements.cloneNode(true));
                    } catch (error) {
                        console.warn('Error clonando headers, recreando:', error);
                        this.#preCreateHeaderElements();
                        frag.appendChild(this.#headerElements.cloneNode(true));
                    }
                }

                const year = this.#currentMonth.getFullYear();
                const month = this.#currentMonth.getMonth();
                
                // Validar que year y month sean válidos
                if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
                    console.error('Fecha inválida en currentMonth:', this.#currentMonth);
                    return;
                }
                
                // Calcular fechas una sola vez
                const firstDay = new Date(year, month, 1);
                const normalizedFirstDay = this.#normalizeDate(firstDay);
                const startDate = new Date(normalizedFirstDay);
                const firstDayOfWeek = normalizedFirstDay.getDay();
                startDate.setDate(startDate.getDate() - firstDayOfWeek);
                startDate.setHours(0, 0, 0, 0);

                // Obtener entradas con cache robusto
                const entriesMap = await this.#getEntriesForMonth(year, month + 1);
                
                // Pre-calcular fecha de hoy una sola vez
                const today = this.#normalizeDate(new Date());
                const todayTime = today.getTime();

                // Crear todos los elementos de días en un solo loop
                const dateIterator = new Date(startDate);
                const totalDays = CalendarManager.WEEKS_TO_SHOW * CalendarManager.DAYS_IN_WEEK;
                
                for (let i = 0; i < totalDays; i++) {
                    try {
                        const currentDate = new Date(dateIterator);
                        const dayEl = this.#createDayElementOptimized(currentDate, month, todayTime, entriesMap);
                        if (dayEl) {
                            frag.appendChild(dayEl);
                        }
                        dateIterator.setDate(dateIterator.getDate() + 1);
                    } catch (error) {
                        console.warn('Error creando elemento de día:', error);
                        // Continuar con el siguiente día
                        dateIterator.setDate(dateIterator.getDate() + 1);
                    }
                }

                // Verificar que este render sigue siendo el actual
                if (renderId !== this.#currentRenderId) {
                    console.log('Render cancelado - nuevo render iniciado');
                    return;
                }

                this.#calendarGrid.appendChild(frag);
                
            } catch (error) {
                console.error('Error durante render del calendario:', error);
                // Fallback: limpiar y mostrar error
                this.#calendarGrid.innerHTML = '<div class="error">Error cargando calendario</div>';
            } finally {
                // Solo marcar como completado si este render sigue siendo el actual
                if (renderId === this.#currentRenderId) {
                    this.#renderInProgress = false;
                }
            }
        });
    }

    #createDayElementOptimized(date, month, todayTime, entriesMap) {
        try {
            const normalizedDate = this.#normalizeDate(date);
            
            // Verificar que la fecha normalizada sea válida
            if (isNaN(normalizedDate.getTime())) {
                console.warn('Fecha inválida en createDayElement:', date);
                return null;
            }
            
            const dayEl = this.#getDayElement();
            if (!dayEl) {
                console.warn('No se pudo crear elemento de día');
                return null;
            }
            
            dayEl.textContent = normalizedDate.getDate();

            // Optimización: comparar directamente el mes
            if (normalizedDate.getMonth() !== month) {
                dayEl.classList.add('other-month');
            }
            
            // Optimización: comparar timestamps en lugar de fechas
            if (normalizedDate.getTime() === todayTime) {
                dayEl.classList.add('today');
            }

            // Buscar entrada de forma más eficiente con validación
            try {
                const dateKey = formatDateForStorage(normalizedDate);
                const entry = entriesMap.get(dateKey);
                
                if (entry && this.#isValidEntry(entry)) {
                    dayEl.classList.add('has-entry');
                    if (entry.mood && typeof entry.mood === 'string') {
                        // Crear elemento mood de forma más eficiente
                        const mood = document.createElement('span');
                        mood.className = 'absolute top-0 right-0 text-xs';
                        mood.textContent = entry.mood;
                        dayEl.style.position = 'relative';
                        dayEl.appendChild(mood);
                    }
                }
            } catch (entryError) {
                console.warn('Error procesando entrada para fecha:', normalizedDate, entryError);
            }

            // Usar event delegation sería mejor, pero manteniendo funcionalidad original
            dayEl.addEventListener('click', () => {
                try {
                    if (normalizedDate.getMonth() === month && this.#ui?.selectDate) {
                        this.#ui.selectDate(normalizedDate);
                    }
                } catch (clickError) {
                    console.warn('Error en click de día:', clickError);
                }
            });

            return dayEl;
        } catch (error) {
            console.warn('Error creando elemento de día:', error);
            return null;
        }
    }

    #isSameDay(a, b) {
        // Optimización: comparar timestamps directamente
        const dateA = this.#normalizeDate(a);
        const dateB = this.#normalizeDate(b);
        return dateA.getTime() === dateB.getTime();
    }

    setCurrentMonth(date) {
        // Cancelar render anterior si está en progreso
        if (this.#renderInProgress) {
            this.#currentRenderId++;
            this.#renderInProgress = false;
        }
        
        this.#currentMonth = new Date(date);
        this.render();
    }

    getCurrentMonth() {
        return new Date(this.#currentMonth);
    }

    goToToday() {
        // Cancelar render anterior si está en progreso
        if (this.#renderInProgress) {
            this.#currentRenderId++;
            this.#renderInProgress = false;
        }
        
        this.#currentMonth = new Date();
        this.render();
    }

    goToPreviousMonth() {
        // Cancelar render anterior si está en progreso
        if (this.#renderInProgress) {
            this.#currentRenderId++;
            this.#renderInProgress = false;
        }
        
        this.#currentMonth.setMonth(this.#currentMonth.getMonth() - 1);
        this.render();
    }

    goToNextMonth() {
        // Cancelar render anterior si está en progreso
        if (this.#renderInProgress) {
            this.#currentRenderId++;
            this.#renderInProgress = false;
        }
        
        this.#currentMonth.setMonth(this.#currentMonth.getMonth() + 1);
        this.render();
    }

    // Método para limpiar cache con validación
    clearCache() {
        try {
            this.#clearCacheData();
            this.#lastFetchedMonth = null;
            this.#cacheTimestamp = null;
            this.#cacheVersion = 0;
        } catch (error) {
            console.warn('Error limpiando cache:', error);
        }
    }

    // Método para obtener información del cache (debugging)
    getCacheInfo() {
        return {
            lastFetchedMonth: this.#lastFetchedMonth,
            cacheSize: this.#cachedEntries.size,
            cacheTimestamp: this.#cacheTimestamp,
            cacheVersion: this.#cacheVersion,
            poolSize: this.#dayElementPool.length,
            maxCacheAge: this.#maxCacheAge,
            renderInProgress: this.#renderInProgress,
            currentRenderId: this.#currentRenderId
        };
    }

    // Método para invalidar cache cuando hay cambios externos
    invalidateCache() {
        this.#cacheVersion++;
        this.#lastFetchedMonth = null;
        this.#clearCacheData();
    }
}
