#!/usr/bin/env node
// nb-call.mjs — Gọi 1 tool của notebooklm-mcp qua JSON-RPC (stdio), không cần MCP nạp sẵn trong Claude.
// Dùng: node nb-call.mjs <toolName> '<jsonArgs>'   (jsonArgs mặc định {})
//   hoặc node nb-call.mjs --list                    (liệt kê tool)
// In ra JSON kết quả (content text) ra stdout. Exit 1 nếu lỗi.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

// Tự dò binary notebooklm-mcp (cross-platform). Ưu tiên env NLM_MCP_EXE.
function detectExe() {
  if (process.env.NLM_MCP_EXE) return process.env.NLM_MCP_EXE;
  if (process.platform !== "win32") {
    try {
      const r = spawnSync("which", ["notebooklm-mcp"], { encoding: "utf8" });
      const line = (r.stdout || "").split(/\r?\n/).map(s => s.trim()).find(Boolean);
      if (line && existsSync(line)) return line;
    } catch {}
    const guess = `${homedir()}/.local/bin/notebooklm-mcp`;
    if (existsSync(guess)) return guess;
    return "notebooklm-mcp"; // dựa vào PATH
  }
  return "C:/Users/Admin/AppData/Roaming/Python/Python312/Scripts/notebooklm-mcp.exe";
}
const EXE = detectExe();
const WAIT_MS = parseInt(process.env.NLM_WAIT_MS || "180000", 10); // 3 phút mặc định

const [, , tool, argsRaw] = process.argv;
if (!tool) { console.error("Thiếu tên tool. VD: node nb-call.mjs notebook_list"); process.exit(2); }
let args = {};
if (argsRaw && argsRaw !== "--") { try { args = JSON.parse(argsRaw); } catch (e) { console.error("jsonArgs không hợp lệ:", e.message); process.exit(2); } }

const p = spawn(EXE, [], { stdio: ["pipe", "pipe", "pipe"] });
let buf = "";
const lines = [];
p.stdout.on("data", d => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\n")) >= 0) { lines.push(buf.slice(0, i)); buf = buf.slice(i + 1); }
});
p.stderr.on("data", () => {}); // nuốt log
p.on("error", e => { console.error("spawn lỗi:", e.message); process.exit(1); });

const send = o => p.stdin.write(JSON.stringify(o) + "\n");
const seen = new Set();
function drain() {
  for (const line of lines.splice(0)) {
    if (!line.trim()) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.id != null && !seen.has(j.id)) { seen.add(j.id); handlers[j.id]?.(j); }
  }
}
const handlers = {};
const waitFor = (id, ms) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error(`timeout chờ id ${id} sau ${ms}ms`)), ms);
  handlers[id] = j => { clearTimeout(t); res(j); };
});
const poll = setInterval(drain, 100);

try {
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "nb-call", version: "1" } } });
  await waitFor(1, 15000);
  send({ jsonrpc: "2.0", method: "notifications/initialized" });

  if (tool === "--list") {
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const r = await waitFor(2, 15000);
    for (const t of r.result?.tools || []) console.log(t.name, "::", (t.description || "").replace(/\s+/g, " ").slice(0, 100));
  } else {
    send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: tool, arguments: args } });
    const r = await waitFor(3, WAIT_MS);
    if (r.error) { console.error("TOOL ERROR:", JSON.stringify(r.error)); process.exitCode = 1; }
    const content = r.result?.content;
    if (Array.isArray(content)) console.log(content.map(c => c.text ?? JSON.stringify(c)).join("\n"));
    else console.log(JSON.stringify(r.result, null, 2));
    if (r.result?.isError) process.exitCode = 1;
  }
} catch (e) {
  console.error("LỖI:", e.message); process.exitCode = 1;
} finally {
  clearInterval(poll); p.kill();
}
