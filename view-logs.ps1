# Script para ver logs de la aplicación en tiempo real
# Uso: .\view-logs.ps1

param(
    [string]$Package = "com.journalcapacitorapp.app",
    [switch]$Clear
)

if ($Clear) {
    Write-Host "🧹 Limpiando buffer de logs..." -ForegroundColor Blue
    & "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe" logcat -c
}

Write-Host "📱 Mostrando logs para: $Package" -ForegroundColor Green
Write-Host "   Presiona Ctrl+C para salir" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Filtrar logs por el package de la aplicación y algunos tags importantes
& "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe" logcat --pid=$(& "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe" shell pidof $Package)
