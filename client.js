window.__ModuleLoader__.load({
  id: '@local/dsh-task-bell',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const dictionaries = {
      zh: { title: '任务完成通知', description: '任务结束时发送系统通知，支持关闭应用窗口后接收。', enable: '允许通知', test: '测试通知', denied: '通知已被阻止，请在浏览器的网站权限中允许通知。', dismissed: '尚未允许通知，请重试。', unsupported: '当前环境不支持系统通知，请使用支持通知的浏览器，通过 HTTPS 或本机 localhost／回环地址访问。', ready: '系统通知已开启。', failed: '通知失败：{message}', done: 'DSH · 任务已完成', error: 'DSH · 任务异常结束', blocked: 'DSH · 任务需要关注', body: '会话 {id} · 点击查看结果', namedBody: '{name} · 点击查看结果', testTitle: 'DSH · 通知测试', testBody: '任务结束后会通过系统通知提醒你。', tested: '测试通知已发送。', reconnect: '通知连接已断开，正在重连…', soundHint: '提示音由系统通知设置决定。', limit: '需要联网并允许浏览器后台通知；DSH 服务需保持运行。', pushReady: '后台推送已开启，关闭应用窗口后也可接收。', pushNeeded: '尚未开启后台推送，目前仅网页打开时接收。', setupPush: '开启后台推送', busy: '处理中…', unsubscribed: '通知已关闭。' },
      en: { title: 'Task notifications', description: 'Send system notifications when tasks end, even after closing the app window.', enable: 'Allow notifications', test: 'Test notification', denied: 'Notifications are blocked. Allow them in the browser site permissions.', dismissed: 'Notification permission was not granted. Please retry.', unsupported: 'Use a browser that supports notifications over HTTPS or local localhost/loopback.', ready: 'System notifications enabled.', failed: 'Notification failed: {message}', done: 'DSH · Task completed', error: 'DSH · Task ended with an error', blocked: 'DSH · Task needs attention', body: 'Session {id} · Click to view results', namedBody: '{name} · Click to view results', testTitle: 'DSH · Notification test', testBody: 'Finished tasks will send system notifications.', tested: 'Test notification sent.', reconnect: 'Notification connection lost. Reconnecting…', soundHint: 'Sound follows your system notification settings.', limit: 'Requires network access, browser background notifications and a running DSH server.', pushReady: 'Background push is enabled, including after closing the app window.', pushNeeded: 'Background push is not enabled. This page must stay open.', setupPush: 'Enable background push', busy: 'Working…', unsubscribed: 'Notifications disabled.' }
    };
    Object.assign(dictionaries.zh, {
      receiptHelp: '若通知已送达但没有回执，可能是旧版通知组件。可关闭再开启通知以更新组件，然后重试；仍无回执时请检查网络和浏览器后台运行设置。', enabling: '正在开启…', disabling: '正在关闭…', enableNotification: '开启通知', timeout: '操作超时，请重试并检查浏览器权限。', unavailable: '通知暂不可用，请检查浏览器权限和网络后重试。', disable: '关闭通知', repairAndDiagnose: '重新开启并自检', enableAndDiagnose: '开启并自检', diagnose: '通知自检', checking: '正在自检…', diagnosticTitle: '通知自检结果', secure: '安全上下文', notificationAPI: 'Notification API', workerAPI: 'Service Worker API', pushAPI: 'Push API', permission: '通知权限', workerActive: 'Service Worker 已激活', sse: '网页实时连接（SSE）', browserSubscription: '浏览器推送订阅', serverSubscription: '服务端推送订阅', accepted: '推送服务接受', received: 'Service Worker 收到', shown: 'showNotification 调用成功', yes: '通过', no: '未通过', unknown: '未检查', pending: '等待回执', timedOut: '未收到回执，尚未验证', permissionGranted: '已允许', permissionDefault: '未授权，请单独点击通知开关授权', permissionDenied: '已阻止，请在浏览器网站权限中修改', sseOff: '通知开关已关闭', sseDisconnected: '未连接／重连中', testSkipped: '未发送测试：请先允许通知并开启后台推送，再运行自检。', manualCheck: '人工检查：请确认你看到了测试通知，并点击它确认能返回此页面。浏览器回执只能证明收到推送及通知接口调用成功，无法验证系统横幅、声音或窗口是否实际置前。', pwaOptional: '安装为应用是可选项，不是通知的必要条件。', pwaStandalone: '当前正在独立应用窗口中运行。', pwaMenu: '若浏览器支持，可使用浏览器菜单中的安装／添加到主屏幕入口；没有安装入口也可以继续使用普通网页。', install: '安装为应用', installing: '正在请求安装…', installed: '浏览器已完成安装或打开应用的操作。', installCancelled: '安装已取消或无法完成。', installFailed: '无法开始安装，请使用浏览器提供的安装入口。', testFailed: '测试投递未完成：{message}', changedTest: '另一项测试替换了本次测试，请重新自检。'
    });
    Object.assign(dictionaries.en, {
      receiptHelp: 'If the notification arrived without a receipt, the notification worker may be outdated. Turn notifications off and on to update it, then retry. If receipts are still missing, check the network and browser background settings.', enabling: 'Enabling…', disabling: 'Disabling…', enableNotification: 'Enable notifications', timeout: 'The operation timed out. Check browser permissions and retry.', unavailable: 'Notifications are unavailable. Check browser permissions and network, then retry.', disable: 'Disable notifications', repairAndDiagnose: 'Re-enable and check', enableAndDiagnose: 'Enable and check', diagnose: 'Notification self-check', checking: 'Checking…', diagnosticTitle: 'Notification self-check results', secure: 'Secure context', notificationAPI: 'Notification API', workerAPI: 'Service Worker API', pushAPI: 'Push API', permission: 'Notification permission', workerActive: 'Service Worker activated', sse: 'Page event connection (SSE)', browserSubscription: 'Browser push subscription', serverSubscription: 'Server push subscription', accepted: 'Push service accepted', received: 'Service Worker received', shown: 'showNotification call succeeded', yes: 'Passed', no: 'Not passed', unknown: 'Not checked', pending: 'Waiting for receipt', timedOut: 'No receipt; unverified', permissionGranted: 'Granted', permissionDefault: 'Not granted; use the notification switch to grant permission', permissionDenied: 'Blocked; change this in browser site permissions', sseOff: 'Notification switch is off', sseDisconnected: 'Disconnected / reconnecting', testSkipped: 'Test not sent: allow notifications and enable background push, then run the check again.', manualCheck: 'Manual check: confirm you saw the test notification, then click it to check that it returns to this page. Browser receipts only confirm push receipt and a successful notification API call. They cannot verify system banners, sound, or whether the window actually came to the front.', pwaOptional: 'Installing as an app is optional and is not required for notifications.', pwaStandalone: 'Currently running in a standalone app window.', pwaMenu: 'If supported, use the browser’s install / add to home screen option. You can keep using the regular page when installation is unavailable.', install: 'Install as app', installing: 'Requesting installation…', installed: 'The browser completed the install or open action.', installCancelled: 'Installation was canceled or could not complete.', installFailed: 'Installation could not start. Use the browser’s installation option.', testFailed: 'Test delivery did not complete: {message}', changedTest: 'Another test replaced this test. Run the check again.'
    });
    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply(ctx) {
        const locale = ctx.locale;
        for (const [language, dict] of Object.entries(dictionaries)) locale.register('taskBell', language, dict);
        const t = locale.bind('taskBell');
        const key = 'dsh-task-bell.preferences.v1';
        let preferences = { enabled: false };
        try { preferences = { ...preferences, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch {}
        let state = { ...preferences, message: '', connected: false, pushActive: false, busy: false };
        let registrationPromise;
        let diagnosticTimer, diagnosticRevision = 0;
        let deferredInstallPrompt;
        const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches === true || navigator.standalone === true;
        const canInstall = () => window.isSecureContext && !standalone() && (typeof navigator.install === 'function' || !!deferredInstallPrompt);
        async function existingRegistration() {
          const workerUrl = new URL('dsh-task-bell/worker.js', new URL('.', location.href));
          const reg = await bounded(navigator.serviceWorker?.getRegistration(workerUrl));
          return reg?.scope === new URL('.', workerUrl).href ? reg : undefined;
        }
        let operationRevision = 0;
        let restoring = false;
        const subscribers = new Set();
        let source, disposed = false;
        const patch = change => { state = { ...state, ...change }; for (const fn of subscribers) fn(); };
        const fail = () => patch({ message: t('unavailable') });
        const save = change => {
          preferences = { ...preferences, ...change };
          try { localStorage.setItem(key, JSON.stringify(preferences)); } catch {}
          patch(preferences);
        };
        const subscribe = fn => { subscribers.add(fn); return () => subscribers.delete(fn); };
        const snapshot = () => state;
        function bounded(promise, milliseconds = 15000) {
          let timer;
          return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(t('timeout'))), milliseconds); })]).finally(() => clearTimeout(timer));
        }
        function registration() {
          if (!registrationPromise) registrationPromise = (async () => {
            if (!navigator.serviceWorker || !window.isSecureContext) throw new Error(t('unsupported'));
            const workerUrl = new URL('dsh-task-bell/worker.js', new URL('.', location.href));
            const reg = await bounded(navigator.serviceWorker.register(workerUrl, { scope: new URL('.', workerUrl).pathname }));
            await bounded(reg.update());
            const worker = reg.installing || reg.waiting;
            if (worker && worker.state !== 'activated') await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => finish(new Error('Service worker activation timed out')), 15000);
              function finish(error) { clearTimeout(timeout); worker.removeEventListener('statechange', changed); error ? reject(error) : resolve(); }
              function changed() {
                if (worker.state === 'activated') finish();
                else if (worker.state === 'redundant') finish(new Error('Service worker activation failed'));
              }
              worker.addEventListener('statechange', changed); changed();
            });
            if (!reg.active) throw new Error('Service worker is not active');
            return reg;
          })().catch(error => { registrationPromise = undefined; throw error; });
          return registrationPromise;
        }
        async function api(action, payload = {}) {
          const response = await fetch(new URL('dsh-task-bell/push', new URL('.', location.href)), {
            method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-DSH-Task-Bell': '1' },
            body: JSON.stringify({ action, ...payload }), signal: AbortSignal.timeout(25000),
          });
          const value = await response.json();
          if (!response.ok) throw Object.assign(new Error(value.error || `HTTP ${response.status}`), { status: response.status });
          return value;
        }
        async function show(title, body, item) {
          if (disposed || !state.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
          const reg = await registration();
          if (disposed || !state.enabled) return false;
          const url = new URL(location.href);
          if (item.sessionId) url.searchParams.set('taskBellSession', item.sessionId);
          return new Promise((resolve, reject) => {
            const channel = new MessageChannel();
            const timeout = setTimeout(() => finish(new Error('Notification worker did not respond; refresh this page')), 10000);
            function finish(error, shown) { clearTimeout(timeout); channel.port1.close(); error ? reject(error) : resolve(shown); }
            channel.port1.onmessage = event => event.data?.ok ? finish(null, event.data.shown) : finish(new Error(event.data?.error || 'Notification failed'));
            try { reg.active.postMessage({ type: 'task-bell:notify', event: { ...item, title, body, url: url.href } }, [channel.port2]); }
            catch (error) { finish(error); }
          });
        }
        async function setupPush(revision) {
          const current = () => { if (disposed || revision !== operationRevision) throw new Error('Operation expired'); };
          const reg = await registration();
          current();
          if (!reg.pushManager) throw new Error(t('unsupported'));
          const response = await fetch(new URL('dsh-task-bell/push-key', new URL('.', location.href)), { credentials: 'same-origin', signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error(`Push setup failed: HTTP ${response.status}`);
          const { publicKey } = await response.json();
          current();
          const raw = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - publicKey.length % 4) % 4));
          const applicationServerKey = Uint8Array.from(raw, character => character.charCodeAt(0));
          let subscription = await bounded(reg.pushManager.getSubscription());
          current();
          if (subscription && subscription.options.applicationServerKey) {
            const old = new Uint8Array(subscription.options.applicationServerKey);
            if (old.length !== applicationServerKey.length || old.some((byte, index) => byte !== applicationServerKey[index])) { await bounded(subscription.unsubscribe()); subscription = null; }
          }
          current();
          subscription ||= await bounded(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }));
          current();
          const locale = document.documentElement.lang.toLowerCase().startsWith('en') ? 'en' : 'zh';
          await api('subscribe', { subscription: subscription.toJSON(), url: location.href, locale });
          current();
          save({ enabled: true });
          patch({ pushActive: true, message: '' });
          connect();
        }
        async function disable() {
          if (state.busy) return;
          operationRevision++;
          patch({ busy: true, action: 'disabling' });
          try {
            const reg = await existingRegistration();
            const subscription = await bounded(reg?.pushManager?.getSubscription());
            if (subscription) {
              await api('unsubscribe', { endpoint: subscription.endpoint });
              await bounded(subscription.unsubscribe());
            }
            diagnosticRevision++; clearTimeout(diagnosticTimer);
            save({ enabled: false }); patch({ pushActive: false, message: '' }); connect();
          } catch (error) { fail(error); }
          finally { patch({ busy: false }); }
        }
        async function restorePush() {
          if (disposed || state.busy || restoring) return;
          restoring = true;
          const revision = operationRevision;
          try {
            const reg = await existingRegistration();
            const subscription = await bounded(reg?.pushManager?.getSubscription());
            if (disposed || state.busy || revision !== operationRevision) return;
            if (!subscription) { patch({ pushActive: false }); return; }
            const status = await api('status', { endpoint: subscription.endpoint });
            if (disposed || state.busy || revision !== operationRevision) return;
            patch({ pushActive: status.active });
            if (status.active && !state.enabled) { save({ enabled: true }); connect(); }
            if (status.lastDelivery?.ok === false) fail(new Error(status.lastDelivery.error));
          } catch (error) { if (!disposed && revision === operationRevision && state.enabled) fail(error); }
          finally { restoring = false; }
        }
        async function once(item, kind, action) {
          const run = async () => {
            if (disposed || !state.enabled) return;
            const seenKey = `dsh-task-bell.last.${kind}.${item.sessionId}`;
            try { if (localStorage.getItem(seenKey) === item.id) return; } catch {}
            if (await action()) {
              try { localStorage.setItem(seenKey, item.id); } catch {}
            }
          };
          if (navigator.locks) await navigator.locks.request('dsh-task-bell-' + kind, run);
          else await run(); // Native notification tags also coalesce on browsers without Web Locks.
        }
        async function deliver(item) {
          if (disposed || !state.enabled || Date.now() - item.time > 120000) return;
          const title = t(item.reason === 'completed' ? 'done' : item.reason === 'error' ? 'error' : 'blocked');
          const label = item.sessionTitle?.trim().slice(0, 160);
          const body = label ? t('namedBody', { name: label }) : t('body', { id: item.sessionId.slice(0, 12) });
          await once(item, 'notification', () => show(title, body, item));
        }
        function connect() {
          source?.close(); source = undefined;
          patch({ connected: false });
          if (!state.enabled || disposed) return;
          source = new EventSource(new URL('dsh-task-bell/events', new URL('.', location.href)));
          source.onopen = () => patch({ connected: true });
          source.onerror = () => patch({ connected: false });
          source.onmessage = event => { try { deliver(JSON.parse(event.data)).catch(fail); } catch (error) { fail(error); } };
        }
        async function enable() {
          if (state.busy || disposed) return;
          operationRevision++;
          patch({ busy: true, action: 'enabling' });
          try {
            if (!('Notification' in window) || !window.isSecureContext) throw new Error(t('unsupported'));
            // Request synchronously in this explicit enable click, before any await.
            // A blocked site needs browser settings; requesting again cannot fix it.
            const permission = Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission;
            const result = await bounded(permission, 30000);
            if (disposed) return;
            if (result !== 'granted') patch({ message: t(result === 'denied' ? 'denied' : 'dismissed') });
            else {
              await bounded(setupPush(operationRevision), 25000);
            }
          } catch (error) { operationRevision++; registrationPromise = undefined; fail(error); }
          finally {
            // Transfer the operation to diagnostics after setup, including denied/failed setup.
            patch({ busy: false });
            if (!disposed && state.pushActive) void diagnose();
          }
        }
        async function diagnose() {
          if (disposed) return;
          const revision = ++diagnosticRevision;
          clearTimeout(diagnosticTimer);
          const rows = [
            ['secure', window.isSecureContext ? 'yes' : 'no'],
            ['notificationAPI', typeof Notification !== 'undefined' ? 'yes' : 'no'],
            ['workerAPI', navigator.serviceWorker ? 'yes' : 'no'],
            ['pushAPI', 'PushManager' in window ? 'yes' : 'no'],
            ['permission', typeof Notification === 'undefined' ? 'unknown' : Notification.permission === 'granted' ? 'permissionGranted' : Notification.permission === 'denied' ? 'permissionDenied' : 'permissionDefault'],
            ['workerActive', 'unknown'], ['sse', state.connected ? 'yes' : state.enabled ? 'sseDisconnected' : 'sseOff'],
            ['browserSubscription', 'unknown'], ['serverSubscription', 'unknown'],
            ['accepted', 'unknown'], ['received', 'unknown'], ['shown', 'unknown'],
          ];
          const current = () => !disposed && revision === diagnosticRevision;
          const set = (key, result, detail) => { const row = rows.find(row => row[0] === key); row[1] = result; row[2] = detail; };
          const render = (notice, change = {}) => { if (current()) patch({ diagnostics: rows.map(row => [...row]), diagnosticNotice: notice || '', ...change }); };
          patch({ diagnosticNotice: '', diagnosticError: '', diagnostics: rows });
          try {
            // Inspection never registers a worker, requests permission or creates a subscription.
            const reg = window.isSecureContext && navigator.serviceWorker ? await existingRegistration() : undefined;
            set('workerActive', reg?.active?.state === 'activated' ? 'yes' : 'no');
            const subscription = await bounded(reg?.pushManager?.getSubscription());
            set('browserSubscription', subscription ? 'yes' : 'no');
            const status = subscription ? await api('status', { endpoint: subscription.endpoint }) : null;
            set('serverSubscription', status?.active ? 'yes' : 'no');
            if (!current()) return;
            if (!window.isSecureContext || typeof Notification === 'undefined' || Notification.permission !== 'granted' ||
                !reg?.active || reg.active.state !== 'activated' || !subscription || !status?.active || !('PushManager' in window)) {
              render('testSkipped'); return;
            }
            set('accepted', 'pending'); set('received', 'pending'); set('shown', 'pending'); render();
            const result = await api('test', { endpoint: subscription.endpoint });
            set('accepted', result.ok ? 'yes' : 'no', result.error);
            render();
            const deadline = Date.now() + 15000;
            async function readReceipt() {
              if (!current()) return;
              try {
                const next = await api('status', { endpoint: subscription.endpoint });
                if (!current()) return;
                const test = next.lastTest;
                if (test?.id !== result.id) { set('received', 'unknown'); set('shown', 'unknown'); render('changedTest'); return; }
                if (test.receipt) {
                  set('received', 'yes');
                  set('shown', test.receipt.shownAt ? 'yes' : test.receipt.error ? 'no' : 'unknown', test.receipt.error);
                  if (test.receipt.error && current()) fail();
                  render(); return;
                }
                if (Date.now() >= deadline) {
                  set('received', 'timedOut'); set('shown', 'timedOut'); render('receiptHelp'); if (current()) fail(); return;
                }
                diagnosticTimer = setTimeout(readReceipt, 1000);
              } catch (error) {
                set('received', 'unknown', String(error?.message || error));
                set('shown', 'unknown'); render();
              }
            }
            if (!result.ok) fail();
            if (result.ok) await readReceipt();
            else { set('received', 'unknown'); set('shown', 'unknown'); render(); }
          } catch (error) {
            const awaitingAcceptance = rows.find(row => row[0] === 'accepted')[1] === 'pending';
            if (awaitingAcceptance) {
              set('accepted', error?.status === 502 ? 'no' : 'unknown', String(error?.message || error));
              set('received', 'unknown'); set('shown', 'unknown');
            }
            render();
            if (current()) fail();
          }
        }
        async function installApp() {
          if (state.installBusy || !canInstall()) return;
          patch({ installBusy: true });
          try {
            if (typeof navigator.install === 'function') {
              // Keep the browser-controlled consent request in the explicit click gesture.
              await navigator.install();
              patch({ installMessage: 'installed', installComplete: true });
            } else {
              const promptEvent = deferredInstallPrompt;
              deferredInstallPrompt = undefined;
              patch({ installAvailable: false });
              await promptEvent.prompt();
              const { outcome } = await promptEvent.userChoice;
              patch({ installMessage: outcome === 'accepted' ? 'installed' : 'installCancelled', installComplete: outcome === 'accepted' });
            }
          } catch (error) { patch({ installMessage: error?.name === 'AbortError' ? 'installCancelled' : 'installFailed' }); }
          finally { patch({ installBusy: false, installAvailable: canInstall() }); }
        }
        const resultTone = result => ['yes', 'permissionGranted'].includes(result) ? 'success' : ['no', 'permissionDenied'].includes(result) ? 'error' : ['permissionDefault', 'pending', 'timedOut', 'sseDisconnected'].includes(result) ? 'warning' : 'neutral';
        const styles = `
          .taskBell-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2);font-family:inherit;color:var(--dsw-alias-label-primary);min-width:0}
          .taskBell-copy{flex:1;min-width:0}.taskBell-title{font-size:14px;line-height:20px;font-weight:400}
          .taskBell-description{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
          .taskBell-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-end;max-width:100%}
          .taskBell-button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:20px;padding:6px 8px;border-radius:6px;cursor:pointer}
          .taskBell-button:disabled{cursor:default;opacity:.5}.taskBell-button:hover{background:var(--dsw-alias-bg-layer-2)}
          .taskBell-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
          .taskBell-result-success{color:var(--dsw-alias-state-success-primary,light-dark(#176b3a,#82dca1))}
          .taskBell-result-error{color:var(--dsw-alias-state-error-primary,light-dark(#b42318,#ffb4ab))}
          .taskBell-result-warning{color:var(--dsw-alias-state-warn-primary,light-dark(#875600,#f3ca73))}
          .taskBell-result-neutral{color:var(--dsw-alias-label-secondary,light-dark(#5c626b,#b5bbc4))}
          @media(forced-colors:active){.taskBell-result{color:CanvasText}}
          @media(max-width:480px){.taskBell-row{gap:12px;flex-wrap:wrap}.taskBell-copy{flex-basis:calc(100% - 48px)}.taskBell-actions{margin-left:auto}}
        `;
        function Controls() {
          const value = React.useSyncExternalStore(subscribe, snapshot);
          React.useSyncExternalStore(fn => locale.subscribe(fn), () => locale.getLocale());
          const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';
          const status = state.message;
          return h('div', { className: 'taskBell-row' },
            h('style', null, styles),
            h('div', { className: 'taskBell-copy' },
              h('div', { className: 'taskBell-title' }, t('title')),
              h('div', { className: 'taskBell-description' }, t('description')),
              h('div', { className: 'taskBell-description' }, t('soundHint')),
              h('div', { className: 'taskBell-description' }, t('limit')),
              h('div', { className: 'taskBell-description', role: 'status', 'aria-live': 'polite' }, status),
              h('div', { role: 'status', 'aria-live': 'polite' }, value.installMessage ? t(value.installMessage) : '')),
            h('div', { className: 'taskBell-actions' },
              canInstall() && !value.installComplete && h('button', { type: 'button', className: 'taskBell-button', 'aria-disabled': !!value.installBusy, onClick: () => installApp() }, t(value.installBusy ? 'installing' : 'install')),
              h('button', { type: 'button', className: 'taskBell-button', disabled: value.busy, onClick: () => (value.enabled ? disable() : enable()).catch(fail) }, t(value.busy ? value.action || 'enabling' : value.enabled ? 'disable' : 'enableNotification'))));
        }
        ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id: 'task-bell', order: 80 }, Controls));
        ctx.effect(() => {
          const onInstallPrompt = event => {
            event.preventDefault();
            deferredInstallPrompt = event;
            patch({ installAvailable: true, installComplete: false });
          };
          const onInstalled = () => {
            deferredInstallPrompt = undefined;
            patch({ installAvailable: false, installComplete: true, installMessage: 'installed' });
          };
          window.addEventListener('beforeinstallprompt', onInstallPrompt);
          window.addEventListener('appinstalled', onInstalled);
          const onStorage = event => {
            if (event.key !== key) return;
            try {
              operationRevision++;
              preferences = { ...preferences, ...JSON.parse(event.newValue || '{}') };
              patch({ ...preferences, pushActive: false, message: '' }); connect();
              if (preferences.enabled) void restorePush();
            } catch {}
          };
          const onResume = () => { if (document.visibilityState === 'visible') void restorePush(); };
          const statusTimer = setInterval(() => { if (state.enabled) void restorePush(); }, 60000);
          const onMessage = event => {
            if (event.origin !== location.origin) return;
            if (event.data?.type === 'task-bell:client-info') {
              event.ports?.[0]?.postMessage({ type: 'task-bell:client-info:ack', standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true });
              return;
            }
            if (event.data?.type !== 'task-bell:open-session') return;
            if (typeof event.data.sessionId !== 'string') return;
            try {
              if (event.data.sessionId) ctx.uiWorkspace.openSession(event.data.sessionId);
              event.ports?.[0]?.postMessage({ type: 'task-bell:open-session:ack' });
            } catch { /* Worker navigates to the complete session URL if routing fails. */ }
          };
          window.addEventListener('storage', onStorage);
          window.addEventListener('focus', onResume);
          document.addEventListener('visibilitychange', onResume);
          navigator.serviceWorker?.addEventListener('message', onMessage);
          const url = new URL(location.href);
          if (url.searchParams.get('taskBellSession')) {
            ctx.uiWorkspace.openSession(url.searchParams.get('taskBellSession'));
            url.searchParams.delete('taskBellSession'); history.replaceState(history.state, '', url);
          }
          connect();
          void restorePush();
          return () => {
            disposed = true; source?.close();
            diagnosticRevision++;
            clearTimeout(diagnosticTimer);
            deferredInstallPrompt = undefined;
            window.removeEventListener('beforeinstallprompt', onInstallPrompt);
            window.removeEventListener('appinstalled', onInstalled);
            clearInterval(statusTimer);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('focus', onResume);
            document.removeEventListener('visibilitychange', onResume);
            navigator.serviceWorker?.removeEventListener('message', onMessage);
          };
        });
      }
    };
  }
});
