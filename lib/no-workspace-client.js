import {
  noWorkspaceRemoteInfo
} from "./chunk-POZQ777A.js";
import {
  groupIndependentWorkspaces,
  isIndependentWorkspace
} from "./chunk-W67ZYAQI.js";

// src/no-workspace-client.ts
async function installNoWorkspace(ctx) {
  const mountKey = /* @__PURE__ */ Symbol.for("dsh.session-tools.independent-remote");
  const registry = globalThis;
  let mount = registry[mountKey];
  if (!mount) {
    mount = { users: /* @__PURE__ */ new Set(), owner: ctx, ready: ctx.remote.$mount(noWorkspaceRemoteInfo) };
    registry[mountKey] = mount;
    mount.ready.catch(() => {
      if (registry[mountKey] === mount) delete registry[mountKey];
    });
  }
  mount.users.add(ctx);
  ctx.on?.("dispose", async () => {
    mount.users.delete(ctx);
    if (mount.owner !== ctx) return;
    try {
      const dispose = await mount.ready;
      await dispose?.();
    } catch {
    }
    const next = mount.users.values().next().value;
    if (!next) {
      if (registry[mountKey] === mount) delete registry[mountKey];
      return;
    }
    mount.owner = next;
    mount.ready = next.remote.$mount(noWorkspaceRemoteInfo);
    try {
      await mount.ready;
    } catch {
      if (registry[mountKey] === mount) delete registry[mountKey];
    }
  });
  await mount.ready;
  ctx.inject(["uiWorkspace", "workspaces", "sessions", "remote.yuNoWorkspace"], function setup(ready) {
    const navigation = ready.uiWorkspace;
    const installed = /* @__PURE__ */ Symbol.for("dsh.session-tools.independent-workspaces");
    if (globalThis[installed]) {
      const waiting2 = globalThis[installed];
      const takeOver = () => setup(ready);
      waiting2.add(takeOver);
      ready.on("dispose", () => waiting2.delete(takeOver));
      return;
    }
    const waiting = /* @__PURE__ */ new Set();
    globalThis[installed] = waiting;
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
    let directory;
    let disposed = false;
    let rawDepth = 0;
    let lastSource;
    let lastSelectedBlank;
    let lastProjection;
    const raw = () => originalSnapshot.call(list);
    const managed = (id) => directory !== void 0 && raw().items.some(
      (item) => item.workspaceId === id && isIndependentWorkspace(item, directory)
    );
    const snapshot = () => {
      const source = raw();
      if (rawDepth > 0 || directory === void 0) return source;
      const selectedId = navigation.selection?.getSnapshot()?.sessionId;
      const selectedBlank = selectedId !== void 0 && sessions.list.getSnapshot().byId[selectedId]?.blank ? selectedId : void 0;
      if (source !== lastSource || selectedBlank !== lastSelectedBlank) {
        lastSource = source;
        lastSelectedBlank = selectedBlank;
        lastProjection = groupIndependentWorkspaces(source, directory, selectedBlank);
      }
      return lastProjection;
    };
    list.getSnapshot = snapshot;
    function withRaw(action) {
      rawDepth++;
      try {
        return action();
      } finally {
        rawDepth--;
      }
    }
    function waitForWorkspace(id) {
      if (raw().items.some((item) => item.workspaceId === id)) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error("\u65B0\u5DE5\u4F5C\u533A\u540C\u6B65\u8D85\u65F6"));
        }, 1e4);
        const unsubscribe = list.subscribe(() => {
          if (!raw().items.some((item) => item.workspaceId === id)) return;
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        });
      });
    }
    async function createAndOpen(options, beforeOpen, asOpen = false) {
      try {
        const result = await remoteApi.create();
        if (!result.ok) throw new Error(result.error.message);
        const id = result.value.workspaceId;
        await waitForWorkspace(id);
        if (disposed) return;
        if (asOpen) await withRaw(() => originalOpen.call(navigation, id, beforeOpen, options));
        else withRaw(() => originalStart.call(navigation, id, options));
      } catch (error) {
        if (!disposed) window.alert(`\u65E0\u6CD5\u521B\u5EFA\u72EC\u7ACB\u5BF9\u8BDD\u76EE\u5F55\uFF1A${error instanceof Error ? error.message : String(error)}`);
      }
    }
    navigation.startSession = function(workspaceId, options) {
      if (workspaceId !== void 0 && !managed(workspaceId)) return originalStart.call(navigation, workspaceId, options);
      void createAndOpen(options);
    };
    navigation.openWorkspace = function(workspaceId, beforeOpen, options) {
      if (!managed(workspaceId)) return originalOpen.call(navigation, workspaceId, beforeOpen, options);
      return createAndOpen(options, beforeOpen, true);
    };
    workspaces.rename = function(id, title) {
      if (managed(id)) return Promise.reject(new Error("\u72EC\u7ACB\u5BF9\u8BDD\u5206\u7EC4\u4E0D\u80FD\u91CD\u547D\u540D\uFF1B\u5176\u4E0B\u7684\u5404\u4F1A\u8BDD\u76EE\u5F55\u4ECD\u72EC\u7ACB\u4FDD\u7559\u3002"));
      return originalRename.call(workspaces, id, title);
    };
    workspaces.delete = function(id) {
      if (managed(id)) return Promise.reject(new Error("\u72EC\u7ACB\u5BF9\u8BDD\u5206\u7EC4\u4E0D\u80FD\u6574\u4F53\u5220\u9664\uFF1B\u8BF7\u9010\u4E2A\u5F52\u6863\u4F1A\u8BDD\u3002"));
      return originalDelete.call(workspaces, id);
    };
    workspaces.insertSessionBefore = function(id, sessionId, beforeId) {
      if (managed(id)) return Promise.reject(new Error("\u8DE8\u72EC\u7ACB\u5BF9\u8BDD\u76EE\u5F55\u7684\u62D6\u52A8\u6392\u5E8F\u6682\u4E0D\u652F\u6301\u3002"));
      return originalReorder.call(workspaces, id, sessionId, beforeId);
    };
    void remoteApi.base().then((result) => {
      if (disposed) return;
      if (!result.ok) throw new Error(result.error.message);
      directory = result.value.directory;
      list.invalidate();
    }).catch((error) => console.error("[session-tools] workspace group:", error));
    ready.on("dispose", () => {
      disposed = true;
      delete globalThis[installed];
      if (navigation.startSession !== originalStart) navigation.startSession = originalStart;
      if (navigation.openWorkspace !== originalOpen) navigation.openWorkspace = originalOpen;
      if (list.getSnapshot === snapshot) list.getSnapshot = originalSnapshot;
      if (workspaces.rename !== originalRename) workspaces.rename = originalRename;
      if (workspaces.delete !== originalDelete) workspaces.delete = originalDelete;
      if (workspaces.insertSessionBefore !== originalReorder) workspaces.insertSessionBefore = originalReorder;
      list.invalidate();
      queueMicrotask(() => {
        for (const takeOver of waiting) takeOver();
      });
    });
  });
}
export {
  installNoWorkspace
};
