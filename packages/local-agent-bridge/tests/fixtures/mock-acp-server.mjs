import readline from 'node:readline';

if (process.argv.includes('--version')) {
 console.log('mock-acp 1.2.3');
 process.exit(0);
}

const mode = process.env.MOCK_ACP_MODE || 'antigravity';
const log = {
 initCaps: null,
 sessionCwds: [],
 setModelCalls: [],
 setConfigCalls: [],
 permissionOutcomes: [],
 cancelledSessions: [],
 lastPromptBlocks: null,
};

// Emit non-JSON startup banner noise on stdout to ensure parser skips it safely
console.log('[boot] checking plugin registry...');

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

function send(obj) {
 process.stdout.write(JSON.stringify(obj) + '\n');
}

rl.on('line', line => {
 const trimmed = line.trim();
 if (!trimmed) return;
 let msg;
 try {
  msg = JSON.parse(trimmed);
 } catch {
  return;
 }

 // Response to our reverse permission request
 if (!msg.method && msg.id !== undefined) {
  log.permissionOutcomes.push(msg.result);
  return;
 }

 if (msg.method === 'session/cancel') {
  log.cancelledSessions.push(msg.params?.sessionId);
  return;
 }

 if (msg.method === 'initialize') {
  log.initCaps = msg.params?.capabilities;
  if (mode === 'auth_error') {
   send({
    jsonrpc: '2.0',
    id: msg.id,
    error: { code: -32001, message: 'unauthorized: login required' },
   });
   return;
  }
  send({
   jsonrpc: '2.0',
   id: msg.id,
   result: { protocolVersion: 1, capabilities: {} },
  });
  return;
 }

 if (msg.method === 'session/new') {
  log.sessionCwds.push(msg.params?.cwd);
  const sid = `sess-${log.sessionCwds.length}`;
  if (mode === 'workbuddy_empty') {
   send({ jsonrpc: '2.0', id: msg.id, result: { sessionId: sid } });
   return;
  }
  if (mode === 'workbuddy_config') {
   send({
    jsonrpc: '2.0',
    id: msg.id,
    result: {
     sessionId: sid,
     configOptions: [
      {
       id: 'model',
       category: 'model',
       currentValue: 'glm-5-code',
       options: [
        { value: 'glm-5-code', name: 'GLM-5 Code' },
        { value: 'deepseek-v4', name: 'DeepSeek V4' },
        { value: 'fast-no-think', name: 'Fast No Think' },
       ],
      },
      {
       id: 'thought_level',
       category: 'thought_level',
       currentValue: 'high',
       options: [
        { value: 'low', name: 'Low' },
        { value: 'medium', name: 'Medium' },
        { value: 'high', name: 'High' },
        { value: 'xhigh', name: 'XHigh' },
       ],
      },
     ],
    },
   });
   return;
  }
  send({
   jsonrpc: '2.0',
   id: msg.id,
   result: {
    sessionId: sid,
    models: {
     currentModelId: 'gemini-4-hydrogen',
     availableModels: [
      { modelId: 'gemini-4-hydrogen', name: 'Gemini 4 Hydrogen' },
      { modelId: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
     ],
    },
   },
  });
  return;
 }

 if (msg.method === 'session/set_config_option') {
  log.setConfigCalls.push(msg.params);
  if (mode === 'workbuddy_config' && msg.params?.configId === 'model') {
   const val = msg.params.value;
   const modelOpt = {
    id: 'model',
    category: 'model',
    currentValue: val,
    options: [
     { value: 'glm-5-code', name: 'GLM-5 Code' },
     { value: 'deepseek-v4', name: 'DeepSeek V4' },
     { value: 'fast-no-think', name: 'Fast No Think' },
    ],
   };
   const configOptions = [modelOpt];
   if (val === 'glm-5-code') {
    configOptions.push({
     id: 'thought_level',
     category: 'thought_level',
     currentValue: 'high',
     options: [
      { value: 'low', name: 'Low' },
      { value: 'medium', name: 'Medium' },
      { value: 'high', name: 'High' },
      { value: 'xhigh', name: 'XHigh' },
     ],
    });
   } else if (val === 'deepseek-v4') {
    configOptions.push({
     id: 'thought_level',
     category: 'thought_level',
     currentValue: 'medium',
     options: [
      { value: 'low', name: 'Low' },
      { value: 'medium', name: 'Medium' },
      { value: 'high', name: 'High' },
     ],
    });
   }
   send({ jsonrpc: '2.0', id: msg.id, result: { configOptions } });
   return;
  }
  send({ jsonrpc: '2.0', id: msg.id, result: { ok: true } });
  return;
 }

 if (msg.method === 'session/set_model') {
  log.setModelCalls.push(msg.params);
  send({ jsonrpc: '2.0', id: msg.id, result: { ok: true } });
  return;
 }

 if (msg.method === 'session/prompt') {
  const sid = msg.params?.sessionId;
  const blocks = msg.params?.prompt || [];
  log.lastPromptBlocks = blocks;
  const textContent = blocks.find(b => b.type === 'text')?.text || '';

  if (textContent.includes('[TRIGGER_PERMISSION]')) {
   // Attempt a privileged tool permission request from server -> client must reject!
   const permId = 'perm-1';
   send({
    jsonrpc: '2.0',
    id: permId,
    method: 'session/request_permission',
    params: {
     sessionId: sid,
     toolCall: { toolCallId: 'tc-1', title: 'Read ~/.ssh/id_rsa', kind: 'read' },
    },
   });
   setTimeout(() => {
    const outcome = log.permissionOutcomes[0]?.outcome?.outcome || 'missing';
    send({
     jsonrpc: '2.0',
     method: 'session/update',
     params: {
      sessionId: sid,
      update: {
       sessionUpdate: 'agent_message_chunk',
       content: { type: 'text', text: `perm=${outcome}` },
      },
     },
    });
    send({ jsonrpc: '2.0', id: msg.id, result: { stopReason: 'end_turn' } });
   }, 40);
   return;
  }

  if (textContent.includes('[TRIGGER_ABORT]')) {
   send({
    jsonrpc: '2.0',
    method: 'session/update',
    params: {
     sessionId: sid,
     update: {
      sessionUpdate: 'agent_thought_chunk',
      content: { type: 'text', text: 'thinking-before-cancel' },
     },
    },
   });
   const timer = setInterval(() => {
    if (log.cancelledSessions.includes(sid)) {
     clearInterval(timer);
     send({ jsonrpc: '2.0', id: msg.id, result: { stopReason: 'cancelled' } });
    }
   }, 15);
   return;
  }

  send({
   jsonrpc: '2.0',
   method: 'session/update',
   params: {
    sessionId: sid,
    update: {
     sessionUpdate: 'agent_thought_chunk',
     content: { type: 'text', text: '推理一步' },
    },
   },
  });
  const hasConstraint = textContent.includes('[OUTPUT CONSTRAINT]');
  const hasImage = blocks.some(b => b.type === 'image' && b.mimeType === 'image/png');
  send({
   jsonrpc: '2.0',
   method: 'session/update',
   params: {
    sessionId: sid,
    update: {
     sessionUpdate: 'agent_message_chunk',
     content: {
      type: 'text',
      text: JSON.stringify({
       ok: true,
       cwd: log.sessionCwds[log.sessionCwds.length - 1],
       capsCount: Object.keys(log.initCaps || {}).length,
       hasConstraint,
       hasImage,
      }),
     },
    },
   },
  });
  send({ jsonrpc: '2.0', id: msg.id, result: { stopReason: 'end_turn' } });
 }
});
