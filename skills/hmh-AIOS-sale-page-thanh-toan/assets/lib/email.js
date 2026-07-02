// lib/email.js — Dựng email HTML đẹp từ template (markdown đơn giản) + biến {{name}}...
export function fillVars(str, vars) {
  return String(str || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? ""));
}

// markdown rất nhẹ: **đậm**, "- " bullet, dòng trống → <br>
export function buildHtml(markdown, vars = {}) {
  let s = fillVars(markdown, vars);
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const lines = s.split(/\r?\n/);
  let out = "";
  let inUl = false;
  for (const ln of lines) {
    if (/^\s*-\s+/.test(ln)) {
      if (!inUl) {
        out += "<ul style='padding-left:20px;margin:8px 0'>";
        inUl = true;
      }
      out += "<li style='margin:4px 0'>" + ln.replace(/^\s*-\s+/, "") + "</li>";
    } else {
      if (inUl) {
        out += "</ul>";
        inUl = false;
      }
      out += ln.trim() === "" ? "<div style='height:10px'></div>" : "<p style='margin:8px 0'>" + ln + "</p>";
    }
  }
  if (inUl) out += "</ul>";
  return wrap(out, vars);
}

function wrap(inner, vars) {
  const color = vars.color || "#111827";
  const brand = vars.brand || "Xác nhận thanh toán";
  return (
    `<!doctype html><html><body style="margin:0;background:#f4f5f7;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2329">` +
    `<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.06)">` +
    `<div style="background:${color};padding:22px 28px;color:#fff;font-size:18px;font-weight:700">${brand}</div>` +
    `<div style="padding:24px 28px;font-size:15px;line-height:1.6">${inner}</div>` +
    `<div style="padding:16px 28px;color:#8a8f99;font-size:12px;border-top:1px solid #eee">Email tự động — vui lòng không trả lời.</div>` +
    `</div></body></html>`
  );
}
