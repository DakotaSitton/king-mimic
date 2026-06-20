# Captures all demo-state screenshots. Screenshots use Edge's native --screenshot
# (see tools/screenshot.js) — no Playwright.
#   Usage:  powershell -File tools/shoot.ps1 [state ...]
#
# IMPORTANT (owner 2026-06-19): this script must NEVER blanket-kill `bun`. The old version
# ran `Get-Process bun | Stop-Process` on both setup and teardown, which nuked the user's own
# `bun --watch run server.js` dev server every time. Now: if a server is already serving :3000
# we REUSE it and leave it untouched; we only ever stop a server THIS script started itself.

function Test-Server {
  try { (Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 }
  catch { $false }
}

$server = $null
if (Test-Server) {
  Write-Host "Reusing the server already on :3000 (leaving it running)."
} else {
  Write-Host "No server on :3000 — starting a temporary one."
  $server = Start-Process -FilePath "bun" -ArgumentList "run","server.js" -PassThru -WindowStyle Hidden
  for ($i = 0; $i -lt 20 -and -not (Test-Server); $i++) { Start-Sleep -Milliseconds 250 }
}

try {
  bun tools/screenshot.js @args
} finally {
  # Only stop the server we started ourselves — never a pre-existing one, never a blanket bun kill.
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
}
