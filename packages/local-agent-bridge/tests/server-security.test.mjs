import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildLocalPairingUrl,
  buildMobilePairingUrl,
  BridgeRelayClient,
  DriverProcessPool,
  ensureEmptySandboxDir,
  loadOrCreateBridgeConfig,
  renderPairingQr,
  resolveSafeCommand,
  startBridgeServer,
} from '../dist/index.js';

function rawHttpRequest(port, { method = 'GET', path: reqPath = '/', headers = {}, body = undefined }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: reqPath,
        headers,
      },
      res => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function createMinimalWsServer() {
  const sockets = new Set();
  const receivedFrames = [];
  const server = http.createServer((_req, res) => {
    res.writeHead(404);
    res.end();
  });

  function encodeWsText(text) {
    const data = Buffer.from(text, 'utf8');
    if (data.length < 126) {
      return Buffer.concat([Buffer.from([0x81, data.length]), data]);
    }
    const hdr = Buffer.alloc(4);
    hdr[0] = 0x81;
    hdr[1] = 126;
    hdr.writeUInt16BE(data.length, 2);
    return Buffer.concat([hdr, data]);
  }

  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    const accept = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
    socket.write(
      [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        '',
        '',
      ].join('\r\n'),
    );
    sockets.add(socket);

    let buf = Buffer.alloc(0);
    socket.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 2) {
        const b0 = buf[0];
        const b1 = buf[1];
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f;
        let off = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          off = 4;
        }
        const maskBytes = masked ? 4 : 0;
        if (buf.length < off + maskBytes + len) return;
        let payload = buf.subarray(off + maskBytes, off + maskBytes + len);
        if (masked) {
          const mask = buf.subarray(off, off + 4);
          payload = Buffer.from(payload);
          for (let i = 0; i < payload.length; i++) {
            payload[i] ^= mask[i % 4];
          }
        }
        buf = buf.subarray(off + maskBytes + len);
        if (opcode === 0x8) {
          socket.end();
          return;
        }
        if (opcode === 0x1) {
          const text = payload.toString('utf8');
          receivedFrames.push(text);
        }
      }
    });

    socket.on('close', () => sockets.delete(socket));
  });

  return {
    server,
    receivedFrames,
    sendText(text) {
      const frame = encodeWsText(text);
      for (const s of sockets) s.write(frame);
    },
    listen() {
      return new Promise(resolve => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          resolve(addr.port);
        });
      });
    },
    close() {
      for (const s of sockets) s.destroy();
      return new Promise(resolve => server.close(() => resolve()));
    },
  };
}

test('bridge config generation, sandbox cleanup, managed tools, and cmd shim resolution', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'brg-cfg-'));
  try {
    const first = loadOrCreateBridgeConfig({ configDir: tmpHome });
    assert.match(first.config.token, /^brg_[a-f0-9]{64}$/);
    assert.equal(fs.existsSync(first.configPath), true);

    const second = loadOrCreateBridgeConfig({ configDir: tmpHome });
    assert.equal(second.config.token, first.config.token);

    const rotated = loadOrCreateBridgeConfig({ configDir: tmpHome, resetToken: true });
    assert.notEqual(rotated.config.token, first.config.token);

    const sandbox = ensureEmptySandboxDir(tmpHome);
    fs.writeFileSync(path.join(sandbox, 'leak.txt'), 'secret');
    ensureEmptySandboxDir(tmpHome);
    assert.deepEqual(fs.readdirSync(sandbox), []);

    // Managed tool binary resolution without polluting PATH
    const managedDir = path.join(tmpHome, 'tools', 'codex');
    fs.mkdirSync(managedDir, { recursive: true });
    const fakeCodex = path.join(managedDir, process.platform === 'win32' ? 'codex.exe' : 'codex');
    fs.writeFileSync(fakeCodex, 'stub');
    const resolvedManaged = resolveSafeCommand('codex', ['app-server'], tmpHome);
    assert.ok(resolvedManaged);
    assert.equal(resolvedManaged.displayPath, fakeCodex);

    if (process.platform === 'win32') {
      const shimDir = path.join(tmpHome, 'shims');
      const entryDir = path.join(shimDir, 'node_modules', 'demo');
      fs.mkdirSync(entryDir, { recursive: true });
      const targetJs = path.join(entryDir, 'cli.js');
      fs.writeFileSync(targetJs, 'console.log("ok")');
      const cmdPath = path.join(shimDir, 'demo.cmd');
      fs.writeFileSync(cmdPath, `@ECHO off\r\n"%_prog%" "%dp0%\\node_modules\\demo\\cli.js" %*\r\n`);
      const resolved = resolveSafeCommand(cmdPath, ['app-server'], tmpHome);
      assert.ok(resolved);
      assert.equal(resolved.viaCmd, false);
      assert.equal(resolved.command, process.execPath);
      assert.deepEqual(resolved.args, [targetJs, 'app-server']);
    }
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('server security middleware enforces loopback Host, Origin allowlist, PNA preflight, Bearer token, and loopback-only management routes', async () => {
  const mockDriver = {
    id: 'antigravity',
    name: 'Mock',
    async detect() {
      return { id: 'antigravity', name: 'Mock', status: 'ready', defaultModel: 'm1', models: [{ id: 'm1', label: 'M1' }] };
    },
    async streamTurn(input) {
      input.onModel('local:antigravity/m1');
      input.onDelta('hello');
    },
    async dispose() {},
  };

  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'brg-srv-'));
  const token = 'brg_' + 'a'.repeat(64);
  const running = await startBridgeServer({
    port: 0,
    token,
    configDir: tmpHome,
    pool: new DriverProcessPool([mockDriver]),
  });

  try {
    const addr = running.server.address();
    assert.equal(addr.address, '127.0.0.1');

    // 1. Invalid Host -> 403
    const badHost = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/ping',
      headers: { Host: `evil.example:${running.port}` },
    });
    assert.equal(badHost.status, 403);

    // 2. Unauthorized Origin -> 403
    const badOrigin = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/ping',
      headers: { Host: `127.0.0.1:${running.port}`, Origin: 'https://evil.com' },
    });
    assert.equal(badOrigin.status, 403);

    // 3. PNA preflight for production site origin -> 204 + PNA header, never '*'
    const pna = await rawHttpRequest(running.port, {
      method: 'OPTIONS',
      path: '/v1/stream',
      headers: {
        Host: `127.0.0.1:${running.port}`,
        Origin: 'https://exhan.dpdns.org',
        'Access-Control-Request-Private-Network': 'true',
      },
    });
    assert.equal(pna.status, 204);
    assert.equal(pna.headers['access-control-allow-origin'], 'https://exhan.dpdns.org');
    assert.equal(pna.headers['access-control-allow-private-network'], 'true');

    // 4. Public /v1/ping -> 200 without Authorization
    const ping = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/ping',
      headers: { Host: `127.0.0.1:${running.port}`, Origin: 'https://exhan.dpdns.org' },
    });
    assert.equal(ping.status, 200);
    const pingJson = JSON.parse(ping.body);
    assert.equal(pingJson.ok, true);
    assert.equal(pingJson.name, 'interview-study-bridge');

    // 5. Protected routes require exact Bearer token
    const unauth = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/providers',
      headers: { Host: `127.0.0.1:${running.port}` },
    });
    assert.equal(unauth.status, 401);

    const wrongTok = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/providers',
      headers: {
        Host: `127.0.0.1:${running.port}`,
        Authorization: 'Bearer wrong',
      },
    });
    assert.equal(wrongTok.status, 401);

    const okProv = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/providers',
      headers: {
        Host: `127.0.0.1:${running.port}`,
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(okProv.status, 200);
    const provJson = JSON.parse(okProv.body);
    assert.equal(provJson.providers[0].status, 'ready');

    // 6. Tunnel Host allowlist allows /v1/ping & /v1/providers, but REJECTS management routes (/v1/relay/*, /v1/tools/*)
    running.allowHost('https://demo-bridge.trycloudflare.com');
    const allowedTunnel = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/ping',
      headers: { Host: 'demo-bridge.trycloudflare.com', Origin: 'https://exhan.dpdns.org' },
    });
    assert.equal(allowedTunnel.status, 200);

    const blockedRelayMgmt = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/relay/status',
      headers: {
        Host: 'demo-bridge.trycloudflare.com',
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(blockedRelayMgmt.status, 403);

    const blockedToolsMgmt = await rawHttpRequest(running.port, {
      method: 'POST',
      path: '/v1/tools/login',
      headers: {
        Host: 'demo-bridge.trycloudflare.com',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider: 'codex' }),
    });
    assert.equal(blockedToolsMgmt.status, 403);

    // Loopback relay status -> 200
    const relaySt = await rawHttpRequest(running.port, {
      method: 'GET',
      path: '/v1/relay/status',
      headers: {
        Host: `127.0.0.1:${running.port}`,
        Authorization: `Bearer ${token}`,
      },
    });
    assert.equal(relaySt.status, 200);
    assert.equal(JSON.parse(relaySt.body).configured, false);

    const pairUrl = buildMobilePairingUrl('https://demo-bridge.trycloudflare.com', token);
    assert.match(pairUrl, /^https:\/\/exhan\.dpdns\.org\/ai\/local-bridge#pair=/);
    const localPairUrl = buildLocalPairingUrl(running.port, token);
    assert.match(localPairUrl, /^https:\/\/exhan\.dpdns\.org\/ai\/local-bridge#pair=/);
    const qr = renderPairingQr(pairUrl);
    assert.equal(qr.length > 50, true);
  } finally {
    await running.close();
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('BridgeRelayClient forwards providers RPC and NDJSON streams over WebSocket', async () => {
  const wsSrv = createMinimalWsServer();
  const wsPort = await wsSrv.listen();
  const pool = new DriverProcessPool([
    {
      id: 'codex',
      name: 'Mock Codex',
      async detect() {
        return { id: 'codex', name: 'Mock Codex', status: 'ready', defaultModel: 'gpt-5', models: [{ id: 'gpt-5', label: 'GPT-5' }] };
      },
      async streamTurn(input) {
        input.onModel('local:codex/gpt-5');
        input.onThink('thinking...');
        input.onDelta('answer chunk');
      },
      async dispose() {},
    },
  ]);

  const relay = new BridgeRelayClient(pool);
  try {
    relay.connect({
      relayUrl: `ws://127.0.0.1:${wsPort}/api/bridge-relay/ws`,
      relaySecret: 'rly_' + 'b'.repeat(64),
      roomKey: 'user:test',
    });

    for (let i = 0; i < 30 && !relay.getStatus().connected; i++) {
      await new Promise(r => setTimeout(r, 50));
    }
    assert.equal(relay.getStatus().connected, true);

    wsSrv.sendText(JSON.stringify({ id: 'rpc1', op: 'providers' }));
    wsSrv.sendText(
      JSON.stringify({
        id: 'st1',
        op: 'stream',
        payload: {
          provider: 'codex',
          system: 'sys',
          messages: [{ role: 'user', content: 'hi' }],
        },
      }),
    );

    for (let i = 0; i < 40 && wsSrv.receivedFrames.length < 5; i++) {
      await new Promise(r => setTimeout(r, 50));
    }

    const parsed = wsSrv.receivedFrames.map(s => JSON.parse(s));
    const rpcReply = parsed.find(f => f.id === 'rpc1' && f.t === 'result');
    assert.ok(rpcReply);
    assert.equal(rpcReply.status, 200);
    assert.equal(rpcReply.data.providers[0].id, 'codex');

    const streamEvents = parsed.filter(f => f.id === 'st1');
    assert.ok(streamEvents.some(f => f.t === 'ndjson' && f.event?.t === 'delta' && f.event?.text === 'answer chunk'));
    assert.ok(streamEvents.some(f => f.t === 'stream_end'));
  } finally {
    relay.disconnect();
    await pool.disposeAll();
    await wsSrv.close();
  }
});
