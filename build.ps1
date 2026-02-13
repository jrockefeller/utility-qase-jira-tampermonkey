#!/usr/bin/env pwsh
# Build script for Aviator Tampermonkey
# Combines all source files into a single aviator.js that replaces the module loader

# Set console to UTF-8 to handle emojis
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Building Aviator..." -ForegroundColor Cyan

# Define file order for proper dependency resolution
$sourceFiles = @(
    "src\shared.js",
    "src\aviator.js", 
    "src\traciator.js"
)

$outputFile = "aviator.js"
$tempFile = "aviator.temp.js"

# Check if source files exist
foreach ($file in $sourceFiles) {
    if (!(Test-Path $file)) {
        Write-Error "❌ Source file not found: $file"
        exit 1
    }
}

Write-Host "Combining source files..." -ForegroundColor Yellow

# Create the built aviator.js that replaces the loader
$header = @"
// ==================================================
// Aviator - Combined Build
// Generated on $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
// This file replaces the module loader with combined code
// ==================================================

(function () {
    'use strict';
    
"@

# Create footer that initializes the tools (matching the original loader logic)
$footer = @"

    // Initialize Aviator after all modules are loaded (matching original loader)
    async function initAviator() {
        try {
            console.log('All Aviator modules loaded successfully');
            
            // Initialize the main functionality
            if (typeof AviatorShared.addAviatorTools === 'function') {
                AviatorShared.addAviatorTools();
                console.log('Aviator tools initialized');
            } else {
                console.error('addAviatorTools function not found');
            }
            
        } catch (error) {
            console.error('Failed to load Aviator modules:', error);
        }
    }

    // Start initialization
    initAviator();

})();
"@

# Start with header
$header | Out-File -FilePath $tempFile -Encoding UTF8

# Combine source files with proper UTF-8 handling
foreach ($file in $sourceFiles) {
    Write-Host "   Adding $file..." -ForegroundColor Gray
    
    # Add separator comment
    "`n// === $file ===`n" | Out-File -FilePath $tempFile -Append -Encoding UTF8
    
    # Read and append file content with UTF-8 encoding
    $content = Get-Content $file -Raw -Encoding UTF8
    $content | Out-File -FilePath $tempFile -Append -Encoding UTF8 -NoNewline
    
    # Add newlines between files
    "`n`n" | Out-File -FilePath $tempFile -Append -Encoding UTF8 -NoNewline
}

# Add footer
$footer | Out-File -FilePath $tempFile -Append -Encoding UTF8

# Replace the output file
if (Test-Path $outputFile) {
    Remove-Item $outputFile
}
Move-Item $tempFile $outputFile

$fileSize = [math]::Round((Get-Item $outputFile).Length / 1KB, 2)
Write-Host "Build complete!" -ForegroundColor Green
Write-Host "   Output: $outputFile ($($fileSize) KB)" -ForegroundColor Green

# Optional: Run a quick validation
Write-Host "Validating build..." -ForegroundColor Yellow
$content = Get-Content $outputFile -Raw

$checks = @{
    "AviatorShared" = $content -match "const AviatorShared"
    "Aviator" = $content -match "const Aviator"
    "Traciator" = $content -match "const Traciator"
    "addAviatorTools" = $content -match "addAviatorTools"
}

$allPassed = $true
foreach ($check in $checks.GetEnumerator()) {
    if ($check.Value) {
        Write-Host "   $($check.Key) found" -ForegroundColor Green
    } else {
        Write-Host "   $($check.Key) missing" -ForegroundColor Red
        $allPassed = $false
    }
}

if ($allPassed) {
    Write-Host "Build validation passed!" -ForegroundColor Green
    Write-Host "Your aviator.user.js will now load this combined file" -ForegroundColor Cyan
} else {
    Write-Host "Build validation found issues" -ForegroundColor Yellow
}