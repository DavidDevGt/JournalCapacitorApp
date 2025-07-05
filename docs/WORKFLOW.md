# Flujo de Trabajo - Journal Capacitor App

## Conventional Commits

Todos los commits deben seguir el formato de Conventional Commits:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Tipos de Commits

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Cambios en documentación
- `style`: Cambios de formato (espacios, punto y coma, etc.)
- `refactor`: Refactorización de código
- `perf`: Mejoras de rendimiento
- `test`: Agregar o corregir tests
- `build`: Cambios en el sistema de build
- `ci`: Cambios en configuración de CI/CD
- `chore`: Tareas de mantenimiento
- `revert`: Revertir cambios

### Ejemplos

```bash
git commit -m "feat: agregar sistema de notificaciones push"
git commit -m "fix: corregir error en validación de formulario"
git commit -m "docs: actualizar README con instrucciones de instalación"
git commit -m "refactor: simplificar lógica de autenticación"
```

## Estructura de Ramas

### Ramas Principales

- `main`: Código en producción
- `develop`: Rama de desarrollo principal

### Ramas de Trabajo

- `feature/`: Nuevas funcionalidades
- `hotfix/`: Correcciones urgentes para producción
- `release/`: Preparación de releases

## Flujo de Trabajo

### 1. Desarrollo de Features

```bash
# Crear rama de feature
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad

# Desarrollar y hacer commits
git add .
git commit -m "feat: implementar nueva funcionalidad"

# Push y crear Pull Request
git push origin feature/nueva-funcionalidad
```

### 2. Hotfixes

```bash
# Crear rama de hotfix desde main
git checkout main
git pull origin main
git checkout -b hotfix/correccion-urgente

# Corregir y hacer commit
git add .
git commit -m "fix: corregir error crítico en producción"

# Merge a main y develop
git checkout main
git merge hotfix/correccion-urgente
git tag -a v1.0.1 -m "fix: corrección urgente"
git push origin main --tags

git checkout develop
git merge hotfix/correccion-urgente
git push origin develop
```

### 3. Releases

```bash
# Crear rama de release desde develop
git checkout develop
git pull origin develop
git checkout -b release/v1.1.0

# Preparar release (versionado, changelog)
git add .
git commit -m "chore: preparar release v1.1.0"

# Merge a main y develop
git checkout main
git merge release/v1.1.0
git tag -a v1.1.0 -m "feat: release v1.1.0"
git push origin main --tags

git checkout develop
git merge release/v1.1.0
git push origin develop
```

## Configuración de Hooks

El proyecto incluye hooks de Git que validan automáticamente:

- Formato de commits (conventional commits)
- Linting de código
- Tests antes de push

## Comandos Útiles

```bash
# Ver historial de commits
git log --oneline --graph

# Ver tags
git tag -l

# Ver diferencias entre ramas
git diff main..develop

# Limpiar ramas locales
git branch --merged | grep -v "\*" | xargs -n 1 git branch -d
``` 