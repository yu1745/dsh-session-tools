import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveIndependentSessions, installIndependentAutoArchive, Config } from '../lib/no-workspace.js';
const day = 86_400_000, now = 1000 * day;
function fixture() {
  const archived = [], warnings = [], summaries = [];
  const registry = {
    pinnedSessionIds: [], archivedSessionIds: [],
    list: () => [{ id: 'independent', path: '/chats/chat-ABC123', title: '不在工作区工作 · ABC123', sessionIds: summaries.filter(s => s.sessionId !== 'project').map(s => s.sessionId) }, { id: 'project', path: '/project', title: 'project', sessionIds: ['project'] }],
    archiveSession: async id => { archived.push(id); },
  };
  const ctx = { workspaceRegistry: registry, sessionController: { list: async () => ({ items: summaries }) }, sessionQuery: { inspectSession: async (id, read) => read({ header: { createdAt: now - 90 * day }, seq: 1, eventAt: () => ({ time: summaries.find(s => s.sessionId === id).eventAt ?? now - 8 * day }) }) }, logger: { warn: (...args) => warnings.push(args) } };
  return { ctx, registry, archived, summaries, warnings };
}
test('archives only inactive independent root sessions using last event activity', async () => {
  const f = fixture();
  const row = (sessionId, extra = {}) => ({ sessionId, updatedAt: now - 10 * day, running: false, blank: false, ...extra });
  f.summaries.push(row('old'), row('boundary', { eventAt: now - 7 * day }), row('recent-event', { eventAt: now - day }), row('running', { running: true }), row('pinned'), row('archived'), row('blank', { blank: true }), row('child', { parentSessionId: 'root' }), row('subagent', { origin: 'subagent' }), row('project'), row('recent-prompt', { updatedAt: now - day }), row('invalid', { updatedAt: NaN }));
  f.registry.pinnedSessionIds.push('pinned'); f.registry.archivedSessionIds.push('archived');
  await archiveIndependentSessions(f.ctx, '/chats', 7, new AbortController().signal, now);
  assert.deepEqual(f.archived, ['old', 'boundary']);
});
test('disabled, invalid and cancelled scans never read sessions', async () => {
  for (const days of [0, -1, 4, 365]) {
    const f = fixture(); f.ctx.sessionController.list = () => assert.fail('must not list');
    await archiveIndependentSessions(f.ctx, '/chats', days, new AbortController().signal, now);
  }
  const f = fixture(), controller = new AbortController(); controller.abort();
  f.ctx.workspaceRegistry.list = () => assert.fail('must not list');
  await archiveIndependentSessions(f.ctx, '/chats', 7, controller.signal, now);
});
test('rechecks pins after asynchronous reads; a failed archive does not stop later sessions', async () => {
  const f = fixture();
  f.summaries.push(...['pin-race', 'busy-race', 'eligible'].map(sessionId => ({ sessionId, updatedAt: now - 10 * day })));
  const read = f.ctx.sessionQuery.inspectSession;
  f.ctx.sessionQuery.inspectSession = async (id, ...args) => { if (id === 'pin-race') f.registry.pinnedSessionIds.push(id); return read(id, ...args); };
  f.registry.archiveSession = async (...args) => { assert.equal(args.length, 1, 'never pass stopActivity'); if (args[0] === 'busy-race') throw new Error('active'); f.archived.push(args[0]); };
  await archiveIndependentSessions(f.ctx, '/chats', 7, new AbortController().signal, now);
  assert.deepEqual(f.archived, ['eligible']); assert.equal(f.warnings.length, 1);
});
test('host timer skips overlapping scans and cancels at disposal; off registers nothing', async () => {
  let release, tick, dispose, calls = 0;
  const f = fixture(); f.summaries.push({ sessionId: 'old', updatedAt: 0 });
  f.ctx.sessionController.list = async () => { calls++; await new Promise(resolve => { release = resolve; }); return { items: [] }; };
  f.ctx.on = (event, callback) => { assert.equal(event, 'dispose'); dispose = callback; };
  f.ctx.interval = (callback, delay) => { assert.equal(delay, 60000); tick = callback; };
  installIndependentAutoArchive(f.ctx, '/chats', 0); assert.equal(tick, undefined);
  installIndependentAutoArchive(f.ctx, '/chats', 7); assert.equal(calls, 1);
  tick(); assert.equal(calls, 1); dispose(); release(); await new Promise(resolve => setImmediate(resolve)); tick(); assert.equal(calls, 1);
});
test('timer reads live settings so enabling and disabling need no remount', async () => {
  const f = fixture();
  f.summaries.push({ sessionId: 'old', updatedAt: 0, eventAt: 0 });
  let days = 0, tick, calls = 0;
  f.ctx.on = () => {};
  f.ctx.interval = callback => { tick = callback; };
  f.ctx.sessionController.list = async () => { calls++; return { items: f.summaries }; };
  installIndependentAutoArchive(f.ctx, '/chats', () => days);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 0);
  days = 7; tick();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.archived, ['old']);
  days = 0; tick();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls, 1);
});
test('config defaults to off and accepts exactly the advertised durations', () => {
  assert.equal(Config.dict.autoArchiveDays.meta.volatile, true, 'native settings exposes only volatile fields');
  assert.equal(Config.dict.directory.meta.volatile, undefined, 'directory must not be required in settings views');
  assert.equal(Config({}).autoArchiveDays.get(), 0);
  for (const days of [0, 1, 2, 3, 7, 14, 30, 90, 180]) assert.equal(Config({ autoArchiveDays: days }).autoArchiveDays.get(), days);
  assert.throws(() => Config({ autoArchiveDays: 4 }));
});
