import { Network } from '@capacitor/network';

class NetworkService {
    constructor() {
        this.status = 'unknown';
        this.isConnected = false;
        this.connectionType = 'unknown';
        this.listeners = [];
        this.networkListener = null;
        
        this.init();
    }

    /**
     * Inicializa el NetworkService y obtiene el estado inicial de la red
     */
    async init() {
        try {
            await this.updateNetworkStatus();
            this.setupNetworkListener();
            console.log('NetworkService initialized successfully');
        } catch (error) {
            console.error('Error initializing NetworkService:', error);
        }
    }

    /**
     * Obtiene y actualiza el estado actual de la red
     */
    async updateNetworkStatus() {
        try {
            const status = await Network.getStatus();
            this.isConnected = status.connected;
            this.connectionType = status.connectionType;
            this.status = status.connected ? 'connected' : 'disconnected';
            
            console.log('Network status updated:', {
                connected: this.isConnected,
                type: this.connectionType,
                status: this.status
            });
            
            return status;
        } catch (error) {
            console.error('Error getting network status:', error);
            this.status = 'error';
            return null;
        }
    }

    /**
     * Configura el listener para cambios en el estado de la red
     */
    setupNetworkListener() {
        this.networkListener = Network.addListener('networkStatusChange', (status) => {
            console.log('Network status changed:', status);
            
            this.isConnected = status.connected;
            this.connectionType = status.connectionType;
            this.status = status.connected ? 'connected' : 'disconnected';
            
            this.notifyListeners(status);
        });
    }

    /**
     * Registra un callback para ser notificado cuando cambie el estado de la red
     * @param {Function} callback - Función que será llamada cuando cambie el estado
     * @returns {Function} - Función para remover el listener
     */
    addListener(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        this.listeners.push(callback);
        
        return () => {
            this.removeListener(callback);
        };
    }

    /**
     * Remueve un listener específico
     * @param {Function} callback - Función callback a remover
     */
    removeListener(callback) {
        const index = this.listeners.indexOf(callback);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notifica a todos los listeners registrados sobre cambios en la red
     * @param {Object} status - Estado actual de la red
     */
    notifyListeners(status) {
        this.listeners.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error executing network listener callback:', error);
            }
        });
    }

    /**
     * Verifica si hay conexión a internet
     * @returns {boolean} - true si hay conexión, false si no
     */
    isOnline() {
        return this.isConnected;
    }

    /**
     * Verifica si la conexión es WiFi
     * @returns {boolean} - true si es WiFi, false si no
     */
    isWiFi() {
        return this.connectionType === 'wifi';
    }

    /**
     * Verifica si la conexión es celular
     * @returns {boolean} - true si es celular, false si no
     */
    isCellular() {
        return this.connectionType === 'cellular';
    }

    /**
     * Obtiene el tipo de conexión actual
     * @returns {string} - 'wifi', 'cellular', 'none', 'unknown'
     */
    getConnectionType() {
        return this.connectionType;
    }

    /**
     * Obtiene el estado completo de la red
     * @returns {Object} - Objeto con toda la información de la red
     */
    getStatus() {
        return {
            connected: this.isConnected,
            connectionType: this.connectionType,
            status: this.status,
            isOnline: this.isOnline(),
            isWiFi: this.isWiFi(),
            isCellular: this.isCellular()
        };
    }

    /**
     * Espera hasta que haya conexión a internet
     * @param {number} timeout - Tiempo límite en milisegundos (opcional)
     * @returns {Promise} - Promise que se resuelve cuando hay conexión
     */
    waitForConnection(timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (this.isOnline()) {
                resolve(this.getStatus());
                return;
            }

            let timeoutId;
            const removeListener = this.addListener((status) => {
                if (status.connected) {
                    clearTimeout(timeoutId);
                    removeListener();
                    resolve(status);
                }
            });

            if (timeout > 0) {
                timeoutId = setTimeout(() => {
                    removeListener();
                    reject(new Error('Timeout waiting for network connection'));
                }, timeout);
            }
        });
    }

    /**
     * Ejecuta una función solo si hay conexión a internet
     * @param {Function} callback - Función a ejecutar
     * @param {Function} fallback - Función a ejecutar si no hay conexión (opcional)
     */
    async executeIfOnline(callback, fallback = null) {
        if (this.isOnline()) {
            return await callback();
        } else {
            console.warn('No network connection available');
            if (fallback && typeof fallback === 'function') {
                return await fallback();
            }
            throw new Error('No network connection available');
        }
    }

    /**
     * Limpia todos los listeners y recursos
     */
    async destroy() {
        try {
            this.listeners = [];
            
            if (this.networkListener) {
                this.networkListener.remove();
                this.networkListener = null;
            }
            
            await Network.removeAllListeners();
            
            console.log('NetworkService destroyed successfully');
        } catch (error) {
            console.error('Error destroying NetworkService:', error);
        }
    }
}

export default NetworkService;
