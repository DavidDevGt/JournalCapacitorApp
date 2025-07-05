# Script para ver logs de la aplicación en tiempo real
# Uso: .\view-logs.ps1 [Package] [-Clear] [-Filter]

param(
    [string]$Package = "com.daviddevgt.journalapp",
    [switch]$Clear,
    [switch]$Filter,
    [switch]$NoPID,
    [string]$LogLevel = "V"
)

# Configuración de colores
$ErrorActionPreference = "Continue"

# Función para verificar si ADB está disponible
function Test-ADB {
    $adbPath = "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe"
    if (-not (Test-Path $adbPath)) {
        Write-Host "❌ Error: ADB no encontrado en $adbPath" -ForegroundColor Red
        Write-Host "   Asegúrate de tener Android SDK instalado" -ForegroundColor Yellow
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
        Write-Host "   Conecta un dispositivo o inicia un emulador" -ForegroundColor Yellow
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
        # Verificar si la app está instalada
        if (-not (Test-AppInstalled $AdbPath $Package)) {
            Write-Host "❌ Error: La aplicación $Package no está instalada" -ForegroundColor Red
            Write-Host "   Instala la aplicación primero:" -ForegroundColor Yellow
            Write-Host "   adb install -r android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Cyan
            exit 1
        }
        
        $processId = & $AdbPath shell pidof $Package
        if ([string]::IsNullOrWhiteSpace($processId)) {
            Write-Host "⚠️  La aplicación $Package no está ejecutándose" -ForegroundColor Yellow
            Write-Host "   Intentando iniciar la aplicación..." -ForegroundColor Cyan
            
            # Intentar diferentes métodos para iniciar la app
            $startResult = & $AdbPath shell am start -n "$Package/.MainActivity" 2>&1
            if ($LASTEXITCODE -ne 0) {
                # Si falla, intentar con monkey
                $startResult = & $AdbPath shell monkey -p $Package -c android.intent.category.LAUNCHER 1 2>&1
            }
            
            Start-Sleep -Seconds 3
            $processId = & $AdbPath shell pidof $Package
        }
        
        if ([string]::IsNullOrWhiteSpace($processId)) {
            Write-Host "❌ No se pudo obtener el PID de la aplicación" -ForegroundColor Red
            Write-Host "   Asegúrate de que la aplicación esté instalada en el dispositivo" -ForegroundColor Yellow
            Write-Host "   Puedes intentar ejecutar: adb install -r app-debug.apk" -ForegroundColor Cyan
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
    } else {
        Write-Host "⚠️  No se pudo limpiar el buffer de logs" -ForegroundColor Yellow
    }
}

# Función principal para mostrar logs
function Show-Logs {
    param($AdbPath, $Package, $ProcessId, $Filter, $LogLevel)
    
    Write-Host "📱 Mostrando logs para: $Package (PID: $ProcessId)" -ForegroundColor Green
    Write-Host "   Presiona Ctrl+C para salir" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    try {
        if ($Filter) {
            # Filtrar logs por tags importantes y nivel
            & $AdbPath logcat -s "System.out:*" "AndroidRuntime:E" "FATAL:*" "*:$LogLevel" --pid=$ProcessId
        } else {
            # Mostrar todos los logs del proceso
            & $AdbPath logcat --pid=$ProcessId
        }
    }
    catch {
        Write-Host "❌ Error al mostrar logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Función alternativa para mostrar logs sin filtro de PID
function Show-Logs-NoPID {
    param($AdbPath, $Package, $Filter, $LogLevel)
    
    Write-Host "📱 Mostrando logs del sistema (sin filtro de PID)" -ForegroundColor Green
    Write-Host "   Presiona Ctrl+C para salir" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
    try {
        if ($Filter) {
            # Filtrar logs por tags importantes y nivel
            & $AdbPath logcat -s "System.out:*" "AndroidRuntime:E" "FATAL:*" "*:$LogLevel"
        } else {
            # Mostrar todos los logs
            & $AdbPath logcat
        }
    }
    catch {
        Write-Host "❌ Error al mostrar logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Función para mostrar ayuda
function Show-Help {
    Write-Host "📖 Uso del script:" -ForegroundColor Cyan
    Write-Host "   .\view-logs.ps1 [Package] [-Clear] [-Filter] [-NoPID] [-LogLevel Level]" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Parámetros:" -ForegroundColor Cyan
    Write-Host "   Package    - Nombre del paquete de la aplicación (default: com.journalcapacitorapp.app)" -ForegroundColor White
    Write-Host "   -Clear     - Limpiar buffer de logs antes de mostrar" -ForegroundColor White
    Write-Host "   -Filter    - Filtrar logs por tags importantes" -ForegroundColor White
    Write-Host "   -NoPID     - Mostrar logs sin filtro de PID (modo sistema)" -ForegroundColor White
    Write-Host "   -LogLevel  - Nivel de log (V, D, I, W, E, F) (default: V)" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Ejemplos:" -ForegroundColor Cyan
    Write-Host "   .\view-logs.ps1" -ForegroundColor White
    Write-Host "   .\view-logs.ps1 com.mi.app -Clear -Filter" -ForegroundColor White
    Write-Host "   .\view-logs.ps1 -LogLevel E" -ForegroundColor White
    Write-Host "   .\view-logs.ps1 -NoPID -Filter" -ForegroundColor White
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
} else {
    try {
        $appPID = Get-AppPID $adbPath $Package
        # Mostrar logs con filtro de PID
        Show-Logs $adbPath $Package $appPID $Filter $LogLevel
    }
    catch {
        Write-Host "⚠️  No se pudo obtener el PID, mostrando logs del sistema..." -ForegroundColor Yellow
        # Mostrar logs sin filtro de PID como alternativa
        Show-Logs-NoPID $adbPath $Package $Filter $LogLevel
    }
}
