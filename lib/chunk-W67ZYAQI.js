// src/no-workspace-group.ts
function isIndependentWorkspace(workspace, directory) {
  const path = workspace.path.replace(/\\/g, "/");
  const root = directory.replace(/\\/g, "/").replace(/\/$/, "");
  const child = path.startsWith(`${root}/`) ? path.slice(root.length + 1) : "";
  return /^chat-[^/]+$/.test(child) && /^不在工作区工作 · [a-zA-Z0-9]{6}$/.test(workspace.title);
}
function groupIndependentWorkspaces(snapshot, directory, selectedBlankId) {
  const managed = snapshot.items.filter((item) => isIndependentWorkspace(item, directory));
  if (managed.length === 0) return snapshot;
  const representative = managed.find((item) => selectedBlankId !== void 0 && item.sessionIds.includes(selectedBlankId)) ?? managed[managed.length - 1];
  const ids = new Set(managed.map((item) => item.workspaceId));
  const sessionIds = [...new Set(managed.flatMap((item) => item.sessionIds))];
  let inserted = false;
  return {
    ...snapshot,
    items: snapshot.items.flatMap((item) => {
      if (!ids.has(item.workspaceId)) return [item];
      if (inserted) return [];
      inserted = true;
      return [{ ...representative, title: "\u4E0D\u5728\u5DE5\u4F5C\u533A\u5DE5\u4F5C", sessionIds }];
    })
  };
}

export {
  isIndependentWorkspace,
  groupIndependentWorkspaces
};
