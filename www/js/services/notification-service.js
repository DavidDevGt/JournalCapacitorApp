import { LocalNotifications } from '@capacitor/local-notifications';
import registry from '../registry.js';

const PHRASES_BY_TIME = {
    morning: [
        '¡Buenos días! ¿Cómo comenzó tu día? 🌅',
        '¿Qué esperas de este día? Escríbelo 📝',
        '¿Cuál es tu propósito para hoy? 🎯',
        'Comienza tu día reflexionando sobre tus metas 💭'
    ],
    afternoon: [
        '¿Cómo va tu día hasta ahora? 🌞',
        'Pausa un momento y reflexiona sobre tu mañana 🤔',
        '¿Qué has aprendido hoy? Compártelo en tu diario 📚'
    ],
    evening: [
        '¿Cómo fue tu día? Es hora de escribir en tu diario 📖',
        'A veces uno tiene las ideas desordenadas, es hora de escribir y ordenarlas 📝',
        '¿Qué te gustaría recordar de este día? 💫',
        '¿Qué desafío superaste hoy? 🏆',
        'Termina tu día con gratitud, ¿por qué estás agradecido? 🙏'
    ],
    night: [
        'Antes de dormir, reflexiona sobre tu día ⭐',
        '¿Qué fue lo mejor de hoy? No lo olvides 💭',
        '¿Qué aprendiste sobre ti mismo hoy? 🪞'
    ]
};

class NotificationService {
    constructor() {
        this.isInitialized = false;
        this.notificationId = 1;
    }

    /**
     * Obtiene una frase aleatoria basada en la hora actual
     * @returns {string} - Frase aleatoria
     */
    async getRandomPhrase() {
        const currentTime = new Date().getHours();

        switch (true) {
            case currentTime >= 5 && currentTime < 12:
                return PHRASES_BY_TIME.morning[Math.floor(Math.random() * PHRASES_BY_TIME.morning.length)];
            case currentTime >= 12 && currentTime < 18:
                return PHRASES_BY_TIME.afternoon[Math.floor(Math.random() * PHRASES_BY_TIME.afternoon.length)];
            case currentTime >= 18 && currentTime < 23:
                return PHRASES_BY_TIME.evening[Math.floor(Math.random() * PHRASES_BY_TIME.evening.length)];
            default:
                return PHRASES_BY_TIME.night[Math.floor(Math.random() * PHRASES_BY_TIME.night.length)];
        }
    }

    /**
     * Inicializa el servicio de notificaciones
     */
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

    /**
     * Programar notificaciones diarias
     */
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

            await LocalNotifications.cancel({ notifications: [{ id: this.notificationId }] });

            // Programar recordatorio diario
            const [hours, minutes] = notificationTime.split(':').map(Number);

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: 'Daily Journal',
                        body: await this.getRandomPhrase(),
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

    /**
     * Activar o desactivar notificaciones
     * @param {boolean} enabled - true para activar, false para desactivar
     */
    async toggleNotifications(enabled) {
        if (!registry.db) {
            console.warn('Base de datos no disponible');
            return;
        }

        try {
            await registry.db.setSetting('notificationsEnabled', enabled.toString());

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

    /**
     * Configurar la hora de las notificaciones
     * @param {string} time - La hora en formato HH:MM
     */
    async setNotificationTime(time) {
        if (!registry.db) {
            console.warn('Base de datos no disponible');
            return;
        }

        try {
            await registry.db.setSetting('notificationTime', time);
            await this.scheduleNotifications();
            this.showMessage(`Recordatorio programado para las ${time}`, 'success');
        } catch (error) {
            console.error('Error configurando hora de notificación:', error);
            this.showMessage('Error al configurar recordatorio', 'error');
        }
    }

    /**
     * Obtener la hora de las notificaciones
     * @returns {string} - La hora en formato HH:MM
     */
    async getNotificationTime() {
        if (!registry.db) return '20:00';

        try {
            return await registry.db.getSetting('notificationTime', '20:00') || '20:00';
        } catch (error) {
            console.warn('Error obteniendo hora de notificación:', error);
            return '20:00';
        }
    }

    /**
     * Obtener el estado de las notificaciones
     * @returns {string} - true si están habilitadas, false si están deshabilitadas
     */
    async getNotificationsEnabled() {
        if (!registry.db) return 'true';

        try {
            return await registry.db.getSetting('notificationsEnabled', 'true') || 'true';
        } catch (error) {
            console.warn('Error obteniendo estado de notificaciones:', error);
            return 'true';
        }
    }

    /**
     * Mostrar un mensaje en la interfaz
     * @param {string} message - El mensaje a mostrar
     * @param {string} type - El tipo de mensaje (success, info, error)
     */
    showMessage(message, type) {
        if (registry.ui && typeof registry.ui.showToast === 'function') {
            registry.ui.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Cancelar todas las notificaciones
     */
    async cancelAllNotifications() {
        try {
            await LocalNotifications.cancel({ notifications: [{ id: this.notificationId }] });
            console.log('Todas las notificaciones canceladas');
        } catch (error) {
            console.error('Error cancelando notificaciones:', error);
        }
    }

    /**
     * Obtener las notificaciones pendientes
     * @returns {Array} - Array de notificaciones pendientes
     */
    async getPendingNotifications() {
        try {
            const notifications = await LocalNotifications.getPending();
            return notifications.notifications || [];
        } catch (error) {
            console.error('Error obteniendo notificaciones pendientes:', error);
            return [];
        }
    }

    /**
     * Verificar si se han concedido permisos de notificación
     * @returns {boolean} - true si se han concedido permisos, false si no
     */
    async checkPermissions() {
        try {
            const permissions = await LocalNotifications.checkPermissions();
            return permissions.display === 'granted';
        } catch (error) {
            console.error('Error verificando permisos:', error);
            return false;
        }
    }

    /**
     * Solicitar permisos de notificación
     * @returns {boolean} - true si se han concedido permisos, false si no
     */
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
