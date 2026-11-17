import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { installNoWorkspace } from '../lib/no-workspace-client.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
test('unified package has a self-contained client factory and host schema', async () => {
  let definition;
  vm.runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), {window:{__ModuleLoader__:{load(value){definition=value;}}}});
  const plugin = definition.factory(createRequire(import.meta.url));
  assert.equal(definition.id, '@local/dsh-task-bell');
  assert.ok(plugin.inject.includes('remote'));
  assert.equal(typeof plugin.apply, 'function');
  const {Config, inject} = await import('../index.js');
  const config = Config({});
  assert.deepEqual(config.skipSessionIdPrefixes, []);
  assert.equal(config.autoArchiveDays.get(), 0);
  assert.match(config.directory, /session-tools[/\\]workspaces$/);
  assert.ok(inject.includes('workspaceRegistry'));
  assert.doesNotMatch(await readFile(new URL('../lib/session-tools.js', import.meta.url), 'utf8'), /from ["']\.\.\/src/);
});
test('remote contributions mount once across distinct traced service wrappers and hand over', async () => {
  const key = Symbol.for('dsh.session-tools.independent-remote');
  delete globalThis[key];
  let mounted = false, mounts = 0, unmounts = 0;
  const contexts = [0, 1].map(() => {
    const cleanup = [];
    return { cleanup, on: (_, fn) => cleanup.push(fn), inject() {}, remote: { async $mount() {
      if (mounted) throw new Error('client api: direct method yuNoWorkspace/base is already mounted');
      mounted = true; mounts++;
      let disposed = false;
      return async () => { if (!disposed) { disposed = true; mounted = false; unmounts++; } };
    } } };
  });
  await Promise.all(contexts.map(ctx => installNoWorkspace(ctx)));
  assert.equal(mounts, 1);
  for (const dispose of contexts[0].cleanup) await dispose();
  assert.equal(mounts, 2);
  assert.equal(mounted, true);
  for (const dispose of contexts[1].cleanup) await dispose();
  assert.equal(unmounts, 2);
  assert.equal(globalThis[key], undefined);
});
test('failed remote mounts clear shared state and disposal does not reject', async () => {
  const key = Symbol.for('dsh.session-tools.independent-remote');
  const cleanup = [];
  const ctx = { remote: { $mount: async () => { throw new Error('mount failed'); } }, on: (_, fn) => cleanup.push(fn), inject() {} };
  await assert.rejects(installNoWorkspace(ctx), /mount failed/);
  assert.equal(globalThis[key], undefined);
  for (const dispose of cleanup) await dispose();
});
test('UI ownership is shared even when Cordis returns distinct service wrappers', async () => {
  delete globalThis[Symbol.for('dsh.session-tools.independent-remote')];
  const original = () => {};
  const views = [0, 1].map(() => ({ startSession: original, openWorkspace: original }));
  const scopes = [];
  for (const navigation of views) {
    const cleanup = [];
    const list = { getSnapshot: () => ({ items: [] }), invalidate() {} };
    const ready = { uiWorkspace: navigation, workspaces: { list, rename: original, delete: original, insertSessionBefore: original }, sessions: { list: { getSnapshot: () => ({ byId: {} }) } }, remote: { yuNoWorkspace: { base: async () => ({ ok: true, value: { directory: '/tmp/shared-ui' } }) } }, on: (_, fn) => cleanup.push(fn) };
    scopes.push(cleanup);
    await installNoWorkspace({ remote: { $mount: async () => {} }, inject: (_, fn) => fn(ready) });
  }
  assert.notEqual(views[0].startSession, original);
  assert.equal(views[1].startSession, original, 'second traced wrapper must not install again');
  for (const dispose of scopes[0]) dispose();
  await flush();
  assert.notEqual(views[1].startSession, original, 'remaining wrapper takes over');
  for (const dispose of scopes[1]) dispose();
  await flush();
  delete globalThis[Symbol.for('dsh.session-tools.independent-remote')];
});
test('legacy and unified workspace wrappers install once and hand over on owner disposal', async () => {
  const original = () => {};
  const navigation = {startSession: original, openWorkspace: original};
  const list = {getSnapshot: () => ({items:[]}), invalidate(){}};
  const workspaces = {list,rename:original,delete:original,insertSessionBefore:original};
  const scopes=[];
  for(let i=0;i<2;i++) {
    const cleanup=[];
    const ready={uiWorkspace:navigation,workspaces,sessions:{list:{getSnapshot:()=>({byId:{}})}},remote:{yuNoWorkspace:{base:async()=>({ok:true,value:{directory:'/tmp/chat-tools'}})}},on:(_,fn)=>cleanup.push(fn)};
    scopes.push(cleanup);
    await installNoWorkspace({remote:{$mount:async()=>{}},inject:(_,fn)=>fn(ready)});
    if(i===0) scopes.firstWrapper=navigation.startSession;
    else assert.equal(navigation.startSession, scopes.firstWrapper);
  }
  for(const dispose of scopes[0]) dispose();
  await flush();
  assert.notEqual(navigation.startSession, original);
  assert.notEqual(navigation.startSession, scopes.firstWrapper);
  for(const dispose of scopes[1]) dispose();
  await flush();
  assert.equal(navigation.startSession, original);
});
