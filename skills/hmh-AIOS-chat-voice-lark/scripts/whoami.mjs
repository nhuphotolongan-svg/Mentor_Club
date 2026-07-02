#!/usr/bin/env node
// whoami.mjs — lấy OWNER_OPEN_ID + CONTROL_CHAT_ID trong ~10 giây.
// Cần APP_ID/APP_SECRET trong .env và Bot đã vào nhóm điều khiển.
// Chạy:  node whoami.mjs   → rồi vào nhóm nhắn 1 tin bất kỳ ("test").
import * as Lark from '@larksuiteoapi/node-sdk';
import dotenv from 'dotenv';
dotenv.config();

const appId = process.env.APP_ID, appSecret = process.env.APP_SECRET;
if (!appId || !appSecret) { console.error('❌ Thiếu APP_ID/APP_SECRET trong .env'); process.exit(1); }
const domain = (process.env.LARK_DOMAIN || 'lark').toLowerCase() === 'feishu' ? Lark.Domain.Feishu : Lark.Domain.Lark;

console.log('👂 Đang nghe… Vào NHÓM ĐIỀU KHIỂN trên Lark và nhắn 1 tin bất kỳ (vd "test").');

const dispatcher = new Lark.EventDispatcher({}).register({
  'im.message.receive_v1': async (data) => {
    const openId = data?.sender?.sender_id?.open_id;
    const chatId = data?.message?.chat_id;
    console.log('\n✅ Bắt được tin! Copy 2 dòng này vào .env:\n');
    console.log('OWNER_OPEN_ID=' + openId);
    console.log('CONTROL_CHAT_ID=' + chatId + '\n');
    process.exit(0);
  },
});
const ws = new Lark.WSClient({ appId, appSecret, domain });
ws.start({ eventDispatcher: dispatcher });
setTimeout(() => { console.error('⌛ Hết giờ chờ (60s). Kiểm tra Bot đã vào nhóm + app đã publish chưa.'); process.exit(2); }, 60000);
