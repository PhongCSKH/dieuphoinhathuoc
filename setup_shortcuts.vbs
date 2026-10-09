Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = "C:\Users\cuongnq\Desktop\IUPHIN~1"
zaloDir = rootDir & "\zalo-service"

desktopFolder = WshShell.SpecialFolders("Desktop")
startupFolder = WshShell.SpecialFolders("Startup")

' 1. Tao Shortcut Startup: Tu khoi dong ngam Zalo Bridge khi mo may
startupLnkPath = startupFolder & "\ZaloBridge_Startup.lnk"
Set scStartup = WshShell.CreateShortcut(startupLnkPath)
scStartup.TargetPath = "wscript.exe"
scStartup.Arguments = """" & zaloDir & "\start_service_hidden.vbs"""
scStartup.WorkingDirectory = zaloDir
scStartup.Description = "Tu dong khoi dong Zalo Dispatch Bridge chay ngam"
scStartup.Save

' 2. Tao Shortcut duy nhat tren Desktop: Dieu Phoi Nha Thuoc.lnk (1-Click mo ca hai)
desktopLnkPath = desktopFolder & "\Dieu Phoi Nha Thuoc.lnk"
Set scDesktop = WshShell.CreateShortcut(desktopLnkPath)
scDesktop.TargetPath = "wscript.exe"
scDesktop.Arguments = """" & rootDir & "\Mo_He_Thong_Dieu_Phoi.vbs"""
scDesktop.WorkingDirectory = rootDir
scDesktop.Description = "He Thong Dieu Phoi Nha Thuoc (Da tich hop Zalo Bridge ngam)"

chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
If fso.FileExists(chromePath) Then
    scDesktop.IconLocation = chromePath & ",0"
End If
scDesktop.Save

WScript.Echo "SETUP_SHORTCUTS_OK"
