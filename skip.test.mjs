import test from 'node:test';
import assert from 'node:assert/strict';
import { skipRules, skipReason, pathSegments } from './skip.js';

const explicit = { skipSessionIdPrefixes: ['qqb-'], skipAgentPresetPrefixes: ['qq-'], skipCwdSegments: ['qq-bridge'] };
const rules = skipRules(explicit);

const session = (id, header = {}) => ({ id, header });

test('explicit rules skip the bridge session id prefix', () => {
  assert.equal(skipReason(session('qqb-g-849354356-abc'), rules), 'session-id');
  assert.equal(skipReason(session('qqb-p-1658783310-abc'), rules), 'session-id');
});

test('explicit rules skip both QQ agent presets', () => {
  assert.equal(skipReason(session('session-1', { agentPreset: 'qq-chat' }), rules), 'agent-preset');
  assert.equal(skipReason(session('session-2', { agentPreset: 'qq-chat-v2' }), rules), 'agent-preset');
});

test('explicit rules skip the bridge cwd, including suffixed sibling directories', () => {
  assert.equal(skipReason(session('session-3', { cwd: '/home/example/qq-bridge/workspace' }), rules), 'cwd');
  assert.equal(skipReason(session('session-4', { cwd: '/home/example/qq-bridge/state/slang-agent' }), rules), 'cwd');
  assert.equal(skipReason(session('session-5', { cwd: '/tmp/qq-bridge-probe-ab-compat' }), rules), 'cwd');
  assert.equal(skipReason(session('session-6', { cwd: 'C:\\Users\\me\\qq-bridge\\workspace' }), rules), 'cwd');
});

test('an ordinary session is not skipped', () => {
  assert.equal(skipReason(session('session-7', {
    cwd: '/home/example/.dsh/extensions/yu1745/workspaces/chat-abc',
    agentPreset: 'standard',
  }), rules), undefined);
});

test('cwd rules match whole segments only', () => {
  assert.deepEqual(pathSegments('/home/example/not-qq-bridge/workspace'), ['home', 'example', 'not-qq-bridge', 'workspace']);
  assert.equal(skipReason(session('session-8', { cwd: '/home/example/not-qq-bridge/workspace' }), rules), undefined);
  assert.equal(skipReason(session('session-9', { cwd: '/home/example/myqq-bridge' }), rules), undefined);
});

test('missing or malformed session fields are tolerated', () => {
  assert.equal(skipReason(undefined, rules), undefined);
  assert.equal(skipReason({ id: 'session-10' }, rules), undefined);
  assert.equal(skipReason({ header: { cwd: 42, agentPreset: null } }, rules), undefined);
});

test('an explicit empty list disables that rule but keeps the others', () => {
  const custom = skipRules({ ...explicit, skipCwdSegments: [] });
  assert.equal(skipReason(session('session-11', { cwd: '/tmp/qq-bridge-probe' }), custom), undefined);
  assert.equal(skipReason(session('qqb-g-1-x'), custom), 'session-id');
});

test('custom lists replace the defaults and admit non-bridge filters', () => {
  const custom = skipRules({
    skipSessionIdPrefixes: ['cron-'],
    skipAgentPresetPrefixes: [],
    skipCwdSegments: ['/tmp/bots'],
  });
  assert.equal(skipReason(session('cron-1'), custom), 'session-id');
  assert.equal(skipReason(session('qqb-g-1-x'), custom), undefined);
  assert.equal(skipReason(session('session-12', { agentPreset: 'qq-chat' }), custom), undefined);
  // A configured absolute path takes part in matching by its last segment.
  assert.equal(skipReason(session('session-13', { cwd: '/tmp/bots' }), custom), 'cwd');
});

test('non-array config values fall back to the defaults', () => {
  assert.deepEqual(skipRules({ skipCwdSegments: 'qq-bridge' }), skipRules());
  assert.deepEqual(skipRules(null), skipRules());
  assert.deepEqual(skipRules(undefined), skipRules());
});

test("default rules are generic and notify bridge-like sessions", () => { assert.deepEqual(skipRules(), { sessionIdPrefixes: [], agentPresetPrefixes: [], cwdSegments: [] }); assert.equal(skipReason(session("qqb-example", { agentPreset: "qq-chat", cwd: "/tmp/qq-bridge" }), skipRules()), undefined); });
