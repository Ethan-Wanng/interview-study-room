import { randomBytes, randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { studyDb } from '@/db/study';
import { AuthError, assertSameOrigin, hashToken, rateLimit, sessionUser } from '@/lib/site-auth';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateGuestCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await sessionUser(req.headers).catch(() => null);
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    await rateLimit(`bridge-relay-link:${user?.id || ip}`, 30);

    await req.json().catch(() => ({}));

    const db = studyDb();
    const now = Date.now();
    const relaySecret = `rly_${randomBytes(32).toString('hex')}`;
    const secretHash = hashToken(relaySecret);

    const origin = new URL(req.url).origin;
    const wsOrigin = origin.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');

    if (user && !user.is_guest) {
      const roomKey = `user:${user.id}`;
      const id = randomBytes(16).toString('hex');
      await db
        .prepare(
          `INSERT INTO bridge_relay_links (id, room_key, user_id, guest_code, secret_hash, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, ?)
           ON CONFLICT(room_key) DO UPDATE SET
             secret_hash = excluded.secret_hash,
             updated_at = excluded.updated_at`,
        )
        .bind(id, roomKey, user.id, secretHash, now, now)
        .run();

      return NextResponse.json({
        ok: true,
        mode: 'account',
        roomKey,
        relayUrl: `${wsOrigin}/api/bridge-relay/ws`,
        relaySecret,
      });
    }

    // Guest mode: always allocate a fresh unique 6-char code to prevent session hijacking.
    let guestCode = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      const cand = generateGuestCode();
      const exists = await db
        .prepare('SELECT id FROM bridge_relay_links WHERE guest_code = ?')
        .bind(cand)
        .first<{ id: string }>();
      if (!exists) {
        guestCode = cand;
        break;
      }
    }
    if (!guestCode) {
      return NextResponse.json({ ok: false, message: '生成连接码失败，请重试' }, { status: 500 });
    }

    const roomKey = `guest:${guestCode}`;
    const id = randomBytes(16).toString('hex');
    await db
      .prepare(
        `INSERT INTO bridge_relay_links (id, room_key, user_id, guest_code, secret_hash, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      )
      .bind(id, roomKey, guestCode, secretHash, now, now)
      .run();

    return NextResponse.json({
      ok: true,
      mode: 'guest',
      roomKey,
      guestCode,
      relayUrl: `${wsOrigin}/api/bridge-relay/ws`,
      relaySecret,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: err.status });
    }
    return NextResponse.json({ ok: false, message: '云端中继配对失败' }, { status: 500 });
  }
}
