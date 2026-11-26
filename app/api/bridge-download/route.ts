import { NextResponse } from 'next/server';

const BRIDGE_ASSETS: Record<string, string> = {
  'win-x64': 'InterviewStudyBridge-win-x64.exe',
  'darwin-arm64': 'InterviewStudyBridge-darwin-arm64',
  'darwin-x64': 'InterviewStudyBridge-darwin-x64',
  'linux-x64': 'InterviewStudyBridge-linux-x64',
};

const CODEX_ASSETS: Record<string, string> = {
  'win-x64': 'codex-x86_64-pc-windows-msvc.exe',
  'win-arm64': 'codex-aarch64-pc-windows-msvc.exe',
  'darwin-arm64': 'codex-aarch64-apple-darwin.tar.gz',
  'darwin-x64': 'codex-x86_64-apple-darwin.tar.gz',
  'linux-x64': 'codex-x86_64-unknown-linux-musl.tar.gz',
  'linux-arm64': 'codex-aarch64-unknown-linux-musl.tar.gz',
};

const AGY_PLATFORMS = new Set([
  'windows_amd64',
  'windows_arm64',
  'darwin_arm64',
  'darwin_amd64',
  'linux_amd64',
  'linux_arm64',
]);

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tool = (url.searchParams.get('tool') || 'bridge').trim().toLowerCase();
  const os = (url.searchParams.get('os') || 'win-x64').trim();

  if (tool === 'bridge') {
    const assetName = BRIDGE_ASSETS[os];
    if (!assetName) {
      return NextResponse.json({ error: 'invalid_os', message: '不支持的系统架构' }, { status: 400 });
    }
    const ghUrl = `https://github.com/Ethan-Wanng/interview-study-room/releases/latest/download/${assetName}`;
    try {
      const upstream = await fetchWithTimeout(ghUrl, { redirect: 'follow' }, 25_000);
      if (upstream.status === 404) {
        return NextResponse.json({ error: 'release_not_ready', message: '安装包正在构建中' }, { status: 404 });
      }
      if (!upstream.ok || !upstream.body) {
        return NextResponse.json({ error: 'upstream_error', message: `下载源返回 ${upstream.status}` }, { status: 502 });
      }
      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${assetName}"`,
        'Cache-Control': 'public, max-age=300',
        'X-Asset-Filename': assetName,
      });
      const len = upstream.headers.get('content-length');
      if (len) headers.set('Content-Length', len);
      return new Response(upstream.body, { status: 200, headers });
    } catch {
      return NextResponse.json({ error: 'upstream_timeout', message: '下载超时，请重试' }, { status: 504 });
    }
  }

  if (tool === 'codex') {
    const assetName = CODEX_ASSETS[os];
    if (!assetName) {
      return NextResponse.json({ error: 'invalid_os', message: '不支持的系统架构' }, { status: 400 });
    }
    try {
      const relRes = await fetchWithTimeout(
        'https://api.github.com/repos/openai/codex/releases/latest',
        { headers: { 'User-Agent': 'interview-study-room', Accept: 'application/vnd.github+json' } },
        15_000,
      );
      if (!relRes.ok) {
        return NextResponse.json({ error: 'upstream_error', message: `获取 Codex 版本失败 (${relRes.status})` }, { status: 502 });
      }
      const rel = (await relRes.json()) as {
        tag_name?: string;
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      };
      const asset = rel.assets?.find(a => a.name === assetName);
      const dlUrl = asset?.browser_download_url || '';
      if (!dlUrl.startsWith('https://github.com/openai/codex/releases/download/')) {
        return NextResponse.json({ error: 'asset_not_found', message: '未找到匹配的 Codex 安装包' }, { status: 404 });
      }
      const binRes = await fetchWithTimeout(dlUrl, { redirect: 'follow' }, 25_000);
      if (!binRes.ok || !binRes.body) {
        return NextResponse.json({ error: 'upstream_error', message: `下载 Codex 失败 (${binRes.status})` }, { status: 502 });
      }
      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${assetName}"`,
        'X-Asset-Filename': assetName,
        ...(rel.tag_name ? { 'X-Asset-Version': rel.tag_name } : {}),
      });
      const len = binRes.headers.get('content-length');
      if (len) headers.set('Content-Length', len);
      return new Response(binRes.body, { status: 200, headers });
    } catch {
      return NextResponse.json({ error: 'upstream_timeout', message: '下载 Codex 超时' }, { status: 504 });
    }
  }

  if (tool === 'agy') {
    const plat = AGY_PLATFORMS.has(os) ? os : '';
    if (!plat) {
      return NextResponse.json({ error: 'invalid_os', message: '不支持的系统架构' }, { status: 400 });
    }
    try {
      const mfRes = await fetchWithTimeout(
        `https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/${plat}.json`,
        {},
        15_000,
      );
      if (!mfRes.ok) {
        return NextResponse.json({ error: 'upstream_error', message: `获取 Antigravity 清单失败 (${mfRes.status})` }, { status: 502 });
      }
      const mf = (await mfRes.json()) as { url?: string; sha512?: string; version?: string };
      const dlUrl = typeof mf.url === 'string' ? mf.url : '';
      if (
        !dlUrl.startsWith('https://storage.googleapis.com/antigravity-public/') &&
        !dlUrl.startsWith('https://antigravity.google/')
      ) {
        return NextResponse.json({ error: 'invalid_manifest', message: '无效的官方下载地址' }, { status: 502 });
      }
      const binRes = await fetchWithTimeout(dlUrl, { redirect: 'follow' }, 25_000);
      if (!binRes.ok || !binRes.body) {
        return NextResponse.json({ error: 'upstream_error', message: `下载 Antigravity 失败 (${binRes.status})` }, { status: 502 });
      }
      const filename = plat.startsWith('windows_') ? 'agy.exe' : 'agy';
      const headers = new Headers({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Asset-Filename': filename,
        ...(mf.sha512 ? { 'X-Asset-Sha512': mf.sha512 } : {}),
        ...(mf.version ? { 'X-Asset-Version': mf.version } : {}),
      });
      const len = binRes.headers.get('content-length');
      if (len) headers.set('Content-Length', len);
      return new Response(binRes.body, { status: 200, headers });
    } catch {
      return NextResponse.json({ error: 'upstream_timeout', message: '下载 Antigravity 超时' }, { status: 504 });
    }
  }

  return NextResponse.json({ error: 'invalid_tool', message: '未知下载目标' }, { status: 400 });
}
