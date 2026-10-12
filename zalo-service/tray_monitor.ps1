Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir

$nodeExe = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $nodeExe)) { $nodeExe = "node" }

# 1. Hàm đảm bảo tiến trình node server.js luôn chạy ngầm
function Ensure-NodeServer {
    $conn = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue
    if (-not $conn) {
        Start-Process $nodeExe -ArgumentList "server.js" -WorkingDirectory $scriptDir -WindowStyle Hidden
        Start-Sleep -Milliseconds 1500
    }
}
Ensure-NodeServer

# 2. Tạo Icon đẹp mắt (chữ thập xanh y tế điều phối) cho khay hệ thống
$bmp = New-Object System.Drawing.Bitmap(32, 32)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(14, 116, 144))
$g.FillEllipse($brushBg, 1, 1, 30, 30)
$brushCross = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$g.FillRectangle($brushCross, 13, 6, 6, 20)
$g.FillRectangle($brushCross, 6, 13, 20, 6)
$g.Dispose()
$hIcon = $bmp.GetHicon()
$trayIcon = [System.Drawing.Icon]::FromHandle($hIcon)

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = $trayIcon
$notify.Text = "Điều Phối Nhà Thuốc - Đang giám sát ngầm 24/7"
$notify.Visible = $true

# 3. Tạo Context Menu chuột phải
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$menuOpen = $contextMenu.Items.Add("🖥️ Mở Bảng Điều Phối")
$menuOpen.Font = New-Object System.Drawing.Font($contextMenu.Font, [System.Drawing.FontStyle]::Bold)
$menuStatus = $contextMenu.Items.Add("🟢 Trạng thái: Đang giám sát 24/7 (Cổng 5050)")
$menuStatus.Enabled = $false
$contextMenu.Items.Add("-") | Out-Null
$menuRestart = $contextMenu.Items.Add("🔄 Khởi động lại dịch vụ")
$contextMenu.Items.Add("-") | Out-Null
$menuExit = $contextMenu.Items.Add("❌ Thoát hoàn toàn")

$openAction = {
    $vbsPath = Join-Path $rootDir "Mo_He_Thong_Dieu_Phoi.vbs"
    if (Test-Path $vbsPath) {
        Start-Process "wscript.exe" -ArgumentList "`"$vbsPath`""
    } else {
        Start-Process "https://dieuphoi.xulydulieu.site/"
    }
}

$menuOpen.add_Click($openAction)
$notify.add_DoubleClick($openAction)

$menuRestart.add_Click({
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
    Start-Process "node" -ArgumentList "server.js" -WorkingDirectory $scriptDir -WindowStyle Hidden
    $notify.ShowBalloonTip(3000, "Điều Phối Nhà Thuốc", "Đã khởi động lại dịch vụ ngầm thành công!", [System.Windows.Forms.ToolTipIcon]::Info)
})

$appContext = New-Object System.Windows.Forms.ApplicationContext

$menuExit.add_Click({
    $notify.Visible = $false
    $notify.Dispose()
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    $appContext.ExitThread()
    Stop-Process -Id $PID -Force
})

$notify.ContextMenuStrip = $contextMenu

# 4. Bật thông báo Windows Balloon Notification khi khởi động để người dùng nhận biết ngay
$notify.ShowBalloonTip(4000, "Điều phối nhà thuốc", "Click đúp vào icon để mở bảng điều phối", [System.Windows.Forms.ToolTipIcon]::Info)

# 5. Timer định kỳ kiểm tra node server.js mỗi 10 giây
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 10000
$timer.add_Tick({
    Ensure-NodeServer
})
$timer.Start()

[System.Windows.Forms.Application]::Run($appContext)
