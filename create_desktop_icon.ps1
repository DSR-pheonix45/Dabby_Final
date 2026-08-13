$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Dabby.url"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$IconPath = Join-Path $ScriptDir "public\dobby.ico"

$Content = "[InternetShortcut]`r`nURL=http://localhost:5173`r`nIconIndex=0`r`nIconFile=$IconPath`r`n"
Set-Content -Path $ShortcutPath -Value $Content

Write-Host "Success: Dabby Desktop Shortcut created at: $ShortcutPath" -ForegroundColor Green
