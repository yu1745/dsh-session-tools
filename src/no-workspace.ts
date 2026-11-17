import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { mkdir, mkdtemp } from "node:fs/promises";
import { basename, join, resolve, isAbsolute } from "node:path";
import z from "@deepseek-ai/schemastery";
import { homedir } from "node:os";
export const independentWorkspaceDirectory = join(
  process.env.DSH_HOME || join(homedir(), ".dsh"),
  "extensions", "session-tools", "workspaces",
);
import { noWorkspaceRemoteInfo } from "./no-workspace-remote.js";
import { AUTO_ARCHIVE_DAYS, installIndependentAutoArchive } from "./no-workspace-archive.js";
export { archiveIndependentSessions, installIndependentAutoArchive } from "./no-workspace-archive.js";

export const name = "yu-no-workspace";
export const inject = ["typert", "workspaceRegistry", "sessionController", "sessionQuery", "timer"];
export const Config = z.object({
  directory: z.string().default(independentWorkspaceDirectory),
  autoArchiveDays: z.union(AUTO_ARCHIVE_DAYS.map((days) => z.const(days))).default(0).volatile(),
});

export async function createIndependentWorkspace(
  directory: string,
  registry: { create(path: string, title: string): Promise<{ id: string }> },
): Promise<{ workspaceId: string }> {
  // The OS creates the child atomically, so simultaneous tabs never share a directory.
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const child = await mkdtemp(join(directory, "chat-"));
  const title = `不在工作区工作 · ${basename(child).slice(-6)}`;
  const workspace = await registry.create(child, title);
  return { workspaceId: workspace.id };
}

class NoWorkspace extends TypertRemoteService {
  constructor(ctx: any, private readonly directory: string) {
    super(ctx, "yuNoWorkspace");
    if (!isAbsolute(directory)) throw new Error("No-workspace directory must be absolute");
    ctx.effect(() => ctx.typert.register({
      package: noWorkspaceRemoteInfo.package,
      face: "host",
      schemas: [],
      invocations: noWorkspaceRemoteInfo.descriptors,
      model: { services: [], events: [], objects: [] },
    }));
  }

  base(): { directory: string } {
    return { directory: this.directory };
  }

  async create(): Promise<{ workspaceId: string }> {
    return createIndependentWorkspace(this.directory, (this.ctx as any).workspaceRegistry);
  }
}

export function apply(ctx: any, config: { directory: string; autoArchiveDays?: number | { get(): number } }) {
  const directory = resolve(config.directory);
  new NoWorkspace(ctx, directory);
  installIndependentAutoArchive(ctx, directory, () => {
    const days = config.autoArchiveDays;
    return typeof days === "object" && days !== null ? days.get() : days ?? 0;
  });
}
