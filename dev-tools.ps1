# Script para herramientas de desarrollo móvil
# Uso: .\dev-tools.ps1 [comando]

param(
    [string]$Action = "help"
)

$ADB = "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$PACKAGE = "com.daviddevgt.journalapp"

switch ($Action.ToLower()) {
    "devices" {
        Write-Host "📱 Dispositivos conectados:" -ForegroundColor Green
        & $ADB devices -l
    }
    
    "install" {
        Write-Host "🚀 Instalando APK..." -ForegroundColor Blue
        & $ADB install -r .\android\app\build\outputs\apk\debug\app-debug.apk
    }
    
    "uninstall" {
        Write-Host "🗑️ Desinstalando aplicación..." -ForegroundColor Yellow
        & $ADB uninstall $PACKAGE
    }
    
    "launch" {
        Write-Host "🏃 Lanzando aplicación..." -ForegroundColor Blue
        & $ADB shell monkey -p $PACKAGE -c android.intent.category.LAUNCHER 1
    }
    
    "stop" {
        Write-Host "⏹️ Deteniendo aplicación..." -ForegroundColor Red
        & $ADB shell am force-stop $PACKAGE
    }
    
    "logs" {
        Write-Host "📋 Mostrando logs (Ctrl+C para salir)..." -ForegroundColor Green
        & $ADB logcat --pid=$(& $ADB shell pidof $PACKAGE)
    }
    
    "clear-logs" {
        Write-Host "🧹 Limpiando logs..." -ForegroundColor Blue
        & $ADB logcat -c
    }
    
    "screenshot" {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $filename = "screenshot_$timestamp.png"
        Write-Host "📸 Tomando captura de pantalla..." -ForegroundColor Green
        & $ADB shell screencap -p /sdcard/$filename
        & $ADB pull /sdcard/$filename ./$filename
        & $ADB shell rm /sdcard/$filename
        Write-Host "✅ Captura guardada como: $filename" -ForegroundColor Green
    }
    
    "info" {
        Write-Host "ℹ️ Información de la aplicación:" -ForegroundColor Blue
        & $ADB shell dumpsys package $PACKAGE | Select-String -Pattern "versionName|versionCode|targetSdk|minSdk"
    }
    
    "permissions" {
        Write-Host "🔒 Permisos de la aplicación:" -ForegroundColor Blue
        & $ADB shell dumpsys package $PACKAGE | Select-String -Pattern "permission"
    }
    
    "storage" {
        Write-Host "💾 Datos de almacenamiento:" -ForegroundColor Blue
        & $ADB shell run-as $PACKAGE ls -la
    }
    
    "restart-adb" {
        Write-Host "🔄 Reiniciando ADB..." -ForegroundColor Yellow
        & $ADB kill-server
        & $ADB start-server
        & $ADB devices
    }
    
    "help" {
        Write-Host "🛠️ Herramientas de desarrollo móvil" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "Comandos disponibles:" -ForegroundColor Yellow
        Write-Host "  devices        - Listar dispositivos conectados" -ForegroundColor White
        Write-Host "  install        - Instalar APK en el dispositivo" -ForegroundColor White
        Write-Host "  uninstall      - Desinstalar aplicación" -ForegroundColor White
        Write-Host "  launch         - Lanzar aplicación" -ForegroundColor White
        Write-Host "  stop           - Detener aplicación" -ForegroundColor White
        Write-Host "  logs           - Ver logs en tiempo real" -ForegroundColor White
        Write-Host "  clear-logs     - Limpiar buffer de logs" -ForegroundColor White
        Write-Host "  screenshot     - Tomar captura de pantalla" -ForegroundColor White
        Write-Host "  info           - Información de la aplicación" -ForegroundColor White
        Write-Host "  permissions    - Ver permisos de la aplicación" -ForegroundColor White
        Write-Host "  storage        - Ver datos de almacenamiento" -ForegroundColor White
        Write-Host "  restart-adb    - Reiniciar servidor ADB" -ForegroundColor White
        Write-Host "  help           - Mostrar esta ayuda" -ForegroundColor White
        Write-Host ""
        Write-Host "Ejemplos de uso:" -ForegroundColor Yellow
        Write-Host "  .\dev-tools.ps1 devices" -ForegroundColor Cyan
        Write-Host "  .\dev-tools.ps1 launch" -ForegroundColor Cyan
        Write-Host "  .\dev-tools.ps1 logs" -ForegroundColor Cyan
    }
    
    default {
        Write-Host "❌ Comando desconocido: $Action" -ForegroundColor Red
        Write-Host "   Usa '.\dev-tools.ps1 help' para ver comandos disponibles" -ForegroundColor Yellow
    }
}
