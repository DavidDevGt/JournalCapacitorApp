# Script de Testing Rápido para App Android
# Uso: .\quick-android-test.ps1

param(
    [switch]$BuildFirst,
    [switch]$Screenshot,
    [switch]$Logs
)

# Configuración
$ADB = "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$PACKAGE = "com.daviddevgt.journalapp"
$ACTIVITY = "com.daviddevgt.journalapp.MainActivity"

Write-Host "🧪 Test Rápido de App Android" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# 1. Verificar ADB
Write-Host "🔍 Verificando ADB..." -ForegroundColor Blue
$devices = & $ADB devices
$connectedDevices = $devices | Where-Object { $_ -match "device$" }

if ($connectedDevices.Count -eq 0) {
    Write-Host "❌ No hay dispositivos conectados" -ForegroundColor Red
    Write-Host "   Conecta tu dispositivo y habilita la depuración USB" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Dispositivos conectados: $($connectedDevices.Count)" -ForegroundColor Green
$connectedDevices | ForEach-Object { Write-Host "   $($_)" -ForegroundColor Cyan }

# 2. Compilar e instalar si se solicita
if ($BuildFirst) {
    Write-Host "🔨 Compilando e instalando app..." -ForegroundColor Blue
    & .\build-and-install.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error en la compilación" -ForegroundColor Red
        exit 1
    }
}

# 3. Verificar instalación
Write-Host "📱 Verificando instalación..." -ForegroundColor Blue
$installed = & $ADB shell pm list packages | Select-String $PACKAGE

if (-not $installed) {
    Write-Host "❌ App no está instalada" -ForegroundColor Red
    Write-Host "   Ejecuta con -BuildFirst para compilar e instalar" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ App instalada correctamente" -ForegroundColor Green

# 4. Detener app si está ejecutándose
Write-Host "⏹️ Deteniendo app si está ejecutándose..." -ForegroundColor Blue
& $ADB shell am force-stop $PACKAGE
Start-Sleep -Seconds 1

# 5. Lanzar app
Write-Host "🚀 Lanzando app..." -ForegroundColor Blue
& $ADB shell am start -n "$PACKAGE/$ACTIVITY"
Start-Sleep -Seconds 3

# 6. Verificar que está ejecutándose
$running = & $ADB shell ps | Select-String $PACKAGE

if ($running) {
    Write-Host "✅ App lanzada correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ App no se pudo lanzar" -ForegroundColor Red
    exit 1
}

# 7. Tomar screenshot si se solicita
if ($Screenshot) {
    Write-Host "📸 Tomando screenshot..." -ForegroundColor Blue
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $filename = "test-screenshot-$timestamp.png"
    
    & $ADB shell screencap -p /sdcard/$filename
    & $ADB pull /sdcard/$filename ./$filename
    & $ADB shell rm /sdcard/$filename
    
    Write-Host "✅ Screenshot guardado: $filename" -ForegroundColor Green
}

# 8. Mostrar logs si se solicita
if ($Logs) {
    Write-Host "📋 Mostrando logs de la app..." -ForegroundColor Blue
    Write-Host "   Presiona Ctrl+C para detener" -ForegroundColor Yellow
    
    try {
        & $ADB logcat --pid=$(& $ADB shell pidof $PACKAGE)
    }
    catch {
        Write-Host "   Logs detenidos" -ForegroundColor Yellow
    }
}

# 9. Información del dispositivo
Write-Host "📱 Información del dispositivo:" -ForegroundColor Blue
$deviceInfo = & $ADB shell getprop
$androidVersion = $deviceInfo | Select-String "ro.build.version.release"
$deviceModel = $deviceInfo | Select-String "ro.product.model"

Write-Host "   Android: $androidVersion" -ForegroundColor Cyan
Write-Host "   Modelo: $deviceModel" -ForegroundColor Cyan

# 10. Información de la app
Write-Host "📦 Información de la app:" -ForegroundColor Blue
$appInfo = & $ADB shell dumpsys package $PACKAGE | Select-String -Pattern "versionName|versionCode|targetSdk|minSdk"
$appInfo | ForEach-Object { Write-Host "   $($_)" -ForegroundColor Cyan }

# 11. Verificar permisos
Write-Host "🔒 Permisos de la app:" -ForegroundColor Blue
$permissions = & $ADB shell dumpsys package $PACKAGE | Select-String "permission"
$permissions | ForEach-Object { Write-Host "   $($_)" -ForegroundColor Cyan }

# 12. Test de memoria
Write-Host "📊 Uso de memoria:" -ForegroundColor Blue
$memoryInfo = & $ADB shell dumpsys meminfo $PACKAGE | Select-String "TOTAL"
Write-Host "   $memoryInfo" -ForegroundColor Cyan

# 13. Verificar crashes
Write-Host "💥 Verificando crashes..." -ForegroundColor Blue
$crashLogs = & $ADB logcat -d | Select-String -Pattern "FATAL|CRASH|Exception" | Select-String $PACKAGE

if ($crashLogs) {
    Write-Host "❌ Crashes detectados:" -ForegroundColor Red
    $crashLogs | ForEach-Object { Write-Host "   $($_)" -ForegroundColor Red }
} else {
    Write-Host "✅ No se detectaron crashes" -ForegroundColor Green
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎉 Test rápido completado exitosamente!" -ForegroundColor Green
Write-Host "   La app está funcionando correctamente en tu dispositivo" -ForegroundColor Yellow

# Opciones adicionales
Write-Host ""
Write-Host "💡 Comandos adicionales:" -ForegroundColor Blue
Write-Host "   .\quick-android-test.ps1 -Screenshot    # Incluir screenshot" -ForegroundColor White
Write-Host "   .\quick-android-test.ps1 -Logs           # Mostrar logs en tiempo real" -ForegroundColor White
Write-Host "   .\quick-android-test.ps1 -BuildFirst     # Compilar antes del test" -ForegroundColor White
Write-Host "   .\dev-tools.ps1 logs                     # Ver logs continuos" -ForegroundColor White
Write-Host "   .\dev-tools.ps1 stop                     # Detener la app" -ForegroundColor White 