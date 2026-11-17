import { isIndependentWorkspace } from "./no-workspace-group.js";

export const AUTO_ARCHIVE_DAYS = [0, 1, 2, 3, 7, 14, 30, 90, 180] as const;
export const AUTO_ARCHIVE_INTERVAL = 60_000;

/** Filter native summaries, then verify final durable activity; never use directory mtime. */
export async function archiveIndependentSessions(
  ctx: any, directory: string, days: number, signal: AbortSignal,
  now = Date.now(),
): Promise<void> {
  if (days === 0 || !AUTO_ARCHIVE_DAYS.includes(days as any) || signal.aborted) return;
  const registry = ctx.workspaceRegistry;
  const owned = new Set<string>(registry.list().filter((workspace: any) =>
    isIndependentWorkspace({ ...workspace, workspaceId: workspace.id }, directory),
  ).flatMap((workspace: any) => [...workspace.sessionIds]));
  if (owned.size === 0) return;
  const { items } = await ctx.sessionController.list({}, signal);
  for (const session of items) {
    if (signal.aborted) return;
    if (!owned.has(session.sessionId) || session.running || session.blank ||
      session.parentSessionId || session.origin === "subagent" ||
      !Number.isFinite(session.updatedAt) || session.updatedAt > now - days * 86_400_000 ||
      registry.pinnedSessionIds.includes(session.sessionId) ||
      registry.archivedSessionIds.includes(session.sessionId)) continue;
    try {
      // Native list recency tracks the last user prompt. Read the final durable
      // event as well so a long assistant/tool turn resets the inactivity clock.
      const lastActivity = await ctx.sessionQuery.inspectSession(session.sessionId, (log: any) =>
        Math.max(log.header.createdAt, log.seq > 0 ? log.eventAt(log.seq - 1)?.time ?? Infinity : log.header.createdAt), signal);
      if (signal.aborted || !Number.isFinite(lastActivity) || lastActivity > now - days * 86_400_000 ||
        registry.pinnedSessionIds.includes(session.sessionId) || registry.archivedSessionIds.includes(session.sessionId)) continue;
      // No stopActivity: native activity admission also guards a turn starting
      // after the summary was read. Never cancel running work to archive it.
      await registry.archiveSession(session.sessionId);
    } catch (error) {
      if (!signal.aborted && (error as any)?.code !== "workspace/session-active")
        ctx.logger.warn("Independent session auto-archive skipped %s: %s", session.sessionId, error);
    }
  }
}

/** Context-owned timer; no browser is needed and overlapping scans are skipped. */
export function installIndependentAutoArchive(ctx: any, directory: string, days: number | (() => number)) {
  if (days === 0) return;
  const currentDays = typeof days === "function" ? days : () => days;
  const controller = new AbortController();
  let scanning = false;
  ctx.on("dispose", () => controller.abort());
  const scan = async () => {
    if (scanning || controller.signal.aborted) return;
    scanning = true;
    try { await archiveIndependentSessions(ctx, directory, currentDays(), controller.signal); }
    catch (error) { if (!controller.signal.aborted) ctx.logger.warn("Independent session auto-archive failed: %s", error); }
    finally { scanning = false; }
  };
  ctx.interval(() => { void scan(); }, AUTO_ARCHIVE_INTERVAL);
  void scan();
}
