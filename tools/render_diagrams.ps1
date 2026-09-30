# Render every diagrams/src/*.mmd to SVG + PNG via kroki.io (Mermaid 11).
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'diagrams\src'
$svgDir = Join-Path $root 'diagrams\svg'
$pngDir = Join-Path $root 'diagrams\png'
New-Item -ItemType Directory -Force -Path $svgDir, $pngDir | Out-Null

$failed = @()
Get-ChildItem $src -Filter *.mmd | ForEach-Object {
    $name = $_.BaseName
    $text = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    foreach ($fmt in @('svg', 'png')) {
        $dir = if ($fmt -eq 'svg') { $svgDir } else { $pngDir }
        $out = Join-Path $dir "$name.$fmt"
        $ok = $false
        for ($i = 1; $i -le 3; $i++) {
            try {
                $resp = Invoke-WebRequest -Uri "https://kroki.io/mermaid/$fmt" `
                    -Method Post -Body $bytes `
                    -ContentType 'text/plain; charset=utf-8' `
                    -UseBasicParsing -TimeoutSec 90
                if ($resp.Content -is [string]) {
                    [System.IO.File]::WriteAllText($out, $resp.Content, [System.Text.UTF8Encoding]::new($false))
                } else {
                    [System.IO.File]::WriteAllBytes($out, [byte[]]$resp.Content)
                }
                $ok = $true
                break
            } catch {
                Write-Host "retry $i/$3 failed for $name.$fmt : $($_.Exception.Message)"
                Start-Sleep -Seconds (2 * $i)
            }
        }
        if ($ok) {
            $kb = [math]::Round((Get-Item $out).Length / 1KB, 1)
            Write-Host "OK   $name.$fmt ($kb KB)"
        } else {
            $failed += "$name.$fmt"
        }
    }
    Start-Sleep -Milliseconds 300
}
if ($failed.Count -gt 0) {
    Write-Host "FAILED: $($failed -join ', ')"
    exit 1
}
Write-Host "All diagrams rendered."
