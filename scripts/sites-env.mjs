import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const runtimeRoot = process.env.SITES_RUNTIME_ROOT || path.join(projectRoot, ".sites-runtime");

process.env.CLOUDFLARE_CF_FETCH_ENABLED ||= "false";
process.env.WRANGLER_SEND_METRICS ||= "false";
process.env.WRANGLER_WRITE_LOGS ||= "false";
process.env.WRANGLER_LOG_PATH ||= path.join(runtimeRoot, "wrangler/logs");
process.env.WRANGLER_REGISTRY_PATH ||= path.join(runtimeRoot, "wrangler/dev-registry");
process.env.MINIFLARE_REGISTRY_PATH ||= path.join(runtimeRoot, "wrangler/registry");

process.chdir(projectRoot);
for (const directory of [
  path.dirname(process.env.WRANGLER_LOG_PATH),
  process.env.WRANGLER_REGISTRY_PATH,
  process.env.MINIFLARE_REGISTRY_PATH,
]) {
  mkdirSync(directory, { recursive: true });
}

// 本地预览用的 AI 密钥：从项目外的 ../2.txt（DeepSeek）和 ../1.txt（Gemini）读出，写进构建目录里的 .dev.vars（wrangler dev 会读取它；dist/ 不提交）。
// 线上用 `wrangler secret put DEEPSEEK_API_KEY` 设置。
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const dsKeyFile = path.join(projectRoot, "../2.txt");
const gmKeyFile = path.join(projectRoot, "../1.txt");
const devVars = path.join(projectRoot, "dist/server/.dev.vars");
if (existsSync(path.dirname(devVars))) {
  const lines = [];
  if (!process.env.DEEPSEEK_API_KEY && existsSync(dsKeyFile)) {
    lines.push(`DEEPSEEK_API_KEY=${readFileSync(dsKeyFile, "utf8").trim()}`);
  }
  if (!process.env.GEMINI_API_KEY && existsSync(gmKeyFile)) {
    lines.push(`GEMINI_API_KEY=${readFileSync(gmKeyFile, "utf8").trim()}`);
  }
  if (lines.length) {
    writeFileSync(devVars, lines.join("\n") + "\n");
  }
}
