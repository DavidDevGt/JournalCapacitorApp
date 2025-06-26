/**
 * Manages navigation between views with gesture support and Material Design animations
 */
export class NavigationManager {
    #ui;
    #views = ['today', 'calendar', 'entries'];
    #touchState = {
        startX: 0,
        endX: 0,
        startY: 0,
        endY: 0
    };
    #rippleTimeout = null;
    #isTransitioning = false;

    /**
     * @param {Object} uiManager - UI manager instance
     */
    constructor(uiManager) {
        if (!uiManager) {
            throw new Error('UIManager is required');
        }
        this.#ui = uiManager;
        this.views = Object.freeze([...this.#views]);
    }

    /**
     * Initialize navigation system
     */
    setup() {
        this.#setupNavigationListeners();
        this.#setupGestureNavigation();
    }

    /**
     * Setup click event listeners for navigation tabs
     * @private
     */
    #setupNavigationListeners() {
        const handleTabClick = (selector, getView) => {
            document.addEventListener('click', (e) => {
                const target = e.target.closest(selector);
                if (!target) return;

                e.preventDefault();
                const view = getView(target);
                if (view) {
                    this.switchView(view);
                    if (selector === '.material-tab') {
                        this.#triggerRippleEffect(target, e);
                    }
                }
            });
        };

        handleTabClick('.nav-tab', (tab) => tab.dataset.view);
        handleTabClick('.material-tab', (tab) => tab.dataset.view);
    }

    /**
     * Setup touch gesture navigation
     * @private
     */
    #setupGestureNavigation() {
        const options = { passive: true };

        document.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;

            const touch = e.touches[0];
            this.#touchState.startX = touch.screenX;
            this.#touchState.startY = touch.screenY;
        }, options);

        document.addEventListener('touchend', (e) => {
            if (e.changedTouches.length !== 1) return;

            const touch = e.changedTouches[0];
            this.#touchState.endX = touch.screenX;
            this.#touchState.endY = touch.screenY;

            this.#handleSwipeGesture();
            this.updateNavigationState(this.#ui.currentView);
        }, options);
    }

    /**
     * Handle swipe gesture logic
     * @private
     */
    #handleSwipeGesture() {
        const deltaX = this.#touchState.endX - this.#touchState.startX;
        const deltaY = this.#touchState.endY - this.#touchState.startY;
        const minSwipeDistance = 50;

        if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < minSwipeDistance) {
            return;
        }

        const currentIndex = this.#views.indexOf(this.#ui.currentView);
        let targetIndex = -1;

        if (deltaX > minSwipeDistance && currentIndex > 0) {
            targetIndex = currentIndex - 1;
        } else if (deltaX < -minSwipeDistance && currentIndex < this.#views.length - 1) {
            targetIndex = currentIndex + 1;
        }

        if (targetIndex >= 0) {
            this.switchView(this.#views[targetIndex]);
        }
    }

    /**
     * Create Material Design ripple effect
     * @private
     */
    #triggerRippleEffect(tab, event) {
        const ripple = tab.querySelector('.material-tab-ripple');
        if (!ripple) return;

        if (this.#rippleTimeout) {
            clearTimeout(this.#rippleTimeout);
        }

        this.#resetRipple(ripple);

        const rect = tab.getBoundingClientRect();
        const { x, y } = this.#getRipplePosition(event, rect);

        this.#positionRipple(ripple, x, y);

        const rippleSize = Math.min(Math.max(rect.width, rect.height) * 0.8, 48);

        requestAnimationFrame(() => {
            ripple.style.width = `${rippleSize}px`;
            ripple.style.height = `${rippleSize}px`;
        });

        this.#rippleTimeout = setTimeout(() => {
            this.#resetRipple(ripple);
        }, 300);
    }

    /**
     * Reset ripple element to initial state
     * @private
     */
    #resetRipple(ripple) {
        Object.assign(ripple.style, {
            width: '0',
            height: '0',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
        });
    }

    /**
     * Calculate ripple position based on event
     * @private
     */
    #getRipplePosition(event, rect) {
        const clientX = event.clientX || event.touches?.[0]?.clientX;
        const clientY = event.clientY || event.touches?.[0]?.clientY;

        if (clientX !== undefined && clientY !== undefined) {
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }

        return {
            x: rect.width / 2,
            y: rect.height / 2
        };
    }

    /**
     * Position ripple element
     * @private
     */
    #positionRipple(ripple, x, y) {
        Object.assign(ripple.style, {
            left: `${x}px`,
            top: `${y}px`,
            transform: 'translate(-50%, -50%)'
        });
    }

    /**
     * Switch to a different view
     * @param {string} viewName - Target view name
     */
    switchView(viewName) {
        if (!viewName || this.#ui.currentView === viewName || this.#isTransitioning) {
            return;
        }

        if (!this.#views.includes(viewName)) {
            console.warn(`Invalid view name: ${viewName}`);
            return;
        }

        this.#isTransitioning = true;

        try {
            this.#hideCurrentView();
            this.#showNewView(viewName);
            this.updateNavigationState(viewName);
            this.#ui.currentView = viewName;
            this.#updateStateManager(viewName);
            this.#handleViewSpecificLogic(viewName);
        } finally {
            this.#isTransitioning = false;
        }
    }

    /**
     * Hide current view element
     * @private
     */
    #hideCurrentView() {
        const currentViewEl = document.getElementById(`${this.#ui.currentView}-view`);
        currentViewEl?.classList.add('hidden');
    }

    /**
     * Show new view element
     * @private
     */
    #showNewView(viewName) {
        const newViewEl = document.getElementById(`${viewName}-view`);
        if (newViewEl) {
            newViewEl.classList.remove('hidden');
            newViewEl.classList.add('animate-fade-in');
        }
    }

    /**
     * Update external state manager
     * @private
     */
    #updateStateManager(viewName) {
        if (window.stateManager?.getState?.().currentView !== viewName) {
            window.stateManager?.setCurrentView?.(viewName);
        }
    }

    /**
     * Handle view-specific initialization logic
     * @private
     */
    #handleViewSpecificLogic(viewName) {
        switch (viewName) {
            case 'calendar':
                this.#ui.calendarManager?.render?.();
                break;
            case 'entries':
                this.#ui.loadAllEntries?.();
                break;
        }
    }

    /**
     * Update visual state of navigation elements
     * @param {string} activeView - Currently active view
     */
    updateNavigationState(activeView) {
        const selectors = ['.nav-tab', '.material-tab', '.bottom-nav-btn'];
        const styleProps = ['border', 'borderColor', 'borderBottomWidth', 'color'];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                const isActive = element.dataset.view === activeView;

                element.classList.toggle('active', isActive);
                element.setAttribute('aria-selected', isActive.toString());

                styleProps.forEach(prop => element.style.removeProperty(prop));
            });
        });
    }

    /**
     * Animate element sliding in from specified direction
     * @param {HTMLElement} element - Element to animate
     * @param {string} direction - Animation direction ('left' or 'right')
     */
    slideIn(element, direction = 'right') {
        if (!element) return;

        const translateX = direction === 'right' ? '100%' : '-100%';

        Object.assign(element.style, {
            transform: `translateX(${translateX})`,
            opacity: '0'
        });

        element.classList.remove('hidden');

        requestAnimationFrame(() => {
            Object.assign(element.style, {
                transition: 'all 0.3s ease-out',
                transform: 'translateX(0)',
                opacity: '1'
            });
        });
    }

    /**
     * Animate element sliding out in specified direction
     * @param {HTMLElement} element - Element to animate
     * @param {string} direction - Animation direction ('left' or 'right')
     */
    slideOut(element, direction = 'left') {
        if (!element) return;

        const translateX = direction === 'left' ? '-100%' : '100%';

        Object.assign(element.style, {
            transition: 'all 0.3s ease-out',
            transform: `translateX(${translateX})`,
            opacity: '0'
        });

        setTimeout(() => {
            element.classList.add('hidden');
            Object.assign(element.style, {
                transform: '',
                opacity: '',
                transition: ''
            });
        }, 300);
    }
}