# Driver for tools/screenshot.js — starts headless Edge with CDP, runs the
# screenshotter, then cleans up. Server must already be running on :3000.
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$profile = Join-Path $env:TEMP "km-shot-profile"
$proc = Start-Process -FilePath $edge -PassThru -ArgumentList @(
  "--headless=new", "--remote-debugging-port=9222", "--disable-gpu",
  "--no-first-run", "--no-default-browser-check",
  "--user-data-dir=$profile", "--window-size=1120,760", "about:blank"
)
Start-Sleep -Seconds 2
try {
  bun run tools/screenshot.js
} finally {
  if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  Get-Process msedge -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $edge } | ForEach-Object {
      # only kill the headless debug instances we spawned (best-effort)
    }
}
