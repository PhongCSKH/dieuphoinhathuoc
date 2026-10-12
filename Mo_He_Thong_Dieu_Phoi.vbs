Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetFolder(fso.GetParentFolderName(WScript.ScriptFullName)).ShortPath
zaloDir = rootDir & "\zalo-service"

' 1. Dam bao port 5050 khoi dong san sang truoc khi mo Chrome (Dong bo)
checkCmd = "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect('127.0.0.1', 5050); $open = $true; $tcp.Close(); } catch { $open = $false }; if (-not $open) { Start-Process 'node' -ArgumentList 'server.js' -WorkingDirectory '" & zaloDir & "' -WindowStyle Hidden; Start-Sleep -Milliseconds 1500 }"""
WshShell.Run checkCmd, 0, True

' 2. Khoi dong Trinh quan ly Khay he thong (System Tray Icon)
trayStart = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""$proc = Get-CimInstance Win32_Process -Filter \""CommandLine LIKE '%tray_monitor.ps1%'\""; if (-not $proc) { Start-Process 'wscript.exe' -ArgumentList '\""" & zaloDir & "\start_tray.vbs\""' -WindowStyle Hidden }"""
WshShell.Run trayStart, 0, False

' 3. Tim Chrome va khoi dong che do App sach se
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
