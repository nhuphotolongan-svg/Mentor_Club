// lib/smtp.js — SMTP client tối giản chạy trên Cloudflare (cloudflare:sockets).
// Gửi 1 email HTML qua Lark SMTP: smtp.larksuite.com:465 (SSL ngầm / implicit TLS).
import { connect } from "cloudflare:sockets";

export async function sendMail(env, { to, subject, html }) {
  const host = env.SMTP_HOST || "smtp.larksuite.com";
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_USER; // email Lark, vd: mentor@domain.net
  const pass = env.SMTP_PASS; // Application Password (tạo trong Lark Settings → Security)
  const from = env.SMTP_FROM || user;
  if (!user || !pass) throw new Error("Thiếu SMTP_USER / SMTP_PASS");

  const socket = connect({ hostname: host, port }, { secureTransport: "on", allowHalfOpen: false });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";

  async function readLine() {
    for (;;) {
      const idx = buf.indexOf("\r\n");
      if (idx >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        return line;
      }
      const { value, done } = await reader.read();
      if (done) return buf;
      buf += dec.decode(value, { stream: true });
    }
  }
  // SMTP có thể trả nhiều dòng "250-..." rồi kết bằng "250 ...". Đọc đến dòng cuối.
  async function expect(code) {
    let line;
    do {
      line = await readLine();
    } while (line[3] === "-");
    if (!line.startsWith(code)) throw new Error(`SMTP expected ${code}, got: ${line}`);
    return line;
  }
  const send = (cmd) => writer.write(enc.encode(cmd + "\r\n"));

  try {
    await expect("220");
    await send("EHLO worker");
    await expect("250");
    await send("AUTH LOGIN");
    await expect("334");
    await send(btoa(user));
    await expect("334");
    await send(btoa(pass));
    await expect("235");
    await send(`MAIL FROM:<${from}>`);
    await expect("250");
    await send(`RCPT TO:<${to}>`);
    await expect("250");
    await send("DATA");
    await expect("354");

    const headers =
      `From: ${from}\r\n` +
      `To: ${to}\r\n` +
      `Subject: ${encodeHeader(subject)}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: 8bit\r\n\r\n`;
    // dot-stuffing: dòng bắt đầu bằng "." phải nhân đôi
    const body = html.replace(/\r\n\./g, "\r\n..").replace(/^\./, "..");
    await writer.write(enc.encode(headers + body + "\r\n.\r\n"));
    await expect("250");
    await send("QUIT");
    await writer.close();
    return true;
  } catch (e) {
    try {
      await writer.close();
    } catch {}
    throw e;
  }
}

// Subject có dấu tiếng Việt → MIME encoded-word (UTF-8 Base64)
function encodeHeader(s) {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return `=?UTF-8?B?${b64}?=`;
}
