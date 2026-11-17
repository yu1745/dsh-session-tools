import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const output = await build({ entryPoints: ['src/no-workspace-settings.tsx'], bundle: true, write: false, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic' });
// Resolve React through the repository while loading the bundled component in memory.
const code = output.outputFiles[0].text.replaceAll('from "react"', `from ${JSON.stringify(import.meta.resolve('react'))}`).replaceAll('from "react/jsx-runtime"', `from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`);
const { createAutoArchiveSettingsApi, archiveDayOptions } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('settings uses native namespace revision and preserves unrelated fields', async () => {
  const row = { ns: 'include:yu-no-workspace', value: { autoArchiveDays: 0 }, revision: 3 };
  const api = createAutoArchiveSettingsApi({ describe: async () => ({ ok: true, value: { writable: true, namespaces: [row] } }), update: async (...args) => { assert.deepEqual(args, [row.ns, { autoArchiveDays: 14 }, 3]); return { ok: true, value: { ...row, value: { ...row.value, autoArchiveDays: 14 }, revision: 4 } }; } });
  const state = await api.read(); assert.equal(state.writable, true);
  assert.equal((await api.save(state, 14)).value.autoArchiveDays, 14);
  await assert.rejects(api.save(state, 4), /Invalid/);
  assert.deepEqual(archiveDayOptions, [0, 1, 2, 3, 7, 14, 30, 90, 180]);
});
test('unified task-bell namespace supports native settings writes', async () => {
  const row = { ns: 'include:task-bell', value: { autoArchiveDays: 7 }, revision: 5 };
  const api = createAutoArchiveSettingsApi({ describe: async () => ({ ok: true, value: { writable: true, namespaces: [row] } }) });
  assert.equal((await api.read()).ns, row.ns);
});
test('settings reports conflicts, unavailable and ambiguous namespaces', async () => {
  const row = { ns: 'include:yu-no-workspace', value: { autoArchiveDays: 0 }, revision: 3 };
  const api = createAutoArchiveSettingsApi({ describe: async () => ({ ok: true, value: { writable: false, namespaces: [row] } }), update: async () => ({ ok: false, error: { message: 'Setting changed elsewhere' } }) });
  assert.equal((await api.read()).writable, false);
  await assert.rejects(api.save(row, 7), /Setting changed elsewhere/);
  for (const namespaces of [[], [row, row]]) await assert.rejects(createAutoArchiveSettingsApi({ describe: async () => ({ ok: true, value: { namespaces } }) }).read(), /unavailable or ambiguous/);
});
