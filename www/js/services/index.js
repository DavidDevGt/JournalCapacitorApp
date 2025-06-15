// Services index - Central export point for all application services
import storageService from './storage.js';
import notificationService from './notification.js';
import analyticsService from './analytics.js';
import cameraService from './camera.js';
import modalService from './modal.js';
import themeService from './theme.js';
import searchService from './search.js';
import exportService from './export.js';
import settingsService from './settings.js';

/**
 * ServiceManager - Coordinates initialization and management of all services
 */
class ServiceManager {
    constructor() {
        this.services = {
            storage: storageService,
            notifications: notificationService,
            analytics: analyticsService,
            camera: cameraService,
            modal: modalService,
            theme: themeService,
            search: searchService,
            export: exportService,
            settings: settingsService
        };
        this.isInitialized = false;
        this.initializationOrder = [
            'storage', 
            'settings', 
            'theme', 
            'modal', 
            'search', 
            'notifications', 
            'camera', 
            'export', 
            'analytics'
        ];
    }

    async initializeAll() {
        console.log('Initializing all services...');
        const results = {};

        try {
            for (const serviceName of this.initializationOrder) {
                const service = this.services[serviceName];
                if (service && typeof service.init === 'function') {
                    console.log(`Initializing ${serviceName}Service...`);
                    const result = await service.init();
                    results[serviceName] = result;
                    
                    if (!result.success) {
                        console.error(`Failed to initialize ${serviceName}Service:`, result.error);
                    }
                } else {
                    console.warn(`Service ${serviceName} does not have an init method`);
                    results[serviceName] = { success: true, message: 'No initialization required' };
                }
            }

            this.isInitialized = true;
            console.log('All services initialized successfully');
            
            return {
                success: true,
                results,
                message: 'All services initialized'
            };
        } catch (error) {
            console.error('Error during service initialization:', error);
            return {
                success: false,
                error: error.message,
                results
            };
        }
    }

    getService(serviceName) {
        return this.services[serviceName] || null;
    }

    getAllServices() {
        return this.services;
    }

    async getServicesStatus() {
        const status = {};
        
        for (const [name, service] of Object.entries(this.services)) {
            status[name] = {
                available: !!service,
                initialized: service.isInitialized || false,
                type: service.constructor.name
            };
        }

        return status;
    }

    // Convenience methods for accessing services
    get storage() {
        return this.services.storage;
    }

    get notifications() {
        return this.services.notifications;
    }

    get analytics() {
        return this.services.analytics;
    }

    get camera() {
        return this.services.camera;
    }

    // Health check for all services
    async healthCheck() {
        const health = {
            overall: 'healthy',
            services: {},
            timestamp: new Date().toISOString()
        };

        try {
            // Storage service health
            const storageInfo = await this.storage.getStorageInfo();
            health.services.storage = {
                status: storageInfo.success ? 'healthy' : 'unhealthy',
                platform: storageInfo.platform,
                details: storageInfo
            };

            // Notifications service health
            const notificationStatus = await this.notifications.getNotificationStatus();
            health.services.notifications = {
                status: notificationStatus.success ? 'healthy' : 'unhealthy',
                permissionsGranted: notificationStatus.permissionsGranted,
                details: notificationStatus
            };

            // Camera service health
            const cameraPermissions = await this.camera.checkPermissions();
            health.services.camera = {
                status: cameraPermissions.success ? 'healthy' : 'unhealthy',
                permissions: cameraPermissions.permissions,
                details: cameraPermissions
            };

            // Analytics service health
            const basicStats = await this.analytics.getBasicStats();
            health.services.analytics = {
                status: basicStats.success ? 'healthy' : 'unhealthy',
                cacheSize: this.analytics.cache.size,
                details: basicStats
            };

            // Check overall health
            const unhealthyServices = Object.values(health.services)
                .filter(service => service.status === 'unhealthy');
            
            if (unhealthyServices.length > 0) {
                health.overall = 'degraded';
            }

            if (unhealthyServices.length === Object.keys(health.services).length) {
                health.overall = 'unhealthy';
            }

        } catch (error) {
            health.overall = 'unhealthy';
            health.error = error.message;
        }

        return health;
    }

    // Emergency cleanup
    async emergencyCleanup() {
        console.log('Performing emergency cleanup...');
        const results = {};

        try {
            // Clear all caches
            if (this.storage && this.storage.cache) {
                await this.storage.cleanup();
                results.storage = 'cache cleared';
            }

            if (this.analytics && this.analytics.clearCache) {
                this.analytics.clearCache();
                results.analytics = 'cache cleared';
            }

            // Cancel all notifications
            if (this.notifications && this.notifications.cancelAllNotifications) {
                const cancelResult = await this.notifications.cancelAllNotifications();
                results.notifications = `${cancelResult.canceled || 0} notifications canceled`;
            }

            console.log('Emergency cleanup completed:', results);
            return { success: true, results };
        } catch (error) {
            console.error('Error during emergency cleanup:', error);
            return { success: false, error: error.message, results };
        }
    }
}

const serviceManager = new ServiceManager();

export {
    storageService,
    notificationService,
    analyticsService,
    cameraService,
    serviceManager
};

export default serviceManager;
