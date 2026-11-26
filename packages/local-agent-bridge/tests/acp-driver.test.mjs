import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
 createAntigravityDriver,
 createWorkBuddyDriver,
 DriverProcessPool,
 ensureEmptySandboxDir,
 startBridgeServer,
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_ACP = path.join(__dirname, 'fixtures', 'mock-acp-server.mjs');

test('ACP driver handles Antigravity models, permission denial, images, jsonMode, NDJSON stream, and abort cancel', async () => {
 const prevAgy = process.env.ANTIGRAVITY_BIN;
 const prevWb = process.env.WORKBUDDY_BIN;
 const prevMode = process.env.MOCK_ACP_MODE;
 process.env.ANTIGRAVITY_BIN = MOCK_ACP;
 process.env.WORKBUDDY_BIN = MOCK_ACP;
 process.env.MOCK_ACP_MODE = 'antigravity';

 const token = 'brg_' + 'b'.repeat(64);
 const agy = createAntigravityDriver();
 const wb = createWorkBuddyDriver();
 const pool = new DriverProcessPool([agy, wb]);
 const running = await startBridgeServer({ port: 0, token, pool });

 try {
  const sandbox = ensureEmptySandboxDir();

  // Detect providers
  const provRes = await fetch(`${running.url}/v1/providers`, {
   headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(provRes.status, 200);
  const provData = await provRes.json();
  const agyInfo = provData.providers.find(p => p.id === 'antigravity');
  assert.equal(agyInfo.status, 'ready');
  assert.equal(agyInfo.defaultModel, 'gemini-4-hydrogen');
  assert.equal(agyInfo.models.length, 2);

  // Stream with image + jsonMode
  const streamRes = await fetch(`${running.url}/v1/stream`, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
   },
   body: JSON.stringify({
    provider: 'antigravity',
    model: 'gemini-3.8-flash',
    system: 'Sys prompt',
    jsonMode: true,
    messages: [
     {
      role: 'user',
      content: 'Hi',
      images: ['data:image/png;base64,iVBORw0KGgo='],
     },
    ],
   }),
  });
  assert.equal(streamRes.status, 200);
  const ndjson = await streamRes.text();
  const events = ndjson
   .trim()
   .split('\n')
   .map(l => JSON.parse(l));

  assert.equal(events[0].t, 'start');
  assert.equal(events.find(e => e.t === 'model')?.model, 'local:antigravity/gemini-3.8-flash');
  assert.equal(events.find(e => e.t === 'think')?.text, '推理一步');
  const deltaText = events
   .filter(e => e.t === 'delta')
   .map(e => e.text)
   .join('');
  const payload = JSON.parse(deltaText);
  assert.equal(payload.capsCount, 0);
  assert.equal(payload.cwd, sandbox);
  assert.equal(payload.hasConstraint, true);
  assert.equal(payload.hasImage, true);
  assert.equal(events[events.length - 1].t, 'done');

  // Permission request must be automatically rejected
  let permOut = '';
  const permCtl = new AbortController();
  await agy.streamTurn({
   system: 'test',
   messages: [{ role: 'user', content: '[TRIGGER_PERMISSION]' }],
   signal: permCtl.signal,
   onModel: () => {},
   onThink: () => {},
   onDelta: d => {
    permOut += d;
   },
  });
  assert.equal(permOut, 'perm=cancelled');

  // Abort must send session/cancel cleanly
  const abortCtl = new AbortController();
  let sawThink = false;
  const abortTurn = agy.streamTurn({
   system: 'test',
   messages: [{ role: 'user', content: '[TRIGGER_ABORT]' }],
   signal: abortCtl.signal,
   onModel: () => {},
   onThink: () => {
    sawThink = true;
    abortCtl.abort();
   },
   onDelta: () => {},
  });
  await assert.rejects(abortTurn, err => err.code === 'aborted');
  assert.equal(sawThink, true);
 } finally {
  await running.close();
  if (prevAgy === undefined) delete process.env.ANTIGRAVITY_BIN;
  else process.env.ANTIGRAVITY_BIN = prevAgy;
  if (prevWb === undefined) delete process.env.WORKBUDDY_BIN;
  else process.env.WORKBUDDY_BIN = prevWb;
  if (prevMode === undefined) delete process.env.MOCK_ACP_MODE;
  else process.env.MOCK_ACP_MODE = prevMode;
 }
});

test('ACP driver supports WorkBuddy configOptions, fallback default model, and auth_required detection', async () => {
 const prevWb = process.env.WORKBUDDY_BIN;
 const prevMode = process.env.MOCK_ACP_MODE;
 process.env.WORKBUDDY_BIN = MOCK_ACP;

 const wb = createWorkBuddyDriver();
 try {
  process.env.MOCK_ACP_MODE = 'workbuddy_config';
  const cfgDet = await wb.detect(true);
  assert.equal(cfgDet.status, 'ready');
  assert.equal(cfgDet.defaultModel, 'glm-5-code');
  assert.equal(cfgDet.models[0].id, 'glm-5-code');
  assert.deepEqual(cfgDet.models[0].thinkingLevels, ['low', 'medium', 'high', 'xhigh']);
  assert.equal(cfgDet.models[0].defaultThinkingLevel, 'high');
  assert.equal(cfgDet.models[1].id, 'deepseek-v4');
  assert.deepEqual(cfgDet.models[1].thinkingLevels, ['low', 'medium', 'high']);
  assert.equal(cfgDet.models[1].defaultThinkingLevel, 'medium');
  assert.equal(cfgDet.models[2].id, 'fast-no-think');
  assert.deepEqual(cfgDet.models[2].thinkingLevels, []);
  assert.equal(cfgDet.models[2].defaultThinkingLevel, undefined);

  process.env.MOCK_ACP_MODE = 'workbuddy_empty';
  const emptyDet = await wb.detect(true);
  assert.equal(emptyDet.status, 'ready');
  assert.equal(emptyDet.models[0].id, 'default');

  process.env.MOCK_ACP_MODE = 'auth_error';
  const authDet = await wb.detect(true);
  assert.equal(authDet.status, 'auth_required');
  assert.equal(authDet.loginHint, 'codebuddy login');
 } finally {
  await wb.dispose();
  if (prevWb === undefined) delete process.env.WORKBUDDY_BIN;
  else process.env.WORKBUDDY_BIN = prevWb;
  if (prevMode === undefined) delete process.env.MOCK_ACP_MODE;
  else process.env.MOCK_ACP_MODE = prevMode;
 }
});
