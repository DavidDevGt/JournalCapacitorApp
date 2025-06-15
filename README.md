# Daily Journal 📖

> Diario personal minimalista estilo Notion

## ✨ Lo que hace

Una app elegante para escribir tu diario diario. Diseño limpio, funciona sin internet, y tus datos quedan solo en tu dispositivo.

**🎯 Una entrada por día + foto + estado de ánimo = tu historia personal**

## 🚀 Características

- 📝 **Escribe diario** - Editor con auto-guardado
- 😊 **Registra humor** - 5 emojis para tu día  
- 📷 **Una foto diaria** - Captura momentos
- 📅 **Calendario visual** - Ve entradas por mes
- 🔍 **Búsqueda rápida** - Encuentra cualquier entrada
- 📊 **Estadísticas** - Palabras escritas, rachas, promedios
- 🔔 **Recordatorios** - Notificaciones personalizables
- 🌙 **Modo oscuro** - Diseño adaptable
- 📱 **Funciona offline** - Sin internet necesario
- 📤 **Export/Import** - Backup de tus datos
- 🎨 **Diseño Notion** - Interfaz limpia y elegante

## 💻 Instalación

### Desarrollo rápido
```bash
git clone <repository-url>
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

- **~2,500 líneas** de JavaScript vanilla
- **15+ funcionalidades** principales  
- **10+ plugins** Capacitor integrados
- **Mobile-first** responsive design
- **3 plataformas** soportadas (Android, iOS, Web/PWA)

## 👨‍💻 Autor

**DavidDevGt** - [@DavidDevGt](https://github.com/DavidDevGt)

---

### 🎯 **Perfecto para desarrolladores que buscan:**
- Arquitectura Capacitor moderna
- Código JavaScript vanilla bien estructurado  
- Diseño mobile-first elegante
- App completa lista para producción

**Construido con ❤️ por David**