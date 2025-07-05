# Script de Testing Automatizado para App Android
# Uso: .\android-test-automation.ps1 [comando] [opciones]
# Ejemplo: .\android-test-automation.ps1 full-test
# Ejemplo: .\android-test-automation.ps1 performance-test

param(
    [string]$TestType = "help",
    [switch]$BuildFirst,
    [switch]$InstallOnly,
    [switch]$Verbose,
    [int]$TestDuration = 30,
    [string]$LogLevel = "INFO"
)

# Configuración
$ADB = "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$PACKAGE = "com.daviddevgt.journalapp"
$ACTIVITY = "com.daviddevgt.journalapp.MainActivity"
$TEST_RESULTS_DIR = ".\test-results"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"

# Colores para output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Blue"
    Debug = "Cyan"
    Header = "Magenta"
}

function Write-TestLog {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $levelColor = switch ($Level) {
        "ERROR" { $Colors.Error }
        "WARN" { $Colors.Warning }
        "INFO" { $Colors.Info }
        "DEBUG" { $Colors.Debug }
        default { $Colors.Info }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $levelColor
}

function Test-ADBConnection {
    Write-TestLog "🔍 Verificando conexión ADB..." "INFO"
    
    try {
        $devices = & $ADB devices
        $connectedDevices = $devices | Where-Object { $_ -match "device$" }
        
        if ($connectedDevices.Count -eq 0) {
            Write-TestLog "❌ No hay dispositivos conectados" "ERROR"
            Write-TestLog "   Conecta tu dispositivo y habilita la depuración USB" "WARN"
            return $false
        }
        
        Write-TestLog "✅ Dispositivos conectados: $($connectedDevices.Count)" "INFO"
        $connectedDevices | ForEach-Object { Write-TestLog "   $($_)" "DEBUG" }
        return $true
    }
    catch {
        Write-TestLog "❌ Error al conectar con ADB: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-AppInstallation {
    Write-TestLog "📱 Verificando instalación de la app..." "INFO"
    
    $installed = & $ADB shell pm list packages | Select-String $PACKAGE
    
    if ($installed) {
        Write-TestLog "✅ App instalada correctamente" "INFO"
        return $true
    } else {
        Write-TestLog "❌ App no está instalada" "ERROR"
        return $false
    }
}

function Test-AppLaunch {
    Write-TestLog "🚀 Probando lanzamiento de la app..." "INFO"
    
    try {
        # Lanzar la app
        & $ADB shell am start -n "$PACKAGE/$ACTIVITY"
        Start-Sleep -Seconds 3
        
        # Verificar si está ejecutándose
        $running = & $ADB shell ps | Select-String $PACKAGE
        
        if ($running) {
            Write-TestLog "✅ App lanzada correctamente" "INFO"
            return $true
        } else {
            Write-TestLog "❌ App no se pudo lanzar" "ERROR"
            return $false
        }
    }
    catch {
        Write-TestLog "❌ Error al lanzar la app: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-AppPermissions {
    Write-TestLog "🔒 Verificando permisos de la app..." "INFO"
    
    $permissions = & $ADB shell dumpsys package $PACKAGE | Select-String "permission"
    
    Write-TestLog "Permisos encontrados:" "INFO"
    $permissions | ForEach-Object { Write-TestLog "   $($_)" "DEBUG" }
    
    return $permissions.Count -gt 0
}

function Test-AppPerformance {
    Write-TestLog "⚡ Iniciando test de rendimiento..." "INFO"
    
    $results = @()
    
    # Test de uso de memoria
    Write-TestLog "   📊 Monitoreando uso de memoria..." "INFO"
    $memoryInfo = & $ADB shell dumpsys meminfo $PACKAGE
    $memoryUsage = $memoryInfo | Select-String "TOTAL"
    Write-TestLog "   Memoria total: $memoryUsage" "DEBUG"
    
    # Test de CPU
    Write-TestLog "   🔥 Monitoreando uso de CPU..." "INFO"
    $cpuInfo = & $ADB shell top -n 1 | Select-String $PACKAGE
    Write-TestLog "   CPU: $cpuInfo" "DEBUG"
    
    # Test de batería
    Write-TestLog "   🔋 Verificando impacto en batería..." "INFO"
    $batteryInfo = & $ADB shell dumpsys battery
    Write-TestLog "   Estado de batería obtenido" "DEBUG"
    
    return $true
}

function Test-AppCrash {
    Write-TestLog "💥 Verificando crashes de la app..." "INFO"
    
    # Buscar logs de crash
    $crashLogs = & $ADB logcat -d | Select-String -Pattern "FATAL|CRASH|Exception" | Select-String $PACKAGE
    
    if ($crashLogs) {
        Write-TestLog "❌ Crashes detectados:" "ERROR"
        $crashLogs | ForEach-Object { Write-TestLog "   $($_)" "ERROR" }
        return $false
    } else {
        Write-TestLog "✅ No se detectaron crashes" "INFO"
        return $true
    }
}

function Test-AppLogs {
    Write-TestLog "📋 Analizando logs de la app..." "INFO"
    
    $logs = & $ADB logcat -d | Select-String $PACKAGE | Select-Object -Last 50
    
    Write-TestLog "Últimos logs de la app:" "INFO"
    $logs | ForEach-Object { Write-TestLog "   $($_)" "DEBUG" }
    
    return $logs.Count -gt 0
}

function Test-AppStorage {
    Write-TestLog "💾 Verificando almacenamiento de la app..." "INFO"
    
    try {
        $storageInfo = & $ADB shell run-as $PACKAGE ls -la
        $dataSize = & $ADB shell du -sh /data/data/$PACKAGE
        
        Write-TestLog "Tamaño de datos: $dataSize" "INFO"
        Write-TestLog "Contenido del directorio de datos:" "DEBUG"
        $storageInfo | ForEach-Object { Write-TestLog "   $($_)" "DEBUG" }
        
        return $true
    }
    catch {
        Write-TestLog "❌ Error al verificar almacenamiento: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-AppNetwork {
    Write-TestLog "🌐 Verificando conectividad de red..." "INFO"
    
    # Verificar si la app tiene permisos de internet
    $networkPermissions = & $ADB shell dumpsys package $PACKAGE | Select-String "INTERNET"
    
    if ($networkPermissions) {
        Write-TestLog "✅ Permisos de red configurados" "INFO"
    } else {
        Write-TestLog "⚠️ No se detectaron permisos de red" "WARN"
    }
    
    return $true
}

function Test-AppUI {
    Write-TestLog "🎨 Verificando elementos de UI..." "INFO"
    
    # Tomar screenshot para análisis visual
    $screenshotFile = "ui-test-$TIMESTAMP.png"
    & $ADB shell screencap -p /sdcard/$screenshotFile
    & $ADB pull /sdcard/$screenshotFile ./$screenshotFile
    & $ADB shell rm /sdcard/$screenshotFile
    
    Write-TestLog "📸 Screenshot guardado: $screenshotFile" "INFO"
    
    # Verificar elementos de UI básicos
    $uiElements = & $ADB shell uiautomator dump
    if ($uiElements) {
        Write-TestLog "✅ Elementos de UI detectados" "INFO"
    } else {
        Write-TestLog "⚠️ No se pudieron detectar elementos de UI" "WARN"
    }
    
    return $true
}

function Test-AppStress {
    Write-TestLog "🔥 Iniciando test de estrés..." "INFO"
    
    $startTime = Get-Date
    $iterations = 10
    
    for ($i = 1; $i -le $iterations; $i++) {
        Write-TestLog "   Iteración $i/$iterations" "INFO"
        
        # Lanzar app
        & $ADB shell am start -n "$PACKAGE/$ACTIVITY"
        Start-Sleep -Seconds 2
        
        # Detener app
        & $ADB shell am force-stop $PACKAGE
        Start-Sleep -Seconds 1
        
        # Verificar que se detuvo correctamente
        $running = & $ADB shell ps | Select-String $PACKAGE
        if ($running) {
            Write-TestLog "   ⚠️ App sigue ejecutándose después de force-stop" "WARN"
        }
    }
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-TestLog "✅ Test de estrés completado en $duration segundos" "INFO"
    return $true
}

function Test-AppCompatibility {
    Write-TestLog "📱 Verificando compatibilidad del dispositivo..." "INFO"
    
    # Información del dispositivo
    $deviceInfo = & $ADB shell getprop
    $androidVersion = $deviceInfo | Select-String "ro.build.version.release"
    $sdkVersion = $deviceInfo | Select-String "ro.build.version.sdk"
    $deviceModel = $deviceInfo | Select-String "ro.product.model"
    
    Write-TestLog "Información del dispositivo:" "INFO"
    Write-TestLog "   Android: $androidVersion" "DEBUG"
    Write-TestLog "   SDK: $sdkVersion" "DEBUG"
    Write-TestLog "   Modelo: $deviceModel" "DEBUG"
    
    return $true
}

function Save-TestReport {
    param(
        [hashtable]$Results
    )
    
    if (-not (Test-Path $TEST_RESULTS_DIR)) {
        New-Item -ItemType Directory -Path $TEST_RESULTS_DIR | Out-Null
    }
    
    $reportFile = "$TEST_RESULTS_DIR\test-report-$TIMESTAMP.json"
    $Results | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportFile -Encoding UTF8
    
    Write-TestLog "📄 Reporte guardado: $reportFile" "INFO"
}

function Start-FullTest {
    Write-TestLog "🚀 Iniciando test completo de la app..." "INFO"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Colors.Header
    
    $testResults = @{
        timestamp = $TIMESTAMP
        package = $PACKAGE
        tests = @{}
    }
    
    # Test de conexión ADB
    $testResults.tests.adb_connection = Test-ADBConnection
    if (-not $testResults.tests.adb_connection) {
        Write-TestLog "❌ Test falló: No hay conexión ADB" "ERROR"
        return $false
    }
    
    # Test de instalación
    $testResults.tests.installation = Test-AppInstallation
    if (-not $testResults.tests.installation) {
        Write-TestLog "⚠️ App no instalada, intentando instalar..." "WARN"
        if ($BuildFirst) {
            Write-TestLog "🔨 Compilando e instalando app..." "INFO"
            & .\build-and-install.ps1
            $testResults.tests.installation = Test-AppInstallation
        }
    }
    
    # Test de lanzamiento
    $testResults.tests.launch = Test-AppLaunch
    
    # Test de permisos
    $testResults.tests.permissions = Test-AppPermissions
    
    # Test de rendimiento
    $testResults.tests.performance = Test-AppPerformance
    
    # Test de crashes
    $testResults.tests.crash = Test-AppCrash
    
    # Test de logs
    $testResults.tests.logs = Test-AppLogs
    
    # Test de almacenamiento
    $testResults.tests.storage = Test-AppStorage
    
    # Test de red
    $testResults.tests.network = Test-AppNetwork
    
    # Test de UI
    $testResults.tests.ui = Test-AppUI
    
    # Test de compatibilidad
    $testResults.tests.compatibility = Test-AppCompatibility
    
    # Resumen de resultados
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Colors.Header
    Write-TestLog "📊 RESUMEN DE RESULTADOS" "INFO"
    
    $passedTests = 0
    $totalTests = $testResults.tests.Count
    
    foreach ($test in $testResults.tests.GetEnumerator()) {
        $status = if ($test.Value) { "✅ PASÓ" } else { "❌ FALLÓ" }
        $color = if ($test.Value) { $Colors.Success } else { $Colors.Error }
        Write-Host "   $($test.Key): $status" -ForegroundColor $color
        if ($test.Value) { $passedTests++ }
    }
    
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    Write-TestLog "📈 Tasa de éxito: $passedTests/$totalTests ($successRate%)" "INFO"
    
    # Guardar reporte
    Save-TestReport -Results $testResults
    
    return $passedTests -eq $totalTests
}

function Start-PerformanceTest {
    Write-TestLog "⚡ Iniciando test de rendimiento..." "INFO"
    
    $results = @{
        timestamp = $TIMESTAMP
        package = $PACKAGE
        performance = @{}
    }
    
    # Test de memoria
    Write-TestLog "📊 Monitoreando uso de memoria..." "INFO"
    $memoryInfo = & $ADB shell dumpsys meminfo $PACKAGE
    $results.performance.memory = $memoryInfo
    
    # Test de CPU
    Write-TestLog "🔥 Monitoreando uso de CPU..." "INFO"
    $cpuInfo = & $ADB shell top -n 1 | Select-String $PACKAGE
    $results.performance.cpu = $cpuInfo
    
    # Test de batería
    Write-TestLog "🔋 Verificando impacto en batería..." "INFO"
    $batteryInfo = & $ADB shell dumpsys battery
    $results.performance.battery = $batteryInfo
    
    # Test de red
    Write-TestLog "🌐 Verificando uso de red..." "INFO"
    $networkInfo = & $ADB shell dumpsys netstats | Select-String $PACKAGE
    $results.performance.network = $networkInfo
    
    Save-TestReport -Results $results
    Write-TestLog "✅ Test de rendimiento completado" "INFO"
}

function Start-StressTest {
    Write-TestLog "🔥 Iniciando test de estrés..." "INFO"
    
    $results = @{
        timestamp = $TIMESTAMP
        package = $PACKAGE
        stress = @{
            iterations = 0
            crashes = 0
            memory_leaks = 0
        }
    }
    
    $iterations = 20
    $crashes = 0
    
    for ($i = 1; $i -le $iterations; $i++) {
        Write-TestLog "   Iteración $i/$iterations" "INFO"
        
        # Lanzar app
        & $ADB shell am start -n "$PACKAGE/$ACTIVITY"
        Start-Sleep -Seconds 2
        
        # Verificar si hay crash
        $crashLogs = & $ADB logcat -d | Select-String -Pattern "FATAL|CRASH" | Select-String $PACKAGE
        if ($crashLogs) {
            $crashes++
            Write-TestLog "   ⚠️ Crash detectado en iteración $i" "WARN"
        }
        
        # Detener app
        & $ADB shell am force-stop $PACKAGE
        Start-Sleep -Seconds 1
    }
    
    $results.stress.iterations = $iterations
    $results.stress.crashes = $crashes
    $crashRate = [math]::Round(($crashes / $iterations) * 100, 2)
    
    Write-TestLog "📊 Resultados del test de estrés:" "INFO"
    Write-TestLog "   Iteraciones: $iterations" "INFO"
    Write-TestLog "   Crashes: $crashes" "INFO"
    Write-TestLog "   Tasa de crash: $crashRate%" "INFO"
    
    Save-TestReport -Results $results
    Write-TestLog "✅ Test de estrés completado" "INFO"
}

function Start-QuickTest {
    Write-TestLog "⚡ Iniciando test rápido..." "INFO"
    
    $results = @{
        timestamp = $TIMESTAMP
        package = $PACKAGE
        quick_tests = @{}
    }
    
    # Test básicos
    $results.quick_tests.adb_connection = Test-ADBConnection
    $results.quick_tests.installation = Test-AppInstallation
    $results.quick_tests.launch = Test-AppLaunch
    $results.quick_tests.crash = Test-AppCrash
    
    # Resumen rápido
    $passed = ($results.quick_tests.Values | Where-Object { $_ -eq $true }).Count
    $total = $results.quick_tests.Count
    
    Write-TestLog "📊 Test rápido completado: $passed/$total pasaron" "INFO"
    
    Save-TestReport -Results $results
    return $passed -eq $total
}

# Ejecutar test según el tipo especificado
switch ($TestType.ToLower()) {
    "full-test" {
        Start-FullTest
    }
    "performance-test" {
        Start-PerformanceTest
    }
    "stress-test" {
        Start-StressTest
    }
    "quick-test" {
        Start-QuickTest
    }
    "help" {
        Write-Host "🧪 Script de Testing Automatizado para App Android" -ForegroundColor $Colors.Header
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Colors.Header
        Write-Host "Comandos disponibles:" -ForegroundColor $Colors.Info
        Write-Host "  full-test        - Test completo de todas las funcionalidades" -ForegroundColor White
        Write-Host "  performance-test - Test específico de rendimiento" -ForegroundColor White
        Write-Host "  stress-test      - Test de estrés (múltiples lanzamientos)" -ForegroundColor White
        Write-Host "  quick-test       - Test rápido de funcionalidades básicas" -ForegroundColor White
        Write-Host "  help             - Mostrar esta ayuda" -ForegroundColor White
        Write-Host ""
        Write-Host "Opciones:" -ForegroundColor $Colors.Info
        Write-Host "  -BuildFirst      - Compilar e instalar antes del test" -ForegroundColor White
        Write-Host "  -InstallOnly     - Solo instalar sin test" -ForegroundColor White
        Write-Host "  -Verbose         - Mostrar logs detallados" -ForegroundColor White
        Write-Host "  -TestDuration    - Duración del test en segundos" -ForegroundColor White
        Write-Host "  -LogLevel        - Nivel de log (DEBUG, INFO, WARN, ERROR)" -ForegroundColor White
        Write-Host ""
        Write-Host "Ejemplos:" -ForegroundColor $Colors.Info
        Write-Host "  .\android-test-automation.ps1 full-test" -ForegroundColor $Colors.Debug
        Write-Host "  .\android-test-automation.ps1 performance-test -Verbose" -ForegroundColor $Colors.Debug
        Write-Host "  .\android-test-automation.ps1 quick-test -BuildFirst" -ForegroundColor $Colors.Debug
    }
    default {
        Write-TestLog "❌ Tipo de test desconocido: $TestType" "ERROR"
        Write-TestLog "   Usa '.\android-test-automation.ps1 help' para ver opciones disponibles" "WARN"
    }
} 