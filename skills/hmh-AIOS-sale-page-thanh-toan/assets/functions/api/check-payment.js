// functions/api/check-payment.js — Trang thanh toán poll mỗi 4s hỏi đơn đã "paid" chưa.
import { findByOrder, textOf } from "../../lib/lark.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const order = (url.searchParams.get("order") || "").trim().toUpperCase();
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

  if (!/^X3\d{8}$/.test(order)) {
    return new Response(JSON.stringify({ paid: false, error: "order không hợp lệ" }), { headers });
  }
  try {
    const rec = await findByOrder(env, order);
    const status = rec ? textOf(rec.fields.payment_status).toLowerCase() : "";
    return new Response(JSON.stringify({ paid: status === "paid", found: !!rec }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ paid: false, error: String(e.message || e) }), { headers });
  }
}
