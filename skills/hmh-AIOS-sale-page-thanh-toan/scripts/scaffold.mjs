#!/usr/bin/env node
/**
 * scaffold.mjs — Sinh project "sale page tự động thanh toán" hoàn chỉnh từ một brief.
 *
 * Cách dùng:
 *   node scaffold.mjs --brief path/to/brief.json
 *   node scaffold.mjs --ten "Khóa X3" --slug "x3-marketing" --gia 497000 \
 *        --mau "#E11D48" --bank MB --stk 9978276815 --chutk "HOANG MINH HOA"
 *
 * Ra: output/YYYY-MM-DD-salepage-<slug>/
 *   ├── index.html  thanh-toan/index.html  wrangler.toml
 *   ├── lib/*.js   functions/api/*.js
 *   ├── brief.json            (brief đã chốt)
 *   ├── SECRETS.local.txt      (các lệnh wrangler secret + SEPAY_API_KEY đã sinh — KHÔNG commit)
 *   └── .gitignore
 *
 * Sau khi sinh: cd vào thư mục → wrangler pages deploy . (xem SKILL.md Bước 4).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "..", "assets");

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = i + 1 < argv.length && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      a[key] = val;
    }
  }
  return a;
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function noAccentUpper(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toUpperCase();
}

const args = parseArgs(process.argv);
let brief = {};
if (args.brief) {
  const p = path.resolve(args.brief);
  if (!fs.existsSync(p)) { console.error("Không tìm thấy brief:", p); process.exit(1); }
  brief = JSON.parse(fs.readFileSync(p, "utf8"));
}

// Gộp brief + CLI override
brief.ten = args.ten || brief.ten || "Tên Khóa Học";
brief.slug = slugify(args.slug || brief.slug || brief.ten);
brief.gia = String(args.gia || brief.gia || "0").replace(/\D/g, "") || "0";
brief.mau = args.mau || brief.mau || "#E11D48";
brief.mo_ta = args["mo-ta"] || args.mota || brief.mo_ta || "Đăng ký ngay hôm nay để nhận ưu đãi.";
brief.bank_code = args.bank || brief.bank_code || "MB";
brief.so_tai_khoan = String(args.stk || brief.so_tai_khoan || "").replace(/\s/g, "");
brief.ten_chu_tk = args.chutk || brief.ten_chu_tk || "";

if (!brief.so_tai_khoan || !brief.ten_chu_tk) {
  console.error("⚠️  Thiếu số tài khoản (--stk) hoặc tên chủ TK (--chutk). VietQR cần 2 thông tin này.");
}

const giaFmt = Number(brief.gia).toLocaleString("vi-VN");
const chuTkBank = noAccentUpper(brief.ten_chu_tk); // ngân hàng VN dùng tên không dấu, viết hoa

// Map thay thế — CHỈ token UPPERCASE; biến runtime {{name}} của email giữ nguyên.
const MAP = {
  "{{TEN}}": brief.ten,
  "{{SLUG}}": brief.slug,
  "{{GIA}}": brief.gia,
  "{{GIA_FMT}}": giaFmt,
  "{{MAU}}": brief.mau,
  "{{MO_TA}}": brief.mo_ta,
  "{{BANK_CODE}}": brief.bank_code,
  "{{SO_TK}}": brief.so_tai_khoan,
  "{{TEN_CHU_TK}}": chuTkBank,
  "{{TEN_CHU_TK_ENC}}": encodeURIComponent(chuTkBank),
};

const TEXT_EXT = new Set([".html", ".js", ".toml", ".json", ".md", ".txt"]);
function applyMap(str) {
  for (const [k, v] of Object.entries(MAP)) str = str.split(k).join(v ?? "");
  return str;
}

// Thư mục output
const date = new Date().toISOString().slice(0, 10);
const outDir = path.resolve(process.cwd(), "output", `${date}-salepage-${brief.slug}`);
fs.mkdirSync(outDir, { recursive: true });

// Copy đệ quy assets → output
function walk(srcDir, relBase = "") {
  for (const name of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, name);
    const rel = path.join(relBase, name);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) { walk(src, rel); continue; }

    if (name === "brief.example.json") continue; // không copy mẫu vào project
    let outRel = rel;
    if (name === "_gitignore") outRel = path.join(relBase, ".gitignore");

    const dest = path.join(outDir, outRel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    if (TEXT_EXT.has(path.extname(name)) || name === "_gitignore") {
      fs.writeFileSync(dest, applyMap(fs.readFileSync(src, "utf8")));
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}
walk(ASSETS);

// Ghi brief đã chốt
fs.writeFileSync(path.join(outDir, "brief.json"), JSON.stringify(brief, null, 2));

// Sinh SEPAY_API_KEY và file hướng dẫn secrets
const sepayKey = "x3sepay_" + crypto.randomBytes(8).toString("hex");
const secrets = `# SECRETS — KHÔNG commit, KHÔNG lưu vào memory.
# Chạy từng lệnh (wrangler hỏi value thì dán vào). project = ${brief.slug}

wrangler pages secret put LARK_APP_ID --project-name ${brief.slug}
wrangler pages secret put LARK_APP_SECRET --project-name ${brief.slug}
wrangler pages secret put LARK_BASE_TOKEN --project-name ${brief.slug}
wrangler pages secret put LARK_TABLE_ID --project-name ${brief.slug}
wrangler pages secret put LARK_TEMPLATE_TABLE_ID --project-name ${brief.slug}   # tuỳ chọn (bảng Email Templates)
wrangler pages secret put SEPAY_API_KEY --project-name ${brief.slug}            # dán: ${sepayKey}
wrangler pages secret put SMTP_USER --project-name ${brief.slug}                # email Lark gửi mail
wrangler pages secret put SMTP_PASS --project-name ${brief.slug}                # Application Password Lark
wrangler pages secret put SMAX_TRIGGER_URL --project-name ${brief.slug}         # tuỳ chọn (Zalo)
wrangler pages secret put SMAX_TOKEN --project-name ${brief.slug}               # tuỳ chọn
wrangler pages secret put SMAX_CUSTOMER_PID --project-name ${brief.slug}        # tuỳ chọn
wrangler pages secret put SMAX_PAGE_ID --project-name ${brief.slug}             # tuỳ chọn

# === SEPAY_API_KEY đã sinh (dùng cả khi cấu hình webhook trên sepay.vn) ===
# ${sepayKey}
`;
fs.writeFileSync(path.join(outDir, "SECRETS.local.txt"), secrets);

console.log("\n✅ Đã sinh project sale page:");
console.log("   " + outDir);
console.log("\n📦 Gồm: index.html · thanh-toan/index.html · functions/api/{submit,payment-callback,check-payment}.js · lib/*.js · wrangler.toml");
console.log("🔑 SEPAY_API_KEY (đã sinh): " + sepayKey);
console.log("\n👉 Bước tiếp theo (xem SKILL.md Bước 4):");
console.log("   1) Tạo Lark App + Base + Sepay + (Smax) — lấy credentials");
console.log("   2) cd \"" + outDir + "\" && wrangler pages project create " + brief.slug);
console.log("   3) wrangler pages deploy .");
console.log("   4) Chạy các lệnh trong SECRETS.local.txt để nạp bí mật");
console.log("   5) Cấu hình webhook Sepay → https://<domain>/api/payment-callback (Apikey ở trên)\n");
