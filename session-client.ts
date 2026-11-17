import { installNoWorkspace } from './src/no-workspace-client.js';
import { installAutoArchiveSettings } from './src/no-workspace-settings.js';
export async function apply(ctx: any) {
  await installNoWorkspace(ctx);
  installAutoArchiveSettings(ctx);
}
