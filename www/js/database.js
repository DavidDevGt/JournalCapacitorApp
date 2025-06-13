// Database management for Daily Journal App using Capacitor SQLite
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

class DatabaseManager {
    constructor() {
        this.sqlite = new SQLiteConnection(CapacitorSQLite);
        this.db = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            // Check if platform supports SQLite
            if (Capacitor.getPlatform() === 'web') {
                // For web, we'll use localStorage as fallback
                console.log('Using localStorage for web platform');
                this.isInitialized = true;
                return;
            }

            // Initialize SQLite connection
            await this.sqlite.checkConnectionsConsistency();
            const isConn = await this.sqlite.isConnection('journal_db', false);

            if (!isConn.result) {
                this.db = await this.sqlite.createConnection(
                    'journal_db',
                    false,
                    'no-encryption',
                    1,
                    false
                );
            } else {
                this.db = await this.sqlite.retrieveConnection('journal_db', false);
            }

            await this.db.open();
            await this.createTables();
            this.isInitialized = true;

        } catch (error) {
            console.error('Database initialization error:', error);
            // Fallback to localStorage
            this.isInitialized = true;
        }
    }    async createTables() {
        if (!this.db) return;

        const createTablesSQL = `
            -- Entries table
            CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                content TEXT NOT NULL,
                mood TEXT,
                photo_path TEXT,
                thumbnail_path TEXT,
                word_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Settings table
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
            CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
        `;

        try {
            await this.db.execute(createTablesSQL);
            
            // Check if thumbnail_path column exists, if not add it
            await this.migrateThumbnailColumn();
        } catch (error) {
            console.error('Error creating tables:', error);
        }
    }

    async migrateThumbnailColumn() {
        if (!this.db) return;
        
        try {
            // Check if thumbnail_path column exists
            const result = await this.db.query('PRAGMA table_info(entries)');
            const columns = result.values || [];
            const hasThumbColumn = columns.some(col => col.name === 'thumbnail_path');
            
            if (!hasThumbColumn) {
                console.log('Adding thumbnail_path column to entries table...');
                await this.db.execute('ALTER TABLE entries ADD COLUMN thumbnail_path TEXT');
                console.log('thumbnail_path column added successfully');
            }
        } catch (error) {
            console.error('Error migrating thumbnail column:', error);
        }
    }    // Entry methods
    async saveEntry(date, content, mood = null, photoPath = null, thumbnailPath = null) {
        const wordCount = this.countWords(content);

        if (this.db) {
            // SQLite version
            try {
                const sql = `
                    INSERT INTO entries (date, content, mood, photo_path, thumbnail_path, word_count, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(date) DO UPDATE SET
                        content = excluded.content,
                        mood = excluded.mood,
                        photo_path = excluded.photo_path,
                        thumbnail_path = excluded.thumbnail_path,
                        word_count = excluded.word_count,
                        updated_at = CURRENT_TIMESTAMP
                `;

                await this.db.run(sql, [date, content, mood, photoPath, thumbnailPath, wordCount]);
                return { success: true };
            } catch (error) {
                console.error('Error saving entry:', error);
                return { success: false, error };
            }
        } else {
            // localStorage fallback
            try {
                const entries = this.getStoredEntries();
                entries[date] = {
                    content,
                    mood,
                    photoPath,
                    thumbnailPath,
                    wordCount,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('journal_entries', JSON.stringify(entries));
                return { success: true };
            } catch (error) {
                console.error('Error saving to localStorage:', error);
                return { success: false, error };
            }
        }
    }

    async getEntry(date) {
        if (this.db) {
            // SQLite version
            try {
                const result = await this.db.query(
                    'SELECT * FROM entries WHERE date = ?',
                    [date]
                );
                return result.values && result.values.length > 0 ? result.values[0] : null;
            } catch (error) {
                console.error('Error getting entry:', error);
                return null;
            }
        } else {
            // localStorage fallback
            const entries = this.getStoredEntries();
            return entries[date] || null;
        }
    }

    async getAllEntries(limit = 50, offset = 0) {
        if (this.db) {
            // SQLite version
            try {
                const result = await this.db.query(
                    'SELECT * FROM entries ORDER BY date DESC LIMIT ? OFFSET ?',
                    [limit, offset]
                );
                return result.values || [];
            } catch (error) {
                console.error('Error getting all entries:', error);
                return [];
            }
        } else {
            // localStorage fallback
            const entries = this.getStoredEntries();
            const entriesArray = Object.keys(entries)
                .map(date => ({ date, ...entries[date] }))
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(offset, offset + limit);
            return entriesArray;
        }
    }

    async searchEntries(query) {
        if (this.db) {
            // SQLite version
            try {
                const result = await this.db.query(
                    'SELECT * FROM entries WHERE content LIKE ? ORDER BY date DESC',
                    [`%${query}%`]
                );
                return result.values || [];
            } catch (error) {
                console.error('Error searching entries:', error);
                return [];
            }
        } else {
            // localStorage fallback
            const entries = this.getStoredEntries();
            const filteredEntries = Object.keys(entries)
                .filter(date =>
                    entries[date].content.toLowerCase().includes(query.toLowerCase())
                )
                .map(date => ({ date, ...entries[date] }))
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            return filteredEntries;
        }
    }

    async getEntriesForMonth(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

        if (this.db) {
            try {
                const result = await this.db.query(
                    'SELECT date, mood FROM entries WHERE date >= ? AND date <= ?',
                    [startDate, endDate]
                );
                return result.values || [];
            } catch (error) {
                console.error('Error getting month entries:', error);
                return [];
            }
        } else {
            const entries = this.getStoredEntries();
            return Object.keys(entries)
                .filter(date => date >= startDate && date <= endDate)
                .map(date => ({ date, mood: entries[date].mood }));
        }
    }

    async deleteEntry(date) {
        if (this.db) {
            try {
                await this.db.run('DELETE FROM entries WHERE date = ?', [date]);
                return { success: true };
            } catch (error) {
                console.error('Error deleting entry:', error);
                return { success: false, error };
            }
        } else {
            try {
                const entries = this.getStoredEntries();
                delete entries[date];
                localStorage.setItem('journal_entries', JSON.stringify(entries));
                return { success: true };
            } catch (error) {
                console.error('Error deleting from localStorage:', error);
                return { success: false, error };
            }
        }
    }

    // Settings methods
    async getSetting(key, defaultValue = null) {
        if (this.db) {
            try {
                const result = await this.db.query(
                    'SELECT value FROM settings WHERE key = ?',
                    [key]
                );
                return result.values && result.values.length > 0
                    ? result.values[0].value
                    : defaultValue;
            } catch (error) {
                console.error('Error getting setting:', error);
                return defaultValue;
            }
        } else {
            return localStorage.getItem(`journal_setting_${key}`) || defaultValue;
        }
    }

    async setSetting(key, value) {
        if (this.db) {
            try {
                await this.db.run(
                    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                    [key, value]
                );
                return { success: true };
            } catch (error) {
                console.error('Error setting value:', error);
                return { success: false, error };
            }
        } else {
            try {
                localStorage.setItem(`journal_setting_${key}`, value);
                return { success: true };
            } catch (error) {
                console.error('Error setting localStorage value:', error);
                return { success: false, error };
            }
        }
    }

    // Utility methods
    getStoredEntries() {
        try {
            const entries = localStorage.getItem('journal_entries');
            if (!entries) return {};
            
            const parsed = JSON.parse(entries);
            if (typeof parsed !== 'object' || parsed === null) {
                console.warn('Invalid entries format in localStorage, resetting...');
                localStorage.setItem('journal_entries', '{}');
                return {};
            }
            
            return parsed;
        } catch (error) {
            console.error('Error parsing stored entries:', error);
            // Try to recover by clearing corrupted data
            try {
                localStorage.removeItem('journal_entries');
                localStorage.setItem('journal_entries', '{}');
            } catch (storageError) {
                console.error('localStorage is not available:', storageError);
            }
            return {};
        }
    }

    countWords(text) {
        if (!text || text.trim() === '') return 0;
        return text.trim().split(/\s+/).length;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Statistics methods
    async getStats() {
        if (this.db) {
            try {
                const totalResult = await this.db.query('SELECT COUNT(*) as total FROM entries');
                const totalEntries = totalResult.values[0].total;

                const wordsResult = await this.db.query('SELECT SUM(word_count) as total_words FROM entries');
                const totalWords = wordsResult.values[0].total_words || 0;

                const streakResult = await this.getCurrentStreak();

                return {
                    totalEntries,
                    totalWords,
                    currentStreak: streakResult
                };
            } catch (error) {
                console.error('Error getting stats:', error);
                return { totalEntries: 0, totalWords: 0, currentStreak: 0 };
            }
        } else {
            const entries = this.getStoredEntries();
            const entriesArray = Object.values(entries);
            const totalEntries = entriesArray.length;
            const totalWords = entriesArray.reduce((sum, entry) => sum + (entry.wordCount || 0), 0);
            const currentStreak = await this.getCurrentStreak();

            return { totalEntries, totalWords, currentStreak };
        }
    }

    async getCurrentStreak() {
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);

        while (true) {
            const dateStr = this.formatDate(currentDate);
            const entry = await this.getEntry(dateStr);

            if (entry && entry.content && entry.content.trim().length > 0) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    // Backup and restore
    async exportData() {
        try {
            const entries = await this.getAllEntries(1000);
            const settings = {};

            // Get all settings
            const settingKeys = ['darkMode', 'notificationsEnabled', 'notificationTime'];
            for (const key of settingKeys) {
                settings[key] = await this.getSetting(key);
            }

            return {
                entries,
                settings,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            throw error;
        }
    }    async importData(data) {
        try {
            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Formato de datos inválido: debe ser un objeto');
            }

            if (!data.entries || !Array.isArray(data.entries)) {
                throw new Error('Formato de datos inválido: se requiere un array de entradas');
            }

            // Validate version compatibility
            if (data.version && typeof data.version === 'string') {
                const version = parseFloat(data.version);
                if (version > 1.0) {
                    throw new Error(`Versión no compatible: ${data.version}. Versión máxima soportada: 1.0`);
                }
            }

            // Validate each entry
            for (let i = 0; i < data.entries.length; i++) {
                const entry = data.entries[i];
                if (!entry || typeof entry !== 'object') {
                    throw new Error(`Entrada inválida en posición ${i}: debe ser un objeto`);
                }
                
                if (!entry.date || typeof entry.date !== 'string') {
                    throw new Error(`Entrada inválida en posición ${i}: fecha requerida`);
                }
                
                // Validate date format (YYYY-MM-DD)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(entry.date)) {
                    throw new Error(`Entrada inválida en posición ${i}: formato de fecha inválido (${entry.date})`);
                }
                
                if (entry.content && typeof entry.content !== 'string') {
                    throw new Error(`Entrada inválida en posición ${i}: el contenido debe ser texto`);
                }
                
                if (entry.mood && typeof entry.mood !== 'string') {
                    throw new Error(`Entrada inválida en posición ${i}: el estado de ánimo debe ser texto`);
                }
            }

            // Import entries
            let importedCount = 0;
            let skippedCount = 0;
              for (const entry of data.entries) {
                try {
                    await this.saveEntry(
                        entry.date,
                        entry.content || '',
                        entry.mood || null,
                        entry.photo_path || entry.photoPath || null,
                        entry.thumbnail_path || entry.thumbnailPath || null
                    );
                    importedCount++;
                } catch (entryError) {
                    console.warn(`Error importing entry for ${entry.date}:`, entryError);
                    skippedCount++;
                }
            }

            // Import settings
            if (data.settings && typeof data.settings === 'object') {
                const allowedSettings = ['darkMode', 'notificationsEnabled', 'notificationTime'];
                for (const [key, value] of Object.entries(data.settings)) {
                    if (allowedSettings.includes(key) && value !== null && value !== undefined) {
                        try {
                            await this.setSetting(key, String(value));
                        } catch (settingError) {
                            console.warn(`Error importing setting ${key}:`, settingError);
                        }
                    }
                }
            }

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
                error: error.message || 'Error desconocido durante la importación'
            };
        }
    }
}

// Create and export singleton instance
const db = new DatabaseManager();

export default db;
