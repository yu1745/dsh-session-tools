import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";

export const archiveDayOptions = [0, 1, 2, 3, 7, 14, 30, 90, 180];
function unwrap(result: any) {
  if (!result?.ok) throw new Error(result?.error?.message ?? "Settings operation failed");
  return result.value;
}
export function createAutoArchiveSettingsApi(remote: any) {
  return {
    async read() {
      const view = unwrap(await remote.describe());
      const rows = view.namespaces.filter((row: any) =>
        ["yu-no-workspace", "task-bell", "session-tools"].some(ns => row.ns === ns || row.ns.endsWith(`:${ns}`)) &&
        typeof row.value?.autoArchiveDays === "number");
      if (rows.length !== 1) throw new Error("Independent session settings are unavailable or ambiguous");
      return { ...rows[0], writable: view.writable === true };
    },
    async save(state: any, days: number) {
      if (!archiveDayOptions.includes(days)) throw new Error("Invalid auto-archive duration");
      return unwrap(await remote.update(state.ns, { autoArchiveDays: days }, state.revision));
    },
  };
}
const copy = {
  zh: { title: "自动归档不在工作区工作的会话", detail: "最后活动超过所选天数后自动归档独立会话，跳过运行中、置顶和空白会话。归档后可从已归档列表恢复。服务端每分钟检查，关闭页面后仍生效。", off: "关闭", days: "天", saving: "保存中…", saved: "已保存", reload: "重新加载", loading: "正在读取设置…", readonly: "设置为只读。" },
  en: { title: "Auto-archive sessions outside workspaces", detail: "Archive independent sessions after their last activity. Running, pinned and blank sessions are skipped. Restore sessions from the archive list. The server checks every minute, including while this page is closed.", off: "Off", days: "days", saving: "Saving…", saved: "Saved", reload: "Reload", loading: "Loading settings…", readonly: "Settings are read-only." },
};
export function AutoArchiveSettingsRow({ api, language = "zh" }: { api: any; language?: string }) {
  const text = language.toLowerCase().startsWith("zh") ? copy.zh : copy.en;
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generation, reload] = useState(0);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    setError("");
    api.read().then((value: any) => { if (active) setState(value); }).catch((failure: any) => { if (active) setError(String(failure.message ?? failure)); });
    return () => { active = false; };
  }, [api, generation]);
  async function save(days: number) {
    if (saving.current || !state?.writable) return;
    saving.current = true; setBusy(true); setError(""); setNotice("");
    try { const value = await api.save(state, days); setState({ ...value, writable: state.writable }); setNotice(text.saved); }
    catch (failure: any) { setError(String(failure.message ?? failure)); }
    finally { saving.current = false; setBusy(false); }
  }
  return <div className="yu-auto-archive">
    <style>{`.yu-auto-archive{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;color:var(--dsw-alias-label-primary)}.yu-auto-archive-title{font-size:14px;font-weight:500}.yu-auto-archive-detail{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.6;max-width:560px;margin-top:5px}.yu-auto-archive select,.yu-auto-archive button{font:inherit;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:7px 10px}.yu-auto-archive select:focus-visible,.yu-auto-archive button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.yu-auto-archive select:disabled{opacity:.5}.yu-auto-archive [role=alert]{color:var(--dsw-alias-state-error-primary);font-size:12px}.yu-auto-archive-status{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:4px}@media(max-width:600px){.yu-auto-archive{align-items:flex-start;gap:12px;flex-wrap:wrap}}`}</style>
    <div><label className="yu-auto-archive-title" htmlFor="yu-auto-archive-days">{text.title}</label><div id="yu-auto-archive-detail" className="yu-auto-archive-detail">{text.detail}</div>
      {!state && !error && <div role="status">{text.loading}</div>}
      {state && !state.writable && <div className="yu-auto-archive-status">{text.readonly}</div>}
      <div className="yu-auto-archive-status" role="status">{busy ? text.saving : notice}</div>
      {error && <div role="alert">{error} <button disabled={busy} onClick={() => reload(value => value + 1)}>{text.reload}</button></div>}
    </div>
    <select id="yu-auto-archive-days" aria-describedby="yu-auto-archive-detail" value={state?.value?.autoArchiveDays ?? 0} disabled={!state?.writable || busy} onChange={event => { void save(Number(event.target.value)); }}>
      {archiveDayOptions.map(days => <option key={days} value={days}>{days === 0 ? text.off : `${days} ${text.days}`}</option>)}
    </select>
  </div>;
}
export function installAutoArchiveSettings(ctx: any) {
  ctx.inject(["remote.settings", "locale"], function setup(scope: any) {
    const installed = Symbol.for("dsh.session-tools.archive-settings");
    if ((globalThis as any)[installed]) {
      const waiting = (globalThis as any)[installed] as Set<() => void>;
      const takeOver = () => setup(scope);
      waiting.add(takeOver);
      scope.on("dispose", () => waiting.delete(takeOver));
      return;
    }
    const waiting = new Set<() => void>();
    (globalThis as any)[installed] = waiting;
    scope.on("dispose", () => {
      delete (globalThis as any)[installed];
      queueMicrotask(() => { for (const takeOver of waiting) takeOver(); });
    });
    const api = createAutoArchiveSettingsApi(scope.remote.settings);
    function View() {
      const locale = useSyncExternalStore((notify: () => void) => scope.locale.subscribe(notify), () => scope.locale.getSnapshot());
      return <AutoArchiveSettingsRow api={api} language={typeof locale === "string" ? locale : (locale as any)?.active ?? "zh"} />;
    }
    scope.slots.inject("settings.general.item", () => scope.slots.register({ name: "settings.general.item", id: "yu-independent-auto-archive", order: 40 }, View));
  });
}
