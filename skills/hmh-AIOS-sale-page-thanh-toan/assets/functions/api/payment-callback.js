// functions/api/payment-callback.js — Webhook Sepay:
// phát hiện chuyển khoản VÀO → cập nhật Lark "paid" → gửi email học viên + Zalo cho mentor.
import { getLarkToken, findByOrder, updateRecord, getEmailTemplate, textOf } from "../../lib/lark.js";
import { sendMail } from "../../lib/smtp.js";
import { buildHtml, fillVars } from "../../lib/email.js";
import { notifyZalo } from "../../lib/smax.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1) Xác thực Sepay: header "Authorization: Apikey {SEPAY_API_KEY}"
  const auth = request.headers.get("Authorization") || "";
  if (env.SEPAY_API_KEY && auth !== `Apikey ${env.SEPAY_API_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));

  // 2) Chỉ xử lý tiền VÀO
  if (payload.transferType && payload.transferType !== "in") {
    return json({ ok: true, skipped: "not-incoming" });
  }

  // 3) Tìm order_id trong nội dung chuyển khoản
  const content = `${payload.content || ""} ${payload.description || ""} ${payload.code || ""}`;
  const m = content.match(/X3\d{8}/i);
  if (!m) return json({ ok: true, skipped: "no-order-id" });
  const orderId = m[0].toUpperCase();

  try {
    const token = await getLarkToken(env);
    const rec = await findByOrder(env, orderId, token);
    if (!rec) return json({ ok: true, skipped: "record-not-found", orderId });

    const f = rec.fields;
    if (textOf(f.payment_status).toLowerCase() === "paid") {
      return json({ ok: true, skipped: "already-paid", orderId });
    }

    // 4) Cập nhật paid (đồng bộ — phải xong trước khi trả 200 cho Sepay)
    await updateRecord(env, rec.record_id, { payment_status: "paid" }, token);

    // 5) Thông báo chạy nền (không chặn response)
    const name = textOf(f["Họ và tên"]);
    const email = textOf(f["Email"]);
    const phone = textOf(f["Số điện thoại"]);
    const industry = textOf(f["Lĩnh vực kinh doanh"]);
    const vars = {
      name,
      industry,
      phone,
      order_id: orderId,
      brand: env.BRAND_NAME || "",
      color: env.BRAND_COLOR || "#111827",
    };

    const bg = (async () => {
      if (email) {
        try {
          const tpl = await getEmailTemplate(env, env.EMAIL_TEMPLATE_KEY || "x3_registration", token);
          const subject = tpl?.subject ? fillVars(tpl.subject, vars) : `Chào mừng ${name}!`;
          const html = buildHtml(tpl?.body || defaultBody(name), vars);
          await sendMail(env, { to: email, subject, html });
        } catch (e) {
          console.log("email error:", e.message);
        }
      }
      try {
        await notifyZalo(env, { name, phone, industry, order_id: orderId });
      } catch (e) {
        console.log("zalo error:", e.message);
      }
    })();
    if (typeof context.waitUntil === "function") context.waitUntil(bg);
    else await bg;

    return json({ ok: true, orderId, status: "paid" });
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 500);
  }
}

function defaultBody(name) {
  return (
    `Xin chào **${name}**,\n\n` +
    `Chúng tôi đã nhận được thanh toán của bạn. Cảm ơn bạn đã đăng ký!\n\n` +
    `Đội ngũ sẽ liên hệ với bạn sớm để hướng dẫn bước tiếp theo.`
  );
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
