# PowerShell macro script to export all Pokepaste teams into AllTeams.txt
$ExportDir = $PSScriptRoot
$WorkspaceRoot = (Get-Item $ExportDir).Parent.FullName
$outputFile = Join-Path $WorkspaceRoot "AllTeams.txt"
$jsPath = Join-Path $WorkspaceRoot "js\preset-teams.js"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MACRO: Sincronizador de PokePaste a TXT " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $jsPath)) {
    Write-Host "[ERROR] No se encontro el archivo $jsPath" -ForegroundColor Red
    pause
    exit 1
}

# Remove existing AllTeams.txt if present
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
}

$jsContent = Get-Content $jsPath -Raw
$match = [regex]::Match($jsContent, 'const\s+PRESET_TEAMS\s*=\s*(\[\s*[\s\S]*?\s*\]);')

if (-not $match.Success) {
    Write-Host "[ERROR] No se pudo parsear el listado PRESET_TEAMS." -ForegroundColor Red
    pause
    exit 1
}

$teams = $match.Groups[1].Value | ConvertFrom-Json
Write-Host "[INFO] Se encontraron $($teams.Count) equipos registrados." -ForegroundColor Yellow
Write-Host "[INFO] Iniciando extraccion y descarga..." -ForegroundColor Yellow
Write-Host ""

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$count = 0
foreach ($team in $teams) {
    $count++
    $title = if ($team.description) { $team.description } elseif ($team.name) { $team.name } else { $team.id }
    $creator = if ($team.creator) { $team.creator } else { "Desconocido" }
    
    Write-Host "[$count/$($teams.Count)] Procesando: $title..." -ForegroundColor White

    $header = "=== $title (Creador: $creator) ==="
    $pasteUrl = if ($team.pokepaste) { $team.pokepaste } elseif ($team.link) { $team.link } else { $null }
    $rawText = ""

    if ($pasteUrl) {
        $rawUrl = if (-not $pasteUrl.EndsWith("/raw")) { $pasteUrl.TrimEnd('/') + "/raw" } else { $pasteUrl }
        try {
            $rawText = Invoke-RestMethod -Uri $rawUrl -ErrorAction Stop
        } catch {
            $rawText = ""
        }
    }

    # Fallback to internal details array if raw request fails or URL is missing
    if (-not $rawText -and $team.details) {
        $lines = @()
        foreach ($mon in $team.details) {
            $itemStr = if ($mon.item) { " @ $($mon.item)" } else { "" }
            $lines += "$($mon.species)$itemStr"
            if ($mon.ability) { $lines += "Ability: $($mon.ability)" }
            if ($mon.teraType) { $lines += "Tera Type: $($mon.teraType)" }
            if ($mon.nature) { $lines += "$($mon.nature) Nature" }
            if ($mon.evs) { $lines += "EVs: $($mon.evs)" }
            if ($mon.ivs) { $lines += "IVs: $($mon.ivs)" }
            if ($mon.moves) {
                foreach ($move in $mon.moves) {
                    $lines += "- $move"
                }
            }
            $lines += ""
        }
        $rawText = $lines -join "`n"
    }

    "$header`n$rawText`n`n" | Out-File -FilePath $outputFile -Append -Encoding utf8
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " EXPORTACION COMPLETADA CON EXITO!" -ForegroundColor Green
Write-Host " Archivo generado: $outputFile" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
