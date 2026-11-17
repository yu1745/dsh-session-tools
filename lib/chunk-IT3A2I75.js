import {
  noWorkspaceRemoteInfo
} from "./chunk-POZQ777A.js";
import {
  isIndependentWorkspace
} from "./chunk-W67ZYAQI.js";

// src/no-workspace.ts
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { mkdir, mkdtemp } from "node:fs/promises";
import { basename, join, resolve, isAbsolute } from "node:path";
import z from "@deepseek-ai/schemastery";
import { homedir } from "node:os";

// src/no-workspace-archive.ts
var AUTO_ARCHIVE_DAYS = [0, 1, 2, 3, 7, 14, 30, 90, 180];
var AUTO_ARCHIVE_INTERVAL = 6e4;
async function archiveIndependentSessions(ctx, directory, days, signal, now = Date.now()) {
  if (days === 0 || !AUTO_ARCHIVE_DAYS.includes(days) || signal.aborted) return;
  const registry = ctx.workspaceRegistry;
  const owned = new Set(registry.list().filter(
    (workspace) => isIndependentWorkspace({ ...workspace, workspaceId: workspace.id }, directory)
  ).flatMap((workspace) => [...workspace.sessionIds]));
  if (owned.size === 0) return;
  const { items } = await ctx.sessionController.list({}, signal);
  for (const session of items) {
    if (signal.aborted) return;
    if (!owned.has(session.sessionId) || session.running || session.blank || session.parentSessionId || session.origin === "subagent" || !Number.isFinite(session.updatedAt) || session.updatedAt > now - days * 864e5 || registry.pinnedSessionIds.includes(session.sessionId) || registry.archivedSessionIds.includes(session.sessionId)) continue;
    try {
      const lastActivity = await ctx.sessionQuery.inspectSession(session.sessionId, (log) => Math.max(log.header.createdAt, log.seq > 0 ? log.eventAt(log.seq - 1)?.time ?? Infinity : log.header.createdAt), signal);
      if (signal.aborted || !Number.isFinite(lastActivity) || lastActivity > now - days * 864e5 || registry.pinnedSessionIds.includes(session.sessionId) || registry.archivedSessionIds.includes(session.sessionId)) continue;
      await registry.archiveSession(session.sessionId);
    } catch (error) {
      if (!signal.aborted && error?.code !== "workspace/session-active")
        ctx.logger.warn("Independent session auto-archive skipped %s: %s", session.sessionId, error);
    }
  }
}
function installIndependentAutoArchive(ctx, directory, days) {
  if (days === 0) return;
  const currentDays = typeof days === "function" ? days : () => days;
  const controller = new AbortController();
  let scanning = false;
  ctx.on("dispose", () => controller.abort());
  const scan = async () => {
    if (scanning || controller.signal.aborted) return;
    scanning = true;
    try {
      await archiveIndependentSessions(ctx, directory, currentDays(), controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) ctx.logger.warn("Independent session auto-archive failed: %s", error);
    } finally {
      scanning = false;
    }
  };
  ctx.interval(() => {
    void scan();
  }, AUTO_ARCHIVE_INTERVAL);
  void scan();
}

// src/no-workspace.ts
var independentWorkspaceDirectory = join(
  process.env.DSH_HOME || join(homedir(), ".dsh"),
  "extensions",
  "session-tools",
  "workspaces"
);
var name = "yu-no-workspace";
var inject = ["typert", "workspaceRegistry", "sessionController", "sessionQuery", "timer"];
var Config = z.object({
  directory: z.string().default(independentWorkspaceDirectory),
  autoArchiveDays: z.union(AUTO_ARCHIVE_DAYS.map((days) => z.const(days))).default(0).volatile()
});
async function createIndependentWorkspace(directory, registry) {
  await mkdir(directory, { recursive: true, mode: 448 });
  const child = await mkdtemp(join(directory, "chat-"));
  const title = `\u4E0D\u5728\u5DE5\u4F5C\u533A\u5DE5\u4F5C \xB7 ${basename(child).slice(-6)}`;
  const workspace = await registry.create(child, title);
  return { workspaceId: workspace.id };
}
var NoWorkspace = class extends TypertRemoteService {
  constructor(ctx, directory) {
    super(ctx, "yuNoWorkspace");
    this.directory = directory;
    if (!isAbsolute(directory)) throw new Error("No-workspace directory must be absolute");
    ctx.effect(() => ctx.typert.register({
      package: noWorkspaceRemoteInfo.package,
      face: "host",
      schemas: [],
      invocations: noWorkspaceRemoteInfo.descriptors,
      model: { services: [], events: [], objects: [] }
    }));
  }
  directory;
  base() {
    return { directory: this.directory };
  }
  async create() {
    return createIndependentWorkspace(this.directory, this.ctx.workspaceRegistry);
  }
};
function apply(ctx, config) {
  const directory = resolve(config.directory);
  new NoWorkspace(ctx, directory);
  installIndependentAutoArchive(ctx, directory, () => {
    const days = config.autoArchiveDays;
    return typeof days === "object" && days !== null ? days.get() : days ?? 0;
  });
}

export {
  AUTO_ARCHIVE_DAYS,
  archiveIndependentSessions,
  installIndependentAutoArchive,
  independentWorkspaceDirectory,
  name,
  inject,
  Config,
  createIndependentWorkspace,
  apply
};
