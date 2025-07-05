# Script para compilar e instalar la app sin Android Studio
# Uso: .\build-and-install.ps1

param(
    [string]$BuildType = "debug",
    [switch]$Launch
)

Write-Host "🔨 Iniciando proceso de compilación..." -ForegroundColor Green

# 1. Construir la aplicación web
Write-Host "📦 Construyendo aplicación web..." -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al construir la aplicación web" -ForegroundColor Red
    exit 1
}

# 2. Sincronizar con Capacitor
Write-Host "🔄 Sincronizando con Capacitor..." -ForegroundColor Blue
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al sincronizar con Capacitor" -ForegroundColor Red
    exit 1
}

# 3. Compilar APK
Write-Host "🛠️ Compilando APK ($BuildType)..." -ForegroundColor Blue
Set-Location android
if ($BuildType -eq "release") {
    .\gradlew.bat assembleRelease
    $apkPath = "android\app\build\outputs\apk\release\app-release-unsigned.apk"
} else {
    .\gradlew.bat assembleDebug
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
}
Set-Location ..

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al compilar APK" -ForegroundColor Red
    exit 1
}

# 4. Verificar que el APK existe
Write-Host "🔍 Verificando archivo APK..." -ForegroundColor Blue
if (-not (Test-Path $apkPath)) {
    Write-Host "❌ No se encontró el archivo APK en: $apkPath" -ForegroundColor Red
    Write-Host "   Verifica que la compilación fue exitosa" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ APK encontrado: $apkPath" -ForegroundColor Green

# 5. Verificar dispositivos conectados
Write-Host "📱 Verificando dispositivos conectados..." -ForegroundColor Blue
$devices = & "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
$deviceLines = $devices | Where-Object { $_ -match "device$" }

if ($deviceLines.Count -eq 0) {
    Write-Host "❌ No hay dispositivos conectados" -ForegroundColor Red
    Write-Host "   Conecta tu dispositivo y habilita la depuración USB" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Dispositivos encontrados:" -ForegroundColor Green
$deviceLines | ForEach-Object { Write-Host "   $($_)" -ForegroundColor Cyan }

# 6. Instalar APK
Write-Host "🚀 Instalando APK..." -ForegroundColor Blue
& "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r $apkPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al instalar APK" -ForegroundColor Red
    exit 1
}

Write-Host "✅ APK instalada correctamente!" -ForegroundColor Green

# 7. Lanzar la aplicación (opcional)
if ($Launch) {
    Write-Host "🏃 Lanzando aplicación..." -ForegroundColor Blue
    & "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.daviddevgt.journalapp -c android.intent.category.LAUNCHER 1
}

Write-Host "🎉 ¡Proceso completado exitosamente!" -ForegroundColor Green
Write-Host "   La app está lista para probar en tu dispositivo" -ForegroundColor Yellow
