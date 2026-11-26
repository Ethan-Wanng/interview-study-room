import readline from 'node:readline';

if (process.argv.includes('--version')) {
 console.log('codex 0.25.0-mock');
 process.exit(0);
}

const mode = process.env.MOCK_CODEX_MODE || 'normal';
const sequence = [];
let lastThreadParams = null;
let lastTurnParams = null;
const interruptedTurns = [];
const approvalDecisions = [];

function send(obj) {
 process.stdout.write(JSON.stringify(obj) + '\n');
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', line => {
 const trimmed = line.trim();
 if (!trimmed) return;
 let msg;
 try {
  msg = JSON.parse(trimmed);
 } catch {
  return;
 }

 // Reverse response for approval request
 if (!msg.method && msg.id !== undefined) {
  approvalDecisions.push(msg.result);
  return;
 }

 sequence.push(msg.method);

 if (msg.method === 'initialize') {
  send({ jsonrpc: '2.0', id: msg.id, result: { userAgent: 'codex-mock/1.0' } });
  return;
 }

 if (msg.method === 'initialized') {
  return;
 }

 if (msg.method === 'model/list') {
  if (mode === 'auth_error') {
   send({
    jsonrpc: '2.0',
    id: msg.id,
    error: { code: -32001, message: 'Please sign in with codex login' },
   });
   return;
  }
  send({
   jsonrpc: '2.0',
   id: msg.id,
   result: {
    data: [
     {
      id: 'gpt-5-codex',
      displayName: 'GPT-5 Codex',
      isDefault: true,
      supportedReasoningEfforts: ['low', 'medium', 'high'],
     },
     {
      id: 'gpt-5.6-terra',
      displayName: 'GPT-5.6-Terra',
      isDefault: false,
      defaultReasoningEffort: 'medium',
      supportedReasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
     },
    ],
   },
  });
  return;
 }

 if (msg.method === 'account/rateLimits/read') {
  send({
   jsonrpc: '2.0',
   id: msg.id,
   result: {
    planType: 'plus',
    rateLimits: {
     primary: { usedPercent: 32, windowDurationMins: 300, resetsAt: 1796000000 },
     secondary: { usedPercent: 18, windowDurationMins: 10080, resetsAt: 1796500000 },
    },
   },
  });
  return;
 }

 if (msg.method === 'thread/start') {
  lastThreadParams = msg.params;
  send({
   jsonrpc: '2.0',
   id: msg.id,
   result: {
    thread: { id: 'thr-1' },
   },
  });
  return;
 }

 if (msg.method === 'turn/interrupt') {
  interruptedTurns.push(msg.params);
  send({ jsonrpc: '2.0', id: msg.id, result: { ok: true } });
  return;
 }

 if (msg.method === 'turn/start') {
  lastTurnParams = msg.params;
  const tid = msg.params?.threadId;
  const turnId = 'turn-1';
  send({ jsonrpc: '2.0', id: msg.id, result: { turn: { id: turnId, status: 'inProgress' } } });

  const firstText = msg.params?.input?.find(x => x.type === 'text')?.text || '';

  if (firstText.includes('[TRIGGER_FAILED]')) {
   setTimeout(() => {
    send({
     jsonrpc: '2.0',
     method: 'turn/completed',
     params: {
      threadId: tid,
      turn: { id: turnId, status: 'failed', error: { message: 'upstream model overloaded' } },
     },
    });
   }, 20);
   return;
  }

  if (firstText.includes('[TRIGGER_INTERRUPT]')) {
   send({
    jsonrpc: '2.0',
    method: 'item/reasoning/summaryTextDelta',
    params: { threadId: tid, turnId, delta: 'started-thinking' },
   });
   const t = setInterval(() => {
    if (interruptedTurns.length) {
     clearInterval(t);
     send({
      jsonrpc: '2.0',
      method: 'item/agentMessage/delta',
      params: { threadId: tid, turnId, delta: `interrupted=${interruptedTurns[0].turnId}` },
     });
     send({
      jsonrpc: '2.0',
      method: 'turn/completed',
      params: { threadId: tid, turn: { id: turnId, status: 'interrupted' } },
     });
    }
   }, 15);
   return;
  }

  // Send approval request + reasoning + agent delta
  send({
   jsonrpc: '2.0',
   id: 'srv-approve-1',
   method: 'item/commandExecution/requestApproval',
   params: { threadId: tid, command: 'rm -rf /' },
  });

  setTimeout(() => {
   send({
    jsonrpc: '2.0',
    method: 'item/reasoning/summaryTextDelta',
    params: { threadId: tid, turnId, delta: 'codex-think' },
   });
   send({
    jsonrpc: '2.0',
    method: 'item/agentMessage/delta',
    params: {
     threadId: tid,
     turnId,
     delta: JSON.stringify({
      sequence: sequence.slice(0, 4),
      sandbox: lastThreadParams?.sandbox,
      approvalPolicy: lastThreadParams?.approvalPolicy,
      ephemeral: lastThreadParams?.ephemeral,
      cwd: lastThreadParams?.cwd,
      effort: lastTurnParams?.effort,
      hasImage: Boolean(lastTurnParams?.input?.some(i => i.type === 'image')),
      declined: approvalDecisions[0]?.decision,
     }),
    },
   });
   send({
    jsonrpc: '2.0',
    method: 'turn/completed',
    params: { threadId: tid, turn: { id: turnId, status: 'completed' } },
   });
  }, 35);
 }
});
