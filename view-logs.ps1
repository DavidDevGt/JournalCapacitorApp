# Script para ver logs de la aplicación en tiempo real (Optimizado)
# Uso: .\view-logs.ps1 [Package] [-Clear] [-Filter] [-NoPID] [-LogLevel V|D|I|W|E|F]

param(
    [string]$Package = "com.daviddevgt.journalapp",
    [switch]$Clear,
    [switch]$Filter,
    [switch]$NoPID,
    [string]$LogLevel = "D" # DEBUG
)

# Configuración de colores
$ErrorActionPreference = "Continue"

# Función para verificar si ADB está disponible
function Test-ADB {
    $adbPath = "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe" # Ruta del usuario
    if (-not (Test-Path $adbPath)) {
        Write-Host "❌ Error: ADB no encontrado en $adbPath" -ForegroundColor Red
        Write-Host "   Asegúrate de tener Android SDK instalado" -ForegroundColor Yellow
        exit 1
    }
    return $adbPath
}

# Función para verificar si hay dispositivos conectados
function Test-Device {
    param($AdbPath)
    
    $devices = & $AdbPath devices
    $connectedDevices = $devices | Where-Object { $_ -match "device$" }
    
    if ($connectedDevices.Count -eq 0) {
        Write-Host "❌ Error: No hay dispositivos Android conectados" -ForegroundColor Red
        Write-Host "   Conecta un dispositivo o inicia un emulador" -ForegroundColor Yellow
        exit 1
    }
    
    $deviceId = ($connectedDevices[0] -split '\s+')[0]
    Write-Host "✅ Dispositivo conectado: $deviceId" -ForegroundColor Green
}

# Función para verificar si la aplicación está instalada
function Test-AppInstalled {
    param($AdbPath, $Package)
    
    $installedApps = & $AdbPath shell pm list packages $Package
    return $installedApps -match "^package:$Package$"
}

# Función para obtener el PID de la aplicación
function Get-AppPID {
    param($AdbPath, $Package)
    
    try {
        if (-not (Test-AppInstalled $AdbPath $Package)) {
            Write-Host "❌ Error: La aplicación $Package no está instalada" -ForegroundColor Red
            Write-Host "   Instala la aplicación primero (e.g., adb install -r app-debug.apk)" -ForegroundColor Yellow
            exit 1
        }
        
        $processId = & $AdbPath shell pidof $Package
        if ([string]::IsNullOrWhiteSpace($processId)) {
            Write-Host "⚠️  La aplicación $Package no está ejecutándose" -ForegroundColor Yellow
            Write-Host "   Intentando iniciar la aplicación..." -ForegroundColor Cyan
            
            & $AdbPath shell am start -n "$Package/.MainActivity" 2>&1 | Out-Null
            
            Start-Sleep -Seconds 3
            $processId = & $AdbPath shell pidof $Package
        }
        
        if ([string]::IsNullOrWhiteSpace($processId)) {
            Write-Host "❌ No se pudo obtener el PID de la aplicación" -ForegroundColor Red
            Write-Host "   Asegúrate de que la aplicación esté instalada y se pueda iniciar" -ForegroundColor Yellow
            exit 1
        }
        
        return $processId.Trim()
    }
    catch {
        Write-Host "❌ Error al obtener PID: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Función para limpiar logs
function Clear-Logs {
    param($AdbPath)
    
    Write-Host "🧹 Limpiando buffer de logs..." -ForegroundColor Blue
    & $AdbPath logcat -c
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Buffer de logs limpiado" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  No se pudo limpiar el buffer de logs" -ForegroundColor Yellow
    }
}

# Función para colorear la salida de logcat
function Colorize-Log {
    process {
        $line = $_.ToString()
        
        # Patrones para niveles de log
        if ($line -match "\sE\s|\sF\s") {
            # Error o Fatal (Rojo)
            Write-Host $line -ForegroundColor Red
        }
        elseif ($line -match "\sW\s") {
            # Warning (Amarillo)
            Write-Host $line -ForegroundColor Yellow
        }
        elseif ($line -match "\sI\s") {
            # Info (Verde)
            Write-Host $line -ForegroundColor Green
        }
        elseif ($line -match "\sD\s") {
            # Debug (Gris Oscuro)
            Write-Host $line -ForegroundColor DarkGray
        }
        else {
            # Verbose / otros (Blanco)
            Write-Host $line -ForegroundColor White
        }
    }
}

# Función principal para mostrar logs con filtro de PID
function Show-Logs {
    param($AdbPath, $Package, $ProcessId, $Filter, $LogLevel)
    
    Write-Host "📱 Mostrando logs para: $Package (PID: $ProcessId)" -ForegroundColor Green
    Write-Host "   Presiona Ctrl+C para salir" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    # Tags ruidosos que queremos excluir o degradar su nivel de log:
    # Usaremos el filtro principal -s y luego excluimos explícitamente el ruido.
    $noiseExclusionFilters = @(
        "View:S",                   # Suprime completamente los logs de "View" (setRequestedFrameRate)
        "VRI:*",                    # Suprime logs ruidosos de ViewRootImpl (handleResized, pointer, sync)
        "HWUI:S",                   # Suprime logs de Hardware UI (CacheManager::trimMemory)
        "InputMethodManager:S",     # Logs ruidosos de IME
        "InputMethodManager_LC:S",  # Logs ruidosos de IME
        "InsetsController:S"        # Logs ruidosos de Insets (cambios de barra de navegación/estado)
    )

    try {
        if ($Filter) {
            # 1. Filtros de Inclusión (prioridad alta)
            $logcatIncludeFilters = @(
                "System.out:I",        # Logs generales del sistema (console.log)
                "AndroidRuntime:E",    # Errores de tiempo de ejecución
                "FATAL:*",             # Fallos fatales
                "Capacitor:V",         # Logs detallados de Capacitor y Plugins
                "Database:V",          # Logs genéricos de DB
                "SQLite:V",
                "SQLitePlugin:V",
                "*:$LogLevel"          # Todo lo demás con el nivel de log solicitado (I, W, E, etc.)
            )
            
            # Combinamos filtros de inclusión y exclusión
            $allFilters = @($logcatIncludeFilters + $noiseExclusionFilters)
            
            & $AdbPath logcat -s $allFilters --pid=$ProcessId | Colorize-Log
        }
        else {
            # Si no se usa -Filter, solo aplicamos la exclusión de ruido base
            $allFilters = @("*:$LogLevel" + $noiseExclusionFilters)
            & $AdbPath logcat -s $allFilters --pid=$ProcessId | Colorize-Log
        }
    }
    catch {
        Write-Host "❌ Error al mostrar logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Función alternativa para mostrar logs sin filtro de PID (modo sistema)
function Show-Logs-NoPID {
    param($AdbPath, $Package, $Filter, $LogLevel)
    
    Write-Host "📱 Mostrando logs del sistema (sin filtro de PID). Usa -Filter para reducir el ruido." -ForegroundColor Green
    Write-Host "   Presiona Ctrl+C para salir" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    # Tags ruidosos que queremos excluir o degradar su nivel de log:
    $noiseExclusionFilters = @(
        "View:S",
        "VRI:*",
        "HWUI:S",
        "InputMethodManager:S",
        "InputMethodManager_LC:S",
        "InsetsController:S"
    )

    try {
        if ($Filter) {
            $logcatIncludeFilters = @(
                "System.out:I",
                "AndroidRuntime:E",
                "FATAL:*",
                "Capacitor:V",
                "Database:V",
                "SQLite:V",
                "SQLitePlugin:V",
                "*:$LogLevel"
            )
            $allFilters = @($logcatIncludeFilters + $noiseExclusionFilters)
            & $AdbPath logcat -s $allFilters | Colorize-Log
        }
        else {
            # Solo aplicamos exclusión de ruido con el nivel de log base
            $allFilters = @("*:$LogLevel" + $noiseExclusionFilters)
            & $AdbPath logcat -s $allFilters | Colorize-Log
        }
    }
    catch {
        Write-Host "❌ Error al mostrar logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Función para mostrar ayuda
function Show-Help {
    Write-Host "📖 Uso del script:" -ForegroundColor Cyan
    Write-Host "   .\view-logs.ps1 [Package] [-Clear] [-Filter] [-NoPID] [-LogLevel Level]" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Parámetros:" -ForegroundColor Cyan
    Write-Host "   Package - Nombre del paquete de la aplicación (default: com.daviddevgt.journalapp)" -ForegroundColor White
    Write-Host "   -Clear - Limpiar buffer de logs antes de mostrar" -ForegroundColor White
    Write-Host "   -Filter - **RECOMENDADO.** Filtra logs por tags importantes (Capacitor, DB, Errores) y suprime el ruido de renderizado." -ForegroundColor Yellow
    Write-Host "   -NoPID - Mostrar logs sin filtro de PID (modo sistema)" -ForegroundColor White
    Write-Host "   -LogLevel - Nivel de log (V, D, I, W, E, F) (default: I)" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Ejemplos (usa -Filter para eliminar el ruido):" -ForegroundColor Cyan
    Write-Host "   .\view-logs.ps1 -Clear -Filter     # Mejor visión de errores y DB" -ForegroundColor White
    Write-Host "   .\view-logs.ps1 -LogLevel E       # Solo muestra Errores y Fatales (muy limpio)" -ForegroundColor White
    Write-Host "   .\view-logs.ps1 -Filter -LogLevel D # Muestra Debug y arriba, sin ruido de renderizado" -ForegroundColor White
}

# Verificar si se solicita ayuda
if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "-?") {
    Show-Help
    exit 0
}

# Inicio del script
Write-Host "🚀 Iniciando script de logs..." -ForegroundColor Magenta

# Verificar ADB
$adbPath = Test-ADB

# Verificar dispositivo
Test-Device $adbPath

# Limpiar logs si se solicita
if ($Clear) {
    Clear-Logs $adbPath
}

# Obtener PID de la aplicación o usar modo sin PID
if ($NoPID) {
    Write-Host "📱 Modo sin filtro de PID activado" -ForegroundColor Cyan
    Show-Logs-NoPID $adbPath $Package $Filter $LogLevel
}
else {
    try {
        $appPID = Get-AppPID $adbPath $Package
        # Mostrar logs con filtro de PID
        Show-Logs $adbPath $Package $appPID $Filter $LogLevel
    }
    catch {
        Write-Host "⚠️ No se pudo obtener el PID, mostrando logs del sistema..." -ForegroundColor Yellow
        # Mostrar logs sin filtro de PID como alternativa
        Show-Logs-NoPID $adbPath $Package $Filter $LogLevel
    }
}