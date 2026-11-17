import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { createPushService } from './push.js';
import { notificationInput, notificationEligible } from './notification-input.js';
import { skipRules, skipReason } from './skip.js';

import { workspaceConfig, installIndependent } from './lib/session-tools.js';

// Notification URLs and storage identifiers remain stable across the unified package.
export const Config = z.object({
  ...workspaceConfig,
  vapidSubject: z.string().default('')
    .description('可选 Web Push VAPID 联系地址（HTTPS URL 或 mailto: 邮箱）。默认使用应用 origin，HTTP 回环地址仅在此联系地址中升级为 HTTPS；Apple 推送需配置有效的非 localhost 联系地址。'),
  skipSessionIdPrefixes: z.array(z.string()).default([])
    .description('跳过 sessionId 以此开头的会话。空数组表示不按此规则跳过。'),
  skipAgentPresetPrefixes: z.array(z.string()).default([])
    .description('跳过 agentPreset 以此开头的会话。空数组表示不按此规则跳过。'),
  skipCwdSegments: z.array(z.string()).default([])
    .description('跳过 cwd 含此路径段的会话。空数组表示不按此规则跳过。'),
});

export const inject = ['webServer', 'connection', 'credentials', 'sessionProjections', 'sessionTitle', 'typert', 'workspaceRegistry', 'sessionController', 'sessionQuery', 'timer'];
export async function applyNotifications(ctx, config) {
  const rules = skipRules(config);
  const input = await ctx.sessionProjections.register(notificationInput);
  ctx.effect(() => () => input.dispose());
  const clients = new Set();
  const history = [];
  const generation = randomUUID();
  let sequence = 0;
  const push = createPushService(ctx.credentials, { vapidSubject: config?.vapidSubject || undefined });
  await push.publicKey();
  ctx.effect(() => () => push.close());
  const worker = readFileSync(new URL('./worker.js', import.meta.url), 'utf8');
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const route = (path, methods, handler) => ctx.webServer.register({ kind: 'exact', path, async handler(req, res) {
    const admission = ctx.connection.admit(req);
    if ('rejection' in admission) { res.writeHead(admission.rejection); res.end(); return; }
    if (admission.peer.principal.kind !== 'owner') { res.writeHead(403); res.end(); return; }
    if (!methods.includes(req.method)) { res.writeHead(405, { Allow: methods.join(', ') }); res.end(); return; }
    try { await handler(req, res); }
    catch (error) {
      if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : 'Notification service failed' });
      else res.end();
      ctx.logger?.warn('Task notification request failed (%s)', error.status || 'internal');
    }
  }});
  ctx.effect(() => route('/dsh-task-bell/worker.js', ['GET'], (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(worker);
  }));
  ctx.effect(() => route('/dsh-task-bell/push-key', ['GET'], async (_req, res) => {
    json(res, 200, { publicKey: await push.publicKey() });
  }));
  ctx.effect(() => route('/dsh-task-bell/push', ['POST'], async (req, res) => {
    // A custom header and JSON content type prevent cross-site form submissions.
    if (req.headers['x-dsh-task-bell'] !== '1' || !req.headers.origin || !String(req.headers['content-type']).startsWith('application/json')) {
      json(res, 403, { error: 'Same-origin JSON request required' }); return;
    }
    let body = '', bytes = 0;
    for await (const chunk of req) {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 16384) { json(res, 413, { error: 'Request too large' }); return; }
      body += chunk;
    }
    let value;
    try { value = JSON.parse(body); } catch { json(res, 400, { error: 'Invalid JSON' }); return; }
    if (!value || typeof value !== 'object' || Array.isArray(value)) { json(res, 400, { error: 'Invalid request' }); return; }
    let result;
    if (value.action === 'subscribe') result = await push.subscribe(value.subscription, value.url, value.locale, req.headers.origin);
    else if (['unsubscribe', 'status', 'test', 'receipt'].includes(value.action) && typeof value.endpoint === 'string' && value.endpoint.length < 4096) {
      result = value.action === 'receipt' ? await push.receipt(value.endpoint, value.receipt, req.headers.origin) : value.action === 'test' ? await push.test(value.endpoint, value.testId) : await push[value.action](value.endpoint);
    } else { json(res, 400, { error: 'Invalid notification action' }); return; }
    json(res, result.ok === false ? 502 : 200, result);
  }));
  ctx.effect(() => route('/dsh-task-bell/events', ['GET'], (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
    res.write(': connected\n\n');
    const last = req.headers['last-event-id'];
    if (typeof last === 'string' && last.startsWith(generation + ':')) {
      const cursor = Number(last.split(':')[1]);
      for (const item of history) if (item.sequence > cursor) res.write(item.frame);
    }
    clients.add(res);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20000);
    res.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
  }));
  ctx.on('session/event', (session, event) => {
    if (session.header.origin === 'subagent' || event.type !== 'turn/end') return;
    // Apply deployment-specific filters before either notification channel.
    if (skipReason(session, rules) !== undefined) return;
    const reason = event.data.reason.kind;
    if (!['completed', 'error', 'max-tokens', 'blocked'].includes(reason)) return;
    if (!notificationEligible(input.stateOf(session), event)) return;
    const id = `${generation}:${++sequence}`;
    const sessionTitle = ctx.sessionTitle.get(session)?.title?.replace(/\s+/g, ' ').trim().slice(0, 160) || '';
    const data = { id, sessionId: session.id, sessionTitle, reason, time: event.time, turn: event.data.turn };
    const frame = `id: ${id}\ndata: ${JSON.stringify(data)}\n\n`;
    history.push({ sequence, frame });
    if (history.length > 100) history.shift();
    for (const res of clients) {
      if (res.writableLength > 65536) { res.destroy(); continue; }
      res.write(frame);
    }
    void push.publish(data).then(outcomes => {
      if (outcomes.some(result => !result.ok)) ctx.logger?.warn('Some task push notifications were not accepted; inspect browser notification settings for status');
    }).catch(() => ctx.logger?.warn('Task push notification delivery failed'));
  });
  ctx.effect(() => () => { for (const res of clients) res.end(); clients.clear(); });
}

export async function apply(ctx, config) {
  installIndependent(ctx, config);
  await applyNotifications(ctx, config);
}
