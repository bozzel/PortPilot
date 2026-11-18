<#
  PortPilot uitbrengen op GitHub (https://github.com/bozzel/PortPilot).

  Draaien vanuit C:\PortPilot:   .\release.cmd            (of: powershell -ExecutionPolicy Bypass -File .\release.ps1)
  Eerst kijken wat er gebeurt:   .\release.cmd -DryRun

  Wat het doet:
   1. leest het versienummer uit windows\package.json (bijv. 1.0.5)
   2. controleert: installer + portable in release\ (of windows\dist\), een kopje "## 1.0.5" in CHANGELOG.md,
      tag v1.0.5 en release bestaan nog niet op GitHub
   3. laat zien wat er gaat gebeuren en vraagt om bevestiging
   4. git: alle broncode toevoegen, commit "PortPilot 1.0.5", tag v1.0.5, push naar GitHub
   5. GitHub-release v1.0.5 maken met de changelog van die versie en de twee .exe-bestanden

  Eenmalig nodig: Git for Windows en GitHub CLI, en 1x inloggen:
     winget install --id Git.Git -e
     winget install --id GitHub.cli -e
     (nieuw PowerShell-venster openen)
     gh auth login        (kies GitHub.com, HTTPS, "Login with a web browser")
     gh auth setup-git
#>
param([switch]$DryRun)
$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$Repo = "bozzel/PortPilot"
$RepoUrl = "https://github.com/$Repo.git"

function Stop-Release($msg) { Write-Host ""; Write-Host "GESTOPT: $msg" -ForegroundColor Red; Write-Host ""; exit 1 }
function Step($msg) { Write-Host "-> $msg" -ForegroundColor Cyan }
# Windows PowerShell 5.1 maakt van tekst op stderr (git/gh melden voortgang daar) een fout; daarom per aanroep "Continue".
function Run($exe, [string[]]$a) {
  Write-Host "   $(Split-Path $exe -Leaf) $($a -join ' ')" -ForegroundColor DarkGray
  if ($DryRun) { return }
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  & $exe @a; $code = $LASTEXITCODE
  $ErrorActionPreference = $old
  if ($code -ne 0) { Stop-Release "$(Split-Path $exe -Leaf) $($a[0]) gaf een fout (code $code)." }
}
function Quiet($exe, [string[]]$a) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  & $exe @a *> $null; $code = $LASTEXITCODE
  $ErrorActionPreference = $old; return $code
}

# ---------- 1. gereedschap
$git = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git) { Stop-Release "Git niet gevonden. Installeer met: winget install --id Git.Git -e  (en open daarna een nieuw venster)." }
$gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
if (-not $gh) { Stop-Release "GitHub CLI niet gevonden. Installeer met: winget install --id GitHub.cli -e  (en open daarna een nieuw venster)." }
if ((Quiet $gh @("auth", "status")) -ne 0) { Stop-Release "Nog niet ingelogd bij GitHub. Draai: gh auth login   en daarna: gh auth setup-git" }

# ---------- 2. versie, bestanden, changelog
$pkg = Get-Content -LiteralPath "windows\package.json" -Raw | ConvertFrom-Json
$ver = [string]$pkg.version
if ($ver -notmatch '^\d+\.\d+\.\d+$') { Stop-Release "Versienummer '$ver' in windows\package.json is niet van de vorm 1.2.3." }
$tag = "v$ver"
$files = @()
foreach ($n in @("PortPilot-Setup-$ver.exe", "PortPilot-$ver-portable.exe")) {
  $f = @("release\$n", "windows\dist\$n") | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $f) { Stop-Release "$n niet gevonden in release\ of windows\dist\. Bouw eerst (windows\build.cmd) of zet het bestand in release\." }
  $files += (Resolve-Path -LiteralPath $f).Path
}
$log = Get-Content -LiteralPath "CHANGELOG.md" -Encoding UTF8
$start = -1; for ($i = 0; $i -lt $log.Count; $i++) { if ($log[$i] -match "^##\s+$([regex]::Escape($ver))(\s|$)") { $start = $i; break } }
if ($start -lt 0) { Stop-Release "Geen kopje '## $ver - datum' in CHANGELOG.md. Schrijf eerst wat er nieuw is in deze versie." }
$end = $log.Count; for ($i = $start + 1; $i -lt $log.Count; $i++) { if ($log[$i] -match '^##\s+\d') { $end = $i; break } }
$notes = ($log[($start + 1)..($end - 1)] -join "`n").Trim()
if (-not $notes) { Stop-Release "Het kopje '## $ver' in CHANGELOG.md is leeg." }
$notesFile = Join-Path $env:TEMP "portpilot-notes-$ver.md"
[IO.File]::WriteAllText($notesFile, $notes + "`n", (New-Object Text.UTF8Encoding $false))

# ---------- 3. git-repository (eerste keer: koppelen aan GitHub)
if (-not (Test-Path -LiteralPath ".git")) {
  Step "Eerste keer: map koppelen aan $RepoUrl"
  Run $git @("init", "-b", "main")
  Run $git @("remote", "add", "origin", $RepoUrl)
  Run $git @("fetch", "origin")
  if (-not $DryRun) {
    if ((Quiet $git @("rev-parse", "--verify", "--quiet", "origin/main")) -eq 0) {
      Run $git @("reset", "origin/main")                                            # geschiedenis van GitHub overnemen, je bestanden blijven staan
      $deleted = @(& $git ls-files --deleted)
    foreach ($d in $deleted) { Run $git @("checkout", "--", $d) }   # bijv. LICENSE terugzetten
    }
  }
} else {
  Run $git @("fetch", "origin", "--tags")
}
if (-not $DryRun) {
  if ((Quiet $git @("ls-remote", "--exit-code", "--tags", "origin", "refs/tags/$tag")) -eq 0) { Stop-Release "Tag $tag bestaat al op GitHub. Verhoog het versienummer in windows\package.json." }
  if ((Quiet $gh @("release", "view", $tag, "--repo", $Repo)) -eq 0) { Stop-Release "Release $tag bestaat al op GitHub." }
}

# ---------- 4. overzicht en bevestiging
Write-Host ""
Write-Host "PortPilot $ver uitbrengen op github.com/$Repo" -ForegroundColor Green
Write-Host "Bestanden:"; $files | ForEach-Object { Write-Host ("   {0}  ({1:N1} MB)" -f $_, ((Get-Item -LiteralPath $_).Length / 1MB)) }
Write-Host "Changelog:"; $notes -split "`n" | ForEach-Object { Write-Host "   $_" }
Write-Host ""
if ($DryRun) { Write-Host "DRY RUN: er wordt niets verstuurd. Dit zou er gebeuren:" -ForegroundColor Yellow }
else { $ok = Read-Host "Doorgaan? (j/n)"; if ($ok -notmatch '^[jJyY]') { Stop-Release "Afgebroken, er is niets verstuurd." } }

# ---------- 5. git: commit, tag, push
Step "Broncode vastleggen"
Run $git @("add", "-A")
$changes = $true
if (-not $DryRun) { $changes = ((Quiet $git @("diff", "--cached", "--quiet")) -ne 0) }
if ($changes) { Run $git @("commit", "-m", "PortPilot $ver") } else { Write-Host "   geen wijzigingen in de broncode" }
Run $git @("tag", "-a", $tag, "-m", "PortPilot $ver")
Step "Naar GitHub sturen"
Run $git @("push", "-u", "origin", "main")
Run $git @("push", "origin", $tag)

# ---------- 6. release met changelog en bestanden
Step "Release $tag maken en bestanden uploaden (kan een paar minuten duren)"
Run $gh (@("release", "create", $tag) + $files + @("--repo", $Repo, "--title", "PortPilot $ver", "--notes-file", $notesFile, "--latest", "--verify-tag"))
Remove-Item -LiteralPath $notesFile -ErrorAction SilentlyContinue

Write-Host ""
if ($DryRun) { Write-Host "DRY RUN klaar. Zonder -DryRun draaien om echt uit te brengen." -ForegroundColor Yellow }
else { Write-Host "Klaar: https://github.com/$Repo/releases/tag/$tag" -ForegroundColor Green; Write-Host "Testers met 1.0.4 of nieuwer krijgen de update vanzelf aangeboden." }
