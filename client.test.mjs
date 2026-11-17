import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('./client.js', import.meta.url), 'utf8');
const origin = 'https://dsh.example';

function client({ permission = 'granted', secure = true, subscription = { endpoint: 'https://fcm.googleapis.com/token' }, active = true, serverActive = true, receipt = { receivedAt: 100, shownAt: 101 }, sendError, support = true, nativeInstall, standalone = false, enabled = true, permissionResult, setupError, hangPermission = false, hangRegistration = false, hangSubscription = false } = {}) {
  if (subscription) subscription = { async unsubscribe() { calls.push('browser-unsubscribe'); subscription = null; }, options: {}, toJSON() { return { endpoint: this.endpoint }; }, ...subscription };
  const events = new Map(), effects = [], timers = [], calls = [];
  let Controls, plugin, tested = false, clock = Date.now(), observingState = false;
  const stateChanges = []; let latePermission;
  const reg = { scope: `${origin}/dsh-task-bell/`, active: active ? { state: 'activated' } : undefined, pushManager: { async getSubscription() { calls.push('getSubscription'); return hangSubscription ? new Promise(() => {}) : subscription; }, subscribe() { throw new Error('must not subscribe during inspection'); } } };
  reg.update = async () => {};
  const navigator = { serviceWorker: { async getRegistration() { calls.push('getRegistration'); return reg; }, register() { calls.push('register'); if (hangRegistration) return new Promise(() => {}); if (setupError) throw new Error(setupError); if (permissionResult === undefined) throw new Error('must not register during inspection'); return Promise.resolve(reg); }, addEventListener() {}, removeEventListener() {} } };
  if (nativeInstall) navigator.install = nativeInstall;
  const Notification = { permission, requestPermission() { calls.push('requestPermission'); if (hangPermission) return new Promise(resolve => { latePermission = resolve; }); if (permissionResult === undefined) throw new Error('must not request permission during inspection'); Notification.permission = permissionResult; return Promise.resolve(permissionResult); } };
  const window = { isSecureContext: secure, PushManager: function () {}, matchMedia: () => ({ matches: standalone }), Notification, __ModuleLoader__: { load(value) { plugin = value.factory(() => React); } }, addEventListener(name, callback) { events.set(name, callback); }, removeEventListener(name) { events.delete(name); } };
  if (!support) { delete window.PushManager; delete navigator.serviceWorker; delete window.Notification; }
  const React = { Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useSyncExternalStore: (subscribe, snapshot) => {
    if (!observingState && typeof snapshot()?.busy === 'boolean') {
      observingState = true;
      subscribe(() => stateChanges.push(snapshot()));
    }
    return snapshot();
  } };
  const dictionary = {};
  const ctx = {
    locale: { register(_namespace, language, values) { dictionary[language] = values; }, bind() { return (key, parameters = {}) => Object.entries(parameters).reduce((text, [name, value]) => text.replace(`{${name}}`, value), dictionary.en[key] || key); }, subscribe() {}, getLocale: () => 'en' },
    slots: { inject(_name, callback) { callback(); }, register(_options, component) { Controls = component; } },
    uiWorkspace: { openSession() {} }, effect(callback) { effects.push(callback); },
  };
  vm.runInNewContext(source, {
    window, navigator, ...(support ? { Notification } : {}), React, URL, AbortSignal, Uint8Array, Date: { now: () => clock },
    location: { href: `${origin}/`, origin }, localStorage: { getItem() { return JSON.stringify({ enabled }); }, setItem() {} },
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    EventSource: class { constructor() { calls.push('connect'); } close() {} },
    document: { documentElement: { lang: 'en' }, addEventListener() {}, removeEventListener() {} },
    history: { replaceState() {} },
    setTimeout(callback, milliseconds) { const timer = { callback, milliseconds, active: true }; timers.push(timer); return timer; }, clearTimeout(timer) { if (timer) timer.active = false; }, setInterval() { return 1; }, clearInterval() {},
    async fetch(_url, options) {
      if (!options.body) { calls.push('push-key'); return { ok: true, json: async () => ({ publicKey: 'BA' }) }; }
      const value = JSON.parse(options.body); calls.push(value.action);
      if (value.action === 'test') {
        tested = true;
        if (sendError) return { ok: false, status: 502, json: async () => ({ error: sendError }) };
        return { ok: true, json: async () => ({ ok: true, id: 'test-1' }) };
      }
      return { ok: true, json: async () => ({ active: serverActive, lastTest: tested ? { id: 'test-1', accepted: true, receipt } : null }) };
    },
  });
  plugin.apply(ctx);
  function flatten(node) {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (!node || typeof node !== 'object') return [];
    return [node, ...node.children.flatMap(flatten)];
  }
  const nodes = () => flatten(Controls());
  return {
    calls, events, timers, stateChanges,
    advance(milliseconds) { clock += milliseconds; },
    text: () => nodes().flatMap(node => node.children.filter(child => typeof child === 'string')).join(''),
    resultClass: text => nodes().find(node => node.type === 'span' && node.children.includes(text))?.props.className,
    button: label => nodes().find(node => node.type === 'button' && node.children.includes(label)),
    notificationSwitch: () => nodes().find(node => node.props.role === 'switch'),
    expireLocaleLookup() { Object.defineProperty(ctx, 'locale', { get() { throw new Error('Context is inactive'); } }); },
    check: () => nodes().find(node => node.type === 'button' && ['Enable notifications', 'Disable notifications'].some(label => node.children.includes(label))).props.onClick(),
    state: () => stateChanges.at(-1),
    async settle() { for (let tick = 0; tick < 30; tick++) await Promise.resolve(); },
    expire(milliseconds) { timers.filter(timer => timer.active && timer.milliseconds === milliseconds).forEach(timer => { timer.active = false; timer.callback(); }); },
    lateGrant() { if (latePermission) latePermission('granted'); },
    startEffects() { effects.forEach(callback => callback()); },
  };
}

test('notification UI has one toggle button and no diagnostic list or switch', async () => {
  const runtime = client({ enabled: false, permission: 'default', permissionResult: 'granted' });
  assert.ok(runtime.button('Enable notifications'));
  assert.equal(runtime.notificationSwitch(), undefined);
  const pending = runtime.check();
  assert.equal(runtime.calls[0], 'requestPermission');
  assert.equal(runtime.button('Enabling…').props.disabled, true);
  await pending;
  await runtime.settle();
  assert.ok(runtime.calls.indexOf('subscribe') > runtime.calls.indexOf('register'));
  assert.ok(runtime.calls.indexOf('test') > runtime.calls.indexOf('subscribe'));
  assert.equal(runtime.button('Disable notifications').props.disabled, false);
  assert.doesNotMatch(runtime.text(), /self-check|showNotification|Service Worker received|Push service accepted/);
});

test('close cancels server and browser subscriptions and restores the single enable button', async () => {
  const runtime = client({ enabled: true });
  await runtime.check();
  assert.ok(runtime.calls.indexOf('browser-unsubscribe') > runtime.calls.indexOf('unsubscribe'));
  assert.equal(runtime.button('Enable notifications').props.disabled, false);
  assert.equal(runtime.notificationSwitch(), undefined);
  assert.doesNotMatch(runtime.text(), /Notifications disabled/);
});

test('permission rejection stays recoverable without requesting blocked permission again', async () => {
  const runtime = client({ enabled: false, permission: 'denied' });
  await runtime.check();
  assert.ok(!runtime.calls.includes('requestPermission'));
  assert.ok(!runtime.calls.includes('register'));
  assert.equal(runtime.button('Enable notifications').props.disabled, false);
  assert.match(runtime.text(), /blocked/i);
});

test('never-resolving permission request times out and a late grant cannot subscribe', async () => {
  const runtime = client({ enabled: false, permission: 'default', hangPermission: true });
  const pending = runtime.check();
  runtime.expire(30000);
  await pending;
  runtime.lateGrant();
  await runtime.settle();
  assert.equal(runtime.button('Enable notifications').props.disabled, false);
  assert.ok(!runtime.calls.includes('register'));
  assert.ok(!runtime.calls.includes('subscribe'));
  assert.match(runtime.text(), /unavailable/i);
});

test('never-resolving worker registration times out and releases the control', async () => {
  const runtime = client({ enabled: false, permission: 'default', permissionResult: 'granted', hangRegistration: true });
  const pending = runtime.check();
  await runtime.settle();
  runtime.expire(15000);
  await pending;
  assert.equal(runtime.button('Enable notifications').props.disabled, false);
  assert.ok(!runtime.calls.includes('subscribe'));
});

test('never-resolving browser subscription lookup times out during disable and startup remains read-only', async () => {
  const runtime = client({ enabled: true, hangSubscription: true });
  runtime.startEffects();
  await runtime.settle();
  assert.ok(!runtime.calls.includes('register'));
  const pending = runtime.check();
  await runtime.settle();
  runtime.expire(15000);
  await pending;
  assert.equal(runtime.button('Disable notifications').props.disabled, false);
  assert.ok(!runtime.calls.includes('unsubscribe'));
});

test('optional installation stays an independent explicit action', async () => {
  let installs = 0;
  const runtime = client({ enabled: false, nativeInstall: async () => { installs++; } });
  assert.ok(runtime.button('Install as app'));
  assert.equal(installs, 0);
  await runtime.button('Install as app').props.onClick();
  assert.equal(installs, 1);
});
