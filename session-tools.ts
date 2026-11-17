import z from '@deepseek-ai/schemastery';
import { apply as independentApply, independentWorkspaceDirectory } from './src/no-workspace.js';
import { AUTO_ARCHIVE_DAYS } from './src/no-workspace-archive.js';
export const workspaceConfig = {
  directory: z.string().default(independentWorkspaceDirectory),
  autoArchiveDays: z.union(AUTO_ARCHIVE_DAYS.map(days => z.const(days))).default(0).volatile(),
};
export function installIndependent(ctx: any, config: any) { independentApply(ctx, config); }
