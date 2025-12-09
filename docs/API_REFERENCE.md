# Referencia de API Interna - Daily Journal

## Tabla de Contenidos

- [Visión General](#visión-general)
- [API Global](#api-global)
- [DailyJournalApp](#dailyjournalapp)
- [DatabaseManager](#databasemanager)
- [JournalManager](#journalmanager)
- [UIManager](#uimanager)
- [NotificationService](#notificationservice)
- [SentimentAnalyzer](#sentimentanalyzer)
- [Eventos Personalizados](#eventos-personalizados)
- [Tipos de Datos](#tipos-de-datos)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Patrones de Uso](#patrones-de-uso)
- [Limitaciones y Advertencias](#limitaciones-y-advertencias)
- [API Deprecada](#api-deprecada)

## Visión General

Este documento proporciona una referencia completa de la API interna de la aplicación Daily Journal. Todas las APIs están disponibles globalmente a través del objeto `window` después de que la aplicación se inicializa.

## API Global

Después de la inicialización, los siguientes objetos están disponibles globalmente:

```javascript
// Objetos principales
window.app        // DailyJournalApp instance
window.db         // DatabaseManager instance
window.journal    // JournalManager instance
window.ui         // UIManager instance

// Funciones de utilidad
window.getSettings()
window.getSettingsAsync()
window.saveSettings()
```

## DailyJournalApp

**Ubicación:** [`www/js/app.js`](www/js/app.js)

### Propiedades

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isInitialized` | boolean | Indica si la app está inicializada |
| `hasActiveModal` | boolean | Indica si hay un modal activo |

### Métodos

#### `init()`
Inicializa la aplicación.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.app.init();
```

#### `destroy()`
Limpia recursos y destruye la aplicación.

**Ejemplo:**
```javascript
window.app.destroy();
```

#### `showMenu()`
Muestra el menú principal.

**Ejemplo:**
```javascript
window.app.showMenu();
```

#### `showStats()`
Muestra las estadísticas del diario.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.app.showStats();
```

#### `showSettings()`
Muestra la configuración de la aplicación.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.app.showSettings();
```

#### `showAbout()`
Muestra información sobre la aplicación.

**Ejemplo:**
```javascript
window.app.showAbout();
```

#### `showExportConfirmModal()`
Muestra el modal de confirmación para exportar datos.

**Ejemplo:**
```javascript
window.app.showExportConfirmModal();
```

## DatabaseManager

**Ubicación:** [`www/js/database.js`](www/js/database.js)

### Propiedades

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `isInitialized` | boolean | Indica si la base de datos está inicializada |
| `platform` | string | Plataforma actual ('android', 'ios', 'web') |

### Métodos

#### `init()`
Inicializa la base de datos.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.db.init();
```

#### `saveEntry(date, content, mood, photoPath, thumbnailPath, options)`
Guarda o actualiza una entrada de diario.

**Parameters:**
- `date` (string): Fecha en formato YYYY-MM-DD
- `content` (string): Contenido de la entrada
- `mood` (string|null): Estado de ánimo (emoji)
- `photoPath` (string|null): Ruta de la foto
- `thumbnailPath` (string|null): Ruta del thumbnail
- `options` (Object): Opciones adicionales
  - `tags` (Array): Etiquetas
  - `weather` (string): Clima
  - `location` (string): Ubicación
  - `isFavorite` (boolean): Si es favorito

**Returns:** `Promise<{success: boolean, error?: Error}>`

**Ejemplo:**
```javascript
const result = await window.db.saveEntry('2024-01-01', 'Mi primer día', '😊', null, null, {
    tags: ['personal', 'meta'],
    isFavorite: true
});
```

#### `getEntry(date)`
Obtiene una entrada por fecha.

**Parameters:**
- `date` (string): Fecha en formato YYYY-MM-DD

**Returns:** `Promise<Object|null>` - Objeto de entrada o null si no existe

**Ejemplo:**
```javascript
const entry = await window.db.getEntry('2024-01-01');
```

#### `getAllEntries(limit, offset)`
Obtiene todas las entradas con paginación.

**Parameters:**
- `limit` (number): Límite de resultados (default: 50)
- `offset` (number): Offset para paginación (default: 0)

**Returns:** `Promise<Array>` - Array de entradas

**Ejemplo:**
```javascript
const entries = await window.db.getAllEntries(10, 0);
```

#### `searchEntries(query, filters)`
Busca entradas por contenido.

**Parameters:**
- `query` (string): Término de búsqueda
- `filters` (Object): Filtros adicionales
  - `mood` (string): Filtrar por estado de ánimo
  - `isFavorite` (boolean): Filtrar favoritos
  - `dateFrom` (string): Fecha de inicio (YYYY-MM-DD)
  - `dateTo` (string): Fecha de fin (YYYY-MM-DD)

**Returns:** `Promise<Array>` - Array de resultados

**Ejemplo:**
```javascript
const results = await window.db.searchEntries('vacaciones', {
    mood: '😊',
    isFavorite: true
});
```

#### `deleteEntry(date)`
Elimina una entrada.

**Parameters:**
- `date` (string): Fecha de la entrada a eliminar

**Returns:** `Promise<{success: boolean, error?: Error}>`

**Ejemplo:**
```javascript
const result = await window.db.deleteEntry('2024-01-01');
```

#### `getStats()`
Obtiene estadísticas del diario.

**Returns:** `Promise<Object>` - Objeto con estadísticas
- `totalEntries` (number): Total de entradas
- `totalWords` (number): Total de palabras
- `currentStreak` (number): Rachas actual

**Ejemplo:**
```javascript
const stats = await window.db.getStats();
```

#### `getSetting(key, defaultValue)`
Obtiene una configuración.

**Parameters:**
- `key` (string): Clave de la configuración
- `defaultValue` (any): Valor por defecto

**Returns:** `Promise<*>`

**Ejemplo:**
```javascript
const darkMode = await window.db.getSetting('darkMode', 'false');
```

#### `setSetting(key, value)`
Establece una configuración.

**Parameters:**
- `key` (string): Clave de la configuración
- `value` (any): Valor a establecer

**Returns:** `Promise<{success: boolean, error?: Error}>`

**Ejemplo:**
```javascript
await window.db.setSetting('darkMode', 'true');
```

#### `exportData()`
Exporta todos los datos.

**Returns:** `Promise<Object>` - Objeto con datos exportados
- `entries` (Array): Todas las entradas
- `settings` (Object): Configuraciones
- `exportDate` (string): Fecha de exportación
- `version` (string): Versión del formato

**Ejemplo:**
```javascript
const exportData = await window.db.exportData();
```

#### `importData(data)`
Importa datos.

**Parameters:**
- `data` (Object): Datos a importar (formato de exportData)

**Returns:** `Promise<Object>` - Resultado de la importación
- `success` (boolean): Si fue exitoso
- `importedCount` (number): Número de entradas importadas
- `skippedCount` (number): Número de entradas omitidas
- `message` (string): Mensaje de resultado

**Ejemplo:**
```javascript
const result = await window.db.importData(exportData);
```

#### `clearCache()`
Limpia todos los caches.

**Ejemplo:**
```javascript
window.db.clearCache();
```

#### `close()`
Cierra la conexión de la base de datos.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.db.close();
```

## JournalManager

**Ubicación:** [`www/js/journal.js`](www/js/journal.js)

### Propiedades

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `currentMood` | string|null | Estado de ánimo actual |
| `currentPhoto` | string|null | Foto actual (data URL) |
| `currentThumbnail` | string|null | Thumbnail actual (data URL) |
| `hasUnsavedChanges` | boolean | Si hay cambios sin guardar |
| `isInitialized` | boolean | Si el gestor está inicializado |

### Métodos

#### `init()`
Inicializa el gestor de diario.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.init();
```

#### `saveEntry(silent)`
Guarda la entrada actual.

**Parameters:**
- `silent` (boolean): Si es true, no muestra notificaciones

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.saveEntry();
```

#### `loadEntryForDate(date)`
Carga una entrada por fecha.

**Parameters:**
- `date` (string): Fecha en formato YYYY-MM-DD

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.loadEntryForDate('2024-01-01');
```

#### `loadTodayEntry()`
Carga la entrada de hoy.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.loadTodayEntry();
```

#### `selectMood(mood)`
Selecciona un estado de ánimo.

**Parameters:**
- `mood` (string): Emoji del estado de ánimo

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.selectMood('😊');
```

#### `takePhoto()`
Abre el selector de fuente de foto (cámara/galería).

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.takePhoto();
```

#### `removePhoto()`
Elimina la foto actual.

**Ejemplo:**
```javascript
window.journal.removePhoto();
```

#### `shareEntry()`
Comparte la entrada actual.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.shareEntry();
```

#### `exportEntries()`
Exporta las entradas a un archivo.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.exportEntries();
```

#### `importEntries()`
Importa entradas desde un archivo.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.importEntries();
```

#### `deleteEntry(date)`
Elimina una entrada.

**Parameters:**
- `date` (string): Fecha de la entrada a eliminar

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.deleteEntry('2024-01-01');
```

#### `getWritingStats()`
Obtiene estadísticas de escritura.

**Returns:** `Promise<Object|null>` - Objeto con estadísticas

**Ejemplo:**
```javascript
const stats = await window.journal.getWritingStats();
```

#### `createThumbnail(dataUrl, size, quality)`
Crea un thumbnail a partir de una imagen.

**Parameters:**
- `dataUrl` (string): Data URL de la imagen
- `size` (number): Tamaño en píxeles (default: 200)
- `quality` (number): Calidad (0-1, default: 0.8)

**Returns:** `Promise<string>` - Data URL del thumbnail

**Ejemplo:**
```javascript
const thumbnail = await window.journal.createThumbnail(photoDataUrl);
```

#### `generateMissingThumbnails()`
Genera thumbnails faltantes para entradas existentes.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.generateMissingThumbnails();
```

#### `destroy()`
Limpia recursos del gestor de diario.

**Ejemplo:**
```javascript
window.journal.destroy();
```

## UIManager

**Ubicación:** [`www/js/ui.js`](www/js/ui.js)

### Métodos

#### `init()`
Inicializa la interfaz de usuario.

**Ejemplo:**
```javascript
window.ui.init();
```

#### `setupCalendarNavigation()`
Configura la navegación del calendario.

**Ejemplo:**
```javascript
window.ui.setupCalendarNavigation();
```

#### `setupSearch()`
Configura la funcionalidad de búsqueda.

**Ejemplo:**
```javascript
window.ui.setupSearch();
```

#### `setupDarkMode()`
Configura el modo oscuro.

**Ejemplo:**
```javascript
window.ui.setupDarkMode();
```

#### `loadDarkModePreference()`
Carga la preferencia de modo oscuro.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.ui.loadDarkModePreference();
```

#### `showToast(message, type, duration)`
Muestra una notificación toast.

**Parameters:**
- `message` (string): Mensaje a mostrar
- `type` (string): Tipo de toast ('success', 'info', 'warning', 'error')
- `duration` (number): Duración en ms (default: 3000)

**Ejemplo:**
```javascript
window.ui.showToast('Entrada guardada', 'success');
```

#### `showLoading()`
Muestra el indicador de carga.

**Ejemplo:**
```javascript
window.ui.showLoading();
```

#### `hideLoading()`
Oculta el indicador de carga.

**Ejemplo:**
```javascript
window.ui.hideLoading();
```

#### `showError(message)`
Muestra un error.

**Parameters:**
- `message` (string): Mensaje de error

**Ejemplo:**
```javascript
window.ui.showError('Error al guardar');
```

#### `formatDate(date, format)`
Formatea una fecha.

**Parameters:**
- `date` (Date|string): Fecha a formatear
- `format` (string): Formato ('short', 'long', 'iso')

**Returns:** `string` - Fecha formateada

**Ejemplo:**
```javascript
const formatted = window.ui.formatDate(new Date(), 'short');
```

#### `formatDateForStorage(date)`
Formatea una fecha para almacenamiento (YYYY-MM-DD).

**Parameters:**
- `date` (Date): Fecha a formatear

**Returns:** `string`

**Ejemplo:**
```javascript
const dateStr = window.ui.formatDateForStorage(new Date());
```

## NotificationService

**Ubicación:** [`www/js/services/notification-service.js`](www/js/services/notification-service.js)

### Métodos

#### `init()`
Inicializa el servicio de notificaciones.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.notificationService.init();
```

#### `scheduleNotifications()`
Programa las notificaciones diarias.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.notificationService.scheduleNotifications();
```

#### `toggleNotifications(enabled)`
Activa o desactiva las notificaciones.

**Parameters:**
- `enabled` (boolean): true para activar, false para desactivar

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.notificationService.toggleNotifications(true);
```

#### `setNotificationTime(time)`
Configura la hora de las notificaciones.

**Parameters:**
- `time` (string): Hora en formato HH:MM

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.notificationService.setNotificationTime('20:00');
```

#### `getNotificationTime()`
Obtiene la hora de las notificaciones.

**Returns:** `Promise<string>` - Hora en formato HH:MM

**Ejemplo:**
```javascript
const time = await window.journal.notificationService.getNotificationTime();
```

#### `getNotificationsEnabled()`
Obtiene el estado de las notificaciones.

**Returns:** `Promise<string>` - 'true' o 'false'

**Ejemplo:**
```javascript
const enabled = await window.journal.notificationService.getNotificationsEnabled();
```

#### `cancelAllNotifications()`
Cancela todas las notificaciones.

**Returns:** `Promise<void>`

**Ejemplo:**
```javascript
await window.journal.notificationService.cancelAllNotifications();
```

#### `getPendingNotifications()`
Obtiene las notificaciones pendientes.

**Returns:** `Promise<Array>` - Array de notificaciones pendientes

**Ejemplo:**
```javascript
const notifications = await window.journal.notificationService.getPendingNotifications();
```

## SentimentAnalyzer

**Ubicación:** [`www/js/sentiment-analyzer.js`](www/js/sentiment-analyzer.js)

### Métodos

#### `analyze(text)`
Analiza el sentimiento de un texto.

**Parameters:**
- `text` (string): Texto a analizar

**Returns:** `Object` - Resultado del análisis
- `mood` (string): Emoji del estado de ánimo
- `sentiment` (string): Emoji del sentimiento
- `score` (number): Puntuación de sentimiento (-1 a 1)
- `confidence` (number): Confianza en el resultado (0-1)
- `wordCount` (number): Número de palabras
- `emotions` (Object): Emociones detectadas
- `details` (Object): Detalles del análisis

**Ejemplo:**
```javascript
const analysis = window.journal.sentimentAnalyzer.analyze('¡Hoy fue un día maravilloso!');
```

#### `getMood(text)`
Obtiene el estado de ánimo de un texto.

**Parameters:**
- `text` (string): Texto a analizar

**Returns:** `string` - Emoji del estado de ánimo

**Ejemplo:**
```javascript
const mood = window.journal.sentimentAnalyzer.getMood('Estoy muy feliz hoy');
```

#### `detectEmotions(text)`
Detecta emociones en un texto.

**Parameters:**
- `text` (string): Texto a analizar

**Returns:** `Object` - Emociones detectadas con intensidades

**Ejemplo:**
```javascript
const emotions = window.journal.sentimentAnalyzer.detectEmotions('Me siento muy emocionado');
```

#### `clearCache()`
Limpia el caché de análisis.

**Ejemplo:**
```javascript
window.journal.sentimentAnalyzer.clearCache();
```

## Eventos Personalizados

La aplicación emite varios eventos personalizados:

| Evento | Descripción | Detalles |
|--------|-------------|----------|
| `entrySaved` | Se guarda una entrada | `{ date, content, mood }` |
| `entryLoaded` | Se carga una entrada | `{ date, entry }` |
| `entryDeleted` | Se elimina una entrada | `{ deletedDate }` |
| `calendarNeedsRefresh` | El calendario necesita actualizarse | - |
| `searchResults` | Resultados de búsqueda disponibles | `{ query, results }` |
| `settingsChanged` | Configuración cambiada | `{ key, value }` |
| `themeChanged` | Tema cambiado | `{ darkMode: boolean }` |

**Ejemplo de uso:**
```javascript
// Suscribirse a eventos
document.addEventListener('entrySaved', (event) => {
    console.log('Entrada guardada:', event.detail);
});

// Emitir eventos
document.dispatchEvent(new CustomEvent('calendarNeedsRefresh'));
```

## Tipos de Datos

### Entry Object

```typescript
interface Entry {
    date: string;            // YYYY-MM-DD
    content: string;         // Contenido de la entrada
    mood?: string;           // Emoji del estado de ánimo
    photo_path?: string;     // Ruta de la foto
    thumbnail_path?: string; // Ruta del thumbnail
    word_count: number;      // Conteo de palabras
    created_at?: string;     // Fecha de creación (ISO)
    updated_at?: string;     // Fecha de actualización (ISO)
    tags?: string[];         // Etiquetas
    weather?: string;        // Clima
    location?: string;       // Ubicación
    is_favorite?: boolean;   // Si es favorito
}
```

### Stats Object

```typescript
interface Stats {
    totalEntries: number;    // Total de entradas
    totalWords: number;      // Total de palabras
    currentStreak: number;   // Rachas actual
    averageWordsPerEntry: number; // Promedio de palabras por entrada
}
```

### Analysis Result

```typescript
interface AnalysisResult {
    mood: string;            // Emoji del estado de ánimo
    sentiment: string;       // Emoji del sentimiento
    score: number;           // Puntuación (-1 a 1)
    confidence: number;      // Confianza (0-1)
    wordCount: number;       // Número de palabras
    emotions: {              // Emociones detectadas
        joy?: number;
        sadness?: number;
        anger?: number;
        fear?: number;
        surprise?: number;
        love?: number;
    };
    details: {               // Detalles técnicos
        heuristicScore: number;
        bayesScore: number;
        bayesProbs: {
            positive: number;
            negative: number;
            neutral: number;
        };
    };
}
```

## Ejemplos de Uso

### Ejemplo Completo de Uso

```javascript
// Inicializar la aplicación
await window.app.init();

// Cargar entrada de hoy
await window.journal.loadTodayEntry();

// Establecer estado de ánimo
await window.journal.selectMood('😊');

// Guardar entrada
await window.journal.saveEntry();

// Obtener estadísticas
const stats = await window.journal.getWritingStats();
console.log('Estadísticas:', stats);

// Exportar datos
await window.journal.exportEntries();

// Suscribirse a eventos
document.addEventListener('entrySaved', (event) => {
    console.log('Entrada guardada:', event.detail);
    window.ui.showToast('Entrada guardada correctamente', 'success');
});
```

### Ejemplo de Búsqueda

```javascript
// Buscar entradas
const results = await window.db.searchEntries('vacaciones', {
    mood: '😊',
    isFavorite: true,
    dateFrom: '2024-01-01',
    dateTo: '2024-12-31'
});

console.log('Resultados:', results);

// Mostrar resultados en UI
results.forEach(entry => {
    console.log(`[${entry.date}] ${entry.content.substring(0, 50)}...`);
});
```

### Ejemplo de Análisis de Sentimientos

```javascript
// Analizar texto
const text = 'Hoy tuve un día maravilloso. Todo salió según lo planeado y me siento muy feliz.';
const analysis = window.journal.sentimentAnalyzer.analyze(text);

console.log('Análisis:', {
    mood: analysis.mood,
    score: analysis.score,
    confidence: analysis.confidence,
    emotions: analysis.emotions
});

// Usar el resultado para establecer estado de ánimo automáticamente
if (analysis.confidence > 0.5) {
    await window.journal.selectMood(analysis.mood);
}
```

## Patrones de Uso

### Patrones Recomendados

1. **Inicialización primero**: Siempre esperar a que la app esté inicializada
   ```javascript
   await window.app.init();
   ```

2. **Manejo de errores**: Usar try/catch para operaciones asíncronas
   ```javascript
   try {
       await window.journal.saveEntry();
   } catch (error) {
       window.ui.showError('Error al guardar');
   }
   ```

3. **Event-driven**: Usar eventos para comunicación entre componentes
   ```javascript
   document.addEventListener('entrySaved', handleEntrySaved);
   ```

4. **Limpieza de recursos**: Llamar a métodos destroy cuando sea necesario
   ```javascript
   window.journal.destroy();
   ```

### Anti-Patrones

1. **Acceso directo a DOM**: Evitar manipulación directa del DOM
   ```javascript
   // Mal
   document.getElementById('save-btn').addEventListener(...);

   // Bien - usar métodos de UIManager
   window.ui.setupEventListeners();
   ```

2. **Estado global excesivo**: Minimizar el uso de variables globales

3. **Operaciones síncronas largas**: Evitar bloquear el hilo principal

4. **Caching manual**: Usar los mecanismos de caching integrados

## Limitaciones y Advertencias

### Limitaciones Conocidas

1. **Tamaño de entrada**: Máximo 5000 caracteres por entrada
2. **Tamaño de foto**: Las fotos se comprimen automáticamente
3. **Almacenamiento**: Limitado por el almacenamiento del dispositivo
4. **Soporte offline**: Completo para funcionalidad básica, limitado para sincronización

### Advertencias

1. **Seguridad**: Todos los datos son locales - no hay backup automático en la nube
2. **Rendimiento**: El rendimiento puede degradarse con miles de entradas
3. **Compatibilidad**: Algunas funcionalidades pueden no estar disponibles en todos los navegadores
4. **Actualizaciones**: Las actualizaciones de la app pueden requerir migraciones de datos

## API Deprecada

Las siguientes APIs están deprecadas y no deben usarse:

| API | Reemplazo | Versión de Deprecación |
|-----|-----------|-----------------------|
| `journal.importEntriesFromFile(file)` | `journal.importEntries()` | 1.1.0 |
| `db.getAllEntriesSync()` | `db.getAllEntries()` | 1.0.5 |
| `ui.showModal()` | `app.showMenu()`, `app.showStats()`, etc. | 1.0.3 |

**Ejemplo de migración:**
```javascript
// Antes (deprecado)
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.addEventListener('change', (e) => {
    window.journal.importEntriesFromFile(e.target.files[0]);
});

// Después (recomendado)
await window.journal.importEntries();
```

Esta referencia de API proporciona una guía completa para interactuar con todos los componentes internos de la aplicación Daily Journal, permitiendo a los desarrolladores extender la funcionalidad y personalizar el comportamiento según sea necesario.