# Boots the server, captures all demo-state screenshots, cleans up.
# Screenshots use Edge's native --screenshot (see tools/screenshot.js) — no Playwright.
#   Usage:  powershell -File tools/shoot.ps1 [state ...]
Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$server = Start-Process -FilePath "bun" -ArgumentList "run","server.js" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
try {
  bun tools/screenshot.js @args
} finally {
  if ($server -and -not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
  Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
