// Modal service for centralized modal management
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * ModalService - Centralized modal management with animations and accessibility
 */
class ModalService {
    constructor() {
        this.isInitialized = false;
        this.activeModals = new Map();
        this.zIndexCounter = 1000;
        this.activeModalStack = [];
    }

    async init() {
        try {
            this.setupGlobalEventListeners();
            this.isInitialized = true;
            console.log('ModalService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing ModalService:', error);
            return { success: false, error: error.message };
        }
    }

    setupGlobalEventListeners() {
        // Handle escape key for all modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModalStack.length > 0) {
                const topModal = this.activeModalStack[this.activeModalStack.length - 1];
                this.hideModal(topModal);
            }
        });
    }

    /**
     * Show a modal with options
     * @param {Object} options - Modal configuration
     * @param {string} options.id - Unique modal ID
     * @param {string} options.title - Modal title
     * @param {string} options.content - Modal content HTML
     * @param {Array} options.buttons - Array of button configurations
     * @param {boolean} options.closable - Whether modal can be closed by clicking outside
     * @param {string} options.size - Modal size ('sm', 'md', 'lg', 'xl')
     * @param {Function} options.onShow - Callback when modal is shown
     * @param {Function} options.onHide - Callback when modal is hidden
     */
    async showModal(options = {}) {
        try {
            const {
                id = `modal_${Date.now()}`,
                title = '',
                content = '',
                buttons = [],
                closable = true,
                size = 'md',
                onShow = null,
                onHide = null,
                animation = 'fade'
            } = options;

            // Close existing modal with same ID
            if (this.activeModals.has(id)) {
                await this.hideModal(id);
            }

            const modal = this.createModalElement(id, title, content, buttons, closable, size, animation);
            document.body.appendChild(modal);

            // Store modal info
            this.activeModals.set(id, {
                element: modal,
                onHide,
                closable
            });
            this.activeModalStack.push(id);

            // Trigger show animation
            await this.animateModalIn(modal, animation);

            // Setup event listeners
            this.setupModalEventListeners(id, modal, closable);

            // Trigger haptic feedback
            await this.triggerHapticFeedback('light');

            // Focus management
            this.manageFocus(modal);

            // Call onShow callback
            if (onShow && typeof onShow === 'function') {
                onShow(modal);
            }

            return { success: true, modalId: id, element: modal };
        } catch (error) {
            console.error('Error showing modal:', error);
            return { success: false, error: error.message };
        }
    }

    createModalElement(id, title, content, buttons, closable, size, animation) {
        const sizeClasses = {
            sm: 'max-w-sm',
            md: 'max-w-md',
            lg: 'max-w-lg',
            xl: 'max-w-xl',
            '2xl': 'max-w-2xl'
        };

        const animationClasses = {
            fade: 'animate-fadeIn',
            slideUp: 'animate-slideUp',
            slideDown: 'animate-slideDown',
            scale: 'animate-scaleIn'
        };

        const modalHTML = `
            <div id="${id}" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${animationClasses[animation] || 'animate-fadeIn'}" 
                 style="z-index: ${this.zIndexCounter++}" 
                 data-modal-id="${id}">
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full ${sizeClasses[size] || 'max-w-md'} transform transition-all duration-300 border border-gray-200 dark:border-gray-700" 
                     role="dialog" 
                     aria-modal="true" 
                     aria-labelledby="${id}-title">
                    
                    <!-- Header -->
                    ${title ? `
                        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 id="${id}-title" class="text-xl font-semibold text-gray-900 dark:text-white">
                                ${title}
                            </h3>
                            ${closable ? `
                                <button class="modal-close text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1" 
                                        aria-label="Cerrar modal">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- Content -->
                    <div class="p-6 ${!title ? 'pt-6' : ''} ${buttons.length === 0 ? 'pb-6' : ''}">
                        ${content}
                    </div>
                    
                    <!-- Footer -->
                    ${buttons.length > 0 ? `
                        <div class="flex items-center justify-end space-x-3 p-6 pt-0">
                            ${buttons.map(button => this.createButtonHTML(button)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHTML;
        return wrapper.firstElementChild;
    }

    createButtonHTML(button) {
        const {
            text = 'Button',
            type = 'secondary',
            action = null,
            closeModal = true,
            disabled = false
        } = button;

        const typeClasses = {
            primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
            secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-white',
            danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
            success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
        };

        return `
            <button class="modal-button px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${typeClasses[type] || typeClasses.secondary} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}" 
                    data-action="${action || ''}" 
                    data-close-modal="${closeModal}"
                    ${disabled ? 'disabled' : ''}>
                ${text}
            </button>
        `;
    }

    setupModalEventListeners(modalId, modal, closable) {
        // Close button
        if (closable) {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideModal(modalId));
            }

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modalId);
                }
            });
        }

        // Button actions
        const buttons = modal.querySelectorAll('.modal-button');
        buttons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const action = button.dataset.action;
                const shouldClose = button.dataset.closeModal === 'true';

                if (action && window[action] && typeof window[action] === 'function') {
                    try {
                        await window[action](modal, modalId);
                    } catch (error) {
                        console.error('Error executing modal action:', error);
                    }
                }

                if (shouldClose) {
                    this.hideModal(modalId);
                }
            });
        });
    }

    async hideModal(modalId) {
        try {
            const modalInfo = this.activeModals.get(modalId);
            if (!modalInfo) {
                return { success: false, error: 'Modal not found' };
            }

            const { element, onHide } = modalInfo;

            // Animate out
            await this.animateModalOut(element);

            // Remove from DOM
            element.remove();

            // Clean up tracking
            this.activeModals.delete(modalId);
            const stackIndex = this.activeModalStack.indexOf(modalId);
            if (stackIndex > -1) {
                this.activeModalStack.splice(stackIndex, 1);
            }

            // Call onHide callback
            if (onHide && typeof onHide === 'function') {
                onHide(modalId);
            }

            // Trigger haptic feedback
            await this.triggerHapticFeedback('light');

            return { success: true };
        } catch (error) {
            console.error('Error hiding modal:', error);
            return { success: false, error: error.message };
        }
    }

    async hideAllModals() {
        const modalIds = [...this.activeModals.keys()];
        for (const modalId of modalIds) {
            await this.hideModal(modalId);
        }
    }

    async animateModalIn(modal, animation = 'fade') {
        return new Promise(resolve => {
            modal.style.opacity = '0';
            
            if (animation === 'slideUp') {
                modal.querySelector('[role="dialog"]').style.transform = 'translateY(100px) scale(0.9)';
            } else if (animation === 'scale') {
                modal.querySelector('[role="dialog"]').style.transform = 'scale(0.8)';
            }

            setTimeout(() => {
                modal.style.opacity = '1';
                modal.querySelector('[role="dialog"]').style.transform = 'translateY(0) scale(1)';
                setTimeout(resolve, 300);
            }, 50);
        });
    }

    async animateModalOut(modal) {
        return new Promise(resolve => {
            modal.style.opacity = '0';
            modal.querySelector('[role="dialog"]').style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(resolve, 300);
        });
    }

    manageFocus(modal) {
        // Store currently focused element
        const previouslyFocused = document.activeElement;
        
        // Focus first focusable element in modal
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Trap focus within modal
        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey && document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        modal.addEventListener('keydown', handleTabKey);

        // Restore focus when modal is closed
        modal._restoreFocus = () => {
            if (previouslyFocused) {
                previouslyFocused.focus();
            }
            modal.removeEventListener('keydown', handleTabKey);
        };
    }

    async triggerHapticFeedback(style = 'light') {
        try {
            const impactStyle = style === 'light' ? ImpactStyle.Light :
                style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy;
            await Haptics.impact({ style: impactStyle });
        } catch (error) {
            // Haptics not available, silently fail
        }
    }

    // Quick modal methods
    async showAlert(title, message, buttonText = 'OK') {
        return this.showModal({
            title,
            content: `<p class="text-gray-700 dark:text-gray-300">${message}</p>`,
            buttons: [{
                text: buttonText,
                type: 'primary',
                closeModal: true
            }],
            size: 'sm'
        });
    }

    async showConfirm(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
        return new Promise(resolve => {
            this.showModal({
                title,
                content: `<p class="text-gray-700 dark:text-gray-300">${message}</p>`,
                buttons: [
                    {
                        text: cancelText,
                        type: 'secondary',
                        action: 'modalCancelAction',
                        closeModal: true
                    },
                    {
                        text: confirmText,
                        type: 'primary',
                        action: 'modalConfirmAction',
                        closeModal: true
                    }
                ],
                size: 'sm',
                onHide: (modalId) => {
                    // If no action was set, assume cancel
                    if (!window._modalConfirmed) {
                        resolve(false);
                    }
                    window._modalConfirmed = false;
                }
            });

            // Set up global action handlers
            window.modalConfirmAction = () => {
                window._modalConfirmed = true;
                resolve(true);
            };

            window.modalCancelAction = () => {
                window._modalConfirmed = false;
                resolve(false);
            };
        });
    }

    async showLoading(message = 'Cargando...') {
        return this.showModal({
            id: 'loading-modal',
            content: `
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p class="text-gray-700 dark:text-gray-300">${message}</p>
                </div>
            `,
            closable: false,
            size: 'sm'
        });
    }

    async hideLoading() {
        return this.hideModal('loading-modal');
    }

    // Utility methods
    isModalActive(modalId) {
        return this.activeModals.has(modalId);
    }

    getActiveModals() {
        return [...this.activeModals.keys()];
    }

    getModalElement(modalId) {
        const modalInfo = this.activeModals.get(modalId);
        return modalInfo ? modalInfo.element : null;
    }

    updateModalContent(modalId, newContent) {
        const modal = this.getModalElement(modalId);
        if (modal) {
            const contentContainer = modal.querySelector('.p-6');
            if (contentContainer) {
                contentContainer.innerHTML = newContent;
                return { success: true };
            }
        }
        return { success: false, error: 'Modal or content container not found' };
    }

    destroy() {
        this.hideAllModals();
        this.activeModals.clear();
        this.activeModalStack.length = 0;
    }
}

// Create and export singleton instance
const modalService = new ModalService();

export default modalService;
