import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

/**
 * Gestiona la base de datos SQLite y localStorage como fallback

 */
class DatabaseManager {
    static DB_NAME = 'journal_db';
    static DB_VERSION = 1;
    static STORAGE_PREFIX = 'journal_';
    static MAX_RETRY_ATTEMPTS = 3;
    static ALLOWED_SETTINGS = ['darkMode', 'notificationsEnabled', 'notificationTime'];
    static DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        this.db = null;
        this.isInitialized = false;
        this.platform = Capacitor.getPlatform();
        this.isWeb = this.platform === 'web';
        this.entryCache = new Map();
        this.settingsCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 min
    }

    /**
     * Inicializa la base de datos
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) return;

        try {
            //console.log(`Initializing database for platform: ${this.platform}`);

            if (this.isWeb) {
                await this._initWebStorage();
            } else {
                await this._initSQLite();
            }

            this.isInitialized = true;
            //console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);

            if (!this.isWeb) {
                //console.log('Falling back to localStorage...');
                await this._initWebStorage();
                this.isInitialized = true;
            }
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    /**
     * Inicializa almacenamiento web (localStorage)
     * @private
     */
    async _initWebStorage() {
        if (!this._isLocalStorageAvailable()) {
            throw new Error('localStorage is not available');
        }
        //console.log('Using localStorage for web platform');
    }

    /**
     * Inicializa SQLite para plataformas nativas
     * @private
     */
    async _initSQLite() {
        await this.sqlite.checkConnectionsConsistency();

        const isConnected = await this.sqlite.isConnection(DatabaseManager.DB_NAME, false);

        if (!isConnected.result) {
            this.db = await this.sqlite.createConnection(
                DatabaseManager.DB_NAME,
                false,
                'no-encryption',
                DatabaseManager.DB_VERSION,
                false
            );
        } else {
            this.db = await this.sqlite.retrieveConnection(DatabaseManager.DB_NAME, false);
        }

        await this.db.open();
        await this._createTables();
        await this._runMigrations();
    }

    /**
     * Crea las tablas necesarias
     * @private
     */
    async _createTables() {
        if (!this.db) throw new Error('Database connection not available');

        const sql = `
            -- Tabla de entradas
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                mood TEXT,
                photo_path TEXT,
                thumbnail_path TEXT,
                word_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                tags TEXT, -- JSON array de tags
                weather TEXT,
                location TEXT,
                is_favorite BOOLEAN DEFAULT 0
            );

            -- Tabla de configuraciones
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Tabla para metadatos de archivos
            CREATE TABLE IF NOT EXISTS media_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entry_date TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL, -- 'photo', 'audio', 'video'
                file_size INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entry_date) REFERENCES entries(date) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
            CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_entries_mood ON entries(mood);
            CREATE INDEX IF NOT EXISTS idx_entries_favorite ON entries(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
            CREATE INDEX IF NOT EXISTS idx_media_entry_date ON media_files(entry_date);
        `;

        await this.db.execute(sql);
    }

    /**
     * Ejecuta migraciones de base de datos
     * @private
     */
    async _runMigrations() {
        if (!this.db) return;

        try {
            const tableInfo = await this.db.query('PRAGMA table_info(entries)');
            const columns = new Set((tableInfo.values || []).map(col => col.name));

            const requiredColumns = [
                { name: 'thumbnail_path', type: 'TEXT' },
                { name: 'tags', type: 'TEXT' },
                { name: 'weather', type: 'TEXT' },
                { name: 'location', type: 'TEXT' },
                { name: 'is_favorite', type: 'BOOLEAN DEFAULT 0' }
            ];

            for (const column of requiredColumns) {
                if (!columns.has(column.name)) {
                    //console.log(`Adding column ${column.name} to entries table...`);
                    await this.db.execute(`ALTER TABLE entries ADD COLUMN ${column.name} ${column.type}`);
                }
            }
        } catch (error) {
            console.error('Migration error:', error);
        }
    }

    /**
     * Guarda o actualiza una entrada
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @param {string} content - Contenido de la entrada
     * @param {string|null} mood - Estado de ánimo
     * @param {string|null} photoPath - Ruta de la foto
     * @param {string|null} thumbnailPath - Ruta del thumbnail
     * @param {Object} options - Opciones adicionales
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async saveEntry(date, content, mood = null, photoPath = null, thumbnailPath = null, options = {}) {
        await this._ensureInitialized();

        if (!this._isValidDate(date)) {
            throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
        }

        const wordCount = this._countWords(content);
        const { tags, weather, location, isFavorite } = options;

        try {
            if (this.db) {
                return await this._saveSQLiteEntry(date, content, mood, photoPath, thumbnailPath, wordCount, options);
            } else {
                return await this._saveLocalStorageEntry(date, content, mood, photoPath, thumbnailPath, wordCount, options);
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            return { success: false, error };
        } finally {
            // Limpiar cache
            this._clearCacheForEntry(date);
        }
    }

    /**
     * Guarda entrada en SQLite
     * @private
     */
    async _saveSQLiteEntry(date, content, mood, photoPath, thumbnailPath, wordCount, options) {
        const sql = `
            INSERT INTO entries (date, content, mood, photo_path, thumbnail_path, word_count, tags, weather, location, is_favorite, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(date) DO UPDATE SET
                content = excluded.content,
                mood = excluded.mood,
                photo_path = excluded.photo_path,
                thumbnail_path = excluded.thumbnail_path,
                word_count = excluded.word_count,
                tags = excluded.tags,
                weather = excluded.weather,
                location = excluded.location,
                is_favorite = excluded.is_favorite,
                updated_at = CURRENT_TIMESTAMP
        `;

        const params = [
            date,
            content,
            mood,
            photoPath,
            thumbnailPath,
            wordCount,
            options.tags ? JSON.stringify(options.tags) : null,
            options.weather,
            options.location,
            options.isFavorite ? 1 : 0
        ];

        await this.db.run(sql, params);
        return { success: true };
    }

    /**
     * Guarda entrada en localStorage
     * @private
     */
    async _saveLocalStorageEntry(date, content, mood, photoPath, thumbnailPath, wordCount, options) {
        const entries = this._getStoredEntries();
        entries[date] = {
            content,
            mood,
            photoPath,
            thumbnailPath,
            wordCount,
            tags: options.tags,
            weather: options.weather,
            location: options.location,
            isFavorite: options.isFavorite || false,
            updatedAt: new Date().toISOString()
        };

        this._setStoredEntries(entries);
        return { success: true };
    }

    /**
     * Obtiene una entrada por fecha
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @returns {Promise<Object|null>}
     */
    async getEntry(date) {
        await this._ensureInitialized();

        if (!this._isValidDate(date)) {
            throw new Error(`Invalid date format: ${date}`);
        }

        const cached = this._getCachedEntry(date);
        if (cached) return cached;

        try {
            let entry;
            if (this.db) {
                const result = await this.db.query('SELECT * FROM entries WHERE date = ?', [date]);
                entry = result.values?.[0] || null;

                if (entry?.tags) {
                    try {
                        entry.tags = JSON.parse(entry.tags);
                    } catch {
                        entry.tags = [];
                    }
                }
            } else {
                const entries = this._getStoredEntries();
                entry = entries[date] || null;
            }

            if (entry) {
                this._setCachedEntry(date, entry);
            }

            return entry;
        } catch (error) {
            console.error('Error getting entry:', error);
            return null;
        }
    }

    /**
     * Obtiene todas las entradas con paginación
     * @param {number} limit - Límite de resultados
     * @param {number} offset - Offset para paginación
     * @returns {Promise<Array>}
     */
    async getAllEntries(limit = 50, offset = 0) {
        await this._ensureInitialized();

        try {
            if (this.db) {
                const result = await this.db.query(
                    'SELECT * FROM entries ORDER BY date DESC LIMIT ? OFFSET ?',
                    [limit, offset]
                );
                return this._processEntriesResult(result.values || []);
            } else {
                const entries = this._getStoredEntries();
                return Object.keys(entries)
                    .map(date => ({ date, ...entries[date] }))
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(offset, offset + limit);
            }
        } catch (error) {
            console.error('Error getting all entries:', error);
            return [];
        }
    }

    /**
     * Busca entradas por contenido
     * @param {string} query - Término de búsqueda
     * @param {Object} filters - Filtros adicionales
     * @returns {Promise<Array>}
     */
    async searchEntries(query, filters = {}) {
        await this._ensureInitialized();

        if (!query?.trim()) return [];

        try {
            if (this.db) {
                return await this._searchSQLiteEntries(query, filters);
            } else {
                return await this._searchLocalStorageEntries(query, filters);
            }
        } catch (error) {
            console.error('Error searching entries:', error);
            return [];
        }
    }

    /**
     * Obtiene todas las entradas de un mes específico
     * @param {number} year - Año (ej: 2024)
     * @param {number} month - Mes (1-12)
     * @returns {Promise<Array>}
     */
    async getEntriesForMonth(year, month) {
        await this._ensureInitialized();

        if (!year || !month || month < 1 || month > 12) {
            throw new Error('Invalid year or month parameters');
        }

        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

            if (this.db) {
                const result = await this.db.query(
                    'SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date ASC',
                    [startDate, endDate]
                );
                return this._processEntriesResult(result.values || []);
            } else {
                const entries = this._getStoredEntries();
                return Object.keys(entries)
                    .filter(date => date >= startDate && date <= endDate)
                    .map(date => ({ date, ...entries[date] }))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        } catch (error) {
            console.error('Error getting entries for month:', error);
            return [];
        }
    }

    /**
     * Busca en SQLite
     * @private
     */
    async _searchSQLiteEntries(query, filters) {
        let sql = 'SELECT * FROM entries WHERE content LIKE ?';
        const params = [`%${query}%`];

        if (filters.mood) {
            sql += ' AND mood = ?';
            params.push(filters.mood);
        }

        if (filters.isFavorite) {
            sql += ' AND is_favorite = 1';
        }

        if (filters.dateFrom) {
            sql += ' AND date >= ?';
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            sql += ' AND date <= ?';
            params.push(filters.dateTo);
        }

        sql += ' ORDER BY date DESC';

        const result = await this.db.query(sql, params);
        return this._processEntriesResult(result.values || []);
    }

    /**
     * Busca en localStorage
     * @private
     */
    async _searchLocalStorageEntries(query, filters) {
        const entries = this._getStoredEntries();
        const lowerQuery = query.toLowerCase();

        return Object.keys(entries)
            .filter(date => {
                const entry = entries[date];

                if (!entry.content?.toLowerCase().includes(lowerQuery)) return false;

                if (filters.mood && entry.mood !== filters.mood) return false;
                if (filters.isFavorite && !entry.isFavorite) return false;
                if (filters.dateFrom && date < filters.dateFrom) return false;
                if (filters.dateTo && date > filters.dateTo) return false;

                return true;
            })
            .map(date => ({ date, ...entries[date] }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Elimina una entrada
     * @param {string} date - Fecha de la entrada a eliminar
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async deleteEntry(date) {
        await this._ensureInitialized();

        try {
            if (this.db) {
                await this.db.run('DELETE FROM entries WHERE date = ?', [date]);
            } else {
                const entries = this._getStoredEntries();
                delete entries[date];
                this._setStoredEntries(entries);
            }

            this._clearCacheForEntry(date);
            return { success: true };
        } catch (error) {
            console.error('Error deleting entry:', error);
            return { success: false, error };
        }
    }

    /**
     * Obtiene estadísticas del diario
     * @returns {Promise<Object>}
     */
    async getStats() {
        await this._ensureInitialized();

        try {
            if (this.db) {
                const [totalResult, wordsResult] = await Promise.all([
                    this.db.query('SELECT COUNT(*) as total FROM entries'),
                    this.db.query('SELECT SUM(word_count) as total_words FROM entries')
                ]);

                return {
                    totalEntries: totalResult.values[0].total,
                    totalWords: wordsResult.values[0].total_words || 0,
                    currentStreak: await this._getCurrentStreak()
                };
            } else {
                const entries = this._getStoredEntries();
                const entriesArray = Object.values(entries);

                return {
                    totalEntries: entriesArray.length,
                    totalWords: entriesArray.reduce((sum, entry) => sum + (entry.wordCount || 0), 0),
                    currentStreak: await this._getCurrentStreak()
                };
            }
        } catch (error) {
            console.error('Error getting stats:', error);
            return { totalEntries: 0, totalWords: 0, currentStreak: 0 };
        }
    }

    // =================== CONFIG METHODS ===================

    /**
     * Obtiene una configuración
     * @param {string} key - Clave de la configuración
     * @param {*} defaultValue - Valor por defecto
     * @returns {Promise<*>}
     */
    async getSetting(key, defaultValue = null) {
        await this._ensureInitialized();

        // Verificar cache
        const cached = this._getCachedSetting(key);
        if (cached !== null) return cached;

        try {
            let value;
            if (this.db) {
                const result = await this.db.query('SELECT value FROM settings WHERE key = ?', [key]);
                value = result.values?.[0]?.value || defaultValue;
            } else {
                value = localStorage.getItem(`${DatabaseManager.STORAGE_PREFIX}setting_${key}`) || defaultValue;
            }

            // Cachear valor
            this._setCachedSetting(key, value);
            return value;
        } catch (error) {
            console.error('Error getting setting:', error);
            return defaultValue;
        }
    }

    /**
     * Establece una configuración
     * @param {string} key - Clave de la configuración
     * @param {*} value - Valor a establecer
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async setSetting(key, value) {
        await this._ensureInitialized();

        if (!DatabaseManager.ALLOWED_SETTINGS.includes(key)) {
            throw new Error(`Setting key '${key}' is not allowed`);
        }

        try {
            const stringValue = String(value);

            if (this.db) {
                await this.db.run(
                    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                    [key, stringValue]
                );
            } else {
                localStorage.setItem(`${DatabaseManager.STORAGE_PREFIX}setting_${key}`, stringValue);
            }

            // Actualizar cache
            this._setCachedSetting(key, stringValue);
            return { success: true };
        } catch (error) {
            console.error('Error setting value:', error);
            return { success: false, error };
        }
    }

    // =================== UTILITY METHODS ===================

    /**
     * Processes entry results to parse JSON
     * @private
     */
    _processEntriesResult(entries) {
        return entries.map(entry => {
            if (entry.tags) {
                try {
                    entry.tags = JSON.parse(entry.tags);
                } catch {
                    entry.tags = [];
                }
            }
            return entry;
        });
    }

    /**
     * Obtiene entradas almacenadas en localStorage
     * @private
     */
    _getStoredEntries() {
        try {
            const entries = localStorage.getItem(`${DatabaseManager.STORAGE_PREFIX}entries`);
            if (!entries) return {};

            const parsed = JSON.parse(entries);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (error) {
            console.error('Error parsing stored entries:', error);
            this._resetStoredEntries();
            return {};
        }
    }

    /**
     * Establece entradas en localStorage
     * @private
     */
    _setStoredEntries(entries) {
        try {
            localStorage.setItem(`${DatabaseManager.STORAGE_PREFIX}entries`, JSON.stringify(entries));
        } catch (error) {
            console.error('Error setting stored entries:', error);
            throw new Error('Storage quota exceeded or localStorage unavailable');
        }
    }

    /**
     * Resetea entradas almacenadas
     * @private
     */
    _resetStoredEntries() {
        try {
            localStorage.setItem(`${DatabaseManager.STORAGE_PREFIX}entries`, '{}');
        } catch (error) {
            console.error('Error resetting stored entries:', error);
        }
    }

    /**
     * Cuenta palabras en un texto
     * @private
     */
    _countWords(text) {
        if (!text?.trim()) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Valida formato de fecha
     * @private
     */
    _isValidDate(date) {
        return typeof date === 'string' && DatabaseManager.DATE_REGEX.test(date);
    }

    /**
     * Formatea fecha
     * @private
     */
    _formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    /**
     * Verifica si localStorage está disponible
     * @private
     */
    _isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Asegura que la base de datos esté inicializada
     * @private
     */
    async _ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    /**
     * Calcula la racha actual
     * @private
     */
    async _getCurrentStreak() {
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);

        while (true) {
            const dateStr = this._formatDate(currentDate);
            const entry = await this.getEntry(dateStr);

            if (entry?.content?.trim()) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    // =================== CACHE METHODS ===================

    _getCachedEntry(date) {
        const cached = this.entryCache.get(date);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    _setCachedEntry(date, entry) {
        this.entryCache.set(date, {
            data: entry,
            timestamp: Date.now()
        });
    }

    _clearCacheForEntry(date) {
        this.entryCache.delete(date);
    }

    _getCachedSetting(key) {
        const cached = this.settingsCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        return null;
    }

    _setCachedSetting(key, value) {
        this.settingsCache.set(key, {
            data: value,
            timestamp: Date.now()
        });
    }

    /**
     * Limpia todos los caches
     */
    clearCache() {
        this.entryCache.clear();
        this.settingsCache.clear();
    }

    // =================== EXPORT/IMPORT METHODS ===================

    /**
     * Exporta todos los datos
     * @returns {Promise<Object>}
     */
    async exportData() {
        await this._ensureInitialized();

        try {
            const [entries, settings] = await Promise.all([
                this.getAllEntries(10000), // Exportar hasta 10k entradas
                this._getAllSettings()
            ]);

            return {
                entries,
                settings,
                exportDate: new Date().toISOString(),
                version: '1.1',
                platform: this.platform
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    /**
     * Obtiene todas las configuraciones
     * @private
     */
    async _getAllSettings() {
        const settings = {};

        for (const key of DatabaseManager.ALLOWED_SETTINGS) {
            const value = await this.getSetting(key);
            if (value !== null) {
                settings[key] = value;
            }
        }

        return settings;
    }

    /**
     * Importa datos
     * @param {Object} data - Datos a importar
     * @returns {Promise<Object>}
     */
    async importData(data) {
        await this._ensureInitialized();

        try {
            this._validateImportData(data);

            let importedCount = 0;
            let skippedCount = 0;

            // Importar entradas
            for (const entry of data.entries) {
                try {
                    await this.saveEntry(
                        entry.date,
                        entry.content || '',
                        entry.mood || null,
                        entry.photo_path || entry.photoPath || null,
                        entry.thumbnail_path || entry.thumbnailPath || null,
                        {
                            tags: entry.tags,
                            weather: entry.weather,
                            location: entry.location,
                            isFavorite: entry.is_favorite || entry.isFavorite || false
                        }
                    );
                    importedCount++;
                } catch (entryError) {
                    console.warn(`Error importing entry for ${entry.date}:`, entryError);
                    skippedCount++;
                }
            }
            if (data.settings) {
                await this._importSettings(data.settings);
            }

            this.clearCache();

            return {
                success: true,
                importedCount,
                skippedCount,
                message: `Importadas ${importedCount} entradas. ${skippedCount} omitidas.`
            };
        } catch (error) {
            console.error('Error importing data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Valida datos de importación
     * @private
     */
    _validateImportData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format: must be an object');
        }
        if (!Array.isArray(data.entries)) {
            throw new Error('Invalid data format: entries must be an array');
        }
        if (data.version) {
            const version = parseFloat(data.version);
            if (version > 1.1) {
                throw new Error(`Unsupported version: ${data.version}`);
            }
        }

        data.entries.forEach((entry, index) => {
            if (!entry || typeof entry !== 'object') {
                throw new Error(`Invalid entry at position ${index}`);
            }

            if (!this._isValidDate(entry.date)) {
                throw new Error(`Invalid date format at position ${index}: ${entry.date}`);
            }
        });
    }

    /**
     * Importa configuraciones
     * @private
     */
    async _importSettings(settings) {
        for (const [key, value] of Object.entries(settings)) {
            if (DatabaseManager.ALLOWED_SETTINGS.includes(key) && value != null) {
                try {
                    await this.setSetting(key, value);
                } catch (error) {
                    console.warn(`Error importing setting ${key}:`, error);
                }
            }
        }
    }

    /**
     * Cierra la conexión de base de datos
     */
    async close() {
        if (this.db) {
            try {
                await this.db.close();
                this.db = null;
            } catch (error) {
                console.error('Error closing database:', error);
            }
        }

        this.clearCache();
        this.isInitialized = false;
    }
}

const db = new DatabaseManager();

export default db;