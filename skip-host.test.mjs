import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { applyNotifications as apply } from './index.js';

// Minimal Host context: enough of webServer / connection / credentials /
// sessionProjections / sessionTitle for apply() to mount and for one SSE
// subscriber to observe what the plugin publishes.
function host({ projection } = {}) {
  const routes = new Map();
  const listeners = new Map();
  const cleanup = [];
  const responses = [];
  class Response extends EventEmitter {
    chunks = [];
    writableLength = 0;
    writeHead() {}
    write(chunk) { this.chunks.push(chunk); }
    end(chunk) { if (chunk) this.write(chunk); this.emit('close'); }
    destroy() { this.emit('close'); }
  }
  const ctx = {
    sessionTitle: { get: () => ({ title: '会话标题' }) },
    sessionProjections: {
      async register() {
        return {
          stateOf: () => projection ?? { turn: 1, actionable: true },
          dispose() {},
        };
      },
    },
    credentials: {
      async readRecord() {
        return { kind: 'grant', payload: { version: 1, vapid: { publicKey: 'k', privateKey: 'v' }, devices: {} } };
      },
      async modifyRecord(_key, mutate) { return mutate(undefined); },
    },
    webServer: { register(route) { routes.set(route.path, route); return () => routes.delete(route.path); } },
    connection: { admit: () => ({ peer: { principal: { kind: 'owner' } } }) },
    effect(fn) { cleanup.push(fn()); },
    on(name, fn) { listeners.set(name, fn); },
  };
  // Ending the SSE response clears the plugin's heartbeat interval, and the
  // registered effects remove its routes; without both the test process hangs.
  async function close() {
    for (const res of responses) res.end();
    for (const dispose of cleanup.reverse()) await dispose?.();
  }
  return { ctx, routes, listeners, responses, Response, close };
}

const turnEnd = (turn = 1) => ({ type: 'turn/end', time: Date.now(), data: { turn, reason: { kind: 'completed' } } });
const frames = res => res.chunks.filter(chunk => chunk.startsWith('id: '));

async function subscribe(routes, Response, responses) {
  const res = new Response();
  responses.push(res);
  await routes.get('/dsh-task-bell/events').handler({ method: 'GET', headers: { authorization: 'x' } }, res);
  return res;
}

test('explicit config filters QQ bridge sessions on the Host', async () => {
  const { ctx, routes, listeners, responses, Response, close } = host();
  try {
    await apply(ctx, { skipSessionIdPrefixes: ['qqb-'], skipAgentPresetPrefixes: ['qq-'], skipCwdSegments: ['qq-bridge'] });
    const res = await subscribe(routes, Response, responses);
    const fire = listeners.get('session/event');

    const bridge = [
      { id: 'qqb-g-849354356-648600552d04a380ff968657df7fbb10', header: { cwd: '/home/example/qq-bridge/workspace' } },
      { id: 'session-qq', header: { cwd: '/home/example/qq-bridge/workspace', agentPreset: 'qq-chat-v2' } },
      { id: 'session-slang', header: { cwd: '/home/example/qq-bridge/state/slang-agent', agentPreset: 'qq-chat' } },
      { id: 'session-probe', header: { cwd: '/tmp/qq-bridge-probe-ab-compat', agentPreset: 'standard' } },
    ];
    for (const session of bridge) fire(session, turnEnd());

    fire({ id: 'session-ordinary', header: { cwd: '/home/example/work', agentPreset: 'standard' } }, turnEnd());

    const body = res.chunks.join('');
    assert.equal(frames(res).length, 1, 'only the ordinary session may notify');
    assert.match(body, /session-ordinary/);
    assert.doesNotMatch(body, /qqb-/);
    assert.doesNotMatch(body, /session-qq"/);
    assert.doesNotMatch(body, /session-slang/);
    assert.doesNotMatch(body, /session-probe/);
  } finally { await close(); }
});

test('an explicitly empty list disables one rule without disabling the rest', async () => {
  const { ctx, routes, listeners, responses, Response, close } = host();
  try {
    await apply(ctx, { skipSessionIdPrefixes: ['qqb-'], skipAgentPresetPrefixes: ['qq-'], skipCwdSegments: [] });
    const res = await subscribe(routes, Response, responses);
    const fire = listeners.get('session/event');

    // cwd rule off: a bridge-cwd session is now allowed …
    fire({ id: 'session-qq-cwd', header: { cwd: '/home/example/qq-bridge/workspace' } }, turnEnd());
    // … but the id and preset rules still hold.
    fire({ id: 'qqb-g-1-abc', header: { cwd: '/tmp/x' } }, turnEnd());
    fire({ id: 'session-preset', header: { cwd: '/tmp/x', agentPreset: 'qq-chat' } }, turnEnd());

    assert.equal(frames(res).length, 1);
    assert.match(res.chunks.join(''), /session-qq-cwd/);
  } finally { await close(); }
});

test('a session with no cwd or preset still notifies', async () => {
  const { ctx, routes, listeners, responses, Response, close } = host();
  try {
    await apply(ctx, { skipSessionIdPrefixes: ['qqb-'], skipAgentPresetPrefixes: ['qq-'], skipCwdSegments: ['qq-bridge'] });
    const res = await subscribe(routes, Response, responses);
    listeners.get('session/event')({ id: 'session-bare', header: {} }, turnEnd());
    assert.equal(frames(res).length, 1);
  } finally { await close(); }
});
