Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\cuongnq\Desktop\IUPHIN~1\zalo-service"
WshShell.Run "node server.js", 0, False
