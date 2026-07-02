// lib/smax.js — Bắn thông báo "Đơn mới" qua Zalo cá nhân của mentor (Smax.ai API Trigger).
export async function notifyZalo(env, { name, phone, industry, order_id }) {
  if (!env.SMAX_TRIGGER_URL || !env.SMAX_TOKEN) return false;
  const r = await fetch(env.SMAX_TRIGGER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SMAX_TOKEN}`,
    },
    body: JSON.stringify({
      customer: { id: env.SMAX_CUSTOMER_PID, page_id: env.SMAX_PAGE_ID },
      attrs: [
        { name: "name", value: name || "" },
        { name: "phone", value: phone || "" },
        { name: "industry", value: industry || "" },
        { name: "order_id", value: order_id || "" },
      ],
    }),
  });
  return r.ok;
}
