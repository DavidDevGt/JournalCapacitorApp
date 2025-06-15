// Storage service for unified storage management across mobile and web platforms
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * Preferences Manager - Handles app settings and preferences
 */
class PreferencesManager {
    constructor() {
        this.isNative = Capacitor.isNativePlatform();
    }

    async get(key, defaultValue = null) {
        try {
            if (this.isNative) {
                const result = await Preferences.get({ key });
                return result.value !== null ? this.deserialize(result.value) : defaultValue;
            } else {
                const value = localStorage.getItem(key);
                return value !== null ? this.deserialize(value) : defaultValue;
            }
        } catch (error) {
            console.error(`Error getting preference ${key}:`, error);
            return defaultValue;
        }
    }

    async set(key, value) {
        try {
            const serializedValue = this.serialize(value);
            if (this.isNative) {
                await Preferences.set({ key, value: serializedValue });
            } else {
                localStorage.setItem(key, serializedValue);
            }
            return { success: true };
        } catch (error) {
            console.error(`Error setting preference ${key}:`, error);
            return { success: false, error: error.message };
        }
    }

    async remove(key) {
        try {
            if (this.isNative) {
                await Preferences.remove({ key });
            } else {
                localStorage.removeItem(key);
            }
            return { success: true };
        } catch (error) {
            console.error(`Error removing preference ${key}:`, error);
            return { success: false, error: error.message };
        }
    }

    async clear() {
        try {
            if (this.isNative) {
                await Preferences.clear();
            } else {
                localStorage.clear();
            }
            return { success: true };
        } catch (error) {
            console.error('Error clearing preferences:', error);
            return { success: false, error: error.message };
        }
    }

    serialize(value) {
        if (typeof value === 'string') return value;
        return JSON.stringify(value);
    }

    deserialize(value) {
        try {
            return JSON.parse(value);
        } catch {
            return value; // Return as string if not JSON
        }
    }
}

/**
 * File Manager - Handles file storage for images and documents
 */
class FileManager {
    constructor() {
        this.isNative = Capacitor.isNativePlatform();
        this.dbName = 'JournalFileStorage';
        this.dbVersion = 1;
        this.db = null;
        this.initWebStorage();
    }

    async initWebStorage() {
        if (!this.isNative) {
            try {
                this.db = await new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, this.dbVersion);
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('files')) {
                            db.createObjectStore('files', { keyPath: 'path' });
                        }
                    };
                });
            } catch (error) {
                console.error('Error initializing IndexedDB:', error);
            }
        }
    }

    async saveFile(path, data, mimeType = 'image/jpeg') {
        try {
            if (this.isNative) {
                await Filesystem.writeFile({
                    path,
                    data: data.replace(/^data:.*?;base64,/, ''), // Remove data URL prefix
                    directory: Directory.Data,
                    encoding: Encoding.Base64
                });
            } else {
                await this.saveToIndexedDB(path, data, mimeType);
            }
            return { success: true, path };
        } catch (error) {
            console.error(`Error saving file ${path}:`, error);
            return { success: false, error: error.message };
        }
    }

    async loadFile(path) {
        try {
            if (this.isNative) {
                const result = await Filesystem.readFile({
                    path,
                    directory: Directory.Data,
                    encoding: Encoding.Base64
                });
                return { success: true, data: `data:image/jpeg;base64,${result.data}` };
            } else {
                return await this.loadFromIndexedDB(path);
            }
        } catch (error) {
            console.error(`Error loading file ${path}:`, error);
            return { success: false, error: error.message };
        }
    }

    async deleteFile(path) {
        try {
            if (this.isNative) {
                await Filesystem.deleteFile({
                    path,
                    directory: Directory.Data
                });
            } else {
                await this.deleteFromIndexedDB(path);
            }
            return { success: true };
        } catch (error) {
            console.error(`Error deleting file ${path}:`, error);
            return { success: false, error: error.message };
        }
    }

    async listFiles() {
        try {
            if (this.isNative) {
                const result = await Filesystem.readdir({
                    path: '',
                    directory: Directory.Data
                });
                return { success: true, files: result.files };
            } else {
                return await this.listFromIndexedDB();
            }
        } catch (error) {
            console.error('Error listing files:', error);
            return { success: false, error: error.message };
        }
    }

    async getFileSize(path) {
        try {
            if (this.isNative) {
                const result = await Filesystem.stat({
                    path,
                    directory: Directory.Data
                });
                return { success: true, size: result.size };
            } else {
                return await this.getFileSizeFromIndexedDB(path);
            }
        } catch (error) {
            console.error(`Error getting file size ${path}:`, error);
            return { success: false, error: error.message };
        }
    }

    // IndexedDB methods for web platform
    async saveToIndexedDB(path, data, mimeType) {
        if (!this.db) await this.initWebStorage();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const fileData = {
                path,
                data,
                mimeType,
                timestamp: Date.now(),
                size: data.length
            };
            
            const request = store.put(fileData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadFromIndexedDB(path) {
        if (!this.db) await this.initWebStorage();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get(path);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve({ success: true, data: request.result.data });
                } else {
                    resolve({ success: false, error: 'File not found' });
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFromIndexedDB(path) {
        if (!this.db) await this.initWebStorage();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const request = store.delete(path);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async listFromIndexedDB() {
        if (!this.db) await this.initWebStorage();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.getAllKeys();
            
            request.onsuccess = () => resolve({ success: true, files: request.result });
            request.onerror = () => reject(request.error);
        });
    }

    async getFileSizeFromIndexedDB(path) {
        if (!this.db) await this.initWebStorage();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get(path);
            
            request.onsuccess = () => {
                if (request.result) {
                    resolve({ success: true, size: request.result.size });
                } else {
                    resolve({ success: false, error: 'File not found' });
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    generateFilePath(type = 'image', extension = 'jpg') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${type}_${timestamp}_${random}.${extension}`;
    }
}

/**
 * Cache Manager - Handles in-memory caching with TTL and LRU
 */
class CacheManager {
    constructor(maxSize = 100, defaultTTL = 300000) { // 5 minutes default TTL
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        this.cache = new Map();
        this.accessTimes = new Map();
        this.setupCleanup();
    }

    set(key, value, ttl = this.defaultTTL) {
        const now = Date.now();
        const expiry = now + ttl;

        // Remove oldest if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }

        this.cache.set(key, { value, expiry });
        this.accessTimes.set(key, now);
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        const now = Date.now();
        if (now > item.expiry) {
            this.delete(key);
            return null;
        }

        this.accessTimes.set(key, now);
        return item.value;
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;

        const now = Date.now();
        if (now > item.expiry) {
            this.delete(key);
            return false;
        }

        return true;
    }

    delete(key) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
    }

    clear() {
        this.cache.clear();
        this.accessTimes.clear();
    }

    evictLRU() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, time] of this.accessTimes) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    setupCleanup() {
        // Clean expired entries every 5 minutes
        setInterval(() => {
            const now = Date.now();
            const toDelete = [];

            for (const [key, item] of this.cache) {
                if (now > item.expiry) {
                    toDelete.push(key);
                }
            }

            toDelete.forEach(key => this.delete(key));
        }, 300000);
    }

    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
        };
    }
}

/**
 * Config Manager - Handles app-specific configurations
 */
class ConfigManager {
    constructor(preferencesManager) {
        this.preferences = preferencesManager;
        this.configPrefix = 'app_config_';
    }

    async getDarkMode() {
        return await this.preferences.get(`${this.configPrefix}darkMode`, false);
    }

    async setDarkMode(enabled) {
        return await this.preferences.set(`${this.configPrefix}darkMode`, enabled);
    }

    async getNotificationsEnabled() {
        return await this.preferences.get(`${this.configPrefix}notificationsEnabled`, true);
    }

    async setNotificationsEnabled(enabled) {
        return await this.preferences.set(`${this.configPrefix}notificationsEnabled`, enabled);
    }

    async getNotificationTime() {
        return await this.preferences.get(`${this.configPrefix}notificationTime`, '20:00');
    }

    async setNotificationTime(time) {
        return await this.preferences.set(`${this.configPrefix}notificationTime`, time);
    }

    async getLanguage() {
        return await this.preferences.get(`${this.configPrefix}language`, 'es');
    }

    async setLanguage(language) {
        return await this.preferences.set(`${this.configPrefix}language`, language);
    }

    async getAutoSave() {
        return await this.preferences.get(`${this.configPrefix}autoSave`, true);
    }

    async setAutoSave(enabled) {
        return await this.preferences.set(`${this.configPrefix}autoSave`, enabled);
    }

    async getAutoSaveInterval() {
        return await this.preferences.get(`${this.configPrefix}autoSaveInterval`, 30000);
    }

    async setAutoSaveInterval(interval) {
        return await this.preferences.set(`${this.configPrefix}autoSaveInterval`, interval);
    }

    async getImageQuality() {
        return await this.preferences.get(`${this.configPrefix}imageQuality`, 0.85);
    }

    async setImageQuality(quality) {
        return await this.preferences.set(`${this.configPrefix}imageQuality`, quality);
    }

    async getAppVersion() {
        return await this.preferences.get(`${this.configPrefix}appVersion`, '1.0.0');
    }

    async setAppVersion(version) {
        return await this.preferences.set(`${this.configPrefix}appVersion`, version);
    }

    async getFirstLaunch() {
        return await this.preferences.get(`${this.configPrefix}firstLaunch`, true);
    }

    async setFirstLaunch(isFirst) {
        return await this.preferences.set(`${this.configPrefix}firstLaunch`, isFirst);
    }

    async exportConfig() {
        const config = {};
        const keys = [
            'darkMode', 'notificationsEnabled', 'notificationTime', 'language',
            'autoSave', 'autoSaveInterval', 'imageQuality', 'appVersion'
        ];

        for (const key of keys) {
            config[key] = await this.preferences.get(`${this.configPrefix}${key}`);
        }

        return config;
    }

    async importConfig(config) {
        const results = {};
        for (const [key, value] of Object.entries(config)) {
            if (value !== null && value !== undefined) {
                results[key] = await this.preferences.set(`${this.configPrefix}${key}`, value);
            }
        }
        return results;
    }

    async resetToDefaults() {
        const defaults = {
            darkMode: false,
            notificationsEnabled: true,
            notificationTime: '20:00',
            language: 'es',
            autoSave: true,
            autoSaveInterval: 30000,
            imageQuality: 0.85
        };

        return await this.importConfig(defaults);
    }
}

/**
 * Main Storage Service - Unified storage management
 */
class StorageService {
    constructor() {
        this.isInitialized = false;
        this.preferences = new PreferencesManager();
        this.files = new FileManager();
        this.cache = new CacheManager();
        this.config = new ConfigManager(this.preferences);
        this.platform = Capacitor.getPlatform();
    }

    async init() {
        try {
            await this.files.initWebStorage();
            this.isInitialized = true;
            console.log(`StorageService initialized for platform: ${this.platform}`);
            return { success: true };
        } catch (error) {
            console.error('Error initializing StorageService:', error);
            return { success: false, error: error.message };
        }
    }

    // Unified methods that combine multiple storage types
    async saveImage(imageData, generateThumbnail = true) {
        try {
            const imagePath = this.files.generateFilePath('image', 'jpg');
            const saveResult = await this.files.saveFile(imagePath, imageData);

            if (!saveResult.success) {
                throw new Error(saveResult.error);
            }

            let thumbnailPath = null;
            if (generateThumbnail) {
                try {
                    const thumbnail = await this.generateThumbnail(imageData);
                    thumbnailPath = this.files.generateFilePath('thumbnail', 'jpg');
                    await this.files.saveFile(thumbnailPath, thumbnail);
                } catch (thumbnailError) {
                    console.warn('Error generating thumbnail:', thumbnailError);
                    thumbnailPath = imagePath; // Use original as fallback
                }
            }

            // Cache the image for quick access
            this.cache.set(`image_${imagePath}`, imageData, 600000); // 10 minutes

            return {
                success: true,
                imagePath,
                thumbnailPath,
                size: imageData.length
            };
        } catch (error) {
            console.error('Error saving image:', error);
            return { success: false, error: error.message };
        }
    }

    async loadImage(path, useCache = true) {
        try {
            // Check cache first
            if (useCache) {
                const cached = this.cache.get(`image_${path}`);
                if (cached) {
                    return { success: true, data: cached, fromCache: true };
                }
            }

            const result = await this.files.loadFile(path);
            
            if (result.success && useCache) {
                this.cache.set(`image_${path}`, result.data, 600000);
            }

            return { ...result, fromCache: false };
        } catch (error) {
            console.error('Error loading image:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteImage(path) {
        try {
            const result = await this.files.deleteFile(path);
            
            // Remove from cache
            this.cache.delete(`image_${path}`);
            
            return result;
        } catch (error) {
            console.error('Error deleting image:', error);
            return { success: false, error: error.message };
        }
    }

    async generateThumbnail(imageData, size = 200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = size;
                canvas.height = size;

                const scale = Math.max(size / img.width, size / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const offsetX = (size - scaledWidth) / 2;
                const offsetY = (size - scaledHeight) / 2;

                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, size, size);
                ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = imageData;
        });
    }

    async getStorageInfo() {
        try {
            const fileList = await this.files.listFiles();
            let totalSize = 0;

            if (fileList.success) {
                for (const file of fileList.files) {
                    const sizeResult = await this.files.getFileSize(file);
                    if (sizeResult.success) {
                        totalSize += sizeResult.size;
                    }
                }
            }

            return {
                success: true,
                platform: this.platform,
                isNative: Capacitor.isNativePlatform(),
                totalFiles: fileList.success ? fileList.files.length : 0,
                totalSize,
                cacheStats: this.cache.getStats()
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { success: false, error: error.message };
        }
    }

    async cleanup() {
        try {
            // Clear cache
            this.cache.clear();

            // Could add file cleanup logic here (remove old files, etc.)
            
            return { success: true };
        } catch (error) {
            console.error('Error during cleanup:', error);
            return { success: false, error: error.message };
        }
    }

    // Direct access to managers
    getPreferences() {
        return this.preferences;
    }

    getFiles() {
        return this.files;
    }

    getCache() {
        return this.cache;
    }

    getConfig() {
        return this.config;
    }
}

// Create and export singleton instance
const storageService = new StorageService();

export default storageService;
