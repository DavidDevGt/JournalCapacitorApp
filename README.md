# Daily Journal 📖

> Diario personal minimalista estilo Notion

## ✨ Lo que hace

Una app elegante para escribir tu diario diario. Diseño limpio, funciona sin internet, y tus datos quedan solo en tu dispositivo.

**🎯 Una entrada por día + foto + estado de ánimo = tu historia personal**

## 🚀 Características

- 📝 **Editor inteligente** - Auto-guardado con detección de estado de ánimo en tiempo real
- 🧠 **Análisis inteligente** - Detección automática de sentimientos con IA
- 📷 **Fotos optimizadas** - Compresión automática y miniaturas
- 📅 **Vista calendario** - Navegación visual por fechas con indicadores de estado
- 🔍 **Búsqueda semántica** - Encuentra entradas por contenido y emociones
- 📊 **Estadísticas detalladas** - Análisis de palabras, rachas y patrones emocionales
- 🔔 **Recordatorios personalizables** - Notificaciones programables
- 🌙 **Tema adaptativo** - Modo oscuro automático según preferencias del sistema
- 📱 **100% offline** - Funciona completamente sin conexión
- 📤 **Backup inteligente** - Export/import con validación de datos
- 🎨 **Diseño Notion-inspired** - Interfaz limpia, moderna y profesional

## 💻 Instalación

### Desarrollo rápido
```bash
git clone https://github.com/DavidDevGt/JournalCapacitorApp.git
cd JournalCapacitorApp
npm install
npx serve www  # Ve en navegador
```

### Para móviles
```bash
npm run sync
npm run open:android  # Android Studio
npm run open:ios      # Xcode (solo macOS)
```

## 🛠️ Tecnologías

**Core**
- **Capacitor** - Framework multiplataforma
- **JavaScript vanilla** - Sin frameworks pesados  
- **Tailwind CSS** - Diseño responsive
- **SQLite** - Base de datos nativa (+ localStorage web)

**Plugins nativos**
- Camera, Notifications, Haptics, Share, Device, etc.

## 📱 Plataformas

- ✅ **Android** (APK/Play Store)
- ✅ **iOS** (IPA/App Store) 
- ✅ **PWA** (Navegadores)
- ✅ **Offline** (Funciona sin internet)

## 🎯 Scripts principales

```bash
npm run dev           # Desarrollo con live reload
npm run build         # Build para producción
npm run sync          # Sincronizar con nativos
npm run open:android  # Abrir Android Studio
npm run open:ios      # Abrir Xcode
```

## 📁 Estructura simple

```
www/
├── index.html        # App principal
├── js/
│   ├── app.js       # Aplicacion
│   ├── database.js  # Datos (SQLite/localStorage)
│   ├── ui.js        # Interfaz y componentes
│   ├── journal.js   # Logica interna del Diario
│   └── helpers.js   # Funciones
└── css/styles.css
```

## 🔒 Privacidad total

- ✅ **Local-first** - Todo en tu dispositivo
- ✅ **Sin servidores** - No hay tracking
- ✅ **Sin cuentas** - No hay registro
- ✅ **Tus datos** - Control total

## 🎨 Diseño

**Inspirado en Notion**
- Tipografía Inter elegante
- Espaciado limpio y consistente  
- Colores sutiles y profesionales
- Animaciones suaves
- Dark/light mode automático

## 🐛 Solución rápida

```bash
# Problemas de build Android
cd android && ./gradlew clean && npx cap sync

# Problemas de permisos
# Revisar configuración en Android Studio/Xcode

# App no carga
# Verificar que serve está corriendo en puerto correcto
```

## 📊 Stats del proyecto

- **~3,000+ líneas** de JavaScript vanilla
- **20+ funcionalidades** principales  
- **Análisis de sentimientos** con IA integrada
- **10+ plugins** Capacitor integrados
- **Mobile-first** responsive design
- **3 plataformas** soportadas (Android, iOS, Web/PWA)
- **SQLite + localStorage** para persistencia híbrida

## 🧠 Análisis Inteligente de Emociones

La app incluye un motor de análisis de sentimientos que:

- **Detecta automáticamente** tu estado de ánimo mientras escribes
- **Combina múltiples técnicas**: Análisis heurístico + Naive Bayes
- **Reconoce emociones específicas**: alegría, tristeza, enojo, miedo, amor, etc.
- **Aprende de patrones** en español con diccionario optimizado
- **Funciona offline** completamente sin APIs externas

*El análisis es opcional y configurable en ajustes de la App*

## 👨‍💻 Autor

**DavidDevGt** - [@DavidDevGt](https://github.com/DavidDevGt)

---

### 🎯 **Perfecto para desarrolladores que buscan:**
- Arquitectura Capacitor moderna
- Código JavaScript vanilla bien estructurado  
- Diseño mobile-first elegante
- App completa lista para producción

**Construido con ❤️ por David**