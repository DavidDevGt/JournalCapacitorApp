# Daily Journal - Aplicación de Diario Personal Minimalista

Una aplicación móvil minimalista de diario personal construida con **Capacitor**, **Tailwind CSS** y **JavaScript vanilla**, con una estética elegante tipo Notion y funcionalidades nativas.

## ✨ Características

### 🏗️ Arquitectura y Tecnologías
- **Framework**: Capacitor para desarrollo multiplataforma
- **Frontend**: JavaScript vanilla (sin frameworks pesados)
- **Styling**: Tailwind CSS con diseño responsive
- **Base de datos**: SQLite (con fallback a localStorage)
- **Desarrollo**: Configuración minimalista con máximo rendimiento

### 📝 Funcionalidades del Diario
- ✅ **Entradas diarias** - Escribir y guardar entradas de diario
- 😊 **Seguimiento de estado de ánimo** - 5 opciones de emoji
- 📷 **Una foto por entrada** - Captura o selecciona fotos
- 📅 **Vista de calendario mensual** - Visualiza entradas por fecha
- 🔍 **Búsqueda de texto** - Encuentra entradas específicas
- 🔔 **Recordatorios diarios** - Notificaciones personalizables
- 🌙 **Modo oscuro** - Alternar entre temas claro y oscuro

### 📱 Funcionalidades Nativas
- 📸 **Cámara nativa** - Captura de fotos optimizada
- 🔔 **Notificaciones locales** - Recordatorios programables
- 📳 **Feedback háptico** - Vibración en interacciones
- 🌐 **Funcionamiento offline** - Trabaja sin conexión
- 📤 **Compartir entradas** - Comparte a través de otras apps
- 💾 **Backup/Restore** - Exporta e importa tus datos

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Android Studio (para desarrollo Android)
- Xcode (para desarrollo iOS, solo macOS)

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd JournalCapacitorApp
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Sincronizar con Capacitor**
   ```bash
   npm run sync
   ```

4. **Desarrollo en navegador**
   ```bash
   # Abrir en navegador para testing
   npx serve www
   ```

5. **Desarrollo móvil**
   ```bash
   # Android
   npm run open:android
   
   # iOS (solo macOS)
   npm run open:ios
   ```

### Scripts Disponibles

```bash
# Desarrollo con live reload
npm run dev

# Sincronizar archivos web con plataformas nativas
npm run sync

# Construir para producción
npm run build

# Abrir proyectos nativos
npm run open:android
npm run open:ios

# Construir aplicaciones nativas
npm run build:android
npm run build:ios
```

## 📁 Estructura del Proyecto

```
JournalCapacitorApp/
├── capacitor.config.json      # Configuración de Capacitor
├── package.json               # Dependencias y scripts
├── tailwind.config.js         # Configuración de Tailwind
├── postcss.config.js          # Configuración de PostCSS
└── www/                       # Aplicación web
    ├── index.html            # Página principal
    ├── css/
    │   └── styles.css        # Estilos personalizados
    └── js/
        ├── app.js            # Inicialización principal
        ├── database.js       # Gestión de base de datos
        ├── ui.js             # Componentes UI
        └── journal.js        # Lógica del diario
```

## 🎨 Diseño y UX

### Filosofía de Diseño
- **Minimalismo**: Interfaz limpia sin distracciones
- **Tipo Notion**: Estética elegante y profesional
- **Mobile-first**: Optimizado para dispositivos móviles
- **Accesibilidad**: Cumple estándares de accesibilidad web

### Paleta de Colores
```css
/* Modo Claro */
--notion-bg: #ffffff
--notion-text: #37352f
--notion-gray: #9b9a97
--notion-border: #e9e9e7

/* Modo Oscuro */
--notion-bg-dark: #191919
--notion-text-dark: #ffffff
--notion-gray-dark: #6f6f6f
--notion-border-dark: #373737
```

### Tipografía
- **Fuente principal**: Inter (Google Fonts)
- **Pesos**: 300, 400, 500, 600, 700
- **Tamaños**: Sistema escalable y responsive

## 🔧 Configuración Avanzada

### Base de Datos
La aplicación utiliza **SQLite** en dispositivos nativos y **localStorage** como fallback en web:

```javascript
// Configuración automática
if (Capacitor.isNativePlatform()) {
    // Usa SQLite nativo
} else {
    // Fallback a localStorage
}
```

### Notificaciones
Las notificaciones se configuran automáticamente:

```javascript
// Programar recordatorio diario
LocalNotifications.schedule({
    notifications: [{
        id: 1,
        title: 'Daily Journal',
        body: '¿Cómo fue tu día? Es hora de escribir 📖',
        schedule: {
            on: { hour: 20, minute: 0 },
            repeats: true
        }
    }]
});
```

### Personalización de Tema
El tema se puede personalizar modificando `tailwind.config.js`:

```javascript
theme: {
    extend: {
        colors: {
            notion: {
                // Tus colores personalizados
            }
        }
    }
}
```

## 📱 Plugins de Capacitor Utilizados

### Plugins Oficiales
- `@capacitor/camera` - Captura de fotos
- `@capacitor/local-notifications` - Notificaciones locales
- `@capacitor/preferences` - Almacenamiento de configuraciones
- `@capacitor/haptics` - Feedback háptico
- `@capacitor/status-bar` - Control de la barra de estado
- `@capacitor/keyboard` - Gestión del teclado
- `@capacitor/share` - Compartir contenido
- `@capacitor/device` - Información del dispositivo
- `@capacitor/toast` - Mensajes toast
- `@capacitor/app` - Control de la aplicación

### Plugins de Comunidad
- `@capacitor-community/sqlite` - Base de datos SQLite

## 📊 Funcionalidades Detalladas

### 📝 Sistema de Entradas
- **Auto-guardado**: Guarda automáticamente cada 5 segundos
- **Contador de palabras**: Seguimiento en tiempo real
- **Markdown simple**: Soporte básico de formato
- **Fechas flexibles**: Navega y edita entradas de cualquier día

### 😊 Seguimiento de Estado de Ánimo
- **5 emojis**: 😢 😐 🙂 😊 😄
- **Indicadores visuales**: En calendario y lista de entradas
- **Estadísticas**: Análisis de patrones de humor

### 📸 Sistema de Fotos
- **Una foto por día**: Máximo una foto por entrada
- **Compresión automática**: Optimiza el tamaño de archivo
- **Galería integrada**: Visualiza fotos en calendario

### 📅 Vista de Calendario
- **Navegación mensual**: Botones anterior/siguiente
- **Indicadores**: Días con entradas marcados
- **Colores por estado**: Refleja el humor del día
- **Navegación rápida**: Toca un día para editarlo

### 🔍 Búsqueda
- **Búsqueda en tiempo real**: Resultados mientras escribes
- **Búsqueda completa**: Busca en todo el contenido
- **Filtros inteligentes**: Encuentra entradas relevantes

### 📊 Estadísticas
- **Total de entradas**: Contador global
- **Palabras escritas**: Suma total de palabras
- **Racha actual**: Días consecutivos escribiendo
- **Promedio por entrada**: Palabras promedio

## 🔒 Privacidad y Seguridad

### Almacenamiento Local
- **Sin servidor**: Todos los datos se almacenan localmente
- **Sin seguimiento**: No se recopilan datos del usuario
- **Backup manual**: Control total sobre tus datos

### Exportación de Datos
```javascript
// Exportar todas las entradas
const backupData = await db.exportData();

// Importar desde backup
await db.importData(backupData);
```

## 🚀 Construcción para Producción

### Android
1. **Construir la aplicación web**
   ```bash
   npm run build
   ```

2. **Sincronizar con Android**
   ```bash
   npx cap sync android
   ```

3. **Abrir en Android Studio**
   ```bash
   npx cap open android
   ```

4. **Generar APK/AAB**
   - Usar Android Studio para build final
   - Configurar signing keys
   - Generar release build

### iOS
1. **Construir la aplicación web**
   ```bash
   npm run build
   ```

2. **Sincronizar con iOS**
   ```bash
   npx cap sync ios
   ```

3. **Abrir en Xcode**
   ```bash
   npx cap open ios
   ```

4. **Generar IPA**
   - Usar Xcode para build final
   - Configurar provisioning profiles
   - Archive y export

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de dependencias SQLite**
   ```bash
   npm install @capacitor-community/sqlite@latest
   npx cap sync
   ```

2. **Problemas de permisos de cámara**
   - Verificar permisos en `capacitor.config.json`
   - Solicitar permisos en tiempo de ejecución

3. **Notificaciones no funcionan**
   - Verificar permisos de notificaciones
   - Comprobar configuración de canal (Android)

4. **Problemas de build Android**
   ```bash
   cd android
   ./gradlew clean
   npx cap sync android
   ```

### Debug
```bash
# Logs en tiempo real (Android)
npx cap run android --livereload

# Logs de consola
chrome://inspect (Chrome DevTools)
```

## 📈 Roadmap Futuro

### Versión 1.1
- [ ] Sincronización en la nube opcional
- [ ] Temas personalizados
- [ ] Widgets para pantalla de inicio
- [ ] Recordatorios múltiples

### Versión 1.2
- [ ] Análisis avanzados de humor
- [ ] Múltiples fotos por entrada
- [ ] Audio y video
- [ ] Colaboración familiar

### Versión 2.0
- [ ] IA para análisis de texto
- [ ] Insights automáticos
- [ ] Integración con wearables
- [ ] Modo coaching personal


## 👤 Autor

### DavidDevGt
- GitHub: [@DavidDevGt](https://github.com/DavidDevGt)

---

## 🙏 Agradecimientos

- **Capacitor Team** - Por el excelente framework
- **Tailwind CSS** - Por el sistema de diseño
- **Ionic Team** - Por los plugins de Capacitor
- **Comunidad Open Source** - Por las contribuciones

---

### Construido con ❤️ para desarrolladores que valoran la simplicidad y la elegancia
