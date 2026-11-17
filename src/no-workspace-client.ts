import { noWorkspaceRemoteInfo } from "./no-workspace-remote.js";
import { groupIndependentWorkspaces, isIndependentWorkspace } from "./no-workspace-group.js";

/** Fold only this extension's directories in the browser; Host workspaces remain independent. */
export async function installNoWorkspace(ctx: any) {
  // Cordis gives each plugin a different traced service wrapper. Store ownership
  // on the page, not on ctx.remote/uiWorkspace, so legacy and unified bundles share it.
  const mountKey = Symbol.for("dsh.session-tools.independent-remote");
  const registry = globalThis as any;
  let mount = registry[mountKey];
  if (!mount) {
    mount = { users: new Set<any>(), owner: ctx, ready: ctx.remote.$mount(noWorkspaceRemoteInfo) };
    registry[mountKey] = mount;
    mount.ready.catch(() => { if (registry[mountKey] === mount) delete registry[mountKey]; });
  }
  mount.users.add(ctx);
  ctx.on?.("dispose", async () => {
    mount.users.delete(ctx);
    if (mount.owner !== ctx) return;
    try {
      const dispose = await mount.ready;
      await dispose?.();
    } catch { /* Failed mounts already rolled back their context-owned effects. */ }
    const next = mount.users.values().next().value;
    if (!next) { if (registry[mountKey] === mount) delete registry[mountKey]; return; }
    mount.owner = next;
    mount.ready = next.remote.$mount(noWorkspaceRemoteInfo);
    try { await mount.ready; }
    catch { if (registry[mountKey] === mount) delete registry[mountKey]; }
  });
  await mount.ready;
  ctx.inject(["uiWorkspace", "workspaces", "sessions", "remote.yuNoWorkspace"], function setup(ready: any) {
    const navigation = ready.uiWorkspace;
    const installed = Symbol.for("dsh.session-tools.independent-workspaces");
    if ((globalThis as any)[installed]) {
      const waiting = (globalThis as any)[installed] as Set<() => void>;
      const takeOver = () => setup(ready);
      waiting.add(takeOver);
      ready.on("dispose", () => waiting.delete(takeOver));
      return;
    }
    const waiting = new Set<() => void>();
    (globalThis as any)[installed] = waiting;
    const sessions = ready.sessions;
    const remoteApi = ready.remote.yuNoWorkspace;
    const workspaces = ready.workspaces;
    const list = workspaces.list;
    const originalStart = navigation.startSession;
    const originalOpen = navigation.openWorkspace;
    const originalSnapshot = list.getSnapshot;
    const originalRename = workspaces.rename;
    const originalDelete = workspaces.delete;
    const originalReorder = workspaces.insertSessionBefore;
    let directory: string | undefined;
    let disposed = false;
    let rawDepth = 0;
    let lastSource: any;
    let lastSelectedBlank: string | undefined;
    let lastProjection: any;

    const raw = () => originalSnapshot.call(list);
    const managed = (id: string | undefined) => directory !== undefined && raw().items.some(
      (item: any) => item.workspaceId === id && isIndependentWorkspace(item, directory!),
    );
    const snapshot = () => {
      const source = raw();
      if (rawDepth > 0 || directory === undefined) return source;
      const selectedId = navigation.selection?.getSnapshot()?.sessionId;
      const selectedBlank = selectedId !== undefined && sessions.list.getSnapshot().byId[selectedId]?.blank ? selectedId : undefined;
      if (source !== lastSource || selectedBlank !== lastSelectedBlank) {
        lastSource = source;
        lastSelectedBlank = selectedBlank;
        lastProjection = groupIndependentWorkspaces(source, directory, selectedBlank);
      }
      return lastProjection;
    };
    list.getSnapshot = snapshot;
    // Only the synchronous native lookup needs the unmodified snapshot. Afterward the
    // Host operates on the real id, and the browser sees the folded group again.
    function withRaw<T>(action: () => T): T {
      rawDepth++;
      try { return action(); } finally { rawDepth--; }
    }
    function waitForWorkspace(id: string): Promise<void> {
      if (raw().items.some((item: any) => item.workspaceId === id)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { unsubscribe(); reject(new Error("新工作区同步超时")); }, 10000);
        const unsubscribe = list.subscribe(() => {
          if (!raw().items.some((item: any) => item.workspaceId === id)) return;
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        });
      });
    }
    async function createAndOpen(options: any, beforeOpen?: (sessionId: string) => void, asOpen = false) {
      try {
        const result = await remoteApi.create();
        if (!result.ok) throw new Error(result.error.message);
        const id = result.value.workspaceId;
        await waitForWorkspace(id);
        if (disposed) return;
        if (asOpen) await withRaw(() => originalOpen.call(navigation, id, beforeOpen, options));
        else withRaw(() => originalStart.call(navigation, id, options));
      } catch (error) {
        if (!disposed) window.alert(`无法创建独立对话目录：${error instanceof Error ? error.message : String(error)}`);
      }
    }
    navigation.startSession = function (workspaceId?: string, options?: any) {
      if (workspaceId !== undefined && !managed(workspaceId)) return originalStart.call(navigation, workspaceId, options);
      void createAndOpen(options);
    };
    navigation.openWorkspace = function (workspaceId: string, beforeOpen?: (id: string) => void, options?: any) {
      if (!managed(workspaceId)) return originalOpen.call(navigation, workspaceId, beforeOpen, options);
      return createAndOpen(options, beforeOpen, true);
    };
    workspaces.rename = function (id: string, title: string) {
      if (managed(id)) return Promise.reject(new Error("独立对话分组不能重命名；其下的各会话目录仍独立保留。"));
      return originalRename.call(workspaces, id, title);
    };
    workspaces.delete = function (id: string) {
      if (managed(id)) return Promise.reject(new Error("独立对话分组不能整体删除；请逐个归档会话。"));
      return originalDelete.call(workspaces, id);
    };
    workspaces.insertSessionBefore = function (id: string, sessionId: string, beforeId?: string) {
      if (managed(id)) return Promise.reject(new Error("跨独立对话目录的拖动排序暂不支持。"));
      return originalReorder.call(workspaces, id, sessionId, beforeId);
    };
    void remoteApi.base().then((result: any) => {
      if (disposed) return;
      if (!result.ok) throw new Error(result.error.message);
      directory = result.value.directory;
      list.invalidate();
    }).catch((error: unknown) => console.error("[session-tools] workspace group:", error));
    ready.on("dispose", () => {
      disposed = true;
      delete (globalThis as any)[installed];
      if (navigation.startSession !== originalStart) navigation.startSession = originalStart;
      if (navigation.openWorkspace !== originalOpen) navigation.openWorkspace = originalOpen;
      if (list.getSnapshot === snapshot) list.getSnapshot = originalSnapshot;
      if (workspaces.rename !== originalRename) workspaces.rename = originalRename;
      if (workspaces.delete !== originalDelete) workspaces.delete = originalDelete;
      if (workspaces.insertSessionBefore !== originalReorder) workspaces.insertSessionBefore = originalReorder;
      list.invalidate();
      queueMicrotask(() => { for (const takeOver of waiting) takeOver(); });
    });
  });
}
