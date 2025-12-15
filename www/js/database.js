import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * Gestiona la base de datos SQLite y localStorage como fallback
 * Incluye cifrado para proteger datos en reposo
 */
class DatabaseManager {
    static DB_NAME = 'journal_db';
    static DB_VERSION = 1;
    static STORAGE_PREFIX = 'journal_';
    static MAX_RETRY_ATTEMPTS = 3;
    static ALLOWED_SETTINGS = ['darkMode', 'notificationsEnabled', 'notificationTime'];
    static DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    // Clave maestra (Base64) persistida en almacenamiento seguro nativo.
    // Se usa como passphrase para SQLCipher y como material de clave para AES-GCM (fallback web/localStorage).
    static SECURE_STORAGE_MASTER_KEY_B64 = 'journal_master_key_b64_v1';

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
            if (this.isWeb) {
                await this._initWebStorage();
            } else {
                await this._initSQLite();
            }

            this.isInitialized = true;
        } catch (error) {
            console.error('Database initialization failed:', error);

            if (!this.isWeb) {
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
    }

    /**
     * Obtiene o genera una clave maestra criptográfica de 256 bits (32 bytes) para SQLCipher.
     * La clave se almacena en Secure Storage codificada en Base64 (string).
     * Devuelve siempre la clave en formato Base64.
     *
     * Objetivo: evitar errores `invalidData` en almacenamiento nativo almacenando solo strings Base64.
     * @private
     * @returns {Promise<string>}
     */
    async _getOrGenerateEncryptionKey() {
        const storageKey = DatabaseManager.SECURE_STORAGE_MASTER_KEY_B64;

        const isValidKeyB64 = (b64) => {
            if (typeof b64 !== 'string' || !b64.trim()) return false;
            try {
                // Debe decodificar a exactamente 32 bytes.
                const raw = atob(b64);
                return raw.length === 32;
            } catch {
                return false;
            }
        };

        // 1) Intentar recuperar clave existente
        try {
            const existing = await SecureStorage.getItem(storageKey);
            if (isValidKeyB64(existing)) return existing;
        } catch (error) {
            // Si hay invalidData o corrupción, regeneramos.
            console.warn('SecureStorage.getItem failed, regenerating encryption key:', error);
            try {
                await SecureStorage.removeItem(storageKey);
            } catch {
                // noop
            }
        }

        // 2) Generar clave 256-bit
        const keyBytes = crypto.getRandomValues(new Uint8Array(32));

        // 3) Codificar a Base64 (crucial antes de guardar)
        const keyB64 = btoa(String.fromCharCode(...keyBytes));

        // 4) Persistir como string
        await SecureStorage.setItem(storageKey, keyB64);

        return keyB64;
    }

    /**
     * Inicializa SQLite para plataformas nativas
     * @private
     */
    async _initSQLite() {
        await this.sqlite.checkConnectionsConsistency();

        // Nota: La encriptación real en @capacitor-community/sqlite requiere:
        // 1) Config de CapacitorSQLite con *IsEncryption=true en capacitor.config.*
        // 2) Secret almacenado vía setEncryptionSecret()
        // 3) Conexión creada con encrypted=true y mode="secret"
        try {
            const cfg = await this.sqlite.isInConfigEncryption();
            if (cfg?.result === false) {
                console.warn('CapacitorSQLite encryption is disabled in capacitor.config.*; database may remain unencrypted');
            }
        } catch {
            // noop
        }

        // 1) Obtener clave maestra segura (Base64) y asegurarnos de registrarla
        // en el secure store nativo del plugin de SQLite.
        const masterKeyB64 = await this._getOrGenerateEncryptionKey();

        const secretStored = await this.sqlite.isSecretStored();
        if (!secretStored?.result) {
            await this.sqlite.setEncryptionSecret(masterKeyB64);
        } else {
            // Validación best-effort (si no coincide, no podemos rotar sin conocer la anterior).
            try {
                const ok = await this.sqlite.checkEncryptionSecret(masterKeyB64);
                if (ok?.result === false) {
                    console.warn('SQLite encryption secret differs from stored master key; existing encrypted DBs may fail to open');
                }
            } catch {
                // noop
            }
        }

        // 2) Si existe DB no-encriptada, migrarla a encriptada (export/import).
        try {
            const exists = await this.sqlite.isDatabase(DatabaseManager.DB_NAME);
            if (exists?.result) {
                const encrypted = await this.sqlite.isDatabaseEncrypted(DatabaseManager.DB_NAME);
                if (encrypted?.result === false) {
                    console.warn('Migrating existing plaintext DB to encrypted DB');

                    const plainDb = await this.sqlite.createConnection(
                        DatabaseManager.DB_NAME,
                        false,
                        'no-encryption',
                        DatabaseManager.DB_VERSION,
                        false
                    );
                    await plainDb.open();
                    const exported = await plainDb.exportToJson('full');
                    await plainDb.close();
                    try {
                        await this.sqlite.closeConnection(DatabaseManager.DB_NAME, false);
                    } catch {
                        // noop
                    }
                    await this.sqlite.deleteDatabase(DatabaseManager.DB_NAME, false);

                    const json = exported?.export;
                    if (json) {
                        json.database = DatabaseManager.DB_NAME;
                        json.version = DatabaseManager.DB_VERSION;
                        json.overwrite = true;
                        json.encrypted = true;
                        json.mode = 'full';
                        await this.sqlite.importFromJson(JSON.stringify(json));
                    }
                }
            }
        } catch (e) {
            console.warn('DB encryption migration skipped/failed:', e);
        }

        // 3) Abrir (o crear) conexión ENCRIPTADA.
        try {
            await this.sqlite.closeConnection(DatabaseManager.DB_NAME, false);
        } catch {
            // noop
        }

        this.db = await this.sqlite.createConnection(
            DatabaseManager.DB_NAME,
            true,
            'secret',
            DatabaseManager.DB_VERSION,
            false
        );

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
        const entries = await this._getStoredEntries();
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

        await this._setStoredEntries(entries);
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
                const entries = await this._getStoredEntries();
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
                const entries = await this._getStoredEntries();
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
                const entries = await this._getStoredEntries();
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
        const entries = await this._getStoredEntries();
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
                const entries = await this._getStoredEntries();
                delete entries[date];
                await this._setStoredEntries(entries);
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
                const entries = await this._getStoredEntries();
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
                    this._validateNoPrototypeKeys(entry.tags);
                } catch {
                    entry.tags = [];
                }
            }
            return entry;
        });
    }

    /**
     * Deriva la clave de cifrado desde la passphrase
     * @private
     */
    async _getEncryptionKey() {
        // Refactor: en lugar de derivar desde una passphrase hardcodeada,
        // importamos una clave AES-GCM de 256 bits desde la clave maestra guardada (Base64).
        const keyB64 = await this._getOrGenerateEncryptionKey();

        let rawKeyBytes;
        try {
            const raw = atob(keyB64);
            rawKeyBytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) rawKeyBytes[i] = raw.charCodeAt(i);
        } catch (error) {
            console.warn('Invalid Base64 master key, regenerating:', error);
            try {
                await SecureStorage.removeItem(DatabaseManager.SECURE_STORAGE_MASTER_KEY_B64);
            } catch {
                // noop
            }
            const regenerated = await this._getOrGenerateEncryptionKey();
            const raw = atob(regenerated);
            rawKeyBytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) rawKeyBytes[i] = raw.charCodeAt(i);
        }

        // Reparación defensiva por si hay datos viejos/corruptos.
        if (!rawKeyBytes || rawKeyBytes.byteLength !== 32) {
            try {
                await SecureStorage.removeItem(DatabaseManager.SECURE_STORAGE_MASTER_KEY_B64);
            } catch {
                // noop
            }
            const regenerated = await this._getOrGenerateEncryptionKey();
            const raw = atob(regenerated);
            rawKeyBytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) rawKeyBytes[i] = raw.charCodeAt(i);
        }

        return crypto.subtle.importKey(
            'raw',
            rawKeyBytes,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Cifra datos usando AES-GCM
     * @private
     */
    async _encryptData(data) {
        const key = await this._getEncryptionKey();
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            encoder.encode(JSON.stringify(data))
        );

        // Combinar IV + datos cifrados como base64
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return btoa(String.fromCharCode(...combined));
    }

    /**
     * Descifra datos usando AES-GCM
     * @private
     */
    async _decryptData(encryptedStr) {
        try {
            const key = await this._getEncryptionKey();
            const combined = new Uint8Array(atob(encryptedStr).split('').map(c => c.charCodeAt(0)));
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encrypted
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.warn('Error descifrando datos, asumiendo texto plano:', error);
            // Si falla el descifrado, asumir que es JSON plano y parsearlo
            return JSON.parse(encryptedStr);
        }
    }

    /**
     * Obtiene entradas almacenadas en localStorage (cifradas)
     * @private
     */
    async _getStoredEntries() {
        try {
            const encrypted = localStorage.getItem(`${DatabaseManager.STORAGE_PREFIX}entries`);
            if (!encrypted) return {};

            const parsed = await this._decryptData(encrypted);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (error) {
            console.error('Error obteniendo entradas almacenadas:', error);
            return {};
        }
    }

    /**
     * Establece entradas en localStorage (cifradas)
     * @private
     */
    async _setStoredEntries(entries) {
        try {
            const encrypted = await this._encryptData(entries);
            localStorage.setItem(`${DatabaseManager.STORAGE_PREFIX}entries`, encrypted);
        } catch (error) {
            console.error('Error estableciendo entradas almacenadas:', error);
            throw new Error('Cuota de almacenamiento excedida o cifrado fallido');
        }
    }

    /**
     * Resetea entradas almacenadas
     * @private
     */
    async _resetStoredEntries() {
        try {
            await this._setStoredEntries({});
        } catch (error) {
            console.error('Error reseteando entradas almacenadas:', error);
        }
    }

    /**
     * Valida que el objeto no contenga claves peligrosas para Prototype Pollution
     * @private
     */
    _validateNoPrototypeKeys(obj, path = '') {
        if (typeof obj !== 'object' || obj === null) return;

        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                this._validateNoPrototypeKeys(item, `${path}[${index}].`);
            });
        } else {
            // Check for prototype pollution
            if (obj.__proto__ !== Object.prototype) {
                console.log(`Found prototype pollution at ${path}`);
                throw new Error(`Prohibited prototype modification at ${path}`);
            }
            // Check for dangerous own properties
            for (const key of dangerousKeys) {
                if (obj.hasOwnProperty(key)) {
                    console.log(`Found prohibited key ${key} at ${path}${key}`);
                    throw new Error(`Prohibited key found at ${path}${key}`);
                }
            }
            // Recurse on own properties
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    this._validateNoPrototypeKeys(obj[key], `${path}${key}.`);
                }
            }
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
     * Formatea fecha usando hora local
     * @private
     */
    _formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

            // Sanitizar entradas para solo incluir claves válidas
            const cleanEntries = data.entries.map(entry => ({
                date: entry.date,
                content: entry.content || '',
                mood: entry.mood || null,
                photoPath: entry.photoPath || entry.photo_path || null,
                thumbnailPath: entry.thumbnailPath || entry.thumbnail_path || null,
                tags: entry.tags,
                weather: entry.weather,
                location: entry.location,
                isFavorite: entry.isFavorite || entry.is_favorite || false
            }));

            // Importar entradas sanitizadas
            for (const entry of cleanEntries) {
                try {
                    await this.saveEntry(
                        entry.date,
                        entry.content,
                        entry.mood,
                        entry.photoPath,
                        entry.thumbnailPath,
                        {
                            tags: entry.tags,
                            weather: entry.weather,
                            location: entry.location,
                            isFavorite: entry.isFavorite
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

        // Validar contra contaminación de prototipo
        console.log('Validating import data for prototype pollution');
        this._validateNoPrototypeKeys(data, '');

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
