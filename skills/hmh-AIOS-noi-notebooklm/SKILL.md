---
name: hmh-AIOS-noi-notebooklm
description: >
  Bộ chuyển giao: nối Claude (Claude Code / Claude Desktop) với NotebookLM của Google qua MCP, để Claude tự
  tạo notebook, nạp nguồn (URL/video YouTube/text/file/Google Drive), hỏi phân tích insight, và xuất artifact
  (audio overview/podcast, video, slides, infographic) — không cần mở trình duyệt thao tác tay. Skill self-serve,
  máy-độc-lập: học viên chạy 1 script cài đặt, đăng nhập Google 1 lần, restart Claude là dùng được. Kèm driver
  fallback gọi thẳng MCP qua JSON-RPC khi tool chưa nạp, và bảng tra lệnh + xử lý lỗi auth.
  Dùng khi người dùng muốn: nối/kết nối Claude với NotebookLM, cài NotebookLM MCP, chuyển giao cách dùng NotebookLM
  cho học viên/máy mới, sửa lỗi đăng nhập NotebookLM, hoặc tự động hoá nạp nguồn & tạo audio/video từ NotebookLM.
  Kích hoạt khi có từ: nối notebooklm, kết nối claude notebooklm, cài notebooklm mcp, notebooklm mcp setup,
  chuyển giao notebooklm, nlm login, lỗi auth notebooklm, tạo audio overview, podcast notebooklm, hỏi tài liệu notebooklm.
---

# Skill: Nối Claude với NotebookLM (bộ chuyển giao)

Một câu: **biến NotebookLM thành "bộ não đọc nguồn" cho Claude** — Claude nạp tài liệu/video vào notebook, hỏi
phân tích có trích dẫn, rồi xuất ra podcast/slide/infographic, tất cả qua công cụ thay vì click chuột.

---

## 1. Cơ chế kết nối (giải thích cho người chuyển giao)

NotebookLM **không có API chính thức công khai**. Cây cầu nối là gói mã nguồn mở
[`jacob-bd/notebooklm-mcp-cli`](https://github.com/jacob-bd/notebooklm-mcp-cli) (PyPI: `notebooklm-mcp-cli`).
Gói này làm 3 việc:

1. **`nlm` (CLI)** — mở Chrome, đăng nhập Google của bạn, **trích cookie phiên** NotebookLM và lưu lại làm
   "credentials" (`~/.notebooklm-mcp-cli/profiles/default`). Đây là cách "đăng nhập" — không cần API key.
2. **`notebooklm-mcp` (MCP server)** — một tiến trình nói giao thức **MCP** (Model Context Protocol) qua stdio.
   Nó dùng cookie ở trên để thay bạn thao tác NotebookLM.
3. **Claude đăng ký server này** trong cấu hình MCP → mọi tool hiện ra dưới prefix `mcp__notebooklm-mcp__*`
   (vd `notebook_create`, `source_add`, `notebook_query`, `studio_create`). Claude gọi tool → server thao tác
   NotebookLM → trả kết quả về Claude.

Sơ đồ: **Claude ⇄ (MCP/stdio) ⇄ notebooklm-mcp ⇄ (cookie phiên) ⇄ notebooklm.google.com**

> Vì xác thực bằng **cookie phiên** chứ không phải token bền vững → cookie sẽ hết hạn định kỳ (vài ngày–vài tuần).
> Khi đó chỉ cần chạy lại `nlm login`. Đây là điểm bảo trì duy nhất.

---

## 2. Khi nào dùng / KHÔNG dùng

**Dùng khi:** muốn nối máy mới với NotebookLM; chuyển giao cho học viên tự nối máy họ; sửa lỗi đăng nhập;
muốn Claude tự nạp nguồn & hỏi phân tích & tạo audio/video.

**KHÔNG dùng (đã có skill khác lo):**
- Pipeline content tri thức YouTube→NotebookLM→post Facebook → dùng `hmh-mkt-content-tri-thuc`.
- Research YouTube → ý tưởng video ngắn → dùng `hmh-mkt-shorts-youtube`.
- Research SEO nạp NotebookLM theo đầu bài → dùng `hmh-mkt-research-seo-web`.

Skill này là **tầng hạ tầng** (cài & nối & sửa auth) cho mọi skill trên đứng lên.

---

## 3. Tiền điều kiện (máy của học viên)

| Cần | Kiểm tra nhanh | Nếu thiếu |
|---|---|---|
| Python 3.10+ | `python --version` | cài từ python.org, nhớ tick "Add to PATH" |
| pip | `python -m pip --version` | đi kèm Python |
| Google Chrome | mở được Chrome | cài Chrome (cần để `nlm login` trích cookie) |
| Node.js (cho driver fallback) | `node -v` | chỉ cần nếu dùng `scripts/nb-call.mjs` |
| Claude Code **hoặc** Claude Desktop | | |
| Tài khoản Google có NotebookLM | mở notebooklm.google.com | |

---

## 4. Quy trình NỐI — chạy 1 lần trên máy mới

> Có script gói sẵn 3 bước dưới: **`scripts/cai-dat-notebooklm-mcp.ps1`** (Windows PowerShell). Chạy tay từng bước
> nếu muốn hiểu, hoặc chạy script cho nhanh. macOS/Linux xem `references/cai-dat-macos-linux.md`.

### Bước 1 — Cài gói
```powershell
python -m pip install --user --upgrade notebooklm-mcp-cli
```
- Exe sinh ra ở thư mục Scripts của Python user. Trên máy này (đường dẫn tham chiếu):
  `C:\Users\<USER>\AppData\Roaming\Python\Python3XX\Scripts\` → `nlm.exe` + `notebooklm-mcp.exe`.
- Tìm đường dẫn thật: `python -c "import sysconfig;print(sysconfig.get_path('scripts','nt_user'))"`

### Bước 2 — Đăng nhập Google (trích cookie)
```powershell
nlm login
```
- Mở Chrome → đăng nhập tài khoản Google có NotebookLM → CLI tự trích cookie, báo `Authentication valid!` và
  liệt kê số notebook. Nếu `nlm` không chạy được (chưa trên PATH) → gọi bằng đường dẫn đầy đủ tới `nlm.exe`.
- Nhiều tài khoản: `nlm login switch <tên-profile>` để đổi profile mặc định.

### Bước 3 — Đăng ký MCP server vào Claude
**Claude Code (CLI):**
```powershell
claude mcp add --scope user notebooklm-mcp "<đường-dẫn-đầy-đủ>\notebooklm-mcp.exe"
```
**Claude Desktop:** thêm vào `claude_desktop_config.json` (Settings → Developer → Edit Config):
```json
{
  "mcpServers": {
    "notebooklm-mcp": { "command": "C:\\...\\Scripts\\notebooklm-mcp.exe", "args": [] }
  }
}
```

### Bước 4 — Restart Claude
- **Bắt buộc restart** Claude Code / Claude Desktop để nạp tool. Sau đó tool hiện dưới prefix
  `mcp__notebooklm-mcp__*`.
- Xác minh: bảo Claude "liệt kê notebook NotebookLM" → Claude gọi `notebook_list` → ra danh sách.

---

## 5. Dùng hằng ngày (sau khi nối)

| Việc | Tool MCP | Ghi chú |
|---|---|---|
| Tạo notebook | `notebook_create` | |
| Liệt kê / xem | `notebook_list`, `notebook_get` | |
| Nạp nguồn | `source_add(source_type=url\|text\|drive\|file)` | URL YouTube nạp thẳng — NotebookLM **tự nghe & transcribe** |
| Hỏi phân tích | `notebook_query` (dài: `notebook_query_start`/`_status`) | trả lời **có trích dẫn nguồn** |
| Hỏi nhiều notebook | `cross_notebook_query` | |
| Tạo artifact | `studio_create(artifact_type=audio\|video\|slides\|infographic)` → poll `studio_status` | audio = podcast 2 người dẫn |
| Tải artifact | `download_artifact` | |
| Ghi chú | `note_create/list/update/delete` | |
| Kiểm tra server/auth | `server_info` | |

CLI nhanh (không qua Claude): `nlm list notebooks|sources|artifacts`, thêm `--profile <tên>`.

---

## 6. Driver fallback — gọi MCP khi tool CHƯA nạp trong phiên

Nếu chưa kịp restart Claude mà cần chạy ngay, dùng driver JSON-RPC nói thẳng với server:
```powershell
# Liệt kê tool
node scripts/nb-call.mjs --list
# Gọi 1 tool bất kỳ (args là JSON)
node scripts/nb-call.mjs notebook_list
node scripts/nb-call.mjs source_add '{"notebook_id":"<id>","source_type":"url","url":"https://youtu.be/..."}'
```
- Tự dò exe; ghi đè bằng biến môi trường `NLM_MCP_EXE` nếu đường dẫn khác.
- Tác vụ chậm (tạo audio/video) tăng `NLM_WAIT_MS` (mặc định 180000 = 3 phút).

---

## 7. Gotcha / xử lý lỗi (rút từ thực chiến)

- **`nlm`/`notebooklm-mcp` "không phải lệnh"** → Scripts chưa trên PATH. Gọi bằng đường dẫn đầy đủ tới `.exe`,
  hoặc thêm thư mục Scripts vào PATH.
- **Tool không hiện sau khi `claude mcp add`** → CHƯA restart Claude. Restart lại.
- **Lỗi auth / hết hạn cookie** → chạy lại `nlm login`. Đây là việc bảo trì định kỳ.
- **`server_info`/`refresh_auth` báo `stale`/`expired`/`unverified` NHƯNG tool thật vẫn chạy** → self-check khó
  tính. **Đừng tin mỗi `auth_status`** — cứ thử gọi `notebook_list`; chạy được là OK. Chỉ `nlm login` lại khi
  tool thật thực sự lỗi.
- **Không chạy 2 phiên đăng nhập song song cùng tài khoản** dễ đá cookie nhau.
- **Tạo audio/video lâu** → luôn `studio_status` poll tới khi xong rồi mới `download_artifact`.

---

## 8. Output (theo CLAUDE.md)

Khi skill tạo ra sản phẩm bàn giao (vd gói hướng dẫn in cho học viên, audio/slide tải về):
- Lưu vào `output/YYYY-MM-DD-<mô-tả>/`, file markdown chính + mọi asset trong cùng thư mục.
- Cập nhật `index.md` (mục Output) và ghi 1 dòng `log.md`.

## Tham chiếu
- `scripts/cai-dat-notebooklm-mcp.ps1` — cài + đăng ký + login 1 phát (Windows).
- `scripts/nb-call.mjs` — driver JSON-RPC fallback.
- `references/cai-dat-macos-linux.md` — bản cài cho macOS/Linux.
- `references/bang-tra-tool.md` — bảng tra đầy đủ tool + ví dụ args.
- Liên quan: `hmh-mkt-content-tri-thuc`, `hmh-mkt-shorts-youtube`, `hmh-mkt-research-seo-web`. Cùng pattern cài MCP
  như `apify-scrape-mxh`, `lark-cli-setup`.
