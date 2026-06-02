# git-backup.ps1 — backup sicuro di JARVIS su GitHub.
# Pulisce le .git rotte delle skill, verifica che NESSUN segreto sia tracciato,
# poi committa e fa il push. Si interrompe se trova qualcosa di sensibile.
$ErrorActionPreference = "Stop"
$root = "C:\Users\ceran\Documents\Claude\Projects\JARVIS"
Set-Location $root

Write-Host "== 1. Pulizia .git interne delle skill ==" -ForegroundColor Cyan
Get-ChildItem -Path ".claude\skills" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $g = Join-Path $_.FullName ".git"
  if (Test-Path $g) { Remove-Item $g -Recurse -Force; Write-Host "  rimosso $g" }
}

Write-Host "== 2. Stage di tutte le modifiche ==" -ForegroundColor Cyan
git add -A

Write-Host "== 3. Controllo sicurezza: nessun segreto tracciato ==" -ForegroundColor Cyan
$bad = git ls-files | Select-String -Pattern '(^|/)\.env$|AGGIORNATA|missive|hot-index\.json|interactions\.jsonl'
if ($bad) {
  Write-Host "STOP: file sensibili/transitori in stage:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "Backup ANNULLATO. Controlla .gitignore prima di riprovare." -ForegroundColor Red
  exit 1
}
Write-Host "  OK: niente segreti tracciati." -ForegroundColor Green

Write-Host "== 4. Commit ==" -ForegroundColor Cyan
$msg = "JARVIS - backup " + (Get-Date -Format "yyyy-MM-dd HH:mm")
git commit -m $msg

Write-Host "== 5. Push ==" -ForegroundColor Cyan
git push
Write-Host "Fatto: backup completato su GitHub." -ForegroundColor Green
