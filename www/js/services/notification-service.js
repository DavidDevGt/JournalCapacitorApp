/**
 * NotificationService - Servicio para manejar notificaciones locales
 * 
 * Este servicio encapsula toda la funcionalidad relacionada con notificaciones
 * de Capacitor, proporcionando una interfaz limpia y reutilizable.
 * 
 * Características:
 * - Inicialización automática de permisos
 * - Programación de notificaciones diarias
 * - Gestión de configuración de notificaciones
 * - Manejo de errores centralizado
 * - Integración con la base de datos local
 */

import { LocalNotifications } from '@capacitor/local-notifications';

class NotificationService {
    constructor() {
        this.isInitialized = false;
        this.notificationId = 1;
    }

    async init() {
        try {
            const permissions = await LocalNotifications.requestPermissions();
            
            if (permissions.display === 'granted') {
                this.isInitialized = true;
                await this.scheduleNotifications();
                console.log('NotificationService inicializado correctamente');
            } else {
                console.warn('Permisos de notificación no concedidos');
            }
        } catch (error) {
            console.error('Error inicializando NotificationService:', error);
        }
    }

    async scheduleNotifications() {
        if (!this.isInitialized) {
            console.warn('NotificationService no inicializado');
            return;
        }

        try {
            const notificationTime = await this.getNotificationTime();
            const isEnabled = await this.getNotificationsEnabled();

            if (isEnabled === 'false') {
                console.log('Notificaciones deshabilitadas');
                return;
            }

            // Cancelar notificaciones existentes
            await LocalNotifications.cancel({ notifications: [{ id: this.notificationId }] });

            // Programar recordatorio diario
            const [hours, minutes] = notificationTime.split(':').map(Number);

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: 'Daily Journal',
                        body: '¿Cómo fue tu día? Es hora de escribir en tu diario 📖',
                        id: this.notificationId,
                        schedule: {
                            on: {
                                hour: hours,
                                minute: minutes
                            },
                            allowWhileIdle: true,
                            repeats: true
                        },
                        actionTypeId: 'OPEN_JOURNAL',
                        extra: {
                            action: 'open_today'
                        }
                    }
                ]
            });

            console.log(`Notificación programada para las ${notificationTime}`);
        } catch (error) {
            console.error('Error programando notificaciones:', error);
        }
    }

    async toggleNotifications(enabled) {
        if (!window.db) {
            console.warn('Base de datos no disponible');
            return;
        }

        try {
            await window.db.setSetting('notificationsEnabled', enabled.toString());

            if (enabled) {
                await this.scheduleNotifications();
                this.showMessage('Recordatorios activados', 'success');
            } else {
                await LocalNotifications.cancel({ notifications: [{ id: this.notificationId }] });
                this.showMessage('Recordatorios desactivados', 'info');
            }
        } catch (error) {
            console.error('Error cambiando estado de notificaciones:', error);
            this.showMessage('Error al cambiar configuración', 'error');
        }
    }

    async setNotificationTime(time) {
        if (!window.db) {
            console.warn('Base de datos no disponible');
            return;
        }

        try {
            await window.db.setSetting('notificationTime', time);
            await this.scheduleNotifications();
            this.showMessage(`Recordatorio programado para las ${time}`, 'success');
        } catch (error) {
            console.error('Error configurando hora de notificación:', error);
            this.showMessage('Error al configurar recordatorio', 'error');
        }
    }

    async getNotificationTime() {
        if (!window.db) return '20:00';
        
        try {
            return await window.db.getSetting('notificationTime', '20:00') || '20:00';
        } catch (error) {
            console.warn('Error obteniendo hora de notificación:', error);
            return '20:00';
        }
    }

    async getNotificationsEnabled() {
        if (!window.db) return 'true';
        
        try {
            return await window.db.getSetting('notificationsEnabled', 'true') || 'true';
        } catch (error) {
            console.warn('Error obteniendo estado de notificaciones:', error);
            return 'true';
        }
    }

    showMessage(message, type) {
        if (window.ui && typeof window.ui.showToast === 'function') {
            window.ui.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    async cancelAllNotifications() {
        try {
            await LocalNotifications.cancel({ notifications: [{ id: this.notificationId }] });
            console.log('Todas las notificaciones canceladas');
        } catch (error) {
            console.error('Error cancelando notificaciones:', error);
        }
    }

    async getPendingNotifications() {
        try {
            const notifications = await LocalNotifications.getPending();
            return notifications.notifications || [];
        } catch (error) {
            console.error('Error obteniendo notificaciones pendientes:', error);
            return [];
        }
    }

    async checkPermissions() {
        try {
            const permissions = await LocalNotifications.checkPermissions();
            return permissions.display === 'granted';
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return false;
        }
    }

    async requestPermissions() {
        try {
            const permissions = await LocalNotifications.requestPermissions();
            return permissions.display === 'granted';
        } catch (error) {
            console.error('Error solicitando permisos:', error);
            return false;
        }
    }
}

export default NotificationService; 