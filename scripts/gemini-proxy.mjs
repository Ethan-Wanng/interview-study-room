import { existsSync, mkdirSync, statSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const proxyDir = fileURLToPath(new URL("../gemini-proxy", import.meta.url));
const binDir = join(proxyDir, ".bin");
const binName = process.platform === "win32" ? "gemini-proxy.exe" : "gemini-proxy";
const binPath = join(binDir, binName);
const defaultPort = Number(process.env.GEMINI_PROXY_PORT || 18765);
const listenAddr = `127.0.0.1:${defaultPort}`;
const proxyUrl = `http://${listenAddr}`;

async function isHealthy(url) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1200) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function newestGoMtime() {
  let latest = 0;
  for (const name of ["anytls.go", "checker.go", "server.go", "dialer_windows.go", "dialer_other.go", "system_proxy_windows.go", "system_proxy_other.go", "cmd/gemini-proxy/main.go"]) {
    const p = join(proxyDir, name);
    if (existsSync(p)) latest = Math.max(latest, statSync(p).mtimeMs);
  }
  return latest;
}

function ensureBinary() {
  if (!existsSync(join(proxyDir, "go.mod"))) return null;
  const srcTime = newestGoMtime();
  if (existsSync(binPath) && statSync(binPath).mtimeMs >= srcTime) return binPath;
  mkdirSync(binDir, { recursive: true });
  const build = spawnSync("go", ["build", "-o", binPath, "./cmd/gemini-proxy"], {
    cwd: proxyDir,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (build.status === 0 && existsSync(binPath)) return binPath;
  if (build.stderr) console.warn(`[gemini-proxy] go build warning: ${build.stderr.trim()}`);
  return null;
}

export async function startLocalGeminiProxy({ verbose = false } = {}) {
  const existing = await isHealthy(proxyUrl);
  if (existing?.ok) {
    if (verbose) console.log(`[gemini-proxy] reusing ${proxyUrl} (mode=${existing.mode || "probing"})`);
    return { url: proxyUrl, status: existing, stop() {} };
  }

  const exe = ensureBinary();
  const cmd = exe || "go";
  const args = exe
    ? ["-listen", listenAddr]
    : ["run", "./cmd/gemini-proxy", "-listen", listenAddr];

  const child = spawn(cmd, args, {
    cwd: proxyDir,
    env: process.env,
    stdio: ["ignore", "pipe", verbose ? "inherit" : "pipe"],
  });

  const stop = () => {
    try {
      if (!child.killed) child.kill();
    } catch {}
  };

  let exited = false;
  let errMsg = "";
  child.on("exit", (code) => {
    exited = true;
    if (code && verbose) console.warn(`[gemini-proxy] exited with code ${code}${errMsg ? `: ${errMsg}` : ""}`);
  });
  child.stderr?.on("data", (d) => {
    errMsg += String(d).slice(0, 400);
  });

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && !exited) {
    const st = await isHealthy(proxyUrl);
    if (st?.ok) {
      if (verbose) console.log(`[gemini-proxy] listening at ${proxyUrl} (mode=${st.mode || "probing"}, existing=${st.existingProxy || "checking"})`);
      return { url: proxyUrl, status: st, stop };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (verbose && errMsg) console.warn(`[gemini-proxy] startup error: ${errMsg}`);
  stop();
  return null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = await startLocalGeminiProxy({ verbose: true });
  if (!res) {
    console.error("[gemini-proxy] failed to start local Gemini proxy");
    process.exit(1);
  }
  const onSig = () => {
    res.stop();
    process.exit(0);
  };
  process.on("SIGINT", onSig);
  process.on("SIGTERM", onSig);
  await new Promise(() => {});
}
