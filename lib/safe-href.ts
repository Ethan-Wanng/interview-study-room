export type SafeHref = {
  href: string;
  external: boolean;
};

export function classifySafeHref(raw: string): SafeHref | null {
  const s = raw.trim();
  if (!s || /[\u0000-\u0020\u007f]/.test(s)) return null;
  if (s.startsWith('/') && !s.startsWith('//')) {
    return { href: s, external: false };
  }
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return { href: u.toString(), external: true };
      }
    } catch {
      return null;
    }
  }
  return null;
}

const TRAILING_PUNCT_RE = /^[。，、；：！？）】》”’.,;!?)\]}"']+$/;

export function splitBareUrlTrailing(raw: string): { url: string; trailing: string } {
  let url = raw;
  let trailing = '';
  while (url.length > 8) {
    const ch = url[url.length - 1];
    if (ch === ')') {
      const opens = (url.match(/\(/g) || []).length;
      const closes = (url.match(/\)/g) || []).length;
      if (closes > opens) {
        url = url.slice(0, -1);
        trailing = ch + trailing;
        continue;
      }
      break;
    }
    if (TRAILING_PUNCT_RE.test(ch)) {
      url = url.slice(0, -1);
      trailing = ch + trailing;
      continue;
    }
    break;
  }
  return { url, trailing };
}
