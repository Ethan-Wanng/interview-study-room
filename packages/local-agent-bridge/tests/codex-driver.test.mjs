import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
 CodexAppServerDriver,
 ensureEmptySandboxDir,
} from '../dist/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_CODEX = path.join(__dirname, 'fixtures', 'mock-codex-server.mjs');

test('Codex driver enforces initialize->initialized->model/list, read-only sandbox, effort, and interrupt', async () => {
 const prevCodex = process.env.CODEX_BIN;
 const prevMode = process.env.MOCK_CODEX_MODE;
 process.env.CODEX_BIN = MOCK_CODEX;
 process.env.MOCK_CODEX_MODE = 'normal';

 const driver = new CodexAppServerDriver();
 try {
  const sandbox = ensureEmptySandboxDir();
  const det = await driver.detect(true);
  assert.equal(det.status, 'ready');
  assert.equal(det.defaultModel, 'gpt-5-codex');
  assert.equal(det.models[0].id, 'gpt-5-codex');
  assert.equal(det.quota?.planType, 'plus');
  assert.equal(det.quota?.windows.length, 2);
  assert.equal(det.quota?.windows[0].label, '5h');
  assert.equal(det.quota?.windows[0].usedPercent, 32);

  let thinkText = '';
  let bodyText = '';
  let modelBadge = '';
  const ctl = new AbortController();

  await driver.streamTurn({
   system: 'Codex sys',
   thinkingLevel: 'max',
   messages: [{ role: 'user', content: 'Explain', images: ['data:image/png;base64,AAAA'] }],
   signal: ctl.signal,
   onModel: m => {
    modelBadge = m;
   },
   onThink: t => {
    thinkText += t;
   },
   onDelta: d => {
    bodyText += d;
   },
  });

  assert.equal(modelBadge, 'local:codex/gpt-5-codex');
  assert.equal(thinkText, 'codex-think');
  const info = JSON.parse(bodyText);
  assert.deepEqual(info.sequence, ['initialize', 'initialized', 'model/list', 'account/rateLimits/read']);
  assert.equal(info.sandbox, 'read-only');
  assert.equal(info.approvalPolicy, 'never');
  assert.equal(info.ephemeral, true);
  assert.equal(info.cwd, sandbox);
  assert.equal(info.effort, 'high');
  assert.equal(info.hasImage, true);
  assert.equal(info.declined, 'decline');

  // Model supporting ultra passes ultra verbatim
  let ultraBody = '';
  await driver.streamTurn({
   model: 'gpt-5.6-terra',
   system: 'Codex sys',
   thinkingLevel: 'ultra',
   messages: [{ role: 'user', content: 'Ultra test' }],
   signal: new AbortController().signal,
   onModel: () => {},
   onThink: () => {},
   onDelta: d => {
    ultraBody += d;
   },
  });
  assert.equal(JSON.parse(ultraBody).effort, 'ultra');

  // Failed turn propagates error message
  await assert.rejects(
   driver.streamTurn({
    system: 'Codex sys',
    messages: [{ role: 'user', content: '[TRIGGER_FAILED]' }],
    signal: new AbortController().signal,
    onModel: () => {},
    onThink: () => {},
    onDelta: () => {},
   }),
   err => err.message.includes('upstream model overloaded'),
  );

  // Abort calls turn/interrupt cleanly
  const intCtl = new AbortController();
  const intTurn = driver.streamTurn({
   system: 'Codex sys',
   messages: [{ role: 'user', content: '[TRIGGER_INTERRUPT]' }],
   signal: intCtl.signal,
   onModel: () => {},
   onThink: () => {
    intCtl.abort();
   },
   onDelta: () => {},
  });
  await assert.rejects(intTurn, err => err.code === 'aborted');

  // Auth error maps cleanly
  process.env.MOCK_CODEX_MODE = 'auth_error';
  const authDet = await driver.detect(true);
  assert.equal(authDet.status, 'auth_required');
  assert.equal(authDet.loginHint, 'codex login');
 } finally {
  await driver.dispose();
  if (prevCodex === undefined) delete process.env.CODEX_BIN;
  else process.env.CODEX_BIN = prevCodex;
  if (prevMode === undefined) delete process.env.MOCK_CODEX_MODE;
  else process.env.MOCK_CODEX_MODE = prevMode;
 }
});
