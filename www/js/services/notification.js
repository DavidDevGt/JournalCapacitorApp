// Notification service for handling local notifications and reminders
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import storageService from './storage.js';

class NotificationService {
    constructor() {
        this.isInitialized = false;
        this.isNative = Capacitor.isNativePlatform();
        this.permissionsGranted = false;
    }

    async init() {
        try {
            if (this.isNative) {
                await this.requestPermissions();
            }
            await this.setupNotificationHandlers();
            this.isInitialized = true;
            console.log('NotificationService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing NotificationService:', error);
            return { success: false, error: error.message };
        }
    }

    async requestPermissions() {
        try {
            const permissions = await LocalNotifications.requestPermissions();
            this.permissionsGranted = permissions.display === 'granted';
            
            console.log('Notification permissions:', permissions.display);
            return { success: true, granted: this.permissionsGranted };
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            return { success: false, error: error.message };
        }
    }

    async checkPermissions() {
        try {
            const permissions = await LocalNotifications.checkPermissions();
            this.permissionsGranted = permissions.display === 'granted';
            return { success: true, granted: this.permissionsGranted };
        } catch (error) {
            console.error('Error checking notification permissions:', error);
            return { success: false, error: error.message };
        }
    }

    async scheduleJournalReminder() {
        if (!this.permissionsGranted) {
            console.warn('Notification permissions not granted');
            return { success: false, error: 'Permissions not granted' };
        }

        try {
            const config = storageService.getConfig();
            const isEnabled = await config.getNotificationsEnabled();
            const notificationTime = await config.getNotificationTime();

            if (!isEnabled) {
                return { success: true, message: 'Notifications disabled' };
            }

            // Cancel existing notification
            await this.cancelJournalReminder();

            const [hours, minutes] = notificationTime.split(':').map(Number);

            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: 'Daily Journal',
                        body: '¿Cómo fue tu día? Es hora de escribir en tu diario 📖',
                        id: 1,
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

            console.log(`Journal reminder scheduled for ${notificationTime}`);
            return { success: true, time: notificationTime };
        } catch (error) {
            console.error('Error scheduling journal reminder:', error);
            return { success: false, error: error.message };
        }
    }

    async cancelJournalReminder() {
        try {
            await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
            return { success: true };
        } catch (error) {
            console.error('Error canceling journal reminder:', error);
            return { success: false, error: error.message };
        }
    }

    async scheduleStreakReminder() {
        if (!this.permissionsGranted) {
            return { success: false, error: 'Permissions not granted' };
        }

        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title: '🔥 ¡Mantén tu racha!',
                        body: 'No olvides escribir en tu diario hoy para mantener tu racha activa',
                        id: 2,
                        schedule: {
                            at: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
                        },
                        actionTypeId: 'STREAK_REMINDER',
                        extra: {
                            action: 'maintain_streak'
                        }
                    }
                ]
            });

            return { success: true };
        } catch (error) {
            console.error('Error scheduling streak reminder:', error);
            return { success: false, error: error.message };
        }
    }

    async scheduleCustomNotification(title, body, delay = 3600000) { // 1 hour default
        if (!this.permissionsGranted) {
            return { success: false, error: 'Permissions not granted' };
        }

        try {
            const id = Date.now(); // Use timestamp as unique ID
            
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id,
                        schedule: {
                            at: new Date(Date.now() + delay)
                        },
                        actionTypeId: 'CUSTOM_NOTIFICATION',
                        extra: {
                            action: 'custom',
                            id: id.toString()
                        }
                    }
                ]
            });

            return { success: true, id };
        } catch (error) {
            console.error('Error scheduling custom notification:', error);
            return { success: false, error: error.message };
        }
    }

    async cancelNotification(id) {
        try {
            await LocalNotifications.cancel({ notifications: [{ id }] });
            return { success: true };
        } catch (error) {
            console.error(`Error canceling notification ${id}:`, error);
            return { success: false, error: error.message };
        }
    }

    async cancelAllNotifications() {
        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                const ids = pending.notifications.map(n => ({ id: n.id }));
                await LocalNotifications.cancel({ notifications: ids });
            }
            return { success: true, canceled: pending.notifications.length };
        } catch (error) {
            console.error('Error canceling all notifications:', error);
            return { success: false, error: error.message };
        }
    }

    async getPendingNotifications() {
        try {
            const pending = await LocalNotifications.getPending();
            return { success: true, notifications: pending.notifications };
        } catch (error) {
            console.error('Error getting pending notifications:', error);
            return { success: false, error: error.message };
        }
    }

    async setupNotificationHandlers() {
        try {
            // Handle notification received (when app is in foreground)
            await LocalNotifications.addListener('localNotificationReceived', (notification) => {
                console.log('Notification received:', notification);
                this.handleNotificationReceived(notification);
            });

            // Handle notification action performed (when user taps notification)
            await LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
                console.log('Notification action performed:', notificationAction);
                this.handleNotificationAction(notificationAction);
            });

            return { success: true };
        } catch (error) {
            console.error('Error setting up notification handlers:', error);
            return { success: false, error: error.message };
        }
    }

    handleNotificationReceived(notification) {
        // Handle notification when app is in foreground
        if (window.ui) {
            window.ui.showToast(notification.body, 'info', 5000);
        }
    }

    handleNotificationAction(notificationAction) {
        const { actionId, notification } = notificationAction;
        const extra = notification.extra;

        switch (extra?.action) {
            case 'open_today':
                this.openTodayEntry();
                break;
            case 'maintain_streak':
                this.openStreakView();
                break;
            case 'custom':
                this.handleCustomNotificationAction(extra.id);
                break;
            default:
                console.log('Unknown notification action:', actionId);
        }
    }

    openTodayEntry() {
        if (window.ui) {
            window.ui.switchView('today');
            
            // Focus on journal textarea if available
            setTimeout(() => {
                const textarea = document.getElementById('journal-entry');
                if (textarea) {
                    textarea.focus();
                }
            }, 500);
        }
    }

    openStreakView() {
        if (window.ui) {
            window.ui.switchView('today');
            window.ui.showToast('¡No pierdas tu racha! Escribe algo hoy 🔥', 'info', 5000);
        }
    }

    handleCustomNotificationAction(id) {
        console.log(`Custom notification action for ID: ${id}`);
        // Handle custom notification actions as needed
    }

    async updateNotificationSettings(enabled, time) {
        try {
            const config = storageService.getConfig();
            
            await config.setNotificationsEnabled(enabled);
            if (time) {
                await config.setNotificationTime(time);
            }

            if (enabled) {
                await this.scheduleJournalReminder();
            } else {
                await this.cancelJournalReminder();
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating notification settings:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    isTimeValid(timeString) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeRegex.test(timeString);
    }

    formatNotificationTime(date) {
        return date.toTimeString().substring(0, 5);
    }

    getNextNotificationTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const now = new Date();
        const notificationTime = new Date();
        
        notificationTime.setHours(hours, minutes, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (notificationTime <= now) {
            notificationTime.setDate(notificationTime.getDate() + 1);
        }
        
        return notificationTime;
    }

    async getNotificationStatus() {
        try {
            const config = storageService.getConfig();
            const enabled = await config.getNotificationsEnabled();
            const time = await config.getNotificationTime();
            const pending = await this.getPendingNotifications();
            
            return {
                success: true,
                enabled,
                time,
                permissionsGranted: this.permissionsGranted,
                pendingCount: pending.success ? pending.notifications.length : 0,
                nextNotification: enabled ? this.getNextNotificationTime(time) : null
            };
        } catch (error) {
            console.error('Error getting notification status:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export singleton instance
const notificationService = new NotificationService();

export default notificationService;
