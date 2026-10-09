Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
rootDir = "C:\Users\cuongnq\Desktop\IUPHIN~1"
zaloDir = rootDir & "\zalo-service"

' 1. Kiem tra xem port 5050 da chay chua. Neu chua, khoi dong ngam bang WScript
checkCmd = "powershell -NoProfile -WindowStyle Hidden -Command ""$tcp = New-Object System.Net.Sockets.TcpClient; try { $tcp.Connect('127.0.0.1', 5050); $open = $true; $tcp.Close(); } catch { $open = $false }; if (-not $open) { Start-Process 'node' -ArgumentList 'server.js' -WorkingDirectory '" & zaloDir & "' -WindowStyle Hidden; Start-Sleep -Milliseconds 1200 }"""
WshShell.Run checkCmd, 0, True

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
