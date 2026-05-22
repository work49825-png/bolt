$ports = 5173,5174
$pids = Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($procId in $pids) {
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Write-Host "killed $procId"
  } catch {
    Write-Host "could not kill $procId"
  }
}
if (-not $pids) { Write-Host "no port holders" }
