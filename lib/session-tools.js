import {
  AUTO_ARCHIVE_DAYS,
  apply,
  independentWorkspaceDirectory
} from "./chunk-IT3A2I75.js";
import "./chunk-POZQ777A.js";
import "./chunk-W67ZYAQI.js";

// session-tools.ts
import z from "@deepseek-ai/schemastery";
var workspaceConfig = {
  directory: z.string().default(independentWorkspaceDirectory),
  autoArchiveDays: z.union(AUTO_ARCHIVE_DAYS.map((days) => z.const(days))).default(0).volatile()
};
function installIndependent(ctx, config) {
  apply(ctx, config);
}
export {
  installIndependent,
  workspaceConfig
};
