// Settings service for managing app configuration and user preferences
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * SettingsService - Centralized settings and preferences management
 */
class SettingsService {
    constructor() {
        this.isInitialized = false;
        this.settings = new Map();
        this.defaultSettings = {
            // Appearance
            darkMode: false,
            theme: 'system',
            fontSize: 'medium',
            fontFamily: 'default',
            
            // Journal behavior
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            wordCountVisible: true,
            dateFormat: 'full',
            
            // Notifications
            notificationsEnabled: true,
            notificationTime: '20:00',
            notificationDays: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
            reminderText: '¡Hora de escribir en tu diario! ✍️',
            
            // Privacy & Security
            requireAuth: false,
            autoLock: false,
            autoLockDelay: 300000, // 5 minutes
            hideContentInRecents: false,
            
            // Export & Backup
            autoBackup: false,
            autoBackupInterval: 'weekly',
            backupFormat: 'json',
            includePhotosInBackup: true,
            
            // Advanced
            debugMode: false,
            analytics: true,
            hapticFeedback: true,
            soundEffects: false,
            language: 'es',
            
            // Image settings
            imageQuality: 0.85,
            imageMaxSize: 1920,
            generateThumbnails: true,
            thumbnailSize: 200,
            
            // Search
            searchHistory: true,
            maxSearchHistory: 50,
            indexStopWords: true,
            
            // Performance
            maxEntriesPerPage: 50,
            enableVirtualization: true,
            preloadImages: true
        };
        this.observers = new Set();
        this.validationRules = this.createValidationRules();
    }

    async init() {
        try {
            await this.loadSettings();
            await this.applySettings();
            this.isInitialized = true;
            console.log('SettingsService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing SettingsService:', error);
            return { success: false, error: error.message };
        }
    }

    async loadSettings() {
        try {
            // Load from storage service if available
            if (window.services?.storage) {
                const config = window.services.storage.getConfig();
                
                // Load each setting
                for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
                    try {
                        let value;
                        switch (key) {
                            case 'darkMode':
                                value = await config.getDarkMode();
                                break;
                            case 'notificationsEnabled':
                                value = await config.getNotificationsEnabled();
                                break;
                            case 'notificationTime':
                                value = await config.getNotificationTime();
                                break;
                            case 'language':
                                value = await config.getLanguage();
                                break;
                            case 'autoSave':
                                value = await config.getAutoSave();
                                break;
                            case 'autoSaveInterval':
                                value = await config.getAutoSaveInterval();
                                break;
                            case 'imageQuality':
                                value = await config.getImageQuality();
                                break;
                            default:
                                value = await window.services.storage.getPreferences().get(`setting_${key}`, defaultValue);
                        }
                        
                        this.settings.set(key, value !== null ? value : defaultValue);
                    } catch (error) {
                        console.warn(`Error loading setting ${key}:`, error);
                        this.settings.set(key, defaultValue);
                    }
                }
            } else {
                // Fallback to localStorage
                const storedSettings = localStorage.getItem('journal_settings');
                const parsed = storedSettings ? JSON.parse(storedSettings) : {};
                
                for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
                    this.settings.set(key, parsed[key] !== undefined ? parsed[key] : defaultValue);
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error loading settings:', error);
            // Use defaults on error
            for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
                this.settings.set(key, defaultValue);
            }
            return { success: false, error: error.message };
        }
    }

    async saveSettings() {
        try {
            if (window.services?.storage) {
                const config = window.services.storage.getConfig();
                const preferences = window.services.storage.getPreferences();
                
                // Save specific settings through config manager
                await config.setDarkMode(this.settings.get('darkMode'));
                await config.setNotificationsEnabled(this.settings.get('notificationsEnabled'));
                await config.setNotificationTime(this.settings.get('notificationTime'));
                await config.setLanguage(this.settings.get('language'));
                await config.setAutoSave(this.settings.get('autoSave'));
                await config.setAutoSaveInterval(this.settings.get('autoSaveInterval'));
                await config.setImageQuality(this.settings.get('imageQuality'));
                
                // Save other settings through preferences
                for (const [key, value] of this.settings) {
                    if (!['darkMode', 'notificationsEnabled', 'notificationTime', 'language', 
                          'autoSave', 'autoSaveInterval', 'imageQuality'].includes(key)) {
                        await preferences.set(`setting_${key}`, value);
                    }
                }
            } else {
                // Fallback to localStorage
                const settingsObject = Object.fromEntries(this.settings);
                localStorage.setItem('journal_settings', JSON.stringify(settingsObject));
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving settings:', error);
            return { success: false, error: error.message };
        }
    }

    async applySettings() {
        try {
            // Apply theme settings
            if (window.services?.theme) {
                const themePreference = this.settings.get('theme');
                await window.services.theme.setTheme(themePreference);
            }

            // Apply notification settings
            if (this.settings.get('notificationsEnabled') && window.services?.notifications) {
                await window.services.notifications.scheduleJournalReminder();
            }

            // Apply other app-wide settings
            this.applyFontSettings();
            this.applyAccessibilitySettings();

            return { success: true };
        } catch (error) {
            console.error('Error applying settings:', error);
            return { success: false, error: error.message };
        }
    }

    // Get/Set individual settings
    async get(key, defaultValue = null) {
        if (!this.settings.has(key)) {
            return defaultValue !== null ? defaultValue : this.defaultSettings[key];
        }
        return this.settings.get(key);
    }

    async set(key, value) {
        try {
            // Validate the value
            const validationResult = this.validateSetting(key, value);
            if (!validationResult.valid) {
                return { success: false, error: validationResult.error };
            }

            const oldValue = this.settings.get(key);
            this.settings.set(key, value);

            // Save to persistent storage
            await this.saveSettings();

            // Apply setting if it affects the current session
            await this.applySingleSetting(key, value, oldValue);

            // Notify observers
            this.notifyObservers(key, value, oldValue);

            return { success: true };
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
            return { success: false, error: error.message };
        }
    }

    async setBulk(settings) {
        try {
            const results = {};
            
            for (const [key, value] of Object.entries(settings)) {
                const result = await this.set(key, value);
                results[key] = result;
            }

            return { success: true, results };
        } catch (error) {
            console.error('Error setting bulk settings:', error);
            return { success: false, error: error.message };
        }
    }

    // Setting categories
    getAppearanceSettings() {
        return {
            darkMode: this.settings.get('darkMode'),
            theme: this.settings.get('theme'),
            fontSize: this.settings.get('fontSize'),
            fontFamily: this.settings.get('fontFamily')
        };
    }

    getNotificationSettings() {
        return {
            notificationsEnabled: this.settings.get('notificationsEnabled'),
            notificationTime: this.settings.get('notificationTime'),
            notificationDays: this.settings.get('notificationDays'),
            reminderText: this.settings.get('reminderText')
        };
    }

    getPrivacySettings() {
        return {
            requireAuth: this.settings.get('requireAuth'),
            autoLock: this.settings.get('autoLock'),
            autoLockDelay: this.settings.get('autoLockDelay'),
            hideContentInRecents: this.settings.get('hideContentInRecents')
        };
    }

    getJournalSettings() {
        return {
            autoSave: this.settings.get('autoSave'),
            autoSaveInterval: this.settings.get('autoSaveInterval'),
            wordCountVisible: this.settings.get('wordCountVisible'),
            dateFormat: this.settings.get('dateFormat')
        };
    }

    getBackupSettings() {
        return {
            autoBackup: this.settings.get('autoBackup'),
            autoBackupInterval: this.settings.get('autoBackupInterval'),
            backupFormat: this.settings.get('backupFormat'),
            includePhotosInBackup: this.settings.get('includePhotosInBackup')
        };
    }

    // Apply specific settings
    async applySingleSetting(key, value, oldValue) {
        switch (key) {
            case 'darkMode':
            case 'theme':
                if (window.services?.theme) {
                    await window.services.theme.setTheme(value);
                }
                break;
                
            case 'notificationsEnabled':
            case 'notificationTime':
                if (window.services?.notifications) {
                    if (value && key === 'notificationsEnabled') {
                        await window.services.notifications.scheduleJournalReminder();
                    } else if (key === 'notificationTime') {
                        await window.services.notifications.updateNotificationSettings(
                            this.settings.get('notificationsEnabled'),
                            value
                        );
                    }
                }
                break;
                
            case 'fontSize':
            case 'fontFamily':
                this.applyFontSettings();
                break;
                
            case 'language':
                this.applyLanguageSettings(value);
                break;
                
            case 'hapticFeedback':
                // Store for use in other services
                window.journalSettings = window.journalSettings || {};
                window.journalSettings.hapticFeedback = value;
                break;
        }
    }

    applyFontSettings() {
        const fontSize = this.settings.get('fontSize');
        const fontFamily = this.settings.get('fontFamily');
        
        const root = document.documentElement;
        
        // Apply font size
        const fontSizeMap = {
            small: '14px',
            medium: '16px',
            large: '18px',
            xlarge: '20px'
        };
        
        if (fontSizeMap[fontSize]) {
            root.style.setProperty('--app-font-size', fontSizeMap[fontSize]);
        }
        
        // Apply font family
        const fontFamilyMap = {
            default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            serif: 'Georgia, "Times New Roman", Times, serif',
            mono: '"Fira Code", "Courier New", monospace',
            dyslexic: '"OpenDyslexic", sans-serif'
        };
        
        if (fontFamilyMap[fontFamily]) {
            root.style.setProperty('--app-font-family', fontFamilyMap[fontFamily]);
        }
    }

    applyAccessibilitySettings() {
        const root = document.documentElement;
        
        // High contrast mode
        if (this.settings.get('highContrast')) {
            root.classList.add('high-contrast');
        } else {
            root.classList.remove('high-contrast');
        }
        
        // Reduced motion
        if (this.settings.get('reducedMotion')) {
            root.classList.add('reduced-motion');
        } else {
            root.classList.remove('reduced-motion');
        }
    }

    applyLanguageSettings(language) {
        document.documentElement.lang = language;
        
        // Notify other services about language change
        if (window.services?.notifications) {
            window.services.notifications.updateLanguage(language);
        }
    }

    // Validation
    createValidationRules() {
        return {
            darkMode: { type: 'boolean' },
            theme: { type: 'string', options: ['light', 'dark', 'system'] },
            fontSize: { type: 'string', options: ['small', 'medium', 'large', 'xlarge'] },
            fontFamily: { type: 'string', options: ['default', 'serif', 'mono', 'dyslexic'] },
            autoSave: { type: 'boolean' },
            autoSaveInterval: { type: 'number', min: 5000, max: 300000 },
            notificationsEnabled: { type: 'boolean' },
            notificationTime: { type: 'string', pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/ },
            imageQuality: { type: 'number', min: 0.1, max: 1.0 },
            language: { type: 'string', options: ['es', 'en', 'fr', 'de'] },
            maxEntriesPerPage: { type: 'number', min: 10, max: 200 }
        };
    }

    validateSetting(key, value) {
        const rule = this.validationRules[key];
        if (!rule) {
            return { valid: true }; // No validation rule, allow any value
        }

        // Type validation
        if (rule.type === 'boolean' && typeof value !== 'boolean') {
            return { valid: false, error: `${key} must be a boolean` };
        }

        if (rule.type === 'string' && typeof value !== 'string') {
            return { valid: false, error: `${key} must be a string` };
        }

        if (rule.type === 'number' && typeof value !== 'number') {
            return { valid: false, error: `${key} must be a number` };
        }

        // Options validation
        if (rule.options && !rule.options.includes(value)) {
            return { valid: false, error: `${key} must be one of: ${rule.options.join(', ')}` };
        }

        // Range validation for numbers
        if (rule.type === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                return { valid: false, error: `${key} must be at least ${rule.min}` };
            }
            if (rule.max !== undefined && value > rule.max) {
                return { valid: false, error: `${key} must be at most ${rule.max}` };
            }
        }

        // Pattern validation for strings
        if (rule.pattern && !rule.pattern.test(value)) {
            return { valid: false, error: `${key} has invalid format` };
        }

        return { valid: true };
    }

    // Reset settings
    async resetToDefaults(category = null) {
        try {
            if (category) {
                // Reset specific category
                const categorySettings = this.getCategorySettings(category);
                for (const key of Object.keys(categorySettings)) {
                    this.settings.set(key, this.defaultSettings[key]);
                }
            } else {
                // Reset all settings
                for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
                    this.settings.set(key, defaultValue);
                }
            }

            await this.saveSettings();
            await this.applySettings();

            return { success: true };
        } catch (error) {
            console.error('Error resetting settings:', error);
            return { success: false, error: error.message };
        }
    }

    getCategorySettings(category) {
        const categories = {
            appearance: ['darkMode', 'theme', 'fontSize', 'fontFamily'],
            journal: ['autoSave', 'autoSaveInterval', 'wordCountVisible', 'dateFormat'],
            notifications: ['notificationsEnabled', 'notificationTime', 'notificationDays', 'reminderText'],
            privacy: ['requireAuth', 'autoLock', 'autoLockDelay', 'hideContentInRecents'],
            backup: ['autoBackup', 'autoBackupInterval', 'backupFormat', 'includePhotosInBackup'],
            advanced: ['debugMode', 'analytics', 'hapticFeedback', 'soundEffects', 'language']
        };

        return categories[category] || {};
    }

    // Import/Export settings
    async exportSettings() {
        try {
            const settingsObject = Object.fromEntries(this.settings);
            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                settings: settingsObject
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `journal-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Error exporting settings:', error);
            return { success: false, error: error.message };
        }
    }

    async importSettings(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.settings) {
                throw new Error('Invalid settings file format');
            }

            // Validate and import settings
            const results = {};
            for (const [key, value] of Object.entries(data.settings)) {
                if (this.defaultSettings.hasOwnProperty(key)) {
                    const result = await this.set(key, value);
                    results[key] = result;
                }
            }

            return { success: true, results };
        } catch (error) {
            console.error('Error importing settings:', error);
            return { success: false, error: error.message };
        }
    }

    // Observer pattern
    addObserver(callback) {
        if (typeof callback === 'function') {
            this.observers.add(callback);
        }
    }

    removeObserver(callback) {
        this.observers.delete(callback);
    }

    notifyObservers(key, newValue, oldValue) {
        this.observers.forEach(callback => {
            try {
                callback(key, newValue, oldValue);
            } catch (error) {
                console.error('Error in settings observer callback:', error);
            }
        });
    }

    // Utility methods
    getAllSettings() {
        return Object.fromEntries(this.settings);
    }

    getDefaultSettings() {
        return { ...this.defaultSettings };
    }

    isDefault(key) {
        return this.settings.get(key) === this.defaultSettings[key];
    }

    getChangedSettings() {
        const changed = {};
        for (const [key, value] of this.settings) {
            if (value !== this.defaultSettings[key]) {
                changed[key] = value;
            }
        }
        return changed;
    }

    destroy() {
        this.observers.clear();
        this.settings.clear();
    }
}

// Create and export singleton instance
const settingsService = new SettingsService();

export default settingsService;
