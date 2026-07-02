# Bảng tra tool NotebookLM MCP (prefix `mcp__notebooklm-mcp__`)

Tên server báo về: `notebooklm`. Tool gọi qua Claude có prefix `mcp__notebooklm-mcp__<tên>`.

## Notebook
| Tool | Việc | Args chính |
|---|---|---|
| `notebook_create` | Tạo notebook | `title` |
| `notebook_list` | Liệt kê | `max_results` |
| `notebook_get` / `notebook_describe` | Xem chi tiết | `notebook_id` |
| `notebook_rename` | Đổi tên | `notebook_id`, `title` |
| `notebook_delete` | Xoá | `notebook_id`, `confirm=true` |

## Nguồn (sources)
| Tool | Việc | Args chính |
|---|---|---|
| `source_add` | Nạp nguồn | `notebook_id`, `source_type`= `url`/`text`/`drive`/`file`, kèm `url`/`text`/`document_id`/`file_path` |
| `source_list_drive` | Liệt kê nguồn Drive | `notebook_id` |
| `source_get_content` | Lấy nội dung nguồn | `notebook_id`, `source_id` |
| `source_rename` / `source_delete` | Sửa/xoá nguồn | |
| `source_sync_drive` | Đồng bộ lại nguồn Drive | |

> URL YouTube nạp thẳng qua `source_type=url` — NotebookLM tự nghe & transcribe. Có thể nạp batch nhiều URL.

## Hỏi / phân tích
| Tool | Việc |
|---|---|
| `notebook_query` | Hỏi 1 câu, trả lời CÓ trích dẫn |
| `notebook_query_start` + `notebook_query_status` | Hỏi dài/bất đồng bộ (poll status) |
| `cross_notebook_query` | Hỏi xuyên nhiều notebook |

## Studio (artifact)
| Tool | Việc |
|---|---|
| `studio_create` | Tạo `artifact_type`= `audio`(podcast)/`video`/`slides`/`infographic` |
| `studio_status` | Poll tới khi xong (BẮT BUỘC trước khi tải) |
| `studio_revise` | Sửa từng slide trong deck |
| `download_artifact` / `export_artifact` | Tải về máy / xuất sang Google Docs/Sheets |

## Ghi chú & quản trị
| Tool | Việc |
|---|---|
| `note_create/list/update/delete` | Quản lý note trong notebook |
| `server_info` | Phiên bản + auth_status (đừng tin tuyệt đối — xem gotcha) |
| `refresh_auth` / `save_auth_tokens` | Làm mới / lưu token (fallback của `nlm login`) |
| `notebook_share_public/_invite/_batch/_status` | Chia sẻ notebook |

## Ví dụ chuỗi việc điển hình
1. `notebook_create {title:"Tri thức X"}` → lấy `id`.
2. Lặp `source_add {notebook_id:id, source_type:"url", url:"<youtube>"}` cho từng video.
3. `notebook_query {notebook_id:id, question:"Tóm tắt 5 ý chính + trích dẫn"}`.
4. `studio_create {notebook_id:id, artifact_type:"audio"}` → `studio_status` tới khi `done` → `download_artifact`.
