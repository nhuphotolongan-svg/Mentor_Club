# register-task.ps1 — Đăng ký Scheduled Task quét bảng YouTube mỗi 1 phút (chạy ẩn)
# Tự định vị: chạy scan-and-post.js NẰM CÙNG thư mục với file này.
# Chạy: powershell -ExecutionPolicy Bypass -File register-task.ps1
$ErrorActionPreference = 'Stop'

$TaskName = 'HMH-YouTube-AutoPost'
$Dir      = $PSScriptRoot
$Script   = Join-Path $Dir 'scan-and-post.js'
$NodeExe  = (Get-Command node).Source

if (-not (Test-Path (Join-Path $Dir 'node_modules'))) {
    Write-Host "[!] Chua co node_modules trong $Dir"
    Write-Host "    Chay truoc:  cd `"$Dir`"; npm install"
}

# Lệnh chạy: node scan-and-post.js  (ẩn cửa sổ)
$Action = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$Script`"" -WorkingDirectory $Dir

# Lặp mỗi 1 phút, vô hạn (KHÔNG set RepetitionDuration — MaxValue gây lỗi XML out-of-range)
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1)

$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew

$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# Gỡ task cũ nếu có
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger `
    -Settings $Settings -Principal $Principal -Description 'Quet Lark Base "Lich dang YouTube" moi phut, dang video den han len YouTube.' | Out-Null

Write-Host "OK - Registered Scheduled Task: $TaskName (every 1 minute)"
Write-Host "   Working dir: $Dir"
Write-Host "   Disable: Disable-ScheduledTask -TaskName $TaskName"
Write-Host "   Enable:  Enable-ScheduledTask  -TaskName $TaskName"
Write-Host "   Remove:  Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
Write-Host "   Run now: Start-ScheduledTask -TaskName $TaskName"
