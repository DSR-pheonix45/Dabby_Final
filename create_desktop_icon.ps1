$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Dabby.url"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$IconPath = Join-Path $ScriptDir "public\dobby.ico"

$Content = "[InternetShortcut]`r`nURL=https://www.datalis.in/`r`nIconIndex=0`r`nIconFile=$IconPath`r`n"
Set-Content -Path $ShortcutPath -Value $Content

Write-Host "Success: Updated Dabby Desktop Shortcut for https://www.datalis.in/ at: $ShortcutPath" -ForegroundColor Green
