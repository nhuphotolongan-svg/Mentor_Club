#!/usr/bin/env node
// lark-voice-bridge.mjs — TÔM (text + voice) cho macOS
// ----------------------------------------------------------------------------
// Bản hợp nhất: 1 bridge xử lý CẢ tin chữ lẫn tin thoại trong Lark.
//   Lark (chữ/thoại)  ──WebSocket──►  bridge
//        thoại → [voice-server /stt] (faster-whisper) → chữ
//        chữ   → [claude headless]  (chạy thật trên máy, full skill)
//        kết quả → (nếu voice on) [voice-server /tts] → opus → gửi audio
//                  (nếu voice off) gửi text
// Nhận sự kiện qua long-connection (WSClient) — KHÔNG cần public URL/webhook.
// Gửi + upload + tải file qua App Bot API (im:message:send_as_bot, im:resource).
//
// ⚠️ AN TOÀN: chế độ quyền lấy từ .env (PERMISSION_MODE). Khi đặt
//    PERMISSION_MODE=bypassPermissions, Claude chạy thẳng lệnh không hỏi —
//    CHỈ bật trên máy của chủ; bridge đã chặn chỉ OWNER_OPEN_ID mới ra lệnh.
// ----------------------------------------------------------------------------

import * as Lark from '@larksuiteoapi/node-sdk';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, createReadStream, statSync } from 'node:fs';
import { writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

// ───────────────────────────── Cấu hình ─────────────────────────────
const cfg = {
  appId:        process.env.APP_ID || '',
  appSecret:    process.env.APP_SECRET || '',
  domain:       (process.env.LARK_DOMAIN || 'lark').toLowerCase() === 'feishu' ? Lark.Domain.Feishu : Lark.Domain.Lark,
  ownerOpenId:  process.env.OWNER_OPEN_ID || '',
  controlChat:  process.env.CONTROL_CHAT_ID || '',
  claudeBin:    process.env.CLAUDE_BIN || 'claude',
  model:        process.env.CLAUDE_MODEL || 'haiku',
  brainRoot:    process.env.BRAIN_ROOT || process.cwd(),
  permission:   process.env.PERMISSION_MODE || 'default',   // cấu hình ở .env
  keepSession:  String(process.env.KEEP_SESSION || 'true') === 'true',
  timeoutMs:    parseInt(process.env.CLAUDE_TIMEOUT_MS || '1500000', 10),
  voiceDefault: String(process.env.VOICE_DEFAULT || 'on') !== 'off',
  whisperUrl:   process.env.WHISPER_URL || 'http://127.0.0.1:8765',
  ffmpegBin:    process.env.FFMPEG_BIN || 'ffmpeg',
  ttsEngine:    process.env.TTS_ENGINE || 'auto',     // auto|vbee|gtts|say
  ttsVoice:     process.env.VOICE_CODE || '',
  maxVoiceWords: parseInt(process.env.MAX_VOICE_WORDS || '70', 10),
};

function die(msg) { console.error('❌ ' + msg); process.exit(1); }
if (!cfg.appId || !cfg.appSecret) die('Thiếu APP_ID / APP_SECRET trong .env (lấy ở Lark Developer Console).');
if (!cfg.ownerOpenId) die('Thiếu OWNER_OPEN_ID — chặn có chủ đích để không ai cũng điều khiển được. Chạy: node whoami.mjs');

const client = new Lark.Client({ appId: cfg.appId, appSecret: cfg.appSecret, domain: cfg.domain });

// trạng thái phiên
let voiceOn   = cfg.voiceDefault;
let sessionId = cfg.keepSession ? randomUUID() : null;
let sessionStarted = false;
const seen = new Set();               // dedup message_id

// ───────────────────────────── Gửi tin ─────────────────────────────
async function sendText(chatId, text) {
  try {
    await client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: { receive_id: chatId, msg_type: 'text', content: JSON.stringify({ text }) },
    });
  } catch (e) { console.error('sendText lỗi:', e?.message || e); }
}

// Gửi audio (opus). Fallback: gửi chữ nếu không tạo được opus.
async function sendVoice(chatId, mp3Path, fallbackText) {
  let opus = mp3Path.replace(/\.\w+$/, '.opus');
  try {
    const durMs = await toOpus(mp3Path, opus);
    const up = await client.im.file.create({
      data: { file_type: 'opus', file_name: 'tom.opus', duration: String(durMs || 1000), file: createReadStream(opus) },
    });
    const fileKey = up?.data?.file_key;
    if (!fileKey) throw new Error('không lấy được file_key');
    await client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: { receive_id: chatId, msg_type: 'audio', content: JSON.stringify({ file_key: fileKey }) },
    });
    return true;
  } catch (e) {
    console.error('sendVoice lỗi, rớt về chữ:', e?.message || e);
    if (fallbackText) await sendText(chatId, fallbackText);
    return false;
  } finally { await rm(opus, { force: true }); }
}

// ───────────────────────────── ffmpeg ─────────────────────────────
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cfg.ffmpegBin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => (err += d));
    p.on('error', reject);
    p.on('close', code => (code === 0 ? resolve(err) : reject(new Error('ffmpeg ' + code + ': ' + err.slice(-300)))));
  });
}
// opus mono 16k cho Lark audio; trả về duration ms (ước lượng theo bitrate)
async function toOpus(inFile, outFile) {
  await runFfmpeg(['-y', '-i', inFile, '-ac', '1', '-ar', '16000', '-c:a', 'libopus', '-b:a', '24k', outFile]);
  try { const sz = statSync(outFile).size; return Math.max(1000, Math.round((sz / (24000 / 8)) * 1000)); }
  catch { return 1000; }
}
async function toWav16k(inFile, outFile) {
  await runFfmpeg(['-y', '-i', inFile, '-ac', '1', '-ar', '16000', '-f', 'wav', outFile]);
}

// ───────────────────────────── STT / TTS (voice-server) ─────────────────────────────
async function stt(wavPath) {
  const r = await fetch(cfg.whisperUrl + '/stt', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: wavPath, language: 'vi' }),
  });
  if (!r.ok) throw new Error('STT HTTP ' + r.status);
  const j = await r.json();
  return (j.text || '').trim();
}
async function tts(text) {
  const r = await fetch(cfg.whisperUrl + '/tts', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, engine: cfg.ttsEngine, voice: cfg.ttsVoice }),
  });
  if (!r.ok) throw new Error('TTS HTTP ' + r.status);
  const j = await r.json();
  if (!j.path) throw new Error('TTS không trả path: ' + (j.error || ''));
  return j.path;            // mp3
}

// ───────────────────────────── Claude headless ─────────────────────────────
function runClaude(prompt) {
  return new Promise((resolve) => {
    const args = ['-p', prompt, '--model', cfg.model, '--permission-mode', cfg.permission, '--output-format', 'json'];
    if (cfg.keepSession && sessionId) args.push(sessionStarted ? '--resume' : '--session-id', sessionId);
    const p = spawn(cfg.claudeBin, args, { cwd: cfg.brainRoot, env: process.env });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); }, cfg.timeoutMs);
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.on('error', e => { clearTimeout(timer); resolve({ ok: false, text: 'Lỗi gọi Claude: ' + e.message }); });
    p.on('close', () => {
      clearTimeout(timer);
      sessionStarted = true;
      // --output-format json: object có .result (text) + .session_id
      try {
        const j = JSON.parse(out);
        if (j.session_id) sessionId = j.session_id;
        resolve({ ok: !j.is_error, text: (j.result ?? '').toString().trim() || '(không có nội dung trả về)' });
      } catch {
        const t = out.trim() || err.trim();
        resolve({ ok: !!t, text: t || '(Claude không trả về gì)' });
      }
    });
  });
}

// rút gọn + bỏ markdown/emoji/link cho TTS (UX thoại: ngắn, văn nói)
function plainForVoice(text) {
  let t = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' đường dẫn ')
    .replace(/[*_`#>|~]/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = t.split(' ');
  if (words.length > cfg.maxVoiceWords) t = words.slice(0, cfg.maxVoiceWords).join(' ') + '…';
  return t;
}

// ───────────────────────────── Lệnh / ─────────────────────────────
async function handleCommand(chatId, cmd) {
  const [c, arg] = cmd.trim().slice(1).split(/\s+/);
  switch ((c || '').toLowerCase()) {
    case 'ping':
      await sendText(chatId, `🏓 Pong! TÔM đang chạy. Model: ${cfg.model} · Giọng: ${voiceOn ? 'BẬT' : 'tắt'}.`);
      return true;
    case 'reset':
      sessionId = cfg.keepSession ? randomUUID() : null; sessionStarted = false;
      await sendText(chatId, '🧹 Đã xoá ngữ cảnh. Bắt đầu phiên mới.');
      return true;
    case 'id':
      await sendText(chatId, `chat_id: ${chatId}\nowner_open_id: ${cfg.ownerOpenId}`);
      return true;
    case 'voice':
      if (arg === 'on') voiceOn = true; else if (arg === 'off') voiceOn = false;
      await sendText(chatId, `🔊 Giọng nói: ${voiceOn ? 'BẬT' : 'TẮT'}.`);
      return true;
    case 'model':
      if (['haiku', 'sonnet', 'opus'].includes((arg || '').toLowerCase())) { cfg.model = arg.toLowerCase(); await sendText(chatId, `🤖 Đổi model: ${cfg.model}.`); }
      else await sendText(chatId, 'Dùng: /model haiku | sonnet | opus');
      return true;
    case 'help':
      await sendText(chatId, ['📋 Lệnh TÔM:',
        '/ping — kiểm tra còn sống', '/reset — xoá ngữ cảnh', '/id — xem chat_id + open_id',
        '/voice on|off — bật/tắt trả lời bằng giọng', '/model haiku|sonnet|opus — đổi model',
        '/help — danh sách lệnh', '', 'Hoặc nhắn/nói tự nhiên: "Tóm tắt email hôm nay"…'].join('\n'));
      return true;
    default:
      return false;
  }
}

// ───────────────────────────── Xử lý 1 tin ─────────────────────────────
async function processMessage(chatId, userText, wasVoice) {
  if (userText.startsWith('/')) { if (await handleCommand(chatId, userText)) return; }

  // báo nhận lệnh
  await sendText(chatId, (wasVoice ? '🎙️ Nghe: “' + userText + '”\n' : '') + '⏳ TÔM đang xử lý…');

  let prompt = userText;
  if (voiceOn) prompt = 'Trả lời NGẮN GỌN, văn nói tiếng Việt (tối đa ~' + cfg.maxVoiceWords +
    ' từ), không markdown/emoji/đường link để đọc lên loa được. Câu hỏi: ' + userText;

  const { ok, text } = await runClaude(prompt);

  if (voiceOn && ok) {
    const spoken = plainForVoice(text);
    try {
      const mp3 = await tts(spoken);
      const sent = await sendVoice(chatId, mp3, text);
      await rm(mp3, { force: true });
      if (sent && text.length > spoken.length + 20) await sendText(chatId, text); // gửi kèm bản đầy đủ
      return;
    } catch (e) { console.error('TTS lỗi, gửi chữ:', e?.message || e); }
  }
  await sendText(chatId, text);
}

// ───────────────────────────── Tải audio từ Lark ─────────────────────────────
async function downloadAudio(messageId, fileKey) {
  const dir = mkdtempSync(path.join(tmpdir(), 'tom-'));
  const raw = path.join(dir, 'in.opus');
  const wav = path.join(dir, 'in.wav');
  const resp = await client.im.messageResource.get({ path: { message_id: messageId, file_key: fileKey }, params: { type: 'file' } });
  if (typeof resp?.writeFile === 'function') await resp.writeFile(raw);
  else if (resp?.getReadableStream) { const s = resp.getReadableStream(); const chunks = []; for await (const c of s) chunks.push(c); await writeFile(raw, Buffer.concat(chunks)); }
  else throw new Error('Không tải được audio (SDK response không hỗ trợ writeFile).');
  await toWav16k(raw, wav);
  return { dir, wav };
}

// ───────────────────────────── Event handler ─────────────────────────────
const dispatcher = new Lark.EventDispatcher({}).register({
  'im.message.receive_v1': async (data) => {
    try {
      const msg = data?.message; const sender = data?.sender;
      if (!msg) return;
      const messageId = msg.message_id;
      if (seen.has(messageId)) return; seen.add(messageId);
      if (seen.size > 2000) seen.clear();

      const openId = sender?.sender_id?.open_id;
      const chatId = msg.chat_id;
      // 🔒 chỉ CHỦ ra lệnh; nếu set CONTROL_CHAT_ID thì khoá đúng nhóm đó
      if (openId !== cfg.ownerOpenId) return;
      if (cfg.controlChat && chatId !== cfg.controlChat) return;

      const type = msg.message_type;
      const content = JSON.parse(msg.content || '{}');

      if (type === 'text') {
        const txt = (content.text || '').trim();
        if (txt) await processMessage(chatId, txt, false);
      } else if (type === 'audio') {
        let tmp;
        try {
          tmp = await downloadAudio(messageId, content.file_key);
          const txt = await stt(tmp.wav);
          if (txt) await processMessage(chatId, txt, true);
          else await sendText(chatId, '🤔 Nghe không rõ, anh nói lại giúp em nhé.');
        } catch (e) {
          await sendText(chatId, '⚠️ Lỗi xử lý tin thoại: ' + (e?.message || e));
        } finally { if (tmp) await rm(tmp.dir, { recursive: true, force: true }); }
      }
      // bỏ qua image/file/sticker… (có thể mở rộng sau)
    } catch (e) { console.error('handler lỗi:', e?.message || e); }
  },
});

// ───────────────────────────── Khởi động ─────────────────────────────
const wsClient = new Lark.WSClient({ appId: cfg.appId, appSecret: cfg.appSecret, domain: cfg.domain });

console.log('▶ TÔM Voice Bridge (macOS)');
console.log('   App     :', cfg.appId);
console.log('   Owner   :', cfg.ownerOpenId);
console.log('   Chat    :', cfg.controlChat || '(mọi nhóm có bot, chỉ chủ)');
console.log('   Model   :', cfg.model, '| Giọng mặc định:', voiceOn ? 'BẬT' : 'tắt', '| Quyền:', cfg.permission);
console.log('   Claude  :', cfg.claudeBin);
console.log('   Brain   :', cfg.brainRoot);
console.log('   Whisper :', cfg.whisperUrl, '| ffmpeg:', cfg.ffmpegBin);

wsClient.start({ eventDispatcher: dispatcher });
console.log('✅ Bridge sẵn sàng. Mọi yêu cầu của chủ sẽ được trả lời ngay.');

if (cfg.controlChat) sendText(cfg.controlChat, '🤖 TÔM Voice đã bật. Nhắn /ping để kiểm tra, /help xem lệnh.');

process.on('SIGINT', () => { console.log('\n⏹ Tắt bridge.'); process.exit(0); });
process.on('unhandledRejection', e => console.error('unhandledRejection:', e?.message || e));
