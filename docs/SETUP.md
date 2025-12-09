# Guía de Configuración y Desarrollo - Daily Journal

## Tabla de Contenidos

- [Guía de Configuración y Desarrollo - Daily Journal](#guía-de-configuración-y-desarrollo---daily-journal)
  - [Tabla de Contenidos](#tabla-de-contenidos)
  - [Requisitos Previos](#requisitos-previos)
    - [Software Requerido](#software-requerido)
    - [Plataformas Soportadas](#plataformas-soportadas)
  - [Instalación](#instalación)
    - [Clonar el Repositorio](#clonar-el-repositorio)
    - [Instalar Dependencias](#instalar-dependencias)
  - [Configuración del Entorno de Desarrollo](#configuración-del-entorno-de-desarrollo)
    - [Configuración Inicial](#configuración-inicial)
    - [Configuración de Android](#configuración-de-android)
    - [Configuración de iOS](#configuración-de-ios)
  - [Estructura del Proyecto](#estructura-del-proyecto)
  - [Scripts de Desarrollo](#scripts-de-desarrollo)
    - [Desarrollo Web](#desarrollo-web)
    - [Desarrollo Móvil](#desarrollo-móvil)
    - [Scripts de Utilidad](#scripts-de-utilidad)
  - [Configuración de Capacitor](#configuración-de-capacitor)
    - [Configuración de Plugins](#configuración-de-plugins)
  - [Configuración de Base de Datos](#configuración-de-base-de-datos)
    - [Configuración de SQLite](#configuración-de-sqlite)
    - [Migraciones de Base de Datos](#migraciones-de-base-de-datos)
  - [Configuración de Notificaciones](#configuración-de-notificaciones)
    - [Configuración de Horario de Notificaciones](#configuración-de-horario-de-notificaciones)
  - [Configuración de Tailwind CSS](#configuración-de-tailwind-css)
    - [Personalización de Tailwind](#personalización-de-tailwind)
  - [Configuración de PWA](#configuración-de-pwa)
  - [Variables de Entorno](#variables-de-entorno)
    - [Variables Disponibles](#variables-disponibles)
    - [Configuración de Variables](#configuración-de-variables)
  - [Configuración de Build](#configuración-de-build)
    - [Configuración de Vite](#configuración-de-vite)
    - [Optimización de Build](#optimización-de-build)
  - [Depuración](#depuración)
    - [Depuración Web](#depuración-web)
    - [Depuración Android](#depuración-android)
    - [Depuración iOS](#depuración-ios)
  - [Testing](#testing)
    - [Testing Manual](#testing-manual)
    - [Testing Automático](#testing-automático)
  - [Solución de Problemas Comunes](#solución-de-problemas-comunes)
    - [Problemas de Build Android](#problemas-de-build-android)
    - [Problemas de Permisos](#problemas-de-permisos)
    - [App no carga](#app-no-carga)
    - [Problemas de Base de Datos](#problemas-de-base-de-datos)
  - [Configuración Avanzada](#configuración-avanzada)
    - [Configuración de Análisis de Sentimientos](#configuración-de-análisis-de-sentimientos)
    - [Configuración de Caching](#configuración-de-caching)
  - [Actualización de Dependencias](#actualización-de-dependencias)
    - [Actualizar Dependencias](#actualizar-dependencias)
    - [Migración de Versiones](#migración-de-versiones)

## Requisitos Previos

### Software Requerido

| Software | Versión Mínima | Notas |
|----------|---------------|-------|
| Node.js | 18.x o superior | Recomendado LTS |
| npm | 9.x o superior | Viene con Node.js |
| Git | 2.30 o superior | Para control de versiones |
| Android Studio | Latest | Solo para desarrollo Android |
| Xcode | Latest | Solo para desarrollo iOS (macOS) |
| Java JDK | 17 | Requerido para Android |
| Capacitor CLI | 6.0.0 | Se instala automáticamente |

### Plataformas Soportadas

- **Desarrollo Web**: Cualquier sistema operativo
- **Desarrollo Android**: Windows, macOS, Linux
- **Desarrollo iOS**: macOS (requerido)

## Instalación

### Clonar el Repositorio

```bash
git clone https://github.com/DavidDevGt/JournalCapacitorApp.git
cd JournalCapacitorApp
```

### Instalar Dependencias

```bash
npm install
```

Este comando instalará todas las dependencias necesarias para el proyecto, incluyendo:
- Dependencias de producción
- Dependencias de desarrollo
- Plugins de Capacitor

## Configuración del Entorno de Desarrollo

### Configuración Inicial

```bash
# Instalar Capacitor CLI globalmente (si no está instalado)
npm install -g @capacitor/cli

# Configurar plataformas (ejecutar según necesidad)
npx cap add android
npx cap add ios
```

### Configuración de Android

1. Abrir Android Studio
2. Importar el proyecto desde `android/`
3. Esperar a que Android Studio descargue las dependencias de Gradle
4. Configurar el SDK de Android (API 33 recomendado)

### Configuración de iOS

1. Abrir Xcode
2. Navegar a la carpeta `ios/App` y abrir el proyecto `.xcodeproj`
3. Configurar el equipo de desarrollo y provisioning profiles
4. Esperar a que Xcode resuelva las dependencias

## Estructura del Proyecto

```
JournalCapacitorApp/
├── android/                  # Proyecto Android nativo
├── ios/                      # Proyecto iOS nativo
├── www/                      # Código de la aplicación web
│   ├── css/                  # Estilos
│   ├── js/                   # JavaScript
│   │   ├── app.js            # Aplicación principal
│   │   ├── database.js       # Gestión de base de datos
│   │   ├── journal.js        # Lógica del diario
│   │   ├── ui.js             # Interfaz de usuario
│   │   ├── sentiment-analyzer.js # Análisis de sentimientos
│   │   ├── components/       # Componentes UI
│   │   ├── services/         # Servicios
│   │   └── helpers/          # Utilidades
│   └── index.html            # Punto de entrada
├── docs/                     # Documentación
├── capacitor.config.json     # Configuración de Capacitor
├── package.json              # Configuración de npm
├── vite.config.js            # Configuración de Vite
└── tailwind.config.js        # Configuración de Tailwind
```

## Scripts de Desarrollo

### Desarrollo Web

```bash
# Iniciar servidor de desarrollo con live reload
npm run dev

# Build para producción
npm run build

# Preview de build de producción
npm run preview
```

### Desarrollo Móvil

```bash
# Sincronizar código web con plataformas nativas
npm run sync

# Abrir Android Studio
npm run open:android

# Abrir Xcode
npm run open:ios

# Build para Android (utiliza Gradle directamente para garantizar la correcta lectura de credenciales de firma)
npm run build:android

# Build para iOS
npm run build:ios
```

### Scripts de Utilidad

```bash
# Build y sincronización completa para Android
npm run android

# Build y sincronización completa para iOS
npm run ios

# Build e instalación automática en Android
npm run mobile:build-install

# Herramientas de desarrollo móvil
npm run mobile:dev-tools
```

## Configuración de Capacitor

El archivo principal de configuración es `capacitor.config.json`:

```json
{
  "appId": "com.daviddevgt.journalapp",
  "appName": "Daily Journal",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "plugins": {
    "Camera": {
      "permissions": ["camera", "photos"]
    },
    "LocalNotifications": {
      "smallIcon": "ic_stat_icon_config_sample",
      "iconColor": "#488AFF",
      "sound": "beep.wav"
    },
    "StatusBar": {
      "style": "Dark"
    },
    "SplashScreen": {
      "launchShowDuration": 2000,
      "launchAutoHide": true,
      "launchFadeOutDuration": 300,
      "backgroundColor": "#ffffff",
      "androidSplashResourceName": "splash_layer",
      "androidScaleType": "CENTER",
      "showSpinner": false,
      "splashFullScreen": true,
      "splashImmersive": false
    }
  }
}
```

### Configuración de Plugins

Los plugins se configuran en la sección `plugins` del archivo de configuración. Para agregar nuevos plugins:

1. Instalar el plugin:
   ```bash
   npm install @capacitor/plugin-name
   ```

2. Registrar el plugin en `capacitor.config.json`

3. Sincronizar con las plataformas nativas:
   ```bash
   npx cap sync
   ```

## Configuración de Base de Datos

La aplicación utiliza SQLite para plataformas nativas y localStorage para web.

### Configuración de SQLite

El archivo [`www/js/database.js`](www/js/database.js) contiene la configuración:

```javascript
class DatabaseManager {
    static DB_NAME = 'journal_db';
    static DB_VERSION = 1;
    static STORAGE_PREFIX = 'journal_';
    static MAX_RETRY_ATTEMPTS = 3;
    // ...
}
```

### Migraciones de Base de Datos

Las migraciones se manejan automáticamente en el método `_runMigrations()`:

```javascript
async _runMigrations() {
    const tableInfo = await this.db.query('PRAGMA table_info(entries)');
    const columns = new Set((tableInfo.values || []).map(col => col.name));

    // Agregar columnas faltantes si es necesario
    const requiredColumns = [
        { name: 'thumbnail_path', type: 'TEXT' },
        { name: 'tags', type: 'TEXT' },
        // ...
    ];

    for (const column of requiredColumns) {
        if (!columns.has(column.name)) {
            await this.db.execute(`ALTER TABLE entries ADD COLUMN ${column.name} ${column.type}`);
        }
    }
}
```

## Configuración de Notificaciones

Las notificaciones se configuran en [`www/js/services/notification-service.js`](www/js/services/notification-service.js):

```javascript
class NotificationService {
    constructor() {
        this.notificationId = 1;
        // Configuración de frases por hora
        this.phrases = {
            morning: ["¡Buenos días! ¿Cómo comenzó tu día? 🌅", ...],
            afternoon: ["¿Cómo va tu día hasta ahora? 🌞", ...],
            evening: ["¿Cómo fue tu día? Es hora de escribir en tu diario 📖", ...],
            night: ["Antes de dormir, reflexiona sobre tu día ⭐", ...]
        };
    }
}
```

### Configuración de Horario de Notificaciones

```javascript
// Configurar hora de notificación (formato HH:MM)
await notificationService.setNotificationTime('20:00');

// Activar/desactivar notificaciones
await notificationService.toggleNotifications(true);
```

## Configuración de Tailwind CSS

El archivo `tailwind.config.js` contiene la configuración:

```javascript
module.exports = {
  content: [
    "./www/**/*.{html,js}",
    "./www/index.html"
  ],
  darkMode: 'class', // Habilita dark mode
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        secondary: '#10B981',
        // ...
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### Personalización de Tailwind

Para personalizar:

1. Editar `tailwind.config.js`
2. Recompilar CSS:
   ```bash
   npm run build:css
   ```

## Configuración de PWA

La aplicación está configurada como PWA (Progressive Web App):

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { vitePlugin as vitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Daily Journal',
        short_name: 'Journal',
        description: 'Diario personal minimalista',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

## Variables de Entorno

La aplicación utiliza variables de entorno para configuración:

### Variables Disponibles

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `VITE_APP_VERSION` | Versión de la aplicación | `1.0.0` |
| `VITE_DEBUG_MODE` | Modo de depuración | `false` |
| `VITE_API_TIMEOUT` | Timeout para operaciones | `10000` |

### Configuración de Variables

Crear un archivo `.env` en la raíz del proyecto:

```
VITE_APP_VERSION=1.0.0
VITE_DEBUG_MODE=true
VITE_API_TIMEOUT=15000
```

## Configuración de Build

### Configuración de Vite

El archivo `vite.config.js` contiene la configuración de build:

```javascript
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
```

### Optimización de Build

```bash
# Build para producción optimizado
npm run build

# Build con análisis de bundle
npm run build -- --mode analyze
```

## Depuración

### Depuración Web

```bash
# Iniciar servidor de desarrollo con herramientas de depuración
npm run dev
```

- Abrir Chrome DevTools (F12)
- Usar la pestaña "Sources" para depurar JavaScript
- Usar la pestaña "Application" para inspeccionar localStorage

### Depuración Android

```bash
# Conectar dispositivo y ver logs
adb logcat --pid=$(adb shell pidof com.daviddevgt.journalapp)

# Usar Chrome DevTools para depuración remota
chrome://inspect/#devices
```

### Depuración iOS

```bash
# Usar Safari Web Inspector
1. Habilitar Web Inspector en el dispositivo iOS
2. Conectar dispositivo a macOS
3. Abrir Safari -> Develop -> [Dispositivo] -> [App]
```

## Testing

### Testing Manual

1. **Pruebas de UI**: Verificar que todos los componentes se rendericen correctamente
2. **Pruebas de flujo**: Seguir los flujos principales de usuario
3. **Pruebas de persistencia**: Verificar que los datos se guarden y carguen correctamente
4. **Pruebas de notificaciones**: Verificar que las notificaciones funcionen
5. **Pruebas de exportación/importación**: Verificar que los datos se exporten e importen correctamente

### Testing Automático

```bash
# Ejecutar pruebas unitarias (si están configuradas)
npm test

# Ejecutar pruebas de Android
cd android && ./gradlew test

# Ejecutar pruebas de iOS
xcodebuild test -workspace ios/App/App.xcworkspace -scheme App
```

## Solución de Problemas Comunes

### Problemas de Build Android

**Error:** `Failed to find Build Tools revision`

**Solución:**
```bash
# Abrir Android Studio y dejar que instale las herramientas necesarias
# O instalar manualmente:
cd android && ./gradlew clean && npx cap sync
```

**Nota sobre el nuevo proceso de build:**

El script `npm run build:android` ahora utiliza directamente Gradle para la construcción (`cd android && .\\gradlew.bat assembleRelease`), lo que garantiza que las credenciales de firma se lean correctamente desde el archivo `android/signing.properties`. Este cambio resuelve problemas comunes con la lectura de credenciales en entornos CI/CD y garantiza una construcción más confiable.

Si necesitas construir manualmente con Gradle:
```bash
# Build de release (producción)
cd android && .\\gradlew.bat assembleRelease

# Build de debug (desarrollo)
cd android && .\\gradlew.bat assembleDebug
```

Asegúrate de que el archivo `android/signing.properties` esté correctamente configurado con tus credenciales de firma antes de ejecutar builds de release.

**Error:** `Could not find cordova.variables.gradle`

**Solución:**
1. Verificar que exista el archivo `android/capacitor-cordova-android-plugins/cordova.variables.gradle`
2. Si no existe, crearlo con el siguiente contenido mínimo:
```gradle
// android/capacitor-cordova-android-plugins/cordova.variables.gradle
ext {
    cdvMinSdkVersion = project.hasProperty('minSdkVersion') ? rootProject.ext.minSdkVersion : 22
    // Plugin gradle extensions can append to this to have code run at the end.
    cdvPluginPostBuildExtras = []
    cordovaConfig = [:]
}
```
3. Asegurar que el archivo sea referenciado correctamente en `android/app/capacitor.build.gradle`:
```gradle
apply from: "../capacitor-cordova-android-plugins/cordova.variables.gradle"
```
4. Ejecutar `npx cap sync` para sincronizar los cambios
5. Limpiar y reconstruir el proyecto:
```bash
cd android && ./gradlew clean && ./gradlew assembleDebug
```

**Nota:** Este archivo es generado automáticamente por Capacitor, pero en algunos casos puede ser necesario crearlo manualmente si se elimina o corrompe.

### Problemas de Permisos

**Error:** `Permission denied for camera`

**Solución:**
1. Verificar que los permisos estén configurados en `AndroidManifest.xml`
2. Verificar que los permisos estén configurados en `capacitor.config.json`
3. Reinstalar la aplicación en el dispositivo

### App no carga

**Error:** `Blank screen after launch`

**Solución:**
1. Verificar que el servidor de desarrollo esté corriendo
2. Verificar la configuración de `webDir` en `capacitor.config.json`
3. Ejecutar `npx cap sync` y reinstalar la app

### Problemas de Base de Datos

**Error:** `Database initialization failed`

**Solución:**
1. Verificar permisos de almacenamiento
2. Limpiar datos de la app y reiniciar
3. Verificar que SQLite esté correctamente configurado

## Configuración Avanzada

### Configuración de Análisis de Sentimientos

El archivo [`www/js/sentiment-analyzer.js`](www/js/sentiment-analyzer.js) contiene la configuración:

```javascript
this.config = {
    updateDelay: 800,          // Retraso para análisis automático (ms)
    minWords: 20,              // Mínimo de palabras para análisis
    confidenceThreshold: 0.3,  // Umbral de confianza
    intensifierWeight: 0.5,    // Peso de intensificadores
    negationWindow: 3,         // Ventana de negación
    smoothing: 0.01,           // Suavizado para Naive Bayes
    heuristicWeight: 0.7,      // Peso del análisis heurístico
    bayesWeight: 0.3           // Peso de Naive Bayes
};
```

### Configuración de Caching

```javascript
// En DatabaseManager
this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
this.maxCacheSize = 100;          // Máximo de entradas en caché
```

## Actualización de Dependencias

### Actualizar Dependencias

```bash
# Actualizar todas las dependencias
npm update

# Actualizar dependencias específicas
npm install @capacitor/core@latest @capacitor/cli@latest

# Verificar dependencias obsoletas
npm outdated

# Actualizar Capacitor
npx cap update
```

### Migración de Versiones

1. Verificar los cambios en el [CHANGELOG.md](CHANGELOG.md)
2. Actualizar dependencias
3. Ejecutar migraciones si es necesario
4. Probar completamente la aplicación

Esta guía proporciona toda la información necesaria para configurar, desarrollar y mantener la aplicación Daily Journal en diferentes entornos y plataformas.