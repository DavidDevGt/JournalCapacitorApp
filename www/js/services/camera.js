// Camera service for photo capture, processing, and optimization
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import storageService from './storage.js';

class CameraService {
    constructor() {
        this.isInitialized = false;
        this.isNative = Capacitor.isNativePlatform();
        this.defaultOptions = {
            quality: 85,
            allowEditing: true,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera,
            width: 1200,
            height: 1200,
            correctOrientation: true
        };
    }

    async init() {
        try {
            await this.checkPermissions();
            this.isInitialized = true;
            console.log('CameraService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing CameraService:', error);
            return { success: false, error: error.message };
        }
    }

    async checkPermissions() {
        try {
            if (this.isNative) {
                const permissions = await Camera.checkPermissions();
                console.log('Camera permissions:', permissions);
                return { success: true, permissions };
            }
            return { success: true, permissions: { camera: 'granted', photos: 'granted' } };
        } catch (error) {
            console.error('Error checking camera permissions:', error);
            return { success: false, error: error.message };
        }
    }

    async requestPermissions() {
        try {
            if (this.isNative) {
                const permissions = await Camera.requestPermissions({
                    permissions: ['camera', 'photos']
                });
                return { success: true, permissions };
            }
            return { success: true, permissions: { camera: 'granted', photos: 'granted' } };
        } catch (error) {
            console.error('Error requesting camera permissions:', error);
            return { success: false, error: error.message };
        }
    }

    async takePhoto(options = {}) {
        try {
            const finalOptions = { ...this.defaultOptions, ...options };
            
            // Get quality setting from config
            const config = storageService.getConfig();
            const savedQuality = await config.getImageQuality();
            finalOptions.quality = Math.round(savedQuality * 100);

            const image = await Camera.getPhoto(finalOptions);

            if (!image || !image.dataUrl) {
                throw new Error('No image data received');
            }

            return { success: true, image };
        } catch (error) {
            console.error('Error taking photo:', error);
            
            if (error.message && error.message.includes('cancelled')) {
                return { success: false, error: 'Photo capture was cancelled', cancelled: true };
            }
            
            return { success: false, error: error.message };
        }
    }

    async pickFromGallery(options = {}) {
        try {
            const finalOptions = {
                ...this.defaultOptions,
                source: CameraSource.Photos,
                ...options
            };

            const image = await Camera.getPhoto(finalOptions);

            if (!image || !image.dataUrl) {
                throw new Error('No image data received');
            }

            return { success: true, image };
        } catch (error) {
            console.error('Error picking from gallery:', error);
            
            if (error.message && error.message.includes('cancelled')) {
                return { success: false, error: 'Gallery selection was cancelled', cancelled: true };
            }
            
            return { success: false, error: error.message };
        }
    }

    async showImageSourceSelector() {
        return new Promise((resolve) => {
            const modal = this.createImageSourceModal();
            document.body.appendChild(modal);

            const handleSelection = async (source) => {
                modal.remove();
                
                try {
                    let result;
                    if (source === 'camera') {
                        result = await this.takePhoto();
                    } else if (source === 'gallery') {
                        result = await this.pickFromGallery();
                    } else {
                        resolve({ success: false, error: 'Selection cancelled' });
                        return;
                    }
                    
                    resolve(result);
                } catch (error) {
                    resolve({ success: false, error: error.message });
                }
            };

            // Setup event listeners
            modal.querySelector('.camera-option').addEventListener('click', () => handleSelection('camera'));
            modal.querySelector('.gallery-option').addEventListener('click', () => handleSelection('gallery'));
            modal.querySelector('.cancel-option').addEventListener('click', () => handleSelection('cancel'));
            
            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    handleSelection('cancel');
                }
            });

            // Setup escape key listener
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    handleSelection('cancel');
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    createImageSourceModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-md transform transition-all duration-300 translate-y-0">
                <div class="p-6">
                    <div class="text-center mb-6">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Agregar foto</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Selecciona una opción</p>
                    </div>
                    
                    <div class="space-y-3">
                        <button class="camera-option w-full flex items-center justify-center space-x-3 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span class="font-medium">Tomar foto</span>
                        </button>
                        
                        <button class="gallery-option w-full flex items-center justify-center space-x-3 p-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span class="font-medium">Seleccionar de galería</span>
                        </button>
                        
                        <button class="cancel-option w-full p-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-colors">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Animate in
        requestAnimationFrame(() => {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.3s ease';
            const content = modal.querySelector('div > div');
            content.style.transform = 'translateY(100%)';
            content.style.transition = 'transform 0.3s ease';
            
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            });
        });

        return modal;
    }

    // Image processing and optimization
    async processAndSaveImage(imageData) {
        try {
            const config = storageService.getConfig();
            const quality = await config.getImageQuality();

            // Optimize image
            const optimizedImage = await this.optimizeImage(imageData, quality);
            
            // Generate thumbnail
            const thumbnail = await this.createThumbnail(optimizedImage.data, 200, quality);

            // Save both images
            const result = await storageService.saveImage(optimizedImage.data, false);
            
            if (result.success) {
                // Save thumbnail separately
                const thumbnailPath = storageService.getFiles().generateFilePath('thumbnail', 'jpg');
                const thumbnailResult = await storageService.getFiles().saveFile(thumbnailPath, thumbnail);
                
                return {
                    success: true,
                    imagePath: result.imagePath,
                    thumbnailPath: thumbnailResult.success ? thumbnailPath : result.imagePath,
                    originalSize: imageData.length,
                    optimizedSize: optimizedImage.data.length,
                    compressionRatio: ((imageData.length - optimizedImage.data.length) / imageData.length * 100).toFixed(1)
                };
            }

            throw new Error(result.error);
        } catch (error) {
            console.error('Error processing and saving image:', error);
            return { success: false, error: error.message };
        }
    }

    async optimizeImage(dataUrl, quality = 0.85, maxWidth = 1200, maxHeight = 1200) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate new dimensions
                const { width, height } = this.calculateOptimalSize(
                    img.width, 
                    img.height, 
                    maxWidth, 
                    maxHeight
                );

                canvas.width = width;
                canvas.height = height;

                // Enable image smoothing for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                
                const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
                
                resolve({
                    data: optimizedDataUrl,
                    width,
                    height,
                    originalWidth: img.width,
                    originalHeight: img.height
                });
            };

            img.onerror = reject;
            img.src = dataUrl;
        });
    }

    async createThumbnail(dataUrl, size = 200, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = size;
                canvas.height = size;

                // Calculate scaling and positioning for center crop
                const scale = Math.max(size / img.width, size / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const offsetX = (size - scaledWidth) / 2;
                const offsetY = (size - scaledHeight) / 2;

                // Fill background
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, size, size);

                // Add subtle shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Draw image
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

    calculateOptimalSize(originalWidth, originalHeight, maxWidth, maxHeight) {
        let { width, height } = { width: originalWidth, height: originalHeight };

        // Scale down if necessary
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        return { width, height };
    }

    // Utility methods
    async getImageInfo(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    size: dataUrl.length,
                    format: this.getImageFormat(dataUrl),
                    aspectRatio: (img.width / img.height).toFixed(2)
                });
            };

            img.onerror = () => resolve(null);
            img.src = dataUrl;
        });
    }

    getImageFormat(dataUrl) {
        if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
        if (dataUrl.startsWith('data:image/png')) return 'PNG';
        if (dataUrl.startsWith('data:image/webp')) return 'WebP';
        if (dataUrl.startsWith('data:image/gif')) return 'GIF';
        return 'Unknown';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    async validateImage(dataUrl) {
        try {
            const info = await this.getImageInfo(dataUrl);
            if (!info) {
                return { valid: false, error: 'Invalid image format' };
            }

            // Check file size (max 10MB)
            const maxSize = 10 * 1024 * 1024;
            if (info.size > maxSize) {
                return { 
                    valid: false, 
                    error: `Image too large (${this.formatFileSize(info.size)}). Maximum: 10MB` 
                };
            }

            // Check dimensions
            const maxDimension = 4000;
            if (info.width > maxDimension || info.height > maxDimension) {
                return { 
                    valid: false, 
                    error: `Image dimensions too large (${info.width}x${info.height}). Maximum: ${maxDimension}px` 
                };
            }

            return { valid: true, info };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Batch processing
    async processMultipleImages(imageDataArray) {
        const results = [];
        
        for (let i = 0; i < imageDataArray.length; i++) {
            try {
                const result = await this.processAndSaveImage(imageDataArray[i]);
                results.push({ index: i, ...result });
            } catch (error) {
                results.push({ 
                    index: i, 
                    success: false, 
                    error: error.message 
                });
            }
        }

        return {
            success: true,
            results,
            totalProcessed: results.length,
            successfulProcessed: results.filter(r => r.success).length
        };
    }
}

// Create and export singleton instance
const cameraService = new CameraService();

export default cameraService;
