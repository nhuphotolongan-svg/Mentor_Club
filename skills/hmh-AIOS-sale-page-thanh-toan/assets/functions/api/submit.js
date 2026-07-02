// functions/api/submit.js — Nhận form đăng ký → tạo order_id → lưu Lark Base (pending).
import { createLead } from "../../lib/lark.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost({ request, env }) {
  try {
    let data = {};
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await request.json();
    } else {
      const f = await request.formData();
      for (const [k, v] of f) data[k] = v;
    }

    const name = (data.name || "").toString().trim();
    const phone = (data.phone || "").toString().trim();
    const email = (data.email || "").toString().trim();
    const industry = (data.industry || "").toString().trim();
    if (!name || !phone) return json({ ok: false, error: "Thiếu họ tên hoặc số điện thoại" }, 400);

    // order_id = "X3" + 8 chữ số (khớp regex /X3\d{8}/i ở webhook)
    const order_id = "X3" + String(Math.floor(10000000 + Math.random() * 90000000));

    await createLead(env, {
      "Họ và tên": name,
      "Số điện thoại": phone,
      Email: email,
      "Lĩnh vực kinh doanh": industry,
      order_id,
      payment_status: "pending",
    });

    return json({ ok: true, order_id, name, email });
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
