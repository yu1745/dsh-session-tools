import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
await mkdir(new URL('./lib/', import.meta.url), { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: {
    'session-tools': 'session-tools.ts',
    'no-workspace': 'src/no-workspace.ts',
    'no-workspace-client': 'src/no-workspace-client.ts',
    'no-workspace-group': 'src/no-workspace-group.ts',
  },
  outdir: 'lib', bundle: true, splitting: true, format: 'esm',
  platform: 'node', target: 'node22', packages: 'external',
});
const client = await build({ absWorkingDir: root, entryPoints: ['session-client.ts'], bundle: true, write: false, format: 'cjs', platform: 'browser', target: 'es2022', jsx: 'automatic', external: ['react', 'react/jsx-runtime', '@deepseek-ai/cordis'] });
const notification = (await readFile(new URL('./client.js', import.meta.url), 'utf8')).replace('window.__ModuleLoader__.load(', 'const notificationModule = (');
await writeFile(new URL('./lib/client.js', import.meta.url), `window.__ModuleLoader__.load({id:'@local/dsh-task-bell',factory(require){const module={exports:{}};const exports=module.exports;\n${client.outputFiles[0].text}\n${notification}\nconst notifications=notificationModule.factory(require);return {...notifications,inject:[...new Set([...notifications.inject,'remote','slots'])],async apply(ctx){notifications.apply(ctx);await module.exports.apply(ctx);}};}});\n`);
