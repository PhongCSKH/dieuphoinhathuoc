Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
zaloDir = rootDir & "\zalo-service"

' 1. Khoi dong Trinh quan ly Khay he thong (System Tray Icon) va Dịch vu ngam 24/7
trayStart = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""$proc = Get-CimInstance Win32_Process -Filter \""CommandLine LIKE '%tray_monitor.ps1%'\""; if (-not $proc) { Start-Process 'wscript.exe' -ArgumentList '\""" & zaloDir & "\start_tray.vbs\""' -WindowStyle Hidden }"""
WshShell.Run trayStart, 0, False

' 2. Tim Chrome va khoi dong che do App sach se
chromePath = ""
chromePaths = Array( _
    WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe", _
    WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Google\Chrome\Application\chrome.exe", _
    WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe" _
)

For Each p In chromePaths
    If fso.FileExists(p) Then
        chromePath = p
        Exit For
    End If
Next

chromeArgs = " --disable-web-security --test-type --disable-infobars --app=""https://dieuphoi.xulydulieu.site/"" --user-data-dir=""" & WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\ChromeQMS"""

If chromePath <> "" Then
    WshShell.Run """" & chromePath & """" & chromeArgs, 1, False
Else
    WshShell.Run "https://dieuphoi.xulydulieu.site/", 1, False
End If
