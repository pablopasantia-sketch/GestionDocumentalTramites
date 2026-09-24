# Script para generar Backup automatico de DB_TRAMITES_EXTERNOS
$ErrorActionPreference = "Stop"

$directorio = $PSScriptRoot
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archivoBackup = Join-Path $directorio "DB_TRAMITES_EXTERNOS_$timestamp.bak"

Write-Host "Generando backup de la base de datos 'DB_TRAMITES_EXTERNOS'..." -ForegroundColor Cyan

try {
    sqlcmd -S localhost -E -C -Q "BACKUP DATABASE [DB_TRAMITES_EXTERNOS] TO DISK = N'$archivoBackup' WITH FORMAT, MEDIANAME = 'DB_TRAMITES_EXTERNOS_Backup', NAME = 'Full Backup of DB_TRAMITES_EXTERNOS';"
    Write-Host "`n✅ Backup generado con exito!" -ForegroundColor Green
    Write-Host "Archivo: $archivoBackup" -ForegroundColor Yellow
}
catch {
    Write-Host "`nError al generar el backup: $_" -ForegroundColor Red
}
