import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { formatDate, formatDateForStorage, fromISODate } from './helpers.js';
import NotificationService from './services/notification-service.js';

class JournalManager {
    constructor() {
        this.currentMood = null;
        this.currentPhoto = null;
        this.currentThumbnail = null;
        this.hasUnsavedChanges = false;
        this.wordCountElement = null;
        this.journalTextarea = null;
        this.autoSaveTimeout = null;
        this.isInitialized = false;
        this.sentimentAnalyzer = null;
        this.autoMoodTimeout = null;
        this.lastAnalyzedText = '';
        this.isManualMoodSelection = false;
        this.notificationService = new NotificationService();
    }

    async init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupAutoSave();
        await this.loadTodayEntry();
        await this.notificationService.init();
        await this.initSentimentAnalyzer();

        setTimeout(() => {
            this.generateMissingThumbnails();
        }, 2000);

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
        } if (this.journalTextarea) {
            this.journalTextarea.addEventListener('input', (e) => {
                this.updateWordCount();
                this.markUnsaved();
                this.scheduleAutoSave();
                this.scheduleAutoMoodDetection(e.target.value);
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

        const todayNavBtn = document.getElementById('nav-today-btn');
        if (todayNavBtn) {
            todayNavBtn.addEventListener('click', async () => {
                if (window.ui && typeof window.ui.selectDate === 'function') {
                    const today = new Date();
                    window.ui.selectDate(today);
                } else {
                    await this.loadTodayEntry(); // Fallback mínimo
                }
            });
        }

        this.#setupDeletionListeners();
    }

    async selectMood(mood) {
        try {
            await this.triggerHapticFeedback('medium');

            document.querySelectorAll('.mood-btn').forEach(btn => {
                btn.classList.remove('selected', 'auto-detected');
            });

            const selectedBtn = document.querySelector(`[data-mood="${mood}"]`);
            if (selectedBtn) {
                selectedBtn.classList.add('selected');
            }

            this.currentMood = mood;
            this.isManualMoodSelection = true; // Mark as manual selection
            this.markUnsaved();
            this.scheduleAutoSave();

            if (window.ui) {
                window.ui.showToast(`Estado de ánimo: ${mood}`, 'success', 2000);
            }
        } catch (error) {
            console.error('Error selecting mood:', error);
        }
    }

    async initSentimentAnalyzer() {
        try {
            const SentimentAnalyzer = (await import('./sentiment-analyzer.js')).default;
            this.sentimentAnalyzer = new SentimentAnalyzer();
        } catch (error) {
            console.warn('Could not load sentiment analyzer:', error);
        }
    }

    scheduleAutoMoodDetection(text) {
        const settings = window.getSettings ? window.getSettings() : { autoMoodDetection: true };

        if (!settings.autoMoodDetection || !this.sentimentAnalyzer) {
            return;
        }

        if (this.autoMoodTimeout) {
            clearTimeout(this.autoMoodTimeout);
        }

        const trimmedText = text.trim();
        if (trimmedText.length < 20 || trimmedText === this.lastAnalyzedText) {
            return;
        }

        this.autoMoodTimeout = setTimeout(() => {
            this.detectAndSetMood(trimmedText);
        }, 800); // Wait 800ms after stop typing
    }

    detectAndSetMood(text) {
        if (!this.sentimentAnalyzer || !text.trim()) {
            return;
        }

        try {
            const settings = window.getSettings ? window.getSettings() : { autoMoodSensitivity: 'medium' };
            const analysis = this.sentimentAnalyzer.analyze(text);
            this.lastAnalyzedText = text.trim();

            // Determine confidence threshold based on sensitivity
            let confidenceThreshold = 0.3; // default medium
            switch (settings.autoMoodSensitivity) {
                case 'low':
                    confidenceThreshold = 0.6; // Only very evident changes
                    break;
                case 'medium':
                    confidenceThreshold = 0.3; // Balanced
                    break;
                case 'high':
                    confidenceThreshold = 0.1; // Detect subtle changes
                    break;
            }

            // Only change mood if confidence is sufficient and no manual selection
            if (analysis.confidence > confidenceThreshold && !this.isManualMoodSelection) {
                this.setAutoDetectedMood(analysis.mood);
            }
        } catch (error) {
            console.warn('Error in mood detection:', error);
        }
    }

    setAutoDetectedMood(mood) {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected', 'auto-detected');
        });

        const moodBtn = document.querySelector(`[data-mood="${mood}"]`);
        if (moodBtn) {
            moodBtn.classList.add('selected', 'auto-detected');
            this.currentMood = mood;

            this.showAutoMoodIndicator(moodBtn);
        }
    }

    showAutoMoodIndicator(moodBtn) {
        moodBtn.style.position = 'relative';

        // Create sparkle indicator
        const indicator = document.createElement('div');
        indicator.className = 'auto-mood-indicator';
        indicator.innerHTML = '✨';
        moodBtn.appendChild(indicator);

        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }

    async takePhoto() {
        try {
            const photoSource = await this.showPhotoSourceModal();

            if (!photoSource) {
                return;
            }

            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: photoSource,
                width: 1200,
                height: 1200,
                correctOrientation: true
            });

            if (image && image.dataUrl) {
                this.displayPhoto(image.dataUrl);
                this.currentPhoto = image.dataUrl;

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
                    window.ui.showToast('Operación cancelada', 'info');
                } else {
                    window.ui.showToast('Error al procesar la foto', 'error');
                }
            }
        }
    }

    showPhotoSourceModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 p-4 transition-colors';
            modal.innerHTML = `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 transform transition-all">
                    <div class="p-6">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                            Seleccionar foto
                        </h3>
                        <div class="space-y-3">

                            <button id="camera-option" class="w-full flex items-center justify-center space-x-3 bg-blue-500 hover:bg-blue-600 text-gray-900 dark:text-white py-3 px-4 rounded-lg transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                                <span class="text-gray-900 dark:text-white">Tomar foto</span>
                            </button>

                            <button id="gallery-option" class="w-full flex items-center justify-center space-x-3 bg-green-500 hover:bg-green-600 text-gray-900 dark:text-white py-3 px-4 rounded-lg transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span class="text-gray-900 dark:text-white">Seleccionar de galería</span>
                            </button>
                            
                            <button id="cancel-option" class="w-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 py-3 px-4 rounded-lg transition-colors border border-gray-400 dark:border-gray-500">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            const cameraBtn = modal.querySelector('#camera-option');
            const galleryBtn = modal.querySelector('#gallery-option');
            const cancelBtn = modal.querySelector('#cancel-option');

            const cleanup = () => {
                if (modal && document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            };

            cameraBtn.addEventListener('click', () => {
                cleanup();
                resolve(CameraSource.Camera);
            });

            galleryBtn.addEventListener('click', () => {
                cleanup();
                resolve(CameraSource.Photos);
            });

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(null);
                }
            });

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);

            requestAnimationFrame(() => {
                modal.style.opacity = '0';
                modal.style.transition = 'opacity 0.3s ease';
                requestAnimationFrame(() => {
                    modal.style.opacity = '1';
                });
            });
        });
    }

    displayPhoto(dataUrl) {
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
    }

    removePhoto() {
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

    setupAutoSave() {
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


    async saveEntry(silent = false) {
        if (!window.db || !window.db.isInitialized) {
            if (!silent && window.ui) {
                window.ui.showToast('Base de datos no disponible', 'error');
            }
            return;
        }

        try {
            const date = window.ui ? window.ui.formatDateForStorage(window.ui.currentDate) : (() => {
                const d = new Date();
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })();
            let content = this.journalTextarea ? this.journalTextarea.value : '';

            if (content.length > 5000) {
                if (window.ui) {
                    window.ui.showToast('El texto no puede superar los 5000 caracteres', 'warning');
                }
                return;
            }
            content = content.replace(/[<>]/g, '');

            if (!content.trim() && !this.currentMood && !this.currentPhoto) {
                if (!silent && window.ui) {
                    window.ui.showToast('No hay contenido para guardar', 'warning');
                }
                return;
            }

            const result = await window.db.saveEntry(
                date,
                content,
                this.currentMood,
                this.currentPhoto,
                this.currentThumbnail
            );

            if (result.success) {
                this.markSaved();
                await this.triggerHapticFeedback('light');

                // Notificar actualización del calendario
                document.dispatchEvent(new Event('calendarNeedsRefresh'));

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
    }

    loadEntryData(entry) {
        this.currentMood = null;
        this.currentPhoto = null;
        this.currentThumbnail = null;
        this.isManualMoodSelection = false; // Reset manual selection flag

        if (this.journalTextarea) {
            this.journalTextarea.value = '';
        }

        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('selected', 'auto-detected');
        });

        const photoContainer = document.getElementById('photo-container');
        const noPhotoDiv = document.getElementById('no-photo');
        if (photoContainer && noPhotoDiv) {
            photoContainer.classList.add('hidden');
            noPhotoDiv.classList.remove('hidden');
        }

        if (entry) {
            if (entry.content && this.journalTextarea) {
                this.journalTextarea.value = entry.content;
            }

            if (entry.mood) {
                this.currentMood = entry.mood;
                this.isManualMoodSelection = true; // Existing mood is considered manual
                const moodBtn = document.querySelector(`[data-mood="${entry.mood}"]`);
                if (moodBtn) {
                    moodBtn.classList.add('selected');
                }
            }
            if (entry.photo_path || entry.photoPath) {
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
            // Extraer datos de la entrada
            const entryData = this._extractEntryData();

            // Validar que hay contenido para compartir
            if (!this._hasContentToShare(entryData)) {
                this._showMessage('No hay contenido para compartir', 'warning');
                return;
            }

            // Generar texto principal de compartir
            const shareText = this._buildShareText(entryData);

            // Configurar opciones base
            const shareOptions = this._buildBaseShareOptions(shareText);

            // Procesar foto si existe
            if (entryData.hasPhoto) {
                await this._processPhotoForSharing(shareOptions, entryData.photo);
            }

            // Ejecutar compartir
            await this._executeShare(shareOptions);

        } catch (error) {
            this._handleShareError(error);
        }
    }

    // Métodos auxiliares privados
    _extractEntryData() {
        const content = this.journalTextarea?.value?.trim() || '';
        const date = window.ui?.formatDate(window.ui.currentDate, 'short') ||
            new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

        return {
            content,
            date,
            mood: this.currentMood,
            photo: this.currentPhoto,
            hasPhoto: this.currentPhoto?.startsWith('data:')
        };
    }

    _hasContentToShare({ content, mood, photo }) {
        return !!(content || mood || photo);
    }

    _buildShareText({ date, mood, content }) {
        const sections = [
            `📖 Mi entrada de diario - ${date}`,
            mood && `😊 Estado de ánimo: ${mood}`,
            content && `📝 ${content}`,
            '✨ Creado con Daily Journal'
        ];

        return sections.filter(Boolean).join('\n\n');
    }

    _buildBaseShareOptions(text) {
        return {
            title: 'Mi entrada de diario',
            text,
            dialogTitle: 'Compartir entrada de diario'
        };
    }

    async _processPhotoForSharing(shareOptions, photo) {
        try {
            const { fileUri, fileName } = await this._createTempPhotoFile(photo);

            shareOptions.url = fileUri;
            shareOptions.text += '\n\n📷 Incluye foto del día';

            this._schedulePhotoCleanup(fileName);

        } catch (photoError) {
            console.warn('Error procesando foto para compartir:', photoError);
            // Fallback graceful
            shareOptions.text += '\n\n📷 (Foto disponible en la entrada)';
        }
    }

    async _createTempPhotoFile(photoData) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        const { base64Data, mimeType } = this._parsePhotoData(photoData);
        const fileName = this._generatePhotoFileName(mimeType);

        await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
        });

        const { uri } = await Filesystem.getUri({
            directory: Directory.Cache,
            path: fileName
        });

        return { fileUri: uri, fileName };
    }

    _parsePhotoData(photoData) {
        const [mimeTypePart, base64Data] = photoData.split(',');
        const mimeType = mimeTypePart.split(':')[1].split(';')[0];

        return { base64Data, mimeType };
    }

    _generatePhotoFileName(mimeType) {
        const extension = this._getFileExtension(mimeType);
        const timestamp = Date.now();
        return `journal_photo_${timestamp}.${extension}`;
    }

    _getFileExtension(mimeType) {
        const extensionMap = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/webp': 'webp'
        };

        return extensionMap[mimeType] || 'jpg';
    }

    _schedulePhotoCleanup(fileName) {
        const cleanupAttempts = [5000, 15000, 30000]; // 5s, 15s, 30s

        cleanupAttempts.forEach(delay => {
            setTimeout(async () => {
                try {
                    const { Filesystem, Directory } = await import('@capacitor/filesystem');
                    await Filesystem.deleteFile({
                        path: fileName,
                        directory: Directory.Cache
                    });
                } catch (error) {
                    if (delay === cleanupAttempts[0]) {
                        console.warn('Intento de limpieza de archivo temporal:', error);
                    }
                }
            }, delay);
        });
    }

    async _executeShare(shareOptions) {
        await Share.share(shareOptions);
        await this.triggerHapticFeedback?.('light');
        this._showMessage('Entrada compartida exitosamente', 'success');
    }

    _handleShareError(error) {
        console.error('Error al compartir entrada:', error);

        const errorMessages = {
            cancelled: { message: 'Compartir cancelado', type: 'info' },
            network: { message: 'Error de conexión al compartir', type: 'error' },
            permission: { message: 'Permisos insuficientes para compartir', type: 'error' },
            default: { message: 'Error al compartir', type: 'error' }
        };

        const errorType = this._categorizeError(error);
        const { message, type } = errorMessages[errorType] || errorMessages.default;

        this._showMessage(message, type);
    }

    _categorizeError(error) {
        const errorMessage = error.message?.toLowerCase() || '';

        if (errorMessage.includes('cancelled') || errorMessage.includes('cancelado')) {
            return 'cancelled';
        }
        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            return 'network';
        }
        if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
            return 'permission';
        }

        return 'default';
    }

    _showMessage(message, type) {
        window.ui?.showToast(message, type);
    }

    async setupNotifications() {
        return await this.notificationService.init();
    }

    async scheduleNotifications() {
        return await this.notificationService.scheduleNotifications();
    }

    async toggleNotifications(enabled) {
        return await this.notificationService.toggleNotifications(enabled);
    }

    async setNotificationTime(time) {
        return await this.notificationService.setNotificationTime(time);
    }

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

                // Notificar actualización del calendario
                document.dispatchEvent(new Event('calendarNeedsRefresh'));

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

    /**
     * Exporta las entradas del diario usando Storage Access Framework (SAF)
     * Permite al usuario elegir dónde guardar el archivo
     */
    async exportEntries() {
        if (!window.db) {
            console.warn('Database not available for export');
            return;
        }

        try {
            // Mostrar indicador de carga
            if (window.ui) {
                window.ui.showToast('Preparando backup...', 'info', 1000);
            }

            // Obtener datos de la base de datos
            const data = await window.db.exportData();
            if (!data) {
                throw new Error('No hay datos para exportar');
            }

            // Generar nombre de archivo con timestamp
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
            const fileName = `journal-backup-${timestamp}.json`;
            const jsonString = JSON.stringify(data, null, 2);

            // Importar módulos de Capacitor
            const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');

            // Intentar usar SAF para que el usuario elija ubicación
            try {
                const result = await Filesystem.pickDirectory();

                if (result && result.uri) {
                    // Usuario eligió ubicación con SAF
                    await Filesystem.writeFile({
                        path: `${result.uri}/${fileName}`,
                        data: jsonString,
                        encoding: Encoding.UTF8
                    });

                    if (window.ui) {
                        window.ui.showToast(`Backup guardado como ${fileName}`, 'success');
                    }
                    return;
                } else {
                    // Usuario canceló la selección de directorio
                    if (window.ui) {
                        window.ui.showToast('Exportación cancelada', 'info');
                    }
                    return;
                }
            } catch (safError) {
                console.warn('SAF no disponible, usando fallback:', safError);

                await this._exportToAppDirectory(fileName, jsonString, Filesystem, Directory, Encoding);
            }
        } catch (error) {
            console.error('Error exporting entries:', error);
            if (window.ui) {
                window.ui.showToast('Error al exportar el backup', 'error');
            }
        }
    }

    /**
     * Método auxiliar para exportar al directorio de la aplicación
     * @private
     */
    async _exportToAppDirectory(fileName, jsonString, Filesystem, Directory, Encoding) {
        try {
            await Filesystem.writeFile({
                path: fileName,
                data: jsonString,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });

            if (window.ui) {
                window.ui.showToast(`Backup guardado en Documentos/${fileName}`, 'success');
            }
        } catch (documentsError) {
            console.warn('Error writing to Documents directory:', documentsError);

            // Último fallback: directorio de datos
            try {
                await Filesystem.writeFile({
                    path: fileName,
                    data: jsonString,
                    directory: Directory.Data,
                    encoding: Encoding.UTF8
                });

                if (window.ui) {
                    window.ui.showToast(`Backup guardado en Datos/${fileName}`, 'success');
                }
            } catch (dataError) {
                console.error('Error writing to Data directory:', dataError);
                throw new Error('No se pudo guardar el backup en ningún directorio');
            }
        }
    }

    /**
     * Importa entradas del diario usando Storage Access Framework (SAF)
     * Permite al usuario seleccionar el archivo a importar
     */
    async importEntries() {
        if (!window.db) {
            if (window.ui) {
                window.ui.showToast('No se pudo acceder a la base de datos', 'error');
            }
            return;
        }

        try {
            // Importar módulos de Capacitor
            const { Filesystem } = await import('@capacitor/filesystem');

            // Usar SAF para seleccionar archivo
            const result = await Filesystem.pickFiles({
                multiple: false,
                readData: true,
                accept: 'application/json'
            });

            if (!result || !result.files || result.files.length === 0) {
                // Usuario canceló la selección
                if (window.ui) {
                    window.ui.showToast('Importación cancelada', 'info');
                }
                return;
            }

            const file = result.files[0];

            // Validar archivo
            await this._validateImportFile(file);

            // Procesar datos
            const data = await this._processImportData(file);

            // Importar a la base de datos
            const importResult = await window.db.importData(data);

            if (importResult.success) {
                await this.loadTodayEntry();
                if (window.ui) {
                    const message = importResult.message || 'Datos importados correctamente';
                    window.ui.showToast(message, 'success');
                    window.ui.loadAllEntries();
                }
            } else {
                throw new Error(importResult.error || 'Error desconocido durante la importación');
            }
        } catch (error) {
            console.error('Error importing entries:', error);
            if (window.ui) {
                window.ui.showToast(error.message || 'Error al importar los datos', 'error');
            }
        }
    }

    /**
     * Valida el archivo de importación
     * @private
     */
    async _validateImportFile(file) {
        // Validar tamaño (máximo 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 10MB`);
        }

        // Validar tipo de archivo
        if (!file.name.endsWith('.json')) {
            throw new Error('Solo se permiten archivos JSON (.json)');
        }

        // Validar que no esté vacío
        if (!file.data || !file.data.trim()) {
            throw new Error('El archivo está vacío');
        }
    }

    /**
     * Procesa los datos del archivo de importación
     * @private
     */
    async _processImportData(file) {
        let data;
        try {
            data = JSON.parse(file.data);
        } catch (parseError) {
            throw new Error('Archivo JSON inválido: ' + parseError.message);
        }

        // Validar estructura básica
        if (!data || typeof data !== 'object') {
            throw new Error('El archivo no contiene datos válidos');
        }

        return data;
    }

    /**
     * Método legacy para compatibilidad con input file
     * @deprecated Usar importEntries() en su lugar
     */
    async importEntriesFromFile(file) {
        if (!window.db || !file) {
            if (window.ui) {
                window.ui.showToast('No se pudo acceder a la base de datos o archivo', 'error');
            }
            return;
        }

        try {
            // Validar archivo
            await this._validateImportFile({
                size: file.size,
                name: file.name,
                data: await file.text()
            });

            // Procesar datos
            const data = await this._processImportData({
                data: await file.text()
            });

            // Importar a la base de datos
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

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveEntry();
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.shareEntry();
            }

            if (e.key === 'Escape' && document.activeElement === this.journalTextarea) {
                this.journalTextarea.blur();
            }
        });
    }

    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        if (this.hasUnsavedChanges) {
            this.saveEntry(true);
        }
    }

    createThumbnail(dataUrl, size = 200, quality = 0.8) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = size;
                canvas.height = size;

                const { width: imgWidth, height: imgHeight } = img;

                const scale = Math.max(size / imgWidth, size / imgHeight);
                const scaledWidth = imgWidth * scale;
                const scaledHeight = imgHeight * scale;

                const offsetX = (size - scaledWidth) / 2;
                const offsetY = (size - scaledHeight) / 2;

                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, size, size);

                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
                ctx.shadowColor = 'transparent';

                const thumbnailDataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(thumbnailDataUrl);
            };
            img.onerror = () => resolve(dataUrl); // Fallback to original
            img.src = dataUrl;
        });
    }

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
                if (window.ui) {
                    window.ui.showToast(`Optimizadas ${generated} imágenes`, 'success');
                    window.ui.loadAllEntries(); // Refresh entries list
                }
            }
        } catch (error) {
            console.error('Error generating missing thumbnails:', error);
        }
    }

    /**
     * Manejar notificaciones de eliminación de entradas
     * @param {string} deletedDate - Fecha de la entrada eliminada
     */
    handleEntryDeletion(deletedDate) {
        // Verificar si la entrada eliminada es la que está actualmente cargada
        const currentDate = window.ui ? window.ui.formatDateForStorage(window.ui.currentDate) : new Date().toISOString().split('T')[0];
        
        if (deletedDate === currentDate) {
            // Si se eliminó la entrada actual, limpiar el estado
            this.loadEntryData(null);
            console.log('Entrada actual eliminada, estado limpiado');
        }
    }

    /**
     * Setup event listeners for entry deletion notifications
     * @private
     */
    #setupDeletionListeners() {
        // Escuchar eventos de eliminación de entradas
        document.addEventListener('entryDeleted', (event) => {
            const { deletedDate } = event.detail;
            this.handleEntryDeletion(deletedDate);
        });
    }
}

const journal = new JournalManager();
export default journal;
