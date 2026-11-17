import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createECDH, randomBytes } from 'node:crypto';
import { applyNotifications as apply } from './index.js';
import { notificationInput } from './notification-input.js';
const routes = new Map(), listeners = new Map(), cleanup = [];
let credential;
const ctx = {
  sessionTitle: { get(session) { return session.title ? { title: session.title } : undefined; } },
  sessionProjections: { async register() { return { stateOf(session) { return session.notificationState || notificationInput.init(); }, dispose() {} }; } },
  credentials: { async readRecord() { return credential; }, async modifyRecord(_key, mutate) { credential = await mutate(credential); return credential; } },
  webServer: { register(route) { routes.set(route.path, route); return () => routes.delete(route.path); } },
  connection: { admit(req) { return req.headers.authorization === 'test-owner' ? { peer: { principal: { kind: 'owner' } } } : { rejection: 401 }; } },
  effect(fn) { cleanup.push(fn()); }, on(name, fn) { listeners.set(name, fn); }
};
class Response extends EventEmitter {
  chunks = []; writableLength = 0;
  writeHead(status, headers) { this.status = status; this.headers = headers; }
  write(chunk) { this.chunks.push(chunk); }
  end(chunk) { if (chunk) this.write(chunk); this.emit('close'); }
  destroy() { this.emit('close'); }
}
await apply(ctx, { skipSessionIdPrefixes: ['qqb-'], skipAgentPresetPrefixes: ['qq-'], skipCwdSegments: ['qq-bridge'] });
const events = routes.get('/dsh-task-bell/events');
const unauthorized = new Response();
await events.handler({ method: 'GET', headers: {} }, unauthorized);
assert.equal(unauthorized.status, 401);
const response = new Response();
await events.handler({ method: 'GET', headers: { authorization: 'test-owner' } }, response);
assert.equal(response.status, 200);
const notify = listeners.get('session/event');
const publish = (session, event) => {
  session.notificationState = notificationInput.apply(session.notificationState || notificationInput.init(), event);
  notify(session, event);
};
const event = (reason, seq = 1, turn = 1) => ({ type: 'turn/end', seq, time: Date.now(), data: { turn, reason: { kind: reason } } });
const root = { id: 'root-session', header: {}, title: '任务通知修复' };
publish(root, { type: 'turn/start', data: { turn: 1 } });
publish(root, { type: 'user/message', data: { source: { kind: 'user' } } });
publish(root, event('completed'));
assert.match(response.chunks.join(''), /"sessionTitle":"任务通知修复"/);
assert.match(response.chunks.join(''), /"reason":"completed"/);
const count = response.chunks.length;
publish({ id: 'child', header: { origin: 'subagent' } }, event('completed'));
publish(root, event('aborted'));
publish(root, event('interrupted'));
assert.equal(response.chunks.length, count);
const id = response.chunks.at(-1).match(/^id: (.+)/)[1];
publish(root, event('error', 2));
const replay = new Response();
await events.handler({ method: 'GET', headers: { authorization: 'test-owner', 'last-event-id': id } }, replay);
assert.match(replay.chunks.join(''), /"reason":"error"/);
assert.doesNotMatch(replay.chunks.join(''), /"reason":"completed"/);
const fresh = new Response();
await events.handler({ method: 'GET', headers: { authorization: 'test-owner' } }, fresh);
assert.equal(fresh.chunks.length, 1);
const beforePassive = response.chunks.length;
publish(root, { type: 'turn/start', data: { turn: 2 } });
publish(root, { type: 'user/message', data: { source: { kind: 'tool-jobs', form: 'notice' } } });
publish(root, { type: 'user/message', data: { source: { kind: 'time-context', form: 'snapshot' } } });
publish(root, event('completed', 3, 2));
assert.equal(response.chunks.length, beforePassive, 'passive job completion must not reach SSE or push history');
publish(root, { type: 'turn/start', data: { turn: 3 } });
publish(root, { type: 'user/message', data: { source: { kind: 'tool-jobs', form: 'notice' } } });
publish(root, { type: 'user/message', data: { source: { kind: 'user' } } });
publish(root, event('completed', 4, 3));
assert.equal(response.chunks.length, beforePassive + 1);
const untitled = { id: 'untitled-session', header: {} };
publish(untitled, { type: 'turn/start', data: { turn: 1 } });
publish(untitled, { type: 'user/message', data: { source: { kind: 'user' } } });
publish(untitled, event('completed'));
assert.equal(JSON.parse(response.chunks.at(-1).split('data: ')[1]).sessionTitle, '');

// QQ bridge sessions are filtered on the Host, so neither channel sees them.
const beforeBridge = response.chunks.length;
const bridgeSessions = [
  { id: 'qqb-g-849354356-648600552d04a380ff968657df7fbb10', header: { cwd: '/home/example/qq-bridge/workspace' }, title: 'QQ 群' },
  { id: 'session-qq-v2', header: { cwd: '/home/example/qq-bridge/workspace', agentPreset: 'qq-chat-v2' }, title: 'QQ 群 v2' },
  { id: 'session-slang', header: { cwd: '/home/example/qq-bridge/state/slang-agent', agentPreset: 'qq-chat' }, title: '黑话学习' },
  { id: 'session-probe', header: { cwd: '/tmp/qq-bridge-probe-ab-compat', agentPreset: 'standard' }, title: '探测' },
];
for (const bridge of bridgeSessions) {
  publish(bridge, { type: 'turn/start', data: { turn: 1 } });
  publish(bridge, { type: 'user/message', data: { source: { kind: 'user' } } });
  publish(bridge, event('completed'));
}
assert.equal(response.chunks.length, beforeBridge, 'QQ bridge sessions must not reach SSE or push history');
// A non-bridge session under an unrelated path still notifies.
const lookalike = { id: 'session-not-bridge', header: { cwd: '/home/example/not-qq-bridge/workspace' }, title: '普通会话' };
publish(lookalike, { type: 'turn/start', data: { turn: 1 } });
publish(lookalike, { type: 'user/message', data: { source: { kind: 'user' } } });
publish(lookalike, event('completed', 9));
assert.equal(response.chunks.length, beforeBridge + 1, 'a lookalike path must still notify');
const sw = new Response();
await routes.get('/dsh-task-bell/worker.js').handler({ method: 'GET', headers: { authorization: 'test-owner' } }, sw);
assert.equal(sw.status, 200); assert.match(sw.chunks.join(''), /notificationclick/);
const key = new Response();
await routes.get('/dsh-task-bell/push-key').handler({ method: 'GET', headers: { authorization: 'test-owner' } }, key);
assert.equal(key.status, 200); assert.equal(JSON.parse(key.chunks.join('')).publicKey.length, 87);
const csrf = new Response();
await routes.get('/dsh-task-bell/push').handler({ method: 'POST', headers: { authorization: 'test-owner' } }, csrf);
assert.equal(csrf.status, 403);
const post = async value => {
  const request = Readable.from([typeof value === 'string' ? value : JSON.stringify(value)]);
  request.method = 'POST';
  request.headers = { authorization: 'test-owner', origin: 'https://example.ts.net', 'content-type': 'application/json', 'x-dsh-task-bell': '1' };
  const result = new Response();
  await routes.get('/dsh-task-bell/push').handler(request, result);
  return result;
};
const invalidJson = await post('{'); assert.equal(invalidJson.status, 400);
const privateEndpoint = await post({ action: 'subscribe', subscription: { endpoint: 'https://127.0.0.1/' }, url: 'https://example.ts.net/', locale: 'zh' });
assert.equal(privateEndpoint.status, 400);
const deviceKey = createECDH('prime256v1'); deviceKey.generateKeys();
const subscription = { endpoint: 'https://wns2-test.notify.windows.com/w/?token=test', keys: { p256dh: deviceKey.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
assert.equal((await post({ action: 'subscribe', subscription, url: 'https://example.ts.net/', locale: 'zh' })).status, 200);
const active = await post({ action: 'status', endpoint: subscription.endpoint });
assert.equal(JSON.parse(active.chunks.join('')).active, true);
assert.equal((await post({ action: 'unsubscribe', endpoint: subscription.endpoint })).status, 200);
const inactive = await post({ action: 'status', endpoint: subscription.endpoint });
assert.equal(JSON.parse(inactive.chunks.join('')).active, false);
for (const dispose of cleanup.reverse()) await dispose?.();
assert.equal(routes.size, 0);
console.log('PASS: authenticated routes, completion/error events, child/cancel filtering, reconnect replay, fresh connection, worker delivery, cleanup');
