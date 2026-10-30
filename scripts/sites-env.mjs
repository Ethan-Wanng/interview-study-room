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

// 本地预览用的 Gemini 密钥：从项目外的 ../1.txt 读出，写进构建目录里的 .dev.vars（wrangler dev 会读取它；dist/ 不提交）。
// 线上用 `wrangler secret put GEMINI_API_KEY` 设置，不经过这里。
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const keyFile = path.join(projectRoot, "../1.txt"), devVars = path.join(projectRoot, "dist/server/.dev.vars");
if (!process.env.GEMINI_API_KEY && existsSync(keyFile) && existsSync(path.dirname(devVars))) {
  writeFileSync(devVars, `GEMINI_API_KEY=${readFileSync(keyFile, "utf8").trim()}\n`);
}
