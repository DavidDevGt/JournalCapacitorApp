import { formatDate, formatDateForStorage, fromISODate } from '../helpers.js';

export class VirtualScrollManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.config = {
            itemHeight: 160,
            containerHeight: 0,
            visibleItems: 0,
            scrollTop: 0,
            totalItems: 0,
            bufferSize: 8,
            startIndex: 0,
            endIndex: 0
        };
        this.allEntries = [];
        this.filteredEntries = [];
        this.container = null;
        this.viewport = null;
        this.content = null;
        this.resizeObserver = null;
    }

    setup() {
        const entriesView = document.getElementById('entries-view');
        if (!entriesView) return;

        const existingContainer = document.getElementById('virtual-scroll-container');
        if (existingContainer) {
            this.container = existingContainer;
        } else {
            this.createStructure();
        }

        this.setupListeners();
        this.setupResizeObserver();
    }

    createStructure() {
        const entriesView = document.getElementById('entries-view');
        const entriesList = document.getElementById('entries-list');

        if (!entriesView || !entriesList) return;

        // Create virtual scroll container
        const container = document.createElement('div');
        container.id = 'virtual-scroll-container';
        container.className = 'h-full overflow-auto';
        container.style.position = 'relative';

        // Create viewport
        const viewport = document.createElement('div');
        viewport.id = 'virtual-scroll-viewport';
        viewport.className = 'relative';
        viewport.style.height = '0px';

        // Create content container
        const content = document.createElement('div');
        content.id = 'virtual-scroll-content';
        content.className = 'absolute top-0 left-0 right-0';
        content.style.transform = 'translateY(0px)';

        viewport.appendChild(content);
        container.appendChild(viewport);

        entriesList.parentNode.replaceChild(container, entriesList);

        this.container = container;
        this.viewport = viewport;
        this.content = content;
    }

    setupListeners() {
        if (!this.container) return;

        const throttledScrollHandler = this.throttle(this.handleScroll.bind(this), 16);
        this.container.addEventListener('scroll', throttledScrollHandler);

        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.container.scrollTop += e.deltaY;
        }, { passive: false });
    }

    setupResizeObserver() {
        if (!this.container || !window.ResizeObserver) return;

        this.resizeObserver = new ResizeObserver(() => {
            this.updateDimensions();
            this.renderItems();
        });

        this.resizeObserver.observe(this.container);
    }

    updateDimensions() {
        if (!this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        this.config.containerHeight = containerRect.height;
        this.config.visibleItems = Math.ceil(containerRect.height / this.config.itemHeight);

        if (this.viewport) {
            this.viewport.style.height = `${this.filteredEntries.length * this.config.itemHeight}px`;
        }
    }

    handleScroll() {
        if (!this.container) return;

        this.config.scrollTop = this.container.scrollTop;
        this.calculateVisibleRange();
        this.renderItems();
    }

    calculateVisibleRange() {
        const { scrollTop, itemHeight, visibleItems, bufferSize } = this.config;
        const totalItems = this.filteredEntries.length;

        let startIndex = Math.floor(scrollTop / itemHeight);
        let endIndex = startIndex + visibleItems + bufferSize * 2;

        if (startIndex >= totalItems) {
            startIndex = Math.max(0, totalItems - visibleItems - bufferSize * 2);
        }
        startIndex = Math.max(0, startIndex - bufferSize);
        endIndex = Math.min(totalItems, endIndex);
        if (endIndex < startIndex) endIndex = startIndex;

        this.config.startIndex = startIndex;
        this.config.endIndex = endIndex;
    }

    renderItems() {
        if (!this.content) return;

        const { startIndex, endIndex } = this.config;
        let visibleEntries = [];
        if (this.filteredEntries.length > 0 && startIndex < endIndex) {
            visibleEntries = this.filteredEntries.slice(startIndex, endIndex);
        }

        this.content.innerHTML = '';

        if (visibleEntries.length === 0) {
            this.renderEmptyState();
            return;
        }

        const fragment = document.createDocumentFragment();
        visibleEntries.forEach((entry, idx) => {
            const itemElement = this.createItem(entry, startIndex + idx);
            fragment.appendChild(itemElement);
        });

        this.content.appendChild(fragment);

        const offsetY = startIndex * this.config.itemHeight;
        this.content.style.transform = `translateY(${offsetY}px)`;
    }

    createItem(entry, index) {
        const swipeWrapper = document.createElement('div');
        swipeWrapper.className = 'swipe-wrapper relative mb-3';
        swipeWrapper.style.height = `${this.config.itemHeight}px`;
        swipeWrapper.setAttribute('data-index', index);

        const background = document.createElement('div');
        background.className = 'swipe-bg absolute inset-0 flex items-center z-0';
        background.style.background = 'linear-gradient(90deg,rgb(224, 74, 74) 60%,rgb(252, 139, 139) 100%)';
        background.innerHTML = `
            <span class="material-icons text-white text-3xl animate-trash" style="position:absolute; right:2rem; top:50%; transform:translateY(-50%); pointer-events:none;">delete</span>
        `;
        background.style.borderRadius = '0.75rem';
        background.style.transition = 'opacity 0.2s';
        background.style.opacity = '0.9';

        const itemElement = document.createElement('div');
        itemElement.className = 'virtual-scroll-item z-10';
        itemElement.style.height = '100%';
        itemElement.style.willChange = 'transform';
        itemElement.style.touchAction = 'pan-y';
        itemElement.style.transition = 'transform 0.25s cubic-bezier(.4,2,.6,1), box-shadow 0.2s';
        itemElement.setAttribute('data-index', index);

        const date = fromISODate(entry.date);
        const formattedDate = formatDate(date, 'short');
        const preview = entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '');

        const moodDisplay = entry.mood ? `
        <div class="mood-indicator flex-shrink-0 w-8 h-8 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center border border-amber-100 dark:border-amber-800/50">
            <span class="text-base">${entry.mood}</span>
        </div>` : '';

        const photoPath = entry.photo_path || entry.photoPath;
        const thumbnailPath = entry.thumbnail_path || entry.thumbnailPath || photoPath;

        const photoDisplay = thumbnailPath ? `
        <div class="entry-photo-compact relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 w-10 h-10 flex-shrink-0">
            <img src="${thumbnailPath}" 
                alt="Foto" 
                class="w-full h-full object-cover" 
                loading="lazy"
                onclick="event.stopPropagation(); ui.showImagePreview('${photoPath || thumbnailPath}')">
        </div>` : '';

        const timeAgo = this.getTimeAgo(date);

        const wordCount = entry.word_count || entry.wordCount || 0;

        itemElement.innerHTML = `
        <div class="entry-card-compact group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600 h-full" 
            onclick="ui.selectDate('${entry.date}')"
            style="min-height: 80px;">
            
            <div class="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-l-lg"></div>
            
            <div class="relative p-3 h-full flex flex-col justify-between">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex-1 min-w-0">
                        <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">${formattedDate}</h3>
                        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>${timeAgo}</span>
                            ${wordCount > 0 ? `<span>&nbsp;&nbsp;•&nbsp;&nbsp;</span><span>${wordCount} palabras</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2 ml-2">
                        ${moodDisplay}
                        ${photoDisplay}
                    </div>
                </div>

                <div class="flex-1">
                    <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                        ${preview}
                    </p>
                </div>
            </div>
        </div>
`;

        // --- Swipe gesture logic ---
        let startX = 0;
        let currentX = 0;
        let dragging = false;
        let hasMoved = false;
        const threshold = 60; // px para eliminar
        const maxTranslate = 80; // px max swipe

        // Pointer/touch events
        itemElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType !== 'touch') return;
            dragging = true;
            hasMoved = false;
            startX = e.clientX;
            currentX = e.clientX;
            itemElement.setPointerCapture(e.pointerId);
            itemElement.style.transition = 'none';
        });
        itemElement.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            currentX = e.clientX;
            let deltaX = currentX - startX;
            if (Math.abs(deltaX) > 5) hasMoved = true;
            if (deltaX < 0) {
                deltaX = Math.max(deltaX, -maxTranslate);
                itemElement.style.transform = `translateX(${deltaX}px)`;
                background.style.opacity = `${Math.min(1, Math.abs(deltaX) / threshold)}`;
            }
        });
        itemElement.addEventListener('pointerup', (e) => {
            if (!dragging) return;
            dragging = false;
            let deltaX = currentX - startX;
            // Solo eliminar si realmente hubo swipe y se superó el umbral
            if (hasMoved && deltaX < -threshold) {
                itemElement.style.transition = 'transform 0.25s cubic-bezier(.4,2,.6,1), opacity 0.2s';
                itemElement.style.transform = `translateX(-120%)`;
                itemElement.style.opacity = '0';
                setTimeout(() => {
                    this.handleDeleteEntry(index);
                }, 220);
            } else {
                itemElement.style.transition = 'transform 0.25s cubic-bezier(.4,2,.6,1)';
                itemElement.style.transform = 'translateX(0)';
                background.style.opacity = '0.9';
            }
        });
        itemElement.addEventListener('pointercancel', () => {
            dragging = false;
            itemElement.style.transition = 'transform 0.25s cubic-bezier(.4,2,.6,1)';
            itemElement.style.transform = 'translateX(0)';
            background.style.opacity = '0.9';
        });

        swipeWrapper.appendChild(background);
        swipeWrapper.appendChild(itemElement);
        return swipeWrapper;
    }

    async handleDeleteEntry(index) {
        const entry = this.filteredEntries[index];
        if (!entry || !entry.date) {
            if (window.ui && typeof window.ui.showToast === 'function') {
                window.ui.showToast('No se pudo eliminar la entrada (sin fecha)', 'error');
            }
            return;
        }
        try {
            if (window.db && typeof window.db.deleteEntry === 'function') {
                const result = await window.db.deleteEntry(entry.date);
                if (!result || result.success === false) {
                    throw (result && result.error) || new Error('Error desconocido al eliminar');
                }
            }
            this.filteredEntries.splice(index, 1);
            this.allEntries = this.allEntries.filter(e => e.date !== entry.date);
            this.renderItems();
            if (window.ui && typeof window.ui.showToast === 'function') {
                window.ui.showToast('Entrada eliminada', 'success');
            }
        } catch (error) {
            console.error('Error eliminando entrada:', error);
            if (window.ui && typeof window.ui.showToast === 'function') {
                window.ui.showToast('Error al eliminar la entrada', 'error');
            }
        }
    }

    getTimeAgo(date) {
        const now = new Date(); // Usar fecha actual en hora local
        const diffTime = Math.abs(now - date);
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        // Menos de una hora
        if (diffMinutes < 60) {
            if (diffMinutes < 1) return 'Hace un momento';
            if (diffMinutes === 1) return 'Hace 1 minuto';
            return `Hace ${diffMinutes} minutos`;
        }

        // Menos de un día
        if (diffHours < 24) {
            if (diffHours === 1) return 'Hace 1 hora';
            return `Hace ${diffHours} horas`;
        }

        // Menos de una semana
        if (diffDays < 7) {
            if (diffDays === 1) return 'Ayer';
            if (diffDays === 2) return 'Anteayer';
            return `Hace ${diffDays} días`;
        }

        // Menos de un mes
        if (diffDays < 30) {
            if (diffWeeks === 1) return 'Hace 1 semana';
            return `Hace ${diffWeeks} semanas`;
        }

        // Menos de un año
        if (diffDays < 365) {
            if (diffMonths === 1) return 'Hace 1 mes';
            return `Hace ${diffMonths} meses`;
        }

        // Un año o más
        if (diffYears === 1) return 'Hace 1 año';
        return `Hace ${diffYears} años`;
    }

    renderEmptyState() {
        if (!this.content) return;

        this.content.innerHTML = `
            <div class="text-center py-12 text-notion-gray dark:text-notion-gray-dark">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <h3 class="text-lg font-semibold mb-2">No se encontro ninguna entrada</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Intenta buscar con otra palabra clave o crea una nueva entrada.</p>
            </div>
        `;
    }

    loadEntries(entries) {
        this.allEntries = entries;
        this.filteredEntries = entries;
        this.initialize();
    }

    initialize() {
        if (!this.container) {
            this.setup();
        }
        requestAnimationFrame(() => {
            this.updateDimensions();
            this.calculateVisibleRange();
            this.renderItems();
            setTimeout(() => {
                this.updateDimensions();
                this.calculateVisibleRange();
                this.renderItems();
            }, 30);
        });
    }

    filterEntries(filteredEntries) {
        this.filteredEntries = filteredEntries;
        this.initialize();
        if (this.container) {
            this.container.scrollTop = 0;
        }
    }

    scrollToIndex(index) {
        if (!this.container || index < 0 || index >= this.filteredEntries.length) {
            return;
        }
        const targetScrollTop = index * this.config.itemHeight;
        this.container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }

    scrollToDate(date) {
        const dateStr = formatDateForStorage(fromISODate(date));
        const index = this.filteredEntries.findIndex(entry => entry.date === dateStr);
        if (index !== -1) {
            this.scrollToIndex(index);
        }
    }

    getVisibleEntries() {
        const { startIndex, endIndex } = this.config;
        return this.filteredEntries.slice(startIndex, endIndex);
    }

    adjustItemHeight(minHeight = 150, maxHeight = 300) {
        const avgContentLength = this.filteredEntries.reduce((sum, entry) => {
            return sum + (entry.content ? entry.content.length : 0);
        }, 0) / this.filteredEntries.length;

        let newHeight = minHeight;
        if (avgContentLength > 200) {
            newHeight = Math.min(minHeight + (avgContentLength - 200) * 0.3, maxHeight);
        }

        this.config.itemHeight = Math.ceil(newHeight);
        this.updateDimensions();
        this.renderItems();
    }

    getDebugInfo() {
        return {
            config: { ...this.config },
            totalEntries: this.allEntries.length,
            filteredEntries: this.filteredEntries.length,
            visibleRange: {
                start: this.config.startIndex,
                end: this.config.endIndex,
                count: this.config.endIndex - this.config.startIndex
            },
            containerHeight: this.config.containerHeight,
            scrollPosition: this.config.scrollTop
        };
    }

    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function (...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.container) {
            this.container.removeEventListener('scroll', this.handleScroll);
        }

        this.container = null;
        this.viewport = null;
        this.content = null;
        this.allEntries = [];
        this.filteredEntries = [];
    }
}