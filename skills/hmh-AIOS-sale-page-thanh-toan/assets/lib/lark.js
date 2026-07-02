// lib/lark.js — Helper gọi Lark Base API (chạy trong Cloudflare Pages Functions).
// Dùng chung cho submit / payment-callback / check-payment.
// Lark quốc tế = open.larksuite.com. Bản Trung Quốc (Feishu) đổi sang open.feishu.cn.
const LARK_HOST = "https://open.larksuite.com";

export async function getLarkToken(env) {
  const r = await fetch(`${LARK_HOST}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: env.LARK_APP_ID, app_secret: env.LARK_APP_SECRET }),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error("Lark token error: " + JSON.stringify(j));
  return j.tenant_access_token;
}

// Tạo lead mới (payment_status = pending)
export async function createLead(env, fields, token) {
  token = token || (await getLarkToken(env));
  const r = await fetch(
    `${LARK_HOST}/open-apis/bitable/v1/apps/${env.LARK_BASE_TOKEN}/tables/${env.LARK_TABLE_ID}/records`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  const j = await r.json();
  if (j.code !== 0) throw new Error("Lark createLead error: " + JSON.stringify(j));
  return j.data.record;
}

// Tìm 1 record theo order_id. Trả {record_id, fields} hoặc null.
export async function findByOrder(env, orderId, token) {
  token = token || (await getLarkToken(env));
  const filter = encodeURIComponent(`CurrentValue.[order_id]="${orderId}"`);
  const r = await fetch(
    `${LARK_HOST}/open-apis/bitable/v1/apps/${env.LARK_BASE_TOKEN}/tables/${env.LARK_TABLE_ID}/records?filter=${filter}&page_size=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const j = await r.json();
  if (j.code !== 0) throw new Error("Lark findByOrder error: " + JSON.stringify(j));
  return (j.data?.items || [])[0] || null;
}

export async function updateRecord(env, recordId, fields, token) {
  token = token || (await getLarkToken(env));
  const r = await fetch(
    `${LARK_HOST}/open-apis/bitable/v1/apps/${env.LARK_BASE_TOKEN}/tables/${env.LARK_TABLE_ID}/records/${recordId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    }
  );
  const j = await r.json();
  if (j.code !== 0) throw new Error("Lark updateRecord error: " + JSON.stringify(j));
  return j.data.record;
}

// Lấy template email theo key trong bảng Email Templates (nếu có cấu hình LARK_TEMPLATE_TABLE_ID)
export async function getEmailTemplate(env, key, token) {
  if (!env.LARK_TEMPLATE_TABLE_ID) return null;
  token = token || (await getLarkToken(env));
  const filter = encodeURIComponent(`CurrentValue.[key]="${key}"`);
  const r = await fetch(
    `${LARK_HOST}/open-apis/bitable/v1/apps/${env.LARK_BASE_TOKEN}/tables/${env.LARK_TEMPLATE_TABLE_ID}/records?filter=${filter}&page_size=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const j = await r.json();
  if (j.code !== 0) return null;
  const rec = (j.data?.items || [])[0];
  if (!rec) return null;
  return { subject: textOf(rec.fields.subject), body: textOf(rec.fields.body) };
}

// Field text của Lark có thể là string hoặc mảng [{text,type}] — chuẩn hoá về string.
export function textOf(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x.text || "")).join("");
  if (typeof v === "object" && v.text) return v.text;
  return String(v);
}
