# Flujos de Datos - Daily Journal

## Tabla de Contenidos

- [Flujos de Datos - Daily Journal](#flujos-de-datos---daily-journal)
  - [Tabla de Contenidos](#tabla-de-contenidos)
  - [Visión General](#visión-general)
  - [Flujo de Datos Principal](#flujo-de-datos-principal)
  - [Flujo de Inicialización](#flujo-de-inicialización)
  - [Flujo de Guardado de Entrada](#flujo-de-guardado-de-entrada)
  - [Flujo de Carga de Entrada](#flujo-de-carga-de-entrada)
  - [Flujo de Análisis de Sentimientos](#flujo-de-análisis-de-sentimientos)
  - [Flujo de Notificaciones](#flujo-de-notificaciones)
  - [Flujo de Exportación/Importación](#flujo-de-exportaciónimportación)
  - [Flujo de Búsqueda](#flujo-de-búsqueda)
  - [Flujo de Gestión de Fotos](#flujo-de-gestión-de-fotos)
  - [Flujo de Configuración](#flujo-de-configuración)
  - [Flujo de Estadísticas](#flujo-de-estadísticas)
  - [Diagramas Mermaid](#diagramas-mermaid)
    - [Diagrama de Flujo de Datos Completo](#diagrama-de-flujo-de-datos-completo)
    - [Diagrama de Secuencia de Inicialización](#diagrama-de-secuencia-de-inicialización)
  - [Patrones de Flujo de Datos](#patrones-de-flujo-de-datos)
  - [Optimizaciones de Flujo](#optimizaciones-de-flujo)
  - [Manejo de Errores en Flujos](#manejo-de-errores-en-flujos)

## Visión General

Este documento describe los principales flujos de datos dentro de la aplicación Daily Journal, mostrando cómo la información circula entre los diferentes componentes y módulos del sistema.

## Flujo de Datos Principal

```mermaid
flowchart TD
    A[Usuario] -->|Interacción| B[UI Manager]
    B -->|Evento| C[Journal Manager]
    C -->|Datos| D[Database Manager]
    D -->|Persistencia| E[SQLite/localStorage]
    E -->|Resultado| D
    D -->|Datos| C
    C -->|Resultado| B
    B -->|Feedback| A

    C -->|Análisis| F[Sentiment Analyzer]
    F -->|Resultado| C

    C -->|Notificación| G[Notification Service]
    G -->|Evento| B
```

## Flujo de Inicialización

```mermaid
sequenceDiagram
    participant User
    participant App
    participant UI
    participant Journal
    participant DB
    participant Notifications
    participant Sentiment

    User->>App: Abre aplicación
    App->>App: validateEnvironment()
    App->>UI: init()
    App->>DB: init()
    DB->>DB: checkConnectionsConsistency()
    DB->>DB: createTables()
    DB->>DB: runMigrations()
    DB-->>App: Initialized
    App->>Journal: init()
    Journal->>Sentiment: init()
    Sentiment-->>Journal: Ready
    Journal->>Notifications: init()
    Notifications->>Notifications: requestPermissions()
    Notifications->>Notifications: scheduleNotifications()
    Notifications-->>Journal: Ready
    Journal-->>App: Initialized
    App->>UI: setupUI()
    UI->>UI: setupCalendar()
    UI->>UI: setupSearch()
    UI->>UI: setupDarkMode()
    UI->>UI: setupEventListeners()
    UI-->>App: Ready
    App->>App: hideLoading()
    App->>User: App lista para usar
```

## Flujo de Guardado de Entrada

```mermaid
flowchart TD
    subgraph Usuario
        A[Escribe contenido] --> B[Selecciona estado de ánimo]
        B --> C[Toma foto opcional]
    end

    subgraph JournalManager
        C --> D[updateWordCount]
        D --> E[markUnsaved]
        E --> F[scheduleAutoSave]
        F --> G[saveEntry]
        G --> H[validateContent]
        H --> I[triggerHapticFeedback]
        I --> J[DatabaseManager.saveEntry]
    end

    subgraph DatabaseManager
        J --> K[validateDate]
        K --> L[countWords]
        L --> M[saveSQLiteEntry]
        M --> N[executeSQL]
        N --> O[clearCache]
    end

    subgraph SQLite
        O --> P[INSERT/UPDATE entries]
        P --> Q[Transaction]
        Q --> R[Commit]
    end

    R --> O
    O --> M
    M --> J
    J --> G

    G --> S[showToast]
    S --> T[markSaved]
    T --> U[dispatchEvent]

    subgraph UI
        U --> V[Actualizar UI]
        V --> W[Actualizar calendario]
        W --> X[Mostrar confirmación]
    end

    X --> Usuario
```

## Flujo de Carga de Entrada

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Journal
    participant DB
    participant SQLite

    User->>UI: Selecciona fecha
    UI->>Journal: loadEntryForDate(date)
    Journal->>DB: getEntry(date)
    DB->>DB: getCachedEntry(date)
    alt Cache hit
        DB->>DB: return cached entry
    else Cache miss
        DB->>SQLite: SELECT * FROM entries WHERE date = ?
        SQLite-->>DB: Entry data
        DB->>DB: parseJSONFields
        DB->>DB: setCachedEntry
    end
    DB-->>Journal: Entry object
    Journal->>Journal: loadEntryData(entry)
    Journal->>Journal: updateWordCount
    Journal->>Journal: markSaved
    Journal->>UI: dispatchEvent('entryLoaded')
    UI->>UI: renderEntry
    UI->>UI: updateCalendar
    UI->>User: Muestra entrada
```

## Flujo de Análisis de Sentimientos

```mermaid
flowchart TD
    subgraph JournalManager
        A[Usuario escribe] --> B[scheduleAutoMoodDetection]
        B --> C[debounce 800ms]
        C --> D[detectAndSetMood]
    end

    subgraph SentimentAnalyzer
        D --> E[preprocessText]
        E --> F[tokenize]
        F --> G[findNegatedWords]
        G --> H[scoreHeuristic]
        H --> I[predictNaiveBayes]
        I --> J[detectEmotions]
        J --> K[calculateConfidence]
        K --> L[scoreToEmoji]
    end

    L --> D
    D --> M[setAutoDetectedMood]
    M --> N[showAutoMoodIndicator]
    N --> O[triggerHapticFeedback]

    subgraph UI
        O --> P[Actualizar botón de estado de ánimo]
        P --> Q[Mostrar indicador ✨]
        Q --> R[Actualizar UI]
    end

    R --> Usuario
```

## Flujo de Notificaciones

```mermaid
sequenceDiagram
    participant User
    participant App
    participant NotificationService
    participant DB
    participant LocalNotifications

    App->>NotificationService: init()
    NotificationService->>LocalNotifications: requestPermissions()
    LocalNotifications-->>NotificationService: Permissions granted
    NotificationService->>DB: getNotificationTime()
    DB-->>NotificationService: '20:00'
    NotificationService->>DB: getNotificationsEnabled()
    DB-->>NotificationService: 'true'
    NotificationService->>NotificationService: getRandomPhrase()
    NotificationService->>LocalNotifications: schedule({hour:20, minute:0})
    LocalNotifications-->>NotificationService: Scheduled

    alt Notification Time
        LocalNotifications->>User: Muestra notificación
        User->>LocalNotifications: Clic en notificación
        LocalNotifications->>App: Abrir aplicación
        App->>App: loadTodayEntry()
    end
```

## Flujo de Exportación/Importación

```mermaid
flowchart TD
    subgraph Exportación
        A[Usuario solicita exportar] --> B[showExportConfirmModal]
        B --> C[confirmExport]
        C --> D[exportEntries]
        D --> E[showLoading]
        E --> F[db.exportData]
        F --> G[getAllEntries]
        G --> H[getAllSettings]
        H --> I[createExportObject]
        I --> J[Filesystem.pickDirectory]
        J --> K[Filesystem.writeFile]
        K --> L[showSuccessToast]
        L --> M[hideLoading]
    end

    subgraph Importación
        N[Usuario solicita importar] --> O[showImportModal]
        O --> P[Filesystem.pickFiles]
        P --> Q[validateImportFile]
        Q --> R[processImportData]
        R --> S[db.importData]
        S --> T[validateImportData]
        T --> U[importEntries]
        U --> V[importSettings]
        V --> W[clearCache]
        W --> X[showSuccessToast]
        X --> Y[loadTodayEntry]
    end
```

## Flujo de Búsqueda

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Journal
    participant DB
    participant SQLite

    User->>UI: Escribe query de búsqueda
    UI->>UI: debounce 300ms
    UI->>Journal: searchEntries(query)
    Journal->>DB: searchEntries(query, filters)
    DB->>DB: getCachedResults(query)
    alt Cache hit
        DB->>DB: return cached results
    else Cache miss
        DB->>SQLite: SELECT * FROM entries WHERE content LIKE ?
        SQLite-->>DB: Results
        DB->>DB: processEntriesResult
        DB->>DB: setCachedResults
    end
    DB-->>Journal: Search results
    Journal->>UI: dispatchEvent('searchResults')
    UI->>UI: renderSearchResults
    UI->>User: Muestra resultados
```

## Flujo de Gestión de Fotos

```mermaid
flowchart TD
    subgraph Captura
        A[Usuario clic en cámara] --> B[showPhotoSourceModal]
        B --> C[Selecciona fuente]
        C --> D[Camera.getPhoto]
        D --> E[processPhotoData]
        E --> F[validatePhoto]
        F --> G[storePhotoData]
    end

    subgraph Procesamiento
        G --> H[createThumbnail]
        H --> I[generateThumbnail]
        I --> J[storeThumbnail]
        J --> K[displayPhoto]
        K --> L[updateUI]
    end

    subgraph Compartir
        M[Usuario clic en compartir] --> N[processPhotoForSharing]
        N --> O[createTempFile]
        O --> P[Filesystem.writeFile]
        P --> Q[Share.share]
        Q --> R[schedulePhotoCleanup]
    end

    subgraph Eliminación
        S[Usuario clic en eliminar] --> T[removePhoto]
        T --> U[clearPhotoData]
        U --> V[updateUIAfterRemoval]
    end
```

## Flujo de Configuración

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Settings
    participant DB

    User->>UI: Abre configuraciones
    UI->>Settings: showSettingsModal()
    Settings->>DB: getSetting('darkMode')
    DB-->>Settings: currentValue
    Settings->>DB: getSetting('notificationsEnabled')
    DB-->>Settings: currentValue
    Settings->>DB: getSetting('notificationTime')
    DB-->>Settings: currentValue
    Settings->>UI: renderSettingsForm
    UI->>User: Muestra formulario

    User->>UI: Cambia configuración
    UI->>Settings: saveSetting(key, value)
    Settings->>DB: setSetting(key, value)
    DB->>DB: INSERT OR REPLACE INTO settings
    DB-->>Settings: success
    Settings->>UI: showToast('Configuración guardada')
    alt notificationsEnabled changed
        Settings->>NotificationService: toggleNotifications(value)
    end
    alt notificationTime changed
        Settings->>NotificationService: setNotificationTime(value)
    end
```

## Flujo de Estadísticas

```mermaid
flowchart TD
    A[Usuario solicita estadísticas (showStats)] --> B(Controller: showStats)

    subgraph Service Layer (Lógica de Negocio)
        B --> C[Service: getWritingStats]
        C --> D[Service: calculateCurrentStreak]
        D --> E[Repo: getEntryDates]
        E --> F(DB: SELECT date FROM entries ORDER BY date DESC)
        F --> D
    end

    subgraph Repository Layer (Acceso a Datos)
        C --> G[Repo: getAggregatedStats]
        G --> H(DB: SELECT COUNT(*) AS totalEntries, SUM(word_count) AS totalWords FROM entries)
    end

    H --> I[totalEntries, totalWords]
    D --> J[currentStreak]

    I --> K[Service: calculateAverage]
    K --> L[avgWordsPerEntry]

    J --> M[Service: createStatsObject]
    L --> M

    M --> N[statsObject]
    N --> O(Controller: generateStatsView)
    O --> P[showStatsModal]
    P --> Q[renderStats]
    Q --> R[Usuario ve estadísticas]
```

## Diagramas Mermaid

### Diagrama de Flujo de Datos Completo

```mermaid
graph TD
    subgraph Capa de Presentación
        UI[UI Manager] -->|Eventos| Journal[Journal Manager]
        UI -->|Consultas| DB[Database Manager]
        UI -->|Notificaciones| Notifications[Notification Service]
    end

    subgraph Capa de Negocio
        Journal -->|Análisis| Sentiment[Sentiment Analyzer]
        Journal -->|Persistencia| DB
        Journal -->|Fotos| Camera[Camera Service]
        Journal -->|Compartir| Share[Share Service]
    end

    subgraph Capa de Datos
        DB -->|SQLite| NativeDB[SQLite Native]
        DB -->|Fallback| WebStorage[localStorage]
        DB -->|Cache| MemoryCache[Memory Cache]
    end

    subgraph Servicios Nativos
        Camera -->|Capacitor| NativeCamera[Camera Plugin]
        Share -->|Capacitor| NativeShare[Share Plugin]
        Notifications -->|Capacitor| NativeNotifications[Local Notifications]
    end

    UI -->|Feedback| Usuario
    Usuario -->|Interacción| UI
```

### Diagrama de Secuencia de Inicialización

```mermaid
sequenceDiagram
    participant IndexHTML
    participant AppJS
    participant UI
    participant DB
    participant Journal
    participant Notifications
    participant Sentiment

    IndexHTML->>AppJS: DOMContentLoaded
    AppJS->>AppJS: new DailyJournalApp()
    AppJS->>AppJS: validateEnvironment()
    AppJS->>UI: init()
    UI->>UI: setupElements()
    UI->>UI: setupEventListeners()
    AppJS->>DB: init()
    DB->>DB: checkPlatform()
    alt Native Platform
        DB->>DB: initSQLite()
        DB->>DB: createConnection()
        DB->>DB: createTables()
    else Web Platform
        DB->>DB: initWebStorage()
    end
    DB->>DB: runMigrations()
    AppJS->>Journal: init()
    Journal->>Sentiment: new SentimentAnalyzer()
    Journal->>Notifications: new NotificationService()
    AppJS->>Notifications: init()
    Notifications->>Notifications: requestPermissions()
    AppJS->>AppJS: setupUI()
    AppJS->>AppJS: finalizeInitialization()
    AppJS->>AppJS: hideLoading()
```

## Patrones de Flujo de Datos

1. **Flujo Unidireccional**: La mayoría de los flujos siguen un patrón unidireccional claro
2. **Event-driven**: Muchos flujos son desencadenados por eventos de usuario
3. **Asincronía**: Operaciones de E/S son asíncronas con callbacks/promises
4. **Caching**: Datos frecuentemente accedidos son cacheados
5. **Fallback**: Múltiples estrategias de fallback para operaciones críticas
6. **Validación**: Validación en múltiples puntos del flujo
7. **Feedback**: Feedback constante al usuario

## Optimizaciones de Flujo

1. **Debouncing**: Para operaciones frecuentes (búsqueda, guardado automático)
2. **Caching**: En múltiples niveles (memoria, localStorage)
3. **Lazy Loading**: Carga diferida de componentes pesados
4. **Batch Operations**: Para operaciones de base de datos
5. **Compresión**: De imágenes y datos
6. **Virtualization**: Para listas grandes
7. **Prefetching**: De datos probablemente necesarios

## Manejo de Errores en Flujos

Cada flujo principal incluye manejo de errores en múltiples puntos:

1. **Validación de entrada**: Antes de procesar datos
2. **Fallback automático**: Cuando una operación falla
3. **Notificación al usuario**: Con mensajes claros
4. **Logging**: Para debugging y análisis
5. **Recuperación**: Intentos de reintento cuando es apropiado
6. **Estado consistente**: Mantener la UI en estado válido

**Ejemplo de manejo de errores en guardado:**
```javascript
try {
    const result = await db.saveEntry(date, content, mood, photo);
    if (!result.success) {
        throw new Error(result.error || 'Unknown error');
    }
    showToast('Guardado exitoso', 'success');
} catch (error) {
    console.error('Save error:', error);
    showToast('Error al guardar', 'error');

    // Fallback: guardar en localStorage
    try {
        localStorage.setItem('backup_entry', JSON.stringify({date, content, mood}));
        showToast('Guardado en backup local', 'warning');
    } catch (backupError) {
        showToast('No se pudo guardar', 'error');
    }
}
```

Este documento proporciona una visión completa de cómo los datos fluyen a través de la aplicación Daily Journal, desde la interacción del usuario hasta la persistencia y viceversa, con diagramas detallados que ilustran cada proceso clave.
