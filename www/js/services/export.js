// Export service for exporting journal data in various formats
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { formatDate } from '../helpers.js';

/**
 * ExportService - Handle data export in multiple formats (JSON, CSV, HTML, PDF-ready)
 */
class ExportService {
    constructor() {
        this.isInitialized = false;
        this.isNative = Capacitor.isNativePlatform();
        this.supportedFormats = ['json', 'csv', 'html', 'txt', 'markdown'];
        this.exportHistory = [];
        this.maxHistoryItems = 20;
    }

    async init() {
        try {
            await this.loadExportHistory();
            this.isInitialized = true;
            console.log('ExportService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing ExportService:', error);
            return { success: false, error: error.message };
        }
    }

    async exportData(options = {}) {
        try {
            const {
                format = 'json',
                dateRange = null,
                includeMoods = true,
                includePhotos = false,
                includeMetadata = true,
                filename = null
            } = options;

            if (!this.supportedFormats.includes(format)) {
                throw new Error(`Unsupported format: ${format}`);
            }

            // Get data from database
            const entries = await this.getEntriesForExport(dateRange);
            if (entries.length === 0) {
                return { success: false, error: 'No entries found for export' };
            }

            // Generate export data based on format
            let exportData;
            let mimeType;
            let fileExtension;

            switch (format) {
                case 'json':
                    exportData = await this.exportAsJSON(entries, { includeMoods, includePhotos, includeMetadata });
                    mimeType = 'application/json';
                    fileExtension = 'json';
                    break;
                case 'csv':
                    exportData = await this.exportAsCSV(entries, { includeMoods, includePhotos });
                    mimeType = 'text/csv';
                    fileExtension = 'csv';
                    break;
                case 'html':
                    exportData = await this.exportAsHTML(entries, { includeMoods, includePhotos });
                    mimeType = 'text/html';
                    fileExtension = 'html';
                    break;
                case 'txt':
                    exportData = await this.exportAsText(entries, { includeMoods });
                    mimeType = 'text/plain';
                    fileExtension = 'txt';
                    break;
                case 'markdown':
                    exportData = await this.exportAsMarkdown(entries, { includeMoods });
                    mimeType = 'text/markdown';
                    fileExtension = 'md';
                    break;
            }

            // Generate filename if not provided
            const finalFilename = filename || this.generateFilename(format, dateRange);

            // Save or share the file
            const result = await this.saveOrShareFile(exportData, finalFilename, mimeType);

            // Add to export history
            this.addToExportHistory({
                format,
                filename: finalFilename,
                entriesCount: entries.length,
                dateRange,
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                format,
                filename: finalFilename,
                entriesCount: entries.length,
                ...result
            };
        } catch (error) {
            console.error('Error exporting data:', error);
            return { success: false, error: error.message };
        }
    }

    async getEntriesForExport(dateRange) {
        if (!window.db || !window.db.isInitialized) {
            throw new Error('Database not available');
        }

        let entries;

        if (dateRange && dateRange.start && dateRange.end) {
            entries = await window.db.getEntriesByDateRange(dateRange.start, dateRange.end);
        } else {
            entries = await window.db.getAllEntries(10000); // Get all entries
        }

        return entries || [];
    }

    async exportAsJSON(entries, options) {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                version: '1.0.0',
                source: 'Daily Journal App',
                totalEntries: entries.length
            },
            entries: entries.map(entry => {
                const exportEntry = {
                    date: entry.date,
                    content: entry.content
                };

                if (options.includeMoods && entry.mood) {
                    exportEntry.mood = entry.mood;
                }

                if (options.includePhotos && (entry.photo_path || entry.photoPath)) {
                    exportEntry.photo_path = entry.photo_path || entry.photoPath;
                    if (entry.thumbnail_path || entry.thumbnailPath) {
                        exportEntry.thumbnail_path = entry.thumbnail_path || entry.thumbnailPath;
                    }
                }

                if (options.includeMetadata) {
                    exportEntry.word_count = entry.word_count || entry.wordCount || 0;
                    exportEntry.created_at = entry.created_at || entry.createdAt;
                    exportEntry.updated_at = entry.updated_at || entry.updatedAt;
                }

                return exportEntry;
            })
        };

        return JSON.stringify(exportData, null, 2);
    }

    async exportAsCSV(entries, options) {
        const headers = ['Fecha', 'Contenido'];
        
        if (options.includeMoods) {
            headers.push('Estado de ánimo');
        }
        
        if (options.includePhotos) {
            headers.push('Tiene foto');
        }
        
        headers.push('Palabras');

        const csvRows = [headers.join(',')];

        entries.forEach(entry => {
            const row = [
                `"${entry.date}"`,
                `"${this.escapeCsvField(entry.content)}"`
            ];

            if (options.includeMoods) {
                row.push(`"${entry.mood || ''}"`);
            }

            if (options.includePhotos) {
                row.push(`"${(entry.photo_path || entry.photoPath) ? 'Sí' : 'No'}"`);
            }

            row.push(`"${entry.word_count || entry.wordCount || 0}"`);

            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    async exportAsHTML(entries, options) {
        const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mi Diario Personal</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #eee;
            margin-bottom: 30px;
            padding-bottom: 20px;
        }
        .entry {
            margin-bottom: 40px;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 8px;
            background: #fafafa;
        }
        .entry-date {
            font-size: 1.2em;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .entry-mood {
            display: inline-block;
            font-size: 1.5em;
            margin-bottom: 10px;
        }
        .entry-content {
            white-space: pre-wrap;
            margin-bottom: 10px;
        }
        .entry-meta {
            font-size: 0.9em;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        .photo-indicator {
            color: #10b981;
            font-weight: bold;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .entry { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Mi Diario Personal</h1>
        <p>Exportado el ${formatDate(new Date(), 'full', 'es-ES')}</p>
        <p>${entries.length} entrada${entries.length !== 1 ? 's' : ''}</p>
    </div>
    
    ${entries.map(entry => this.createHTMLEntry(entry, options)).join('')}
    
    <div style="text-align: center; margin-top: 40px; color: #666; font-size: 0.9em;">
        <p>Generado por Daily Journal App</p>
    </div>
</body>
</html>`;

        return htmlTemplate;
    }

    createHTMLEntry(entry, options) {
        const entryDate = formatDate(new Date(entry.date), 'full', 'es-ES');
        
        return `
        <div class="entry">
            <div class="entry-date">${entryDate}</div>
            ${options.includeMoods && entry.mood ? `<div class="entry-mood">${entry.mood}</div>` : ''}
            <div class="entry-content">${this.escapeHtml(entry.content)}</div>
            <div class="entry-meta">
                ${entry.word_count || entry.wordCount || 0} palabra${(entry.word_count || entry.wordCount || 0) !== 1 ? 's' : ''}
                ${options.includePhotos && (entry.photo_path || entry.photoPath) ? 
                    ' • <span class="photo-indicator">📷 Incluye foto</span>' : ''}
            </div>
        </div>`;
    }

    async exportAsText(entries, options) {
        const lines = [
            'MI DIARIO PERSONAL',
            '='.repeat(50),
            `Exportado el: ${formatDate(new Date(), 'full', 'es-ES')}`,
            `Total de entradas: ${entries.length}`,
            '',
            ''
        ];

        entries.forEach(entry => {
            const entryDate = formatDate(new Date(entry.date), 'full', 'es-ES');
            
            lines.push(`FECHA: ${entryDate}`);
            
            if (options.includeMoods && entry.mood) {
                lines.push(`ESTADO DE ÁNIMO: ${entry.mood}`);
            }
            
            lines.push('');
            lines.push(entry.content);
            lines.push('');
            lines.push(`Palabras: ${entry.word_count || entry.wordCount || 0}`);
            lines.push('-'.repeat(50));
            lines.push('');
        });

        return lines.join('\n');
    }

    async exportAsMarkdown(entries, options) {
        const lines = [
            '# Mi Diario Personal',
            '',
            `**Exportado el:** ${formatDate(new Date(), 'full', 'es-ES')}`,
            `**Total de entradas:** ${entries.length}`,
            '',
            '---',
            ''
        ];

        entries.forEach(entry => {
            const entryDate = formatDate(new Date(entry.date), 'full', 'es-ES');
            
            lines.push(`## ${entryDate}`);
            
            if (options.includeMoods && entry.mood) {
                lines.push(`**Estado de ánimo:** ${entry.mood}`);
                lines.push('');
            }
            
            lines.push(entry.content);
            lines.push('');
            lines.push(`*${entry.word_count || entry.wordCount || 0} palabra${(entry.word_count || entry.wordCount || 0) !== 1 ? 's' : ''}*`);
            lines.push('');
            lines.push('---');
            lines.push('');
        });

        return lines.join('\n');
    }

    async saveOrShareFile(data, filename, mimeType) {
        try {
            if (this.isNative) {
                // On native platforms, save to device and optionally share
                const result = await this.saveToDevice(data, filename, mimeType);
                
                if (result.success) {
                    // Offer to share the file
                    await this.shareFile(result.filePath, filename, mimeType);
                }
                
                return result;
            } else {
                // On web, trigger download
                return this.downloadFile(data, filename, mimeType);
            }
        } catch (error) {
            console.error('Error saving or sharing file:', error);
            return { success: false, error: error.message };
        }
    }

    async saveToDevice(data, filename, mimeType) {
        try {
            const result = await Filesystem.writeFile({
                path: filename,
                data: btoa(unescape(encodeURIComponent(data))), // Convert to base64
                directory: Directory.Documents,
                encoding: Encoding.Base64
            });

            return {
                success: true,
                filePath: result.uri,
                message: 'Archivo guardado en Documentos'
            };
        } catch (error) {
            console.error('Error saving to device:', error);
            return { success: false, error: error.message };
        }
    }

    async shareFile(filePath, filename, mimeType) {
        try {
            await Share.share({
                title: 'Exportar Diario',
                text: `Mi diario personal - ${filename}`,
                url: filePath
            });
        } catch (error) {
            console.warn('Error sharing file:', error);
            // Not critical, file was still saved
        }
    }

    downloadFile(data, filename, mimeType) {
        try {
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return {
                success: true,
                message: 'Archivo descargado'
            };
        } catch (error) {
            console.error('Error downloading file:', error);
            return { success: false, error: error.message };
        }
    }

    generateFilename(format, dateRange) {
        const timestamp = new Date().toISOString().split('T')[0];
        let filename = `diario-${timestamp}`;

        if (dateRange && dateRange.start && dateRange.end) {
            filename = `diario-${dateRange.start}-a-${dateRange.end}`;
        }

        return `${filename}.${format}`;
    }

    // Utility functions
    escapeCsvField(field) {
        if (!field) return '';
        return field.toString().replace(/"/g, '""');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Export history management
    addToExportHistory(exportInfo) {
        this.exportHistory.unshift(exportInfo);
        
        if (this.exportHistory.length > this.maxHistoryItems) {
            this.exportHistory = this.exportHistory.slice(0, this.maxHistoryItems);
        }
        
        this.saveExportHistory();
    }

    getExportHistory() {
        return [...this.exportHistory];
    }

    clearExportHistory() {
        this.exportHistory = [];
        this.saveExportHistory();
    }

    async loadExportHistory() {
        try {
            if (window.services?.storage) {
                const history = await window.services.storage.getPreferences().get('exportHistory', []);
                this.exportHistory = Array.isArray(history) ? history : [];
            } else {
                const stored = localStorage.getItem('journal_export_history');
                this.exportHistory = stored ? JSON.parse(stored) : [];
            }
        } catch (error) {
            console.error('Error loading export history:', error);
            this.exportHistory = [];
        }
    }

    async saveExportHistory() {
        try {
            if (window.services?.storage) {
                await window.services.storage.getPreferences().set('exportHistory', this.exportHistory);
            } else {
                localStorage.setItem('journal_export_history', JSON.stringify(this.exportHistory));
            }
        } catch (error) {
            console.error('Error saving export history:', error);
        }
    }

    // Bulk export operations
    async exportByDateRange(startDate, endDate, format = 'json') {
        return this.exportData({
            format,
            dateRange: { start: startDate, end: endDate },
            filename: `diario-${startDate}-a-${endDate}.${format}`
        });
    }

    async exportByYear(year, format = 'json') {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        return this.exportByDateRange(startDate, endDate, format);
    }

    async exportByMonth(year, month, format = 'json') {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        return this.exportByDateRange(startDate, endDate, format);
    }

    // Statistics and info
    getSupportedFormats() {
        return [
            { value: 'json', label: 'JSON', description: 'Formato estructurado para backup completo' },
            { value: 'csv', label: 'CSV', description: 'Hoja de cálculo compatible' },
            { value: 'html', label: 'HTML', description: 'Página web visualizable' },
            { value: 'txt', label: 'Texto plano', description: 'Formato simple de texto' },
            { value: 'markdown', label: 'Markdown', description: 'Formato de texto enriquecido' }
        ];
    }

    getExportStats() {
        return {
            totalExports: this.exportHistory.length,
            lastExport: this.exportHistory[0]?.timestamp || null,
            formatUsage: this.getFormatUsageStats()
        };
    }

    getFormatUsageStats() {
        const usage = {};
        this.exportHistory.forEach(exp => {
            usage[exp.format] = (usage[exp.format] || 0) + 1;
        });
        return usage;
    }

    destroy() {
        this.exportHistory = [];
    }
}

// Create and export singleton instance
const exportService = new ExportService();

export default exportService;
