$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Dabby.lnk"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$IconPath = Join-Path $ScriptDir "public\dobby.ico"

# Create native Windows .lnk shortcut via WScript.Shell
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "https://www.datalis.in/"
$Shortcut.IconLocation = "$IconPath,0"
$Shortcut.Description = "Dabby - AI Business Intelligence"
$Shortcut.Save()

# Create .url format fallback
$UrlPath = Join-Path $DesktopPath "Dabby.url"
$UrlContent = "[InternetShortcut]`r`nURL=https://www.datalis.in/`r`nIconIndex=0`r`nIconFile=$IconPath`r`n"
Set-Content -Path $UrlPath -Value $UrlContent

# Notify Windows Explorer shell to refresh desktop icons
try {
    $signature = '[DllImport("shell32.dll")] public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);'
    $type = Add-Type -MemberDefinition $signature -Name 'WinAPI' -Namespace 'Shell32' -PassThru
    $type::SHChangeNotify(0x8000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
} catch {
    # Ignore if type already defined
}

Write-Host "Success: Created Dabby.lnk desktop shortcut on your Desktop!" -ForegroundColor Green
