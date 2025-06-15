// Theme service for managing app themes, dark mode, and styling
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

/**
 * ThemeService - Manages app themes, dark mode, and visual preferences
 */
class ThemeService {
    constructor() {
        this.isInitialized = false;
        this.isNative = Capacitor.isNativePlatform();
        this.currentTheme = 'light';
        this.systemPreference = 'light';
        this.userPreference = 'system';
        this.themes = {
            light: {
                name: 'light',
                displayName: 'Claro',
                statusBarStyle: Style.Light,
                colors: {
                    primary: '#2563eb',
                    primaryDark: '#1d4ed8',
                    secondary: '#64748b',
                    background: '#ffffff',
                    surface: '#f8fafc',
                    text: '#1f2937',
                    textSecondary: '#6b7280',
                    border: '#e5e7eb',
                    error: '#dc2626',
                    success: '#059669',
                    warning: '#d97706'
                }
            },
            dark: {
                name: 'dark',
                displayName: 'Oscuro',
                statusBarStyle: Style.Dark,
                colors: {
                    primary: '#3b82f6',
                    primaryDark: '#2563eb',
                    secondary: '#64748b',
                    background: '#111827',
                    surface: '#1f2937',
                    text: '#f9fafb',
                    textSecondary: '#d1d5db',
                    border: '#374151',
                    error: '#ef4444',
                    success: '#10b981',
                    warning: '#f59e0b'
                }
            }
        };
        this.mediaQuery = null;
        this.observers = new Set();
    }

    async init() {
        try {
            await this.detectSystemPreference();
            await this.loadUserPreference();
            await this.applyTheme();
            this.setupSystemThemeListener();
            this.setupThemeCSS();
            
            this.isInitialized = true;
            console.log('ThemeService initialized');
            return { success: true };
        } catch (error) {
            console.error('Error initializing ThemeService:', error);
            return { success: false, error: error.message };
        }
    }

    async detectSystemPreference() {
        try {
            if (window.matchMedia) {
                this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                this.systemPreference = this.mediaQuery.matches ? 'dark' : 'light';
            }
            return { success: true, preference: this.systemPreference };
        } catch (error) {
            console.error('Error detecting system preference:', error);
            return { success: false, error: error.message };
        }
    }

    async loadUserPreference() {
        try {
            // Try to get from storage service first
            if (window.services?.storage) {
                const preference = await window.services.storage.getConfig().getDarkMode();
                if (preference !== null) {
                    this.userPreference = preference ? 'dark' : 'light';
                    return { success: true, preference: this.userPreference };
                }
            }

            // Fallback to localStorage
            const stored = localStorage.getItem('theme-preference');
            this.userPreference = stored || 'system';
            
            return { success: true, preference: this.userPreference };
        } catch (error) {
            console.error('Error loading user preference:', error);
            this.userPreference = 'system';
            return { success: false, error: error.message };
        }
    }

    async saveUserPreference(preference) {
        try {
            this.userPreference = preference;

            // Save to storage service if available
            if (window.services?.storage) {
                const isDark = preference === 'dark' || (preference === 'system' && this.systemPreference === 'dark');
                await window.services.storage.getConfig().setDarkMode(isDark);
            }

            // Also save to localStorage as fallback
            localStorage.setItem('theme-preference', preference);
            
            return { success: true };
        } catch (error) {
            console.error('Error saving user preference:', error);
            return { success: false, error: error.message };
        }
    }

    async setTheme(preference) {
        try {
            await this.saveUserPreference(preference);
            await this.applyTheme();
            this.notifyObservers();
            
            return { success: true, theme: this.currentTheme };
        } catch (error) {
            console.error('Error setting theme:', error);
            return { success: false, error: error.message };
        }
    }

    async applyTheme() {
        try {
            // Determine actual theme to apply
            let targetTheme;
            if (this.userPreference === 'system') {
                targetTheme = this.systemPreference;
            } else {
                targetTheme = this.userPreference;
            }

            this.currentTheme = targetTheme;
            const theme = this.themes[targetTheme];

            // Apply to HTML element
            document.documentElement.className = targetTheme;
            
            if (targetTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            // Apply CSS custom properties
            this.applyCSSVariables(theme.colors);

            // Update status bar on native platforms
            if (this.isNative) {
                await this.updateStatusBar(theme.statusBarStyle);
            }

            // Update meta theme color
            this.updateMetaThemeColor(theme.colors.background);

            console.log(`Theme applied: ${targetTheme}`);
            return { success: true, theme: targetTheme };
        } catch (error) {
            console.error('Error applying theme:', error);
            return { success: false, error: error.message };
        }
    }

    applyCSSVariables(colors) {
        const root = document.documentElement;
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
    }

    async updateStatusBar(style) {
        try {
            if (this.isNative) {
                await StatusBar.setStyle({ style });
                
                // Also set background color to match theme
                const theme = this.themes[this.currentTheme];
                await StatusBar.setBackgroundColor({ 
                    color: theme.colors.background 
                });
            }
        } catch (error) {
            console.warn('Error updating status bar:', error);
        }
    }

    updateMetaThemeColor(color) {
        try {
            let themeColorMeta = document.querySelector('meta[name="theme-color"]');
            if (!themeColorMeta) {
                themeColorMeta = document.createElement('meta');
                themeColorMeta.name = 'theme-color';
                document.head.appendChild(themeColorMeta);
            }
            themeColorMeta.content = color;
        } catch (error) {
            console.warn('Error updating meta theme color:', error);
        }
    }

    setupSystemThemeListener() {
        if (this.mediaQuery) {
            const handler = (e) => {
                this.systemPreference = e.matches ? 'dark' : 'light';
                if (this.userPreference === 'system') {
                    this.applyTheme();
                    this.notifyObservers();
                }
            };
            
            this.mediaQuery.addEventListener('change', handler);
            
            // Store handler for cleanup
            this._systemThemeHandler = handler;
        }
    }

    setupThemeCSS() {
        // Inject custom CSS for theme transitions
        const style = document.createElement('style');
        style.textContent = `
            * {
                transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
            }
            
            .theme-transition {
                transition: all 0.3s ease;
            }
            
            /* Custom theme variables usage examples */
            .theme-bg-primary { background-color: var(--theme-primary); }
            .theme-bg-secondary { background-color: var(--theme-secondary); }
            .theme-bg-surface { background-color: var(--theme-surface); }
            .theme-text-primary { color: var(--theme-text); }
            .theme-text-secondary { color: var(--theme-textSecondary); }
            .theme-border { border-color: var(--theme-border); }
        `;
        document.head.appendChild(style);
    }

    // Observer pattern for theme changes
    addObserver(callback) {
        if (typeof callback === 'function') {
            this.observers.add(callback);
        }
    }

    removeObserver(callback) {
        this.observers.delete(callback);
    }

    notifyObservers() {
        this.observers.forEach(callback => {
            try {
                callback(this.currentTheme, this.themes[this.currentTheme]);
            } catch (error) {
                console.error('Error in theme observer callback:', error);
            }
        });
    }

    // Utility methods
    getCurrentTheme() {
        return {
            name: this.currentTheme,
            config: this.themes[this.currentTheme],
            userPreference: this.userPreference,
            systemPreference: this.systemPreference
        };
    }

    getAvailableThemes() {
        return Object.values(this.themes).map(theme => ({
            name: theme.name,
            displayName: theme.displayName
        }));
    }

    isDarkMode() {
        return this.currentTheme === 'dark';
    }

    async toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        return await this.setTheme(newTheme);
    }

    async toggleSystemTheme() {
        const newPreference = this.userPreference === 'system' ? 
            (this.currentTheme === 'light' ? 'dark' : 'light') : 'system';
        return await this.setTheme(newPreference);
    }

    getThemeColors(themeName = this.currentTheme) {
        return this.themes[themeName]?.colors || {};
    }

    // CSS utilities
    generateThemeCSS(themeName = this.currentTheme) {
        const theme = this.themes[themeName];
        if (!theme) return '';

        const cssVars = Object.entries(theme.colors)
            .map(([key, value]) => `  --theme-${key}: ${value};`)
            .join('\n');

        return `:root {\n${cssVars}\n}`;
    }

    // Custom theme support
    addCustomTheme(name, config) {
        if (!name || !config) {
            return { success: false, error: 'Name and config required' };
        }

        this.themes[name] = {
            name,
            displayName: config.displayName || name,
            statusBarStyle: config.statusBarStyle || Style.Light,
            colors: { ...this.themes.light.colors, ...config.colors }
        };

        return { success: true };
    }

    removeCustomTheme(name) {
        if (name === 'light' || name === 'dark') {
            return { success: false, error: 'Cannot remove default themes' };
        }

        if (this.currentTheme === name) {
            this.setTheme('light');
        }

        delete this.themes[name];
        return { success: true };
    }

    // Animation helpers
    async fadeThemeTransition(duration = 300) {
        return new Promise(resolve => {
            document.body.style.opacity = '0';
            setTimeout(() => {
                this.applyTheme();
                document.body.style.opacity = '1';
                setTimeout(resolve, duration);
            }, duration / 2);
        });
    }

    // Accessibility helpers
    getContrastRatio(color1, color2) {
        // Simple contrast ratio calculation
        const getLuminance = (color) => {
            const rgb = this.hexToRgb(color);
            if (!rgb) return 0;
            
            const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });
            
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        
        return (brightest + 0.05) / (darkest + 0.05);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Cleanup
    destroy() {
        if (this.mediaQuery && this._systemThemeHandler) {
            this.mediaQuery.removeEventListener('change', this._systemThemeHandler);
        }
        this.observers.clear();
    }
}

// Create and export singleton instance
const themeService = new ThemeService();

export default themeService;
