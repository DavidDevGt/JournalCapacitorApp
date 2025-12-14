# 🛡️ Informe de Remediación de Vulnerabilidades — *Daily Journal*

## 📑 1. Resumen Ejecutivo

Este documento presenta las **vulnerabilidades críticas** identificadas en la aplicación *Daily Journal* y detalla los cambios propuestos para su remediación. Implementar estas correcciones es vital para proteger la **confidencialidad**, **integridad** y **disponibilidad** de los datos del usuario.

### Matriz de Riesgos

| Vulnerabilidad                 | Riesgo Principal                   | Prioridad |
| ------------------------------ | ---------------------------------- | --------- |
| **XSS** (Cross-Site Scripting) | Robo de datos / Manipulación de UI | **Alta**  |
| **Almacenamiento Inseguro**    | Acceso a datos en texto plano      | **Alta**  |
| **APIs Globales Expuestas**    | Escalada de privilegios            | **Media** |
| **Prototype Pollution**        | Compromiso de la lógica global     | **Media** |

---

## 🛠️ 2. Matriz de Cambios Propuestos

A continuación se presentan los 4 cambios necesarios para la remediación, con su importancia, estimación de tiempo y archivos involucrados.

---

### 2.1 Cambio 1 — Protección contra XSS

| Aspecto                | Detalle                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| **Detalle de cambios** | Implementar **DOMPurify**, sustituir `innerHTML` por `textContent` y aplicar **CSP** en `index.html`.    |
| **Importancia**        | Un ataque XSS permite ejecución de código malicioso y robo de entradas del diario.                       |
| **Mitigación**         | DOMPurify limpia contenido, `textContent` elimina interpretación HTML y CSP reduce superficie de ataque. |
| **Tiempo estimado**    | **2–4 horas**                                                                                            |
| **Archivos afectados** | `journal.js`, `ui.js`, `index.html`                                                                      |
| **Responsable**        | Frontend Developer                                                                                       |

---

### 2.2 Cambio 2 — Protección contra Prototype Pollution

| Aspecto                | Detalle                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Detalle de cambios** | Validar claves peligrosas: `__proto__`, `constructor`, `prototype` en todos los flujos de `JSON.parse`. |
| **Importancia**        | Permite modificar el prototipo base de `Object`, afectando la lógica completa.                          |
| **Mitigación**         | Implementación de `validateNoPrototypeKeys` en importación/exportación y lectura de `localStorage`.     |
| **Tiempo estimado**    | **1–2 horas**                                                                                           |
| **Archivos afectados** | `database.js`                                                                                           |
| **Responsable**        | Fullstack Developer                                                                                     |

---

### 2.3 Cambio 3 — Eliminación de APIs Globales Inseguras

| Aspecto                | Detalle                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Detalle de cambios** | Eliminar `window.db`, `window.ui`, `window.journal`, `window.app`. Exponer solo bajo un modo debug explícito. |
| **Importancia**        | Los objetos globales permiten manipulación maliciosa desde un XSS.                                            |
| **Mitigación**         | Reducir el alcance de scripts inyectados eliminando referencias globales.                                     |
| **Tiempo estimado**    | **1–2 horas**                                                                                                 |
| **Archivos afectados** | `app.js`                                                                                                      |
| **Responsable**        | Lead Developer                                                                                                |

---

### 2.4 Cambio 4 — Cifrado de SQLite y localStorage

| Aspecto                | Detalle                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| **Detalle de cambios** | Activar cifrado en SQLite con `@capacitor-community/sqlite` y cifrar `localStorage` con AES.    |
| **Importancia**        | Actualmente la información se almacena en texto plano, permitiendo lectura directa de entradas. |
| **Mitigación**         | Cifrado de datos en reposo para proteger confidencialidad en caso de extracción física.         |
| **Tiempo estimado**    | **3–6 horas**                                                                                   |
| **Archivos afectados** | `database.js`, configuración Capacitor                                                          |
| **Responsable**        | Mobile/Capacitor Developer                                                                      |

---

## 🔎 3. Análisis Técnico Detallado

| Vulnerabilidad              | Archivo(s)            | Descripción                                                              |
| --------------------------- | --------------------- | ------------------------------------------------------------------------ |
| **XSS**                     | `ui.js`, `index.html` | Uso de `innerHTML` en `createEntryCard` (`ui.js:158–238`). Falta de CSP. |
| **Prototype Pollution**     | `database.js`         | `JSON.parse` sin validación en `database.js:610–620`.                    |
| **APIs Globales**           | `app.js`              | Exposición de múltiples objetos globales en `app.js:116–130`.            |
| **Almacenamiento Inseguro** | `database.js`         | Base SQLite inicializada con `'no-encryption'` en `database.js:67`.      |

---

## 🧭 4. Recomendaciones Adicionales de Seguridad

1. **Auditoría post-remediación:** pruebas de penetración después de implementar los 4 cambios.
2. **Capacitación en OWASP Top 10:** especialmente sobre XSS, Inyección y Gestión de Sesiones.
3. **Monitoreo y Logging:** registrar fallos CSP y eventos inusuales.
4. **Gestión de Dependencias:** actualizar librerías y revisar CVEs periódicamente.

---

## 🗓️ 5. Priorización y Cronograma Propuesto

### Priorización

| Prioridad     | Tarea                            | Duración | Responsable         |
| ------------- | -------------------------------- | -------- | ------------------- |
| **1 (Alta)**  | Cifrado de datos (Cambio 4)      | 3–6 h    | Mobile Developer    |
| **2 (Alta)**  | Protección XSS (Cambio 1)        | 2–4 h    | Frontend Developer  |
| **3 (Media)** | Remover APIs globales (Cambio 3) | 1–2 h    | Lead Developer      |
| **4 (Media)** | Prototype Pollution (Cambio 2)   | 1–2 h    | Fullstack Developer |

### Cronograma (4 días)

* **Día 1:** Cifrado SQLite + localStorage
* **Día 2:** Remediación XSS
* **Día 3:** Limpieza de APIs globales + validación Prototype Pollution
* **Día 4:** QA de seguridad, pruebas y preparación para auditoría

---

## ✅ 6. Métricas de Éxito

1. Eliminación del **100%** de las vulnerabilidades críticas.
2. Aprobación en las pruebas de penetración.
3. Cero incidentes relacionados durante los primeros **90 días**.
4. Alineación con controles de **OWASP ASVS** y recomendaciones mínimas.

