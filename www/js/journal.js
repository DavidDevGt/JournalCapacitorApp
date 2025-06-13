import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

class JournalManager {    constructor() {
        this.currentMood = null;
        this.currentPhoto = null;
        this.currentThumbnail = null;
        this.hasUnsavedChanges = false;
        this.wordCountElement = null;
        this.journalTextarea = null;
        this.autoSaveTimeout = null;
        this.isInitialized = false;
    }    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupAutoSave();
        await this.loadTodayEntry();
        await this.setupNotifications();
        
        // Generate missing thumbnails in the background
        setTimeout(() => {
            this.generateMissingThumbnails();
        }, 2000); // Wait 2 seconds to not interfere with initial load
        
        this.isInitialized = true;
    }

    setupElements() {
        this.wordCountElement = document.getElementById('word-count');
        this.journalTextarea = document.getElementById('journal-entry');
    }

    setupEventListeners() {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectMood(e.target.dataset.mood);
            });
        });

        const takePhotoBtn = document.getElementById('take-photo-btn');
        if (takePhotoBtn) {
            takePhotoBtn.addEventListener('click', () => this.takePhoto());
        }

        const removePhotoBtn = document.getElementById('remove-photo-btn');
        if (removePhotoBtn) {
            removePhotoBtn.addEventListener('click', () => this.removePhoto());
        }

        if (this.journalTextarea) {
            this.journalTextarea.addEventListener('input', (e) => {
                this.updateWordCount();
                this.markUnsaved();
                this.scheduleAutoSave();
            });

            this.journalTextarea.addEventListener('focus', () => {
                this.triggerHapticFeedback('light');
            });
        }

        const saveBtn = document.getElementById('save-entry-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveEntry());
        }

        const shareBtn = document.getElementById('share-entry-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareEntry());
        }
    }

    async selectMood(mood) {
        try {
            await this.triggerHapticFeedback('medium');

            document.querySelectorAll('.mood-btn').forEach(btn => {
                btn.classList.remove('selected');
            });

            const selectedBtn = document.querySelector(`[data-mood="${mood}"]`);
            if (selectedBtn) {
                selectedBtn.classList.add('selected');
            }

            this.currentMood = mood;
            this.markUnsaved();
            this.scheduleAutoSave();

            if (window.ui) {
                window.ui.showToast(`Estado de ánimo: ${mood}`, 'success', 2000);
            }
        } catch (error) {
            console.error('Error selecting mood:', error);
        }
    }    async takePhoto() {
        try {
            // Show loading state
            if (window.ui) {
                window.ui.showToast('Procesando foto...', 'info', 1000);
            }            const image = await Camera.getPhoto({
                quality: 85,
                allowEditing: true,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Camera,
                width: 1200,
                height: 1200,
                correctOrientation: true
            });

            if (image && image.dataUrl) {
                // Display original photo
                this.displayPhoto(image.dataUrl);
                this.currentPhoto = image.dataUrl;
                
                // Generate optimized thumbnail for entry cards
                try {
                    if (window.ui) {
                        window.ui.showToast('Optimizando imagen...', 'info', 1000);
                    }
                    
                    this.currentThumbnail = await this.createThumbnail(image.dataUrl);
                } catch (thumbnailError) {
                    console.warn('Error creating thumbnail, using original:', thumbnailError);
                    this.currentThumbnail = image.dataUrl;
                }
                
                this.markUnsaved();
                this.scheduleAutoSave();

                await this.triggerHapticFeedback('medium');

                if (window.ui) {
                    window.ui.showToast('Foto agregada correctamente', 'success');
                }
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            if (window.ui) {
                if (error.message && error.message.includes('cancelled')) {
                    window.ui.showToast('Captura de foto cancelada', 'info');
                } else {
                    window.ui.showToast('Error al tomar la foto', 'error');
                }
            }
        }
    }    displayPhoto(dataUrl) {
        const photoContainer = document.getElementById('photo-container');
        const noPhotoDiv = document.getElementById('no-photo');
        const photoImg = document.getElementById('daily-photo');

        if (photoContainer && noPhotoDiv && photoImg) {
            photoImg.src = dataUrl;
            photoImg.onclick = () => {
                if (window.ui) {
                    window.ui.showImagePreview(dataUrl);
                }
            };
            photoImg.title = 'Clic para ver en pantalla completa';
            photoContainer.classList.remove('hidden');
            noPhotoDiv.classList.add('hidden');
        }
    }removePhoto() {
        const photoContainer = document.getElementById('photo-container');
        const noPhotoDiv = document.getElementById('no-photo');

        if (photoContainer && noPhotoDiv) {
            photoContainer.classList.add('hidden');
            noPhotoDiv.classList.remove('hidden');
        }

        this.currentPhoto = null;
        this.currentThumbnail = null;
        this.markUnsaved();
        this.scheduleAutoSave();

        if (window.ui) {
            window.ui.showToast('Foto eliminada', 'info');
        }
    }

    updateWordCount() {
        if (!this.journalTextarea || !this.wordCountElement) return;

        const text = this.journalTextarea.value;
        const wordCount = this.countWords(text);
        this.wordCountElement.textContent = `${wordCount} palabra${wordCount !== 1 ? 's' : ''}`;
    }

    countWords(text) {
        if (!text || text.trim() === '') return 0;
        return text.trim().split(/\s+/).length;
    }

    // Auto-save functionality
    setupAutoSave() {
        // Auto-save every 30 seconds if there are unsaved changes
        setInterval(() => {
            if (this.hasUnsavedChanges) {
                this.saveEntry(true); // Silent save
            }
        }, 30000);
    }

    scheduleAutoSave() {
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            if (this.hasUnsavedChanges) {
                this.saveEntry(true); // Silent save
            }
        }, 5000);
    }

    markUnsaved() {
        this.hasUnsavedChanges = true;
        const saveBtn = document.getElementById('save-entry-btn');
        if (saveBtn) {
            saveBtn.textContent = 'Guardando...';
            saveBtn.disabled = true;
        }
    }

    markSaved() {
        this.hasUnsavedChanges = false;
        const saveBtn = document.getElementById('save-entry-btn');
        if (saveBtn) {
            saveBtn.textContent = 'Guardar';
            saveBtn.disabled = false;
        }
    }

    // Save and load functionality
    async saveEntry(silent = false) {
        if (!window.db || !window.db.isInitialized) {
            if (!silent && window.ui) {
                window.ui.showToast('Base de datos no disponible', 'error');
            }
            return;
        }

        try {
            const date = window.ui ? window.ui.formatDateForStorage(window.ui.currentDate) : new Date().toISOString().split('T')[0];
            const content = this.journalTextarea ? this.journalTextarea.value : '';

            if (!content.trim() && !this.currentMood && !this.currentPhoto) {
                if (!silent && window.ui) {
                    window.ui.showToast('No hay contenido para guardar', 'warning');
                }
                return;
            }            const result = await window.db.saveEntry(
                date,
                content,
                this.currentMood,
                this.currentPhoto,
                this.currentThumbnail
            );

            if (result.success) {
                this.markSaved();
                await this.triggerHapticFeedback('light');

                if (!silent && window.ui) {
                    window.ui.showToast('Entrada guardada correctamente', 'success');
                }
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            if (!silent && window.ui) {
                window.ui.showToast('Error al guardar la entrada', 'error');
            }
        }
    }

    async loadTodayEntry() {
        if (!window.db || !window.db.isInitialized) return;

        try {
            const date = window.ui ? window.ui.formatDateForStorage(window.ui.currentDate) : new Date().toISOString().split('T')[0];
            const entry = await window.db.getEntry(date);

            this.loadEntryData(entry);
        } catch (error) {
            console.error('Error loading today entry:', error);
        }
    }

    async loadEntryForDate(date) {
        if (!window.db || !window.db.isInitialized) return;

        try {
            const entry = await window.db.getEntry(date);
            this.loadEntryData(entry);
        } catch (error) {
            console.error('Error loading entry for date:', error);
        }
    }    loadEntryData(entry) {
        // Reset current state
        this.currentMood = null;
        this.currentPhoto = null;
        this.currentThumbnail = null;

        if (this.journalTextarea) {
            this.journalTextarea.value = '';
        }

        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        const photoContainer = document.getElementById('photo-container');
        const noPhotoDiv = document.getElementById('no-photo');
        if (photoContainer && noPhotoDiv) {
            photoContainer.classList.add('hidden');
            noPhotoDiv.classList.remove('hidden');
        }

        // Load entry data if exists
        if (entry) {
            if (entry.content && this.journalTextarea) {
                this.journalTextarea.value = entry.content;
            }

            if (entry.mood) {
                this.currentMood = entry.mood;
                const moodBtn = document.querySelector(`[data-mood="${entry.mood}"]`);
                if (moodBtn) {
                    moodBtn.classList.add('selected');
                }
            }            if (entry.photo_path || entry.photoPath) {
                this.currentPhoto = entry.photo_path || entry.photoPath;
                this.currentThumbnail = entry.thumbnail_path || entry.thumbnailPath || this.currentPhoto;
                this.displayPhoto(this.currentPhoto);
            }
        }

        this.updateWordCount();
        this.markSaved();
    }

    async shareEntry() {
        try {
            const content = this.journalTextarea ? this.journalTextarea.value : '';
            const date = window.ui ? window.ui.formatDate(window.ui.currentDate, 'short') : new Date().toLocaleDateString();

            if (!content.trim()) {
                if (window.ui) {
                    window.ui.showToast('No hay contenido para compartir', 'warning');
                }
                return;
            }

            const shareText = `📖 Mi entrada de diario - ${date}\n\n${content}`;

            await Share.share({
                title: 'Mi entrada de diario',
                text: shareText,
                dialogTitle: 'Compartir entrada de diario'
            });

            await this.triggerHapticFeedback('light');
        } catch (error) {
            console.error('Error sharing entry:', error);
            if (window.ui) {
                window.ui.showToast('Error al compartir', 'error');
            }
        }
    }

    // Notifications functionality
    async setupNotifications() {
        try {
            // Request permissions
            const permissions = await LocalNotifications.requestPermissions();

            if (permissions.display === 'granted') {
                await this.scheduleNotifications();
            }
        } catch (error) {
            console.error('Error setting up notifications:', error);
        }
    }

    async scheduleNotifications() {
        try {
            // Get user preference for notification time
            const notificationTime = await window.db?.getSetting('notificationTime', '20:00') || '20:00';
            const isEnabled = await window.db?.getSetting('notificationsEnabled', 'true') || 'true';

            if (isEnabled === 'false') return;

            // Cancel existing notifications
            await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

            // Schedule daily reminder
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

            console.log(`Notification scheduled for ${notificationTime}`);
        } catch (error) {
            console.error('Error scheduling notifications:', error);
        }
    }

    async toggleNotifications(enabled) {
        if (!window.db) return;

        try {
            await window.db.setSetting('notificationsEnabled', enabled.toString());

            if (enabled) {
                await this.scheduleNotifications();
                if (window.ui) {
                    window.ui.showToast('Recordatorios activados', 'success');
                }
            } else {
                await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
                if (window.ui) {
                    window.ui.showToast('Recordatorios desactivados', 'info');
                }
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
        }
    }

    async setNotificationTime(time) {
        if (!window.db) return;

        try {
            await window.db.setSetting('notificationTime', time);
            await this.scheduleNotifications();

            if (window.ui) {
                window.ui.showToast(`Recordatorio programado para las ${time}`, 'success');
            }
        } catch (error) {
            console.error('Error setting notification time:', error);
        }
    }

    // Haptic feedback
    async triggerHapticFeedback(style = 'light') {
        try {
            const impactStyle = style === 'light' ? ImpactStyle.Light :
                style === 'medium' ? ImpactStyle.Medium :
                    ImpactStyle.Heavy;

            await Haptics.impact({ style: impactStyle });
        } catch (error) {
            // Haptics not available
        }
    }

    // Statistics and analytics
    async getWritingStats() {
        if (!window.db) return null;

        try {
            const stats = await window.db.getStats();
            return {
                ...stats,
                averageWordsPerEntry: stats.totalEntries > 0 ? Math.round(stats.totalWords / stats.totalEntries) : 0
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }

    // Entry management
    async deleteEntry(date) {
        if (!window.db || !confirm('¿Estás seguro de que quieres eliminar esta entrada?')) {
            return;
        }

        try {
            const result = await window.db.deleteEntry(date);

            if (result.success) {
                await this.triggerHapticFeedback('medium');
                if (window.ui) {
                    window.ui.showToast('Entrada eliminada', 'success');
                    window.ui.loadAllEntries(); // Refresh entries list
                }

                // If deleting current day's entry, clear the form
                const currentDate = window.ui ? window.ui.formatDateForStorage(window.ui.currentDate) : new Date().toISOString().split('T')[0];
                if (date === currentDate) {
                    this.loadEntryData(null);
                }
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            if (window.ui) {
                window.ui.showToast('Error al eliminar la entrada', 'error');
            }
        }
    }

    // Data export/import
    async exportEntries() {
        if (!window.db) return;

        try {
            const data = await window.db.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `journal-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            if (window.ui) {
                window.ui.showToast('Backup exportado correctamente', 'success');
            }
        } catch (error) {
            console.error('Error exporting entries:', error);
            if (window.ui) {
                window.ui.showToast('Error al exportar el backup', 'error');
            }
        }
    }    async importEntries(file) {
        if (!window.db || !file) {
            if (window.ui) {
                window.ui.showToast('No se pudo acceder a la base de datos o archivo', 'error');
            }
            return;
        }

        try {
            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 10MB`);
            }

            // Validate file type
            if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
                throw new Error('Solo se permiten archivos JSON (.json)');
            }

            const text = await file.text();
            
            // Validate JSON structure before parsing
            if (!text.trim()) {
                throw new Error('El archivo está vacío');
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                throw new Error('Archivo JSON inválido: ' + parseError.message);
            }

            const result = await window.db.importData(data);

            if (result.success) {
                await this.loadTodayEntry();
                if (window.ui) {
                    const message = result.message || 'Datos importados correctamente';
                    window.ui.showToast(message, 'success');
                    window.ui.loadAllEntries();
                }
            } else {
                throw new Error(result.error || 'Error desconocido durante la importación');
            }
        } catch (error) {
            console.error('Error importing entries:', error);
            if (window.ui) {
                window.ui.showToast(error.message || 'Error al importar los datos', 'error');
            }
        }
    }

    // Keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveEntry();
            }

            // Ctrl/Cmd + Shift + S to share
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.shareEntry();
            }

            // Escape to blur textarea
            if (e.key === 'Escape' && document.activeElement === this.journalTextarea) {
                this.journalTextarea.blur();
            }
        });
    }

    // Cleanup
    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Save any unsaved changes before cleanup
        if (this.hasUnsavedChanges) {
            this.saveEntry(true);
        }
    }    // Create optimized thumbnail for faster loading in entry cards
    createThumbnail(dataUrl, size = 200, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Create square thumbnail with smart cropping
                canvas.width = size;
                canvas.height = size;
                
                const { width: imgWidth, height: imgHeight } = img;
                
                // Calculate scaling to fit the square while maintaining aspect ratio
                const scale = Math.max(size / imgWidth, size / imgHeight);
                const scaledWidth = imgWidth * scale;
                const scaledHeight = imgHeight * scale;
                
                // Center the image in the square
                const offsetX = (size - scaledWidth) / 2;
                const offsetY = (size - scaledHeight) / 2;
                
                // Fill background with a subtle color
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, size, size);
                
                // Apply subtle shadow/border effect
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                
                // Draw the image
                ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                
                const thumbnailDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(thumbnailDataUrl);
            };
            img.onerror = () => resolve(dataUrl); // Fallback to original
            img.src = dataUrl;
        });
    }

    // Utility function to generate thumbnails for existing entries without them
    async generateMissingThumbnails() {
        if (!window.db) return;

        try {
            const entries = await window.db.getAllEntries(1000); // Get more entries for processing
            let processed = 0;
            let generated = 0;

            for (const entry of entries) {
                if ((entry.photo_path || entry.photoPath) && 
                    !(entry.thumbnail_path || entry.thumbnailPath)) {
                    
                    try {
                        const photoPath = entry.photo_path || entry.photoPath;
                        const thumbnail = await this.createThumbnail(photoPath);
                        
                        await window.db.saveEntry(
                            entry.date,
                            entry.content,
                            entry.mood,
                            photoPath,
                            thumbnail
                        );
                        
                        generated++;
                    } catch (error) {
                        console.warn(`Error generating thumbnail for entry ${entry.date}:`, error);
                    }
                }
                processed++;
            }

            if (generated > 0) {
                console.log(`Generated ${generated} thumbnails for existing entries`);
                if (window.ui) {
                    window.ui.showToast(`Optimizadas ${generated} imágenes`, 'success');
                    window.ui.loadAllEntries(); // Refresh entries list
                }
            }
        } catch (error) {
            console.error('Error generating missing thumbnails:', error);
        }
    }
}

// Create and export singleton instance
const journal = new JournalManager();

export default journal;
