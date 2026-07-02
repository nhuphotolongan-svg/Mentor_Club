<#
  cai-dat-notebooklm-mcp.ps1 — Nối Claude với NotebookLM trên máy MỚI (Windows).
  Chạy:  powershell -ExecutionPolicy Bypass -File cai-dat-notebooklm-mcp.ps1
  Làm 3 việc: (1) cài gói notebooklm-mcp-cli, (2) đăng nhập Google trích cookie, (3) đăng ký MCP vào Claude Code.
  Sau khi xong: RESTART Claude để nạp tool mcp__notebooklm-mcp__*.
#>

$ErrorActionPreference = "Stop"
Write-Host "==> [1/4] Cài gói notebooklm-mcp-cli ..." -ForegroundColor Cyan
python -m pip install --user --upgrade notebooklm-mcp-cli

# Tìm thư mục Scripts của Python user
$scriptsDir = python -c "import sysconfig;print(sysconfig.get_path('scripts','nt_user'))"
$scriptsDir = $scriptsDir.Trim()
$nlm = Join-Path $scriptsDir "nlm.exe"
$mcp = Join-Path $scriptsDir "notebooklm-mcp.exe"

if (-not (Test-Path $mcp)) {
  Write-Host "Không thấy notebooklm-mcp.exe ở $scriptsDir" -ForegroundColor Red
  Write-Host "Kiểm tra lại lệnh pip phía trên có thành công không." -ForegroundColor Red
  exit 1
}
Write-Host "    Exe: $mcp" -ForegroundColor DarkGray

Write-Host "==> [2/4] Đăng nhập Google (mở Chrome, đăng nhập tài khoản có NotebookLM) ..." -ForegroundColor Cyan
& $nlm login

Write-Host "==> [3/4] Đăng ký MCP server vào Claude Code (scope user) ..." -ForegroundColor Cyan
$claude = (Get-Command claude -ErrorAction SilentlyContinue)
if ($claude) {
  claude mcp add --scope user notebooklm-mcp "$mcp"
  Write-Host "    Đã đăng ký vào Claude Code." -ForegroundColor Green
} else {
  Write-Host "    Không thấy lệnh 'claude'. Nếu dùng Claude Desktop, thêm thủ công vào claude_desktop_config.json:" -ForegroundColor Yellow
  Write-Host "    `"notebooklm-mcp`": { `"command`": `"$($mcp -replace '\\','\\')`", `"args`": [] }" -ForegroundColor Yellow
}

Write-Host "==> [4/4] XONG. RESTART Claude (Code/Desktop) để nạp tool mcp__notebooklm-mcp__*." -ForegroundColor Green
Write-Host "    Kiểm tra: bảo Claude 'liệt kê notebook NotebookLM'." -ForegroundColor Green
