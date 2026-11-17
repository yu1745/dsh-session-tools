import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { notificationInput as unit, notificationEligible } from './notification-input.js';
const start = turn => ({ type: 'turn/start', data: { turn } });
const end = turn => ({ type: 'turn/end', data: { turn, reason: { kind: 'completed' } } });
const message = (kind, form) => ({ type: 'user/message', data: { source: { kind, ...(form ? { form } : {}) } } });
const fold = events => events.reduce(unit.apply, unit.init());

test('the observed late job notice and time snapshot do not cause a completion notification', () => {
  const events = [start(14), message('tool-jobs', 'notice'), message('time-context', 'snapshot'), end(14)];
  assert.equal(notificationEligible(fold(events), end(14)), false);
});

test('passive catalog and instruction refreshes cannot arm a job-only turn', () => {
  const state = fold([start(2), message('tool-jobs', 'notice'), message('skill-catalog', 'catalog'), message('agent-instructions', 'instructions'), end(2)]);
  assert.equal(notificationEligible(state, end(2)), false);
});

test('a new human request remains eligible before or after a job notice and snapshots', () => {
  for (const inputs of [
    [message('user'), message('tool-jobs', 'notice'), message('time-context', 'snapshot')],
    [message('runtime-context', 'snapshot'), message('tool-jobs', 'notice'), message('user')],
  ]) assert.equal(notificationEligible(fold([start(1), ...inputs, end(1)]), end(1)), true);
});

test('goals, scheduled tasks and delegated-result continuations still notify', () => {
  for (const kind of ['goal', 'schedule', 'subagent-settled']) {
    assert.equal(notificationEligible(fold([start(3), message(kind, 'notice'), end(3)]), end(3)), true);
  }
});

test('each turn resets eligibility; empty turns and wrong turn IDs do not notify', () => {
  assert.equal(notificationEligible(fold([start(1), message('user'), end(1), start(2), message('tool-jobs', 'notice'), end(2)]), end(2)), false);
  assert.equal(notificationEligible(fold([start(1), end(1)]), end(1)), false);
  assert.equal(notificationEligible(fold([start(1), message('user')]), end(2)), false);
});

test('checkpoint continuation is identical to full replay and ignores unrelated events by reference', () => {
  const prefix = [start(5), message('user'), end(5)];
  const suffix = [start(6), message('tool-jobs', 'notice'), message('time-context', 'snapshot'), end(6)];
  const checkpoint = unit.stateSchema.parse(structuredClone(fold(prefix)));
  assert.deepEqual(suffix.reduce(unit.apply, checkpoint), fold([...prefix, ...suffix]));
  assert.equal(unit.apply(checkpoint, { type: 'tool/result', data: {} }), checkpoint);
});

test('installed DSH registry replays history on first read and restores checkpoints', { skip: !process.env.DSH_INSTALL_DIR }, async () => {
  const require = createRequire(process.env.DSH_INSTALL_DIR + '/package.json');
  const { Context } = require('@deepseek-ai/cordis');
  const { SessionProjectionRegistry } = require('@deepseek-ai/dsh-session-projection');
  const { Session } = require('@deepseek-ai/dsh-session');
  const ctx = new Context();
  const registry = new SessionProjectionRegistry(ctx);
  const session = Session.create('task-bell-notification-test');
  const appendMessage = kind => session.append('user/message', { role: 'user', id: 'message-' + session.seq, source: { kind }, content: [{ type: 'text', text: 'fixture' }] }, { surfaceOp: 'append' });
  session.append('turn/start', { turn: 1 }); appendMessage('user');
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } });
  const handle = await registry.register(unit);
  try {
    assert.equal(handle.stateOf(session).actionable, true);
    const checkpoint = registry.checkpoint(session);
    session.append('turn/start', { turn: 2 }); appendMessage('tool-jobs');
    session.append('turn/end', { turn: 2, reason: { kind: 'completed' } });
    assert.equal(handle.stateOf(session).actionable, false);
    const events = session.snapshotEvents(0);
    const restored = registry.restore(checkpoint, events, 0, session.header, session.inheritedEventCount);
    assert.equal(restored.checkpoint[unit.key].val.actionable, false);
  } finally { await handle.dispose(); await ctx.fiber.dispose(); }
});
