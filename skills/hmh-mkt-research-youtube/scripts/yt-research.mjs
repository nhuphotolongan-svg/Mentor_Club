#!/usr/bin/env node
// yt-research.mjs — Research video YouTube theo chủ đề, lọc theo lượt xem (view) & người đăng ký (sub).
// Chạy bằng Node >= 18 (có fetch sẵn). Không cần cài package.
//
// Ví dụ:
//   node yt-research.mjs --query "kinh doanh online" --min-views 100000 --min-subs 50000 --max 100 --region VN --since 2024-01-01 --order viewCount --out ket-qua.json
//
// Đọc API key theo thứ tự: --key > $YOUTUBE_API_KEY > file .env (tìm ngược lên thư mục cha).

import fs from "node:fs";
import path from "node:path";

const API = "https://www.googleapis.com/youtube/v3";

// ---------- Parse args ----------
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const k = t.slice(2);
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) { a[k] = true; }
      else { a[k] = v; i++; }
    }
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  console.log(`
yt-research.mjs — Research video YouTube theo chủ đề

Tham số:
  --query, -q     <text>   Từ khoá / chủ đề (BẮT BUỘC). Có thể truyền nhiều --query.
  --min-views     <int>    Lượt xem tối thiểu (mặc định 0)
  --min-subs      <int>    Số người đăng ký kênh tối thiểu (mặc định 0)
  --max-subs      <int>    Số sub tối đa (để tìm kênh nhỏ mà video viral; mặc định ∞)
  --max           <int>    Số video ứng viên tối đa cần quét (mặc định 100, bội số 50)
  --region        <CC>     Mã quốc gia, vd VN, US (mặc định VN)
  --lang          <ll>     relevanceLanguage, vd vi, en (mặc định vi)
  --since         <date>   Chỉ video đăng sau ngày này YYYY-MM-DD (publishedAfter)
  --until         <date>   Chỉ video đăng trước ngày này YYYY-MM-DD
  --duration      <type>   any | short | medium | long (mặc định any)
  --order         <by>     relevance | viewCount | date | rating (sắp xếp lúc search; mặc định viewCount)
  --sort          <field>  views | subs | outlier | vpd | engagement | recent (sắp xếp output; mặc định outlier)
  --top           <int>    Chỉ lấy N kết quả đầu sau khi lọc & sắp xếp (mặc định tất cả)
  --out           <file>   Lưu JSON kết quả ra file
  --key           <key>    YouTube API key (nếu không có sẽ đọc env / .env)

Chỉ số tính thêm:
  outlier = views / subs  → video "vượt cỡ kênh" (tín hiệu chủ đề cộng hưởng)
  vpd     = views / số ngày tuổi  → tốc độ kéo view
  engagement = (likes+comments)/views
`);
  process.exit(0);
}

// ---------- Tìm API key ----------
function loadEnvFile() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const f = path.join(dir, ".env");
    if (fs.existsSync(f)) {
      const txt = fs.readFileSync(f, "utf8");
      for (const line of txt.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
      }
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}
loadEnvFile();

// Hỗ trợ nhiều key để xoay vòng khi hết quota: YOUTUBE_API_KEY, YOUTUBE_API_KEY_2, _3...
const KEYS = [
  args.key,
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_API_KEY_2,
  process.env.YOUTUBE_API_KEY_3,
  process.env.YOUTUBE_API_KEY_4,
].filter(Boolean);
if (!KEYS.length) {
  console.error("LỖI: Không tìm thấy API key. Đặt YOUTUBE_API_KEY trong .env hoặc dùng --key.");
  process.exit(1);
}
let keyIdx = 0;

// ---------- Gom query (cho phép nhiều --query) ----------
let queries = [];
const rawQ = process.argv.slice(2).reduce((acc, t, i, arr) => {
  if ((t === "--query" || t === "-q") && arr[i + 1]) acc.push(arr[i + 1]);
  return acc;
}, []);
queries = rawQ.length ? rawQ : (typeof args.query === "string" ? [args.query] : (typeof args.q === "string" ? [args.q] : []));
if (!queries.length) {
  console.error("LỖI: Thiếu --query. Dùng --help để xem hướng dẫn.");
  process.exit(1);
}

const minViews = parseInt(args["min-views"] || "0", 10);
const minSubs  = parseInt(args["min-subs"] || "0", 10);
const maxSubs  = args["max-subs"] ? parseInt(args["max-subs"], 10) : Infinity;
const maxCand  = parseInt(args.max || "100", 10);
const region   = args.region || "VN";
const lang     = args.lang || "vi";
const order    = args.order || "viewCount";
const duration = args.duration || "any";
const sortBy   = args.sort || "outlier";
const topN     = args.top ? parseInt(args.top, 10) : Infinity;

function isoDate(d, end) {
  if (!d) return undefined;
  return end ? `${d}T23:59:59Z` : `${d}T00:00:00Z`;
}

async function api(endpoint, params) {
  while (true) {
    const url = new URL(`${API}/${endpoint}`);
    url.searchParams.set("key", KEYS[keyIdx]);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      const reason = json?.error?.errors?.[0]?.reason || "";
      const msg = json?.error?.message || res.statusText;
      // Hết quota -> tự xoay sang key kế tiếp (nếu còn)
      if (/quotaExceeded|dailyLimitExceeded|rateLimitExceeded/.test(reason) && keyIdx < KEYS.length - 1) {
        console.error(`⚠️  Key #${keyIdx + 1} hết quota (${reason}). Chuyển sang key #${keyIdx + 2}...`);
        keyIdx++;
        continue;
      }
      throw new Error(`API ${endpoint} (${res.status} ${reason}): ${msg}`);
    }
    return json;
  }
}

// ---------- B1: search.list (gom video ID) ----------
async function searchVideos(q) {
  const ids = new Map(); // videoId -> {channelId, publishedAt, title}
  let pageToken = undefined;
  const pages = Math.ceil(maxCand / 50);
  for (let p = 0; p < pages; p++) {
    const data = await api("search", {
      part: "snippet",
      q,
      type: "video",
      maxResults: 50,
      order,
      regionCode: region,
      relevanceLanguage: lang,
      videoDuration: duration,
      publishedAfter: isoDate(args.since, false),
      publishedBefore: isoDate(args.until, true),
      pageToken,
    });
    for (const it of data.items || []) {
      const vid = it.id?.videoId;
      if (vid && !ids.has(vid)) {
        ids.set(vid, {
          channelId: it.snippet?.channelId,
          channelTitle: it.snippet?.channelTitle,
          publishedAt: it.snippet?.publishedAt,
          title: it.snippet?.title,
          matchedQuery: q,
        });
      }
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function main() {
  console.error(`Đang research ${queries.length} chủ đề: ${queries.join(" | ")}`);
  const candidates = new Map();
  for (const q of queries) {
    const r = await searchVideos(q);
    for (const [k, v] of r) if (!candidates.has(k)) candidates.set(k, v);
  }
  console.error(`→ Tìm thấy ${candidates.size} video ứng viên. Đang lấy thống kê...`);

  // B2: videos.list (statistics + contentDetails)
  const vidIds = [...candidates.keys()];
  const videoStats = new Map();
  for (const c of chunk(vidIds, 50)) {
    const data = await api("videos", {
      part: "statistics,snippet,contentDetails",
      id: c.join(","),
    });
    for (const it of data.items || []) videoStats.set(it.id, it);
  }

  // B3: channels.list (subscriberCount)
  const chanIds = [...new Set([...videoStats.values()].map(v => v.snippet?.channelId).filter(Boolean))];
  const chanStats = new Map();
  for (const c of chunk(chanIds, 50)) {
    const data = await api("channels", {
      part: "statistics,snippet",
      id: c.join(","),
    });
    for (const it of data.items || []) chanStats.set(it.id, it);
  }

  // B4: ghép + tính chỉ số + lọc
  const now = Date.now();
  let rows = [];
  for (const [vid, v] of videoStats) {
    const ch = chanStats.get(v.snippet?.channelId);
    const views = parseInt(v.statistics?.viewCount || "0", 10);
    const likes = parseInt(v.statistics?.likeCount || "0", 10);
    const comments = parseInt(v.statistics?.commentCount || "0", 10);
    const subs = parseInt(ch?.statistics?.subscriberCount || "0", 10);
    const subsHidden = ch?.statistics?.hiddenSubscriberCount === true;
    const ageDays = Math.max(1, (now - new Date(v.snippet?.publishedAt).getTime()) / 86400000);
    const vpd = views / ageDays;
    const outlier = subs > 0 ? views / subs : (views > 0 ? Infinity : 0);
    const engagement = views > 0 ? (likes + comments) / views : 0;

    if (views < minViews) continue;
    if (!subsHidden && (subs < minSubs || subs > maxSubs)) continue;

    rows.push({
      title: v.snippet?.title,
      videoId: vid,
      url: `https://www.youtube.com/watch?v=${vid}`,
      channel: v.snippet?.channelTitle,
      channelId: v.snippet?.channelId,
      channelUrl: `https://www.youtube.com/channel/${v.snippet?.channelId}`,
      publishedAt: v.snippet?.publishedAt,
      ageDays: Math.round(ageDays),
      views,
      likes,
      comments,
      subs: subsHidden ? null : subs,
      outlier: Number.isFinite(outlier) ? +outlier.toFixed(2) : null,
      vpd: Math.round(vpd),
      engagement: +(engagement * 100).toFixed(2), // %
      matchedQuery: candidates.get(vid)?.matchedQuery,
    });
  }

  // B5: sắp xếp
  const sorters = {
    views: (a, b) => b.views - a.views,
    subs: (a, b) => (b.subs || 0) - (a.subs || 0),
    outlier: (a, b) => (b.outlier || 0) - (a.outlier || 0),
    vpd: (a, b) => b.vpd - a.vpd,
    engagement: (a, b) => b.engagement - a.engagement,
    recent: (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  };
  rows.sort(sorters[sortBy] || sorters.outlier);
  if (Number.isFinite(topN)) rows = rows.slice(0, topN);

  // ---------- Output ----------
  const fmt = n => n == null ? "—" : n.toLocaleString("en-US");
  console.error(`→ ${rows.length} video đạt điều kiện (views≥${fmt(minViews)}, subs≥${fmt(minSubs)}${Number.isFinite(maxSubs) ? `, ≤${fmt(maxSubs)}` : ""}). Sắp xếp theo: ${sortBy}\n`);

  // Bảng markdown ra stdout
  console.log(`| # | Video | Kênh | Views | Subs | Outlier | V/ngày | Eng% | Tuổi(ngày) | Link |`);
  console.log(`|---|-------|------|------:|-----:|--------:|-------:|-----:|-----------:|------|`);
  rows.forEach((r, i) => {
    const title = (r.title || "").replace(/\|/g, "/").slice(0, 60);
    const chan = (r.channel || "").replace(/\|/g, "/").slice(0, 28);
    console.log(`| ${i + 1} | ${title} | ${chan} | ${fmt(r.views)} | ${fmt(r.subs)} | ${r.outlier ?? "—"} | ${fmt(r.vpd)} | ${r.engagement} | ${r.ageDays} | ${r.url} |`);
  });

  if (args.out) {
    const payload = {
      meta: {
        queries, minViews, minSubs, maxSubs: Number.isFinite(maxSubs) ? maxSubs : null,
        region, lang, order, sortBy, candidates: candidates.size, results: rows.length,
        generatedAt: new Date().toISOString(),
      },
      results: rows,
    };
    fs.writeFileSync(args.out, JSON.stringify(payload, null, 2), "utf8");
    console.error(`\n✓ Đã lưu JSON: ${args.out}`);
  }
}

main().catch(e => { console.error("LỖI:", e.message); process.exit(1); });
