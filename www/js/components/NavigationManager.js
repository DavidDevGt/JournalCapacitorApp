export class NavigationManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.views = ['today', 'calendar', 'entries'];
        window.navigationManager = this;
    }

    setup() {
        this.setupNavigationListeners();
        this.setupGestureNavigation();
    }

    setupNavigationListeners() {
        // Navigation event listeners
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
    }

    setupGestureNavigation() {
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
                const currentIndex = this.views.indexOf(this.ui.currentView);

                if (deltaX > 50 && currentIndex > 0) {
                    this.switchView(this.views[currentIndex - 1]);
                } else if (deltaX < -50 && currentIndex < this.views.length - 1) {
                    this.switchView(this.views[currentIndex + 1]);
                }
            }
            // Forzar actualización visual de tabs después de cualquier gesto
            this.updateNavigationState(this.ui.currentView);
        });
    }

    triggerRippleEffect(tab, event) {
        const ripple = tab.querySelector('.material-tab-ripple');
        if (!ripple) return;

        ripple.style.width = '0';
        ripple.style.height = '0';

        const rect = tab.getBoundingClientRect();
        let x, y;

        if (event.type === 'click' || event.type === 'touchstart') {
            const clientX = event.clientX || (event.touches && event.touches[0]?.clientX);
            const clientY = event.clientY || (event.touches && event.touches[0]?.clientY);

            if (clientX !== undefined && clientY !== undefined) {
                x = clientX - rect.left;
                y = clientY - rect.top;
            } else {
                x = rect.width / 2;
                y = rect.height / 2;
            }
        } else {
            x = rect.width / 2;
            y = rect.height / 2;
        }

        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.transform = 'translate(-50%, -50%)';

        const maxDimension = Math.max(rect.width, rect.height);
        const rippleSize = Math.min(maxDimension * 0.8, 48); // Max 48px as per Material Design

        requestAnimationFrame(() => {
            ripple.style.width = rippleSize + 'px';
            ripple.style.height = rippleSize + 'px';
        });

        setTimeout(() => {
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.left = '50%';
            ripple.style.top = '50%';
            ripple.style.transform = 'translate(-50%, -50%)';
        }, 300);
    }

    switchView(viewName) {
        if (this.ui.currentView === viewName) return;

        //console.log(`🔄 Switching from ${this.ui.currentView} to ${viewName}`);

        const currentViewEl = document.getElementById(`${this.ui.currentView}-view`);
        if (currentViewEl) {
            currentViewEl.classList.add('hidden');
        }
        
        const newViewEl = document.getElementById(`${viewName}-view`);
        if (newViewEl) {
            newViewEl.classList.remove('hidden');
            newViewEl.classList.add('animate-fade-in');
        }

        this.updateNavigationState(viewName);
        this.ui.currentView = viewName;

        // Solo actualizar state manager si es diferente para evitar bucles
        if (window.stateManager && window.stateManager.getState().currentView !== viewName) {
            window.stateManager.setCurrentView(viewName);
        }

        // Handle view-specific logic
        if (viewName === 'calendar') {
            this.ui.calendarManager.render();
        } else if (viewName === 'entries') {
            this.ui.loadAllEntries();
        }
    }

    updateNavigationState(activeView) {
        // Limpia cualquier clase de estado visual residual y estilos inline
        document.querySelectorAll('.nav-tab, .material-tab, .bottom-nav-btn').forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
            // Limpia estilos de borde y color inline si existen
            tab.style.removeProperty('border');
            tab.style.removeProperty('borderColor');
            tab.style.removeProperty('borderBottomWidth');
            tab.style.removeProperty('color');
        });
        // Aplica el estado activo correctamente
        document.querySelectorAll('.nav-tab').forEach(tab => {
            if (tab.dataset.view === activeView) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            }
        });
        document.querySelectorAll('.material-tab').forEach(tab => {
            if (tab.dataset.view === activeView) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
            }
        });
        document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
            if (btn.dataset.view === activeView) {
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
            }
        });
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
}