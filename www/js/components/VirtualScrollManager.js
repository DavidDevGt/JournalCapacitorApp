export class VirtualScrollManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.config = {
            itemHeight: 220,
            containerHeight: 0,
            visibleItems: 0,
            scrollTop: 0,
            totalItems: 0,
            bufferSize: 5,
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

        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleItems + bufferSize * 2, totalItems);

        this.config.startIndex = Math.max(0, startIndex - bufferSize);
        this.config.endIndex = endIndex;
    }

    renderItems() {
        if (!this.content) return;

        const { startIndex, endIndex } = this.config;
        const visibleEntries = this.filteredEntries.slice(startIndex, endIndex);

        this.content.innerHTML = '';

        if (visibleEntries.length === 0) {
            this.renderEmptyState();
            return;
        }

        const fragment = document.createDocumentFragment();
        visibleEntries.forEach((entry, index) => {
            const itemElement = this.createItem(entry, startIndex + index);
            fragment.appendChild(itemElement);
        });

        this.content.appendChild(fragment);

        const offsetY = startIndex * this.config.itemHeight;
        this.content.style.transform = `translateY(${offsetY}px)`;
    }

    createItem(entry, index) {
        const itemElement = document.createElement('div');
        itemElement.className = 'virtual-scroll-item mb-4';
        itemElement.style.height = `${this.config.itemHeight}px`;
        itemElement.setAttribute('data-index', index);

        const date = new Date(entry.date);
        const formattedDate = this.ui.formatDate(date, 'short');
        const preview = entry.content.substring(0, 120) + (entry.content.length > 120 ? '...' : '');
        
        const moodDisplay = entry.mood ? `
            <div class="mood-indicator-small flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center shadow-sm border border-blue-100 dark:border-blue-800/50">
                <span class="text-xl">${entry.mood}</span>
            </div>` : '';

        const photoPath = entry.photo_path || entry.photoPath;
        const thumbnailPath = entry.thumbnail_path || entry.thumbnailPath || photoPath;
        const photoDisplay = thumbnailPath ? `
            <div class="entry-photo-compact relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300 group/photo">
                <img src="${thumbnailPath}" 
                     alt="Foto de la entrada" 
                     class="w-14 h-14 object-cover opacity-0 transition-all duration-300 group-hover/photo:scale-105" 
                     loading="lazy"
                     onload="this.style.opacity='1'"
                     onerror="this.parentElement.innerHTML='<div class=&quot;w-14 h-14 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600&quot;><svg class=&quot;w-6 h-6 text-gray-400&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; viewBox=&quot;0 0 24 24&quot;><path stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot; stroke-width=&quot;2&quot; d=&quot;M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z&quot;></path></svg></div>'"
                     onclick="event.stopPropagation(); ui.showImagePreview('${photoPath || thumbnailPath}')">
                <div class="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300 rounded-lg"></div>
            </div>` : '';

        itemElement.innerHTML = `
            <div class="entry-card-compact group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer transform transition-all duration-200 hover:-translate-y-0.5 h-full" onclick="ui.selectDate(new Date('${entry.date}'))">
                <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div class="relative p-4 h-full flex flex-col">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">${formattedDate}</h3>
                            <div class="flex items-center flex-wrap text-xs text-gray-500 dark:text-gray-400 gap-x-2 gap-y-1">
                                <div class="flex items-center space-x-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span>${entry.word_count || entry.wordCount || 0} palabras</span>
                                </div>
                                ${entry.content.length > 120 ? `<span class="text-blue-600 dark:text-blue-400 font-medium">Leer más...</span>` : ''}
                            </div>
                        </div>
                        
                        <div class="flex items-center space-x-2 ml-3">
                            ${moodDisplay}
                            ${photoDisplay}
                        </div>
                    </div>

                    <div class="flex-1 relative">
                        <p class="text-gray-700 dark:text-gray-300 leading-relaxed text-sm line-clamp-2">
                            ${preview}
                        </p>
                    </div>
                </div>

                <div class="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/3 group-hover:via-purple-500/3 group-hover:to-pink-500/3 transition-all duration-300"></div>
                </div>
            </div>
        `;

        return itemElement;
    }

    renderEmptyState() {
        if (!this.content) return;

        this.content.innerHTML = `
            <div class="text-center py-12 text-notion-gray dark:text-notion-gray-dark">
                <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <h3 class="text-lg font-semibold mb-2">No hay entradas aún</h3>
                <p>Comienza escribiendo tu primera entrada de diario</p>
            </div>
        `;
    }

    // Public methods
    loadEntries(entries) {
        this.allEntries = entries;
        this.filteredEntries = entries;
        this.initialize();
    }

    initialize() {
        if (!this.container) {
            this.setup();
        }
        this.updateDimensions();
        this.calculateVisibleRange();
        this.renderItems();
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
        const dateStr = this.ui.formatDateForStorage(new Date(date));
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