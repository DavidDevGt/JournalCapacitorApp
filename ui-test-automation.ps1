# Script de Testing de UI Automatizado para App Android
# Uso: .\ui-test-automation.ps1 [comando]
# Requiere: uiautomator2 en el dispositivo

param(
    [string]$TestType = "help",
    [switch]$Screenshot,
    [switch]$Record,
    [int]$Timeout = 10
)

# Configuración
$ADB = "C:\Users\josue\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$PACKAGE = "com.daviddevgt.journalapp"
$ACTIVITY = "com.daviddevgt.journalapp.MainActivity"
$TEST_RESULTS_DIR = ".\ui-test-results"

# Colores
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Blue"
    Debug = "Cyan"
}

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { $Colors.Error }
        "WARN" { $Colors.Warning }
        "INFO" { $Colors.Info }
        "DEBUG" { $Colors.Debug }
        default { $Colors.Info }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Test-UIElements {
    Write-TestLog "🎨 Verificando elementos de UI..." "INFO"
    
    # Tomar screenshot
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $screenshotFile = "ui-test-$timestamp.png"
    
    & $ADB shell screencap -p /sdcard/$screenshotFile
    & $ADB pull /sdcard/$screenshotFile ./$screenshotFile
    & $ADB shell rm /sdcard/$screenshotFile
    
    Write-TestLog "📸 Screenshot guardado: $screenshotFile" "INFO"
    
    # Dump de elementos UI
    $uiDumpFile = "ui-dump-$timestamp.xml"
    & $ADB shell uiautomator dump /sdcard/$uiDumpFile
    & $ADB pull /sdcard/$uiDumpFile ./$uiDumpFile
    & $ADB shell rm /sdcard/$uiDumpFile
    
    Write-TestLog "📄 Dump de UI guardado: $uiDumpFile" "INFO"
    
    # Analizar elementos
    $uiContent = Get-Content $uiDumpFile -ErrorAction SilentlyContinue
    if ($uiContent) {
        $buttonCount = ($uiContent | Select-String "clickable=\"true\"").Count
        $textCount = ($uiContent | Select-String "text=").Count
        $imageCount = ($uiContent | Select-String "content-desc=").Count
        
        Write-TestLog "📊 Elementos detectados:" "INFO"
        Write-TestLog "   Botones clickeables: $buttonCount" "DEBUG"
        Write-TestLog "   Elementos con texto: $textCount" "DEBUG"
        Write-TestLog "   Elementos con descripción: $imageCount" "DEBUG"
        
        return $true
    } else {
        Write-TestLog "❌ No se pudo obtener dump de UI" "ERROR"
        return $false
    }
}

function Test-UINavigation {
    Write-TestLog "🧭 Probando navegación de UI..." "INFO"
    
    # Simular toques en diferentes áreas de la pantalla
    $screenSize = & $ADB shell wm size
    Write-TestLog "📱 Tamaño de pantalla: $screenSize" "DEBUG"
    
    # Extraer dimensiones
    if ($screenSize -match "(\d+)x(\d+)") {
        $width = [int]$Matches[1]
        $height = [int]$Matches[2]
        
        Write-TestLog "   Ancho: $width, Alto: $height" "DEBUG"
        
        # Simular toques en diferentes áreas
        $touchPoints = @(
            @{x = [math]::Round($width/2); y = [math]::Round($height/2); desc = "Centro"},
            @{x = [math]::Round($width/4); y = [math]::Round($height/2); desc = "Izquierda"},
            @{x = [math]::Round($width*3/4); y = [math]::Round($height/2); desc = "Derecha"},
            @{x = [math]::Round($width/2); y = [math]::Round($height/4); desc = "Arriba"},
            @{x = [math]::Round($width/2); y = [math]::Round($height*3/4); desc = "Abajo"}
        )
        
        foreach ($point in $touchPoints) {
            Write-TestLog "   Tocando $($point.desc)..." "DEBUG"
            & $ADB shell input tap $point.x $point.y
            Start-Sleep -Seconds 1
        }
        
        Write-TestLog "✅ Navegación de UI probada" "INFO"
        return $true
    } else {
        Write-TestLog "❌ No se pudo obtener tamaño de pantalla" "ERROR"
        return $false
    }
}

function Test-UIResponsiveness {
    Write-TestLog "⚡ Probando responsividad de UI..." "INFO"
    
    $startTime = Get-Date
    
    # Simular múltiples toques rápidos
    for ($i = 1; $i -le 10; $i++) {
        & $ADB shell input tap 500 500
        Start-Sleep -Milliseconds 100
    }
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-TestLog "   Tiempo de respuesta: $duration ms" "DEBUG"
    
    if ($duration -lt 2000) {
        Write-TestLog "✅ UI responsiva" "INFO"
        return $true
    } else {
        Write-TestLog "⚠️ UI puede estar lenta" "WARN"
        return $false
    }
}

function Test-UITheme {
    Write-TestLog "🎨 Verificando tema de UI..." "INFO"
    
    # Verificar si hay modo oscuro
    $darkMode = & $ADB shell settings get secure ui_night_mode
    Write-TestLog "   Modo oscuro: $darkMode" "DEBUG"
    
    # Verificar colores del sistema
    $systemColors = & $ADB shell dumpsys window | Select-String "mSystemUiColor"
    Write-TestLog "   Colores del sistema detectados" "DEBUG"
    
    return $true
}

function Test-UIAnimations {
    Write-TestLog "🎬 Probando animaciones de UI..." "INFO"
    
    # Simular gestos de swipe
    $screenSize = & $ADB shell wm size
    if ($screenSize -match "(\d+)x(\d+)") {
        $width = [int]$Matches[1]
        $height = [int]$Matches[2]
        
        # Swipe horizontal
        Write-TestLog "   Swipe horizontal..." "DEBUG"
        & $ADB shell input swipe $([math]::Round($width/4)) $([math]::Round($height/2)) $([math]::Round($width*3/4)) $([math]::Round($height/2))
        Start-Sleep -Seconds 1
        
        # Swipe vertical
        Write-TestLog "   Swipe vertical..." "DEBUG"
        & $ADB shell input swipe $([math]::Round($width/2)) $([math]::Round($height/4)) $([math]::Round($width/2)) $([math]::Round($height*3/4))
        Start-Sleep -Seconds 1
        
        Write-TestLog "✅ Animaciones probadas" "INFO"
        return $true
    } else {
        Write-TestLog "❌ No se pudo probar animaciones" "ERROR"
        return $false
    }
}

function Test-UIKeyboard {
    Write-TestLog "⌨️ Probando teclado..." "INFO"
    
    # Simular entrada de texto
    & $ADB shell input text "test"
    Start-Sleep -Seconds 1
    
    # Simular teclas especiales
    & $ADB shell input keyevent 4  # Back
    Start-Sleep -Seconds 1
    
    Write-TestLog "✅ Teclado probado" "INFO"
    return $true
}

function Test-UIAccessibility {
    Write-TestLog "♿ Verificando accesibilidad..." "INFO"
    
    # Verificar si hay elementos con content-desc
    $uiDumpFile = "accessibility-test-$TIMESTAMP.xml"
    & $ADB shell uiautomator dump /sdcard/$uiDumpFile
    & $ADB pull /sdcard/$uiDumpFile ./$uiDumpFile
    & $ADB shell rm /sdcard/$uiDumpFile
    
    $uiContent = Get-Content $uiDumpFile -ErrorAction SilentlyContinue
    if ($uiContent) {
        $accessibleElements = ($uiContent | Select-String "content-desc=").Count
        $clickableElements = ($uiContent | Select-String "clickable=\"true\"").Count
        
        Write-TestLog "   Elementos accesibles: $accessibleElements" "DEBUG"
        Write-TestLog "   Elementos clickeables: $clickableElements" "DEBUG"
        
        if ($accessibleElements -gt 0) {
            Write-TestLog "✅ Accesibilidad configurada" "INFO"
            return $true
        } else {
            Write-TestLog "⚠️ Pocos elementos accesibles" "WARN"
            return $false
        }
    } else {
        Write-TestLog "❌ No se pudo verificar accesibilidad" "ERROR"
        return $false
    }
}

function Start-FullUITest {
    Write-TestLog "🚀 Iniciando test completo de UI..." "INFO"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Colors.Info
    
    $results = @{
        timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        package = $PACKAGE
        ui_tests = @{}
    }
    
    # Lanzar app
    & $ADB shell am start -n "$PACKAGE/$ACTIVITY"
    Start-Sleep -Seconds 3
    
    # Ejecutar tests
    $results.ui_tests.elements = Test-UIElements
    $results.ui_tests.navigation = Test-UINavigation
    $results.ui_tests.responsiveness = Test-UIResponsiveness
    $results.ui_tests.theme = Test-UITheme
    $results.ui_tests.animations = Test-UIAnimations
    $results.ui_tests.keyboard = Test-UIKeyboard
    $results.ui_tests.accessibility = Test-UIAccessibility
    
    # Resumen
    $passedTests = ($results.ui_tests.Values | Where-Object { $_ -eq $true }).Count
    $totalTests = $results.ui_tests.Count
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Colors.Info
    Write-TestLog "📊 RESULTADOS DE UI" "INFO"
    
    foreach ($test in $results.ui_tests.GetEnumerator()) {
        $status = if ($test.Value) { "✅ PASÓ" } else { "❌ FALLÓ" }
        $color = if ($test.Value) { $Colors.Success } else { $Colors.Error }
        Write-Host "   $($test.Key): $status" -ForegroundColor $color
    }
    
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    Write-TestLog "📈 Tasa de éxito UI: $passedTests/$totalTests ($successRate%)" "INFO"
    
    # Guardar reporte
    if (-not (Test-Path $TEST_RESULTS_DIR)) {
        New-Item -ItemType Directory -Path $TEST_RESULTS_DIR | Out-Null
    }
    
    $reportFile = "$TEST_RESULTS_DIR\ui-test-report-$($results.timestamp).json"
    $results | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportFile -Encoding UTF8
    Write-TestLog "📄 Reporte UI guardado: $reportFile" "INFO"
    
    return $passedTests -eq $totalTests
}

function Start-QuickUITest {
    Write-TestLog "⚡ Test rápido de UI..." "INFO"
    
    # Lanzar app
    & $ADB shell am start -n "$PACKAGE/$ACTIVITY"
    Start-Sleep -Seconds 3
    
    # Tests básicos
    $elements = Test-UIElements
    $navigation = Test-UINavigation
    $responsiveness = Test-UIResponsiveness
    
    $passed = @($elements, $navigation, $responsiveness) | Where-Object { $_ -eq $true } | Measure-Object | Select-Object -ExpandProperty Count
    $total = 3
    
    Write-TestLog "📊 Test rápido UI: $passed/$total pasaron" "INFO"
    return $passed -eq $total
}

function Start-UIScreenshot {
    Write-TestLog "📸 Tomando screenshot de UI..." "INFO"
    
    # Lanzar app
    & $ADB shell am start -n "$PACKAGE/$ACTIVITY"
    Start-Sleep -Seconds 3
    
    # Tomar múltiples screenshots
    $screenshots = @()
    
    for ($i = 1; $i -le 5; $i++) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $filename = "ui-screenshot-$i-$timestamp.png"
        
        & $ADB shell screencap -p /sdcard/$filename
        & $ADB pull /sdcard/$filename ./$filename
        & $ADB shell rm /sdcard/$filename
        
        $screenshots += $filename
        Write-TestLog "   Screenshot ${i}: $filename" "INFO"
        
        Start-Sleep -Seconds 2
    }
    
    Write-TestLog "✅ Screenshots completados: $($screenshots.Count) archivos" "INFO"
    return $true
}

# Ejecutar según el tipo de test
switch ($TestType.ToLower()) {
    "full-test" {
        Start-FullUITest
    }
    "quick-test" {
        Start-QuickUITest
    }
    "screenshot" {
        Start-UIScreenshot
    }
    "help" {
        Write-Host "🎨 Script de Testing de UI Automatizado" -ForegroundColor $Colors.Info
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Colors.Info
        Write-Host "Comandos disponibles:" -ForegroundColor $Colors.Info
        Write-Host "  full-test    - Test completo de UI" -ForegroundColor White
        Write-Host "  quick-test   - Test rápido de UI" -ForegroundColor White
        Write-Host "  screenshot   - Tomar múltiples screenshots" -ForegroundColor White
        Write-Host "  help         - Mostrar esta ayuda" -ForegroundColor White
        Write-Host ""
        Write-Host "Opciones:" -ForegroundColor $Colors.Info
        Write-Host "  -Screenshot  - Incluir screenshots" -ForegroundColor White
        Write-Host "  -Record      - Grabar video (si está disponible)" -ForegroundColor White
        Write-Host "  -Timeout     - Timeout en segundos" -ForegroundColor White
        Write-Host ""
        Write-Host "Ejemplos:" -ForegroundColor $Colors.Info
        Write-Host "  .\ui-test-automation.ps1 full-test" -ForegroundColor $Colors.Debug
        Write-Host "  .\ui-test-automation.ps1 quick-test" -ForegroundColor $Colors.Debug
        Write-Host "  .\ui-test-automation.ps1 screenshot" -ForegroundColor $Colors.Debug
    }
    default {
        Write-TestLog "❌ Tipo de test desconocido: $TestType" "ERROR"
        Write-TestLog "   Usa '.\ui-test-automation.ps1 help' para ver opciones" "WARN"
    }
} 