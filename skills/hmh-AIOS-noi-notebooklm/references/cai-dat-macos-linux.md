# Cài NotebookLM MCP trên macOS / Linux

Tương tự Windows, chỉ khác cú pháp shell.

## 1. Cài gói
```bash
python3 -m pip install --user --upgrade notebooklm-mcp-cli
```
Tìm thư mục bin user (nơi có `nlm` và `notebooklm-mcp`):
```bash
python3 -c "import sysconfig;print(sysconfig.get_path('scripts','posix_user'))"
# thường là: ~/.local/bin
```
Nếu chưa trên PATH, thêm vào `~/.zshrc` / `~/.bashrc`:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

## 2. Đăng nhập Google (trích cookie)
```bash
nlm login
```
Mở Chrome → đăng nhập tài khoản có NotebookLM → báo `Authentication valid!`.
Credentials lưu ở `~/.notebooklm-mcp-cli/profiles/default`.

## 3. Đăng ký MCP vào Claude
**Claude Code:**
```bash
claude mcp add --scope user notebooklm-mcp "$(command -v notebooklm-mcp)"
```
**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` trên macOS):
```json
{
  "mcpServers": {
    "notebooklm-mcp": { "command": "/Users/<user>/.local/bin/notebooklm-mcp", "args": [] }
  }
}
```

## 4. Restart Claude
Restart để nạp tool `mcp__notebooklm-mcp__*`. Kiểm tra bằng cách bảo Claude liệt kê notebook.

## Driver fallback
```bash
NLM_MCP_EXE="$(command -v notebooklm-mcp)" node scripts/nb-call.mjs --list
```
