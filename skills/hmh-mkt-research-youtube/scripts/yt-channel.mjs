#!/usr/bin/env node
// yt-channel.mjs — Liệt kê TOÀN BỘ video của một kênh YouTube (theo @handle hoặc channelId).
// Chạy bằng Node >= 18. Đọc YOUTUBE_API_KEY từ .env (tìm ngược lên thư mục cha).
//
// Dùng:
//   node yt-channel.mjs --handle tochucdaotaowit [--out videos.json] [--with-stats]
//   node yt-channel.mjs --channel-id UCxxxx --out videos.json
//   --with-stats : lấy thêm view/like/duration (tốn thêm quota, batch 50)

import fs from "node:fs";
import path from "node:path";

const API = "https://www.googleapis.com/youtube/v3";

function parseArgs(argv) { const a = {}; for (let i = 0; i < argv.length; i++) { const t = argv[i]; if (t.startsWith("--")) { const k = t.slice(2); const v = argv[i + 1]; if (v === undefined || v.startsWith("--")) a[k] = true; else { a[k] = v; i++; } } } return a; }
const args = parseArgs(process.argv.slice(2));

function loadEnv() { let dir = process.cwd(); for (let i = 0; i < 8; i++) { const f = path.join(dir, ".env"); if (fs.existsSync(f)) { for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } return; } const p = path.dirname(dir); if (p === dir) break; dir = p; } }
loadEnv();
const KEYS = [args.key, process.env.YOUTUBE_API_KEY, process.env.YOUTUBE_API_KEY_2, process.env.YOUTUBE_API_KEY_3, process.env.YOUTUBE_API_KEY_4].filter(Boolean);
if (!KEYS.length) { console.error("Thiếu YOUTUBE_API_KEY (.env) hoặc --key."); process.exit(1); }
let keyIdx = 0;

async function api(endpoint, params) {
  while (true) {
    const url = new URL(`${API}/${endpoint}`);
    url.searchParams.set("key", KEYS[keyIdx]);
    for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
    const res = await fetch(url);
    const j = await res.json();
    if (!res.ok) {
      const reason = j?.error?.errors?.[0]?.reason || "";
      if (/quotaExceeded|dailyLimitExceeded|rateLimitExceeded/.test(reason) && keyIdx < KEYS.length - 1) {
        console.error(`⚠️  Key #${keyIdx + 1} hết quota (${reason}). Chuyển sang key #${keyIdx + 2}...`);
        keyIdx++;
        continue;
      }
      throw new Error(`API ${endpoint} ${res.status}: ${j?.error?.message || res.statusText}`);
    }
    return j;
  }
}

function chunk(a, n) { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }

async function main() {
  // 1) resolve channel
  let chId = args["channel-id"];
  let chTitle = "";
  let chStats = {};
  if (!chId) {
    const handle = (args.handle || "").replace(/^@/, "");
    if (!handle) { console.error("Cần --handle <tên> hoặc --channel-id."); process.exit(1); }
    const d = await api("channels", { part: "contentDetails,snippet,statistics", forHandle: handle });
    if (!d.items?.length) { console.error(`Không tìm thấy kênh @${handle}.`); process.exit(1); }
    chId = d.items[0].id;
    chTitle = d.items[0].snippet?.title;
    chStats = d.items[0].statistics || {};
    var uploads = d.items[0].contentDetails?.relatedPlaylists?.uploads;
  } else {
    const d = await api("channels", { part: "contentDetails,snippet,statistics", id: chId });
    chTitle = d.items?.[0]?.snippet?.title;
    chStats = d.items?.[0]?.statistics || {};
    var uploads = d.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  }
  console.error(`Kênh: ${chTitle} (${chId}) — subs ${Number(chStats.subscriberCount||0).toLocaleString()} · videos ${chStats.videoCount}`);
  console.error(`Uploads playlist: ${uploads}`);

  // 2) page through uploads
  const vids = [];
  let pageToken;
  do {
    const d = await api("playlistItems", { part: "snippet,contentDetails", playlistId: uploads, maxResults: 50, pageToken });
    for (const it of d.items || []) {
      vids.push({
        videoId: it.contentDetails?.videoId,
        title: it.snippet?.title,
        publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt,
        url: `https://www.youtube.com/watch?v=${it.contentDetails?.videoId}`,
      });
    }
    pageToken = d.nextPageToken;
    process.error?.write?.(".");
  } while (pageToken);
  console.error(`\n→ Lấy được ${vids.length} video.`);

  // 3) optional stats
  if (args["with-stats"]) {
    const map = new Map();
    for (const c of chunk(vids.map(v => v.videoId), 50)) {
      const d = await api("videos", { part: "statistics,contentDetails", id: c.join(",") });
      for (const it of d.items || []) map.set(it.id, it);
    }
    for (const v of vids) {
      const it = map.get(v.videoId);
      v.views = parseInt(it?.statistics?.viewCount || "0", 10);
      v.likes = parseInt(it?.statistics?.likeCount || "0", 10);
      v.duration = it?.contentDetails?.duration;
    }
    vids.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    vids.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  const payload = { meta: { channel: chTitle, channelId: chId, subscribers: chStats.subscriberCount, videoCount: vids.length, generatedAt: new Date().toISOString() }, results: vids };
  if (args.out) { fs.writeFileSync(args.out, JSON.stringify(payload, null, 2)); console.error(`✓ Lưu: ${args.out}`); }

  // bảng tóm tắt
  const fmt = n => n == null ? "—" : Number(n).toLocaleString("en-US");
  console.log(`\n| # | Video | ${args["with-stats"] ? "Views | " : ""}Ngày |`);
  console.log(`|---|-------|${args["with-stats"] ? "------:|" : ""}------|`);
  vids.forEach((v, i) => console.log(`| ${i + 1} | ${(v.title||"").replace(/\|/g,"/").slice(0,70)} | ${args["with-stats"] ? fmt(v.views) + " | " : ""}${(v.publishedAt||"").slice(0,10)} |`));
}
main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
