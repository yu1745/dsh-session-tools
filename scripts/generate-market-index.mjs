import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const values = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  if (!['--ref', '--repository', '--output'].includes(flag) || !process.argv[index + 1]) {
    throw new Error('Usage: node scripts/generate-market-index.mjs [--ref v2.0.0] [--repository https://github.com/owner/repo] [--output market/index.json]');
  }
  values[flag.slice(2)] = process.argv[index + 1];
}
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const repository = values.repository || (typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url)?.replace(/^git\+/, '').replace(/\.git$/, '');
const url = new URL(repository);
if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Repository must be a credential-free HTTPS Git URL');
const ref = values.ref || 'HEAD';
if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref)) throw new Error('Invalid Git reference');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const commit = git('rev-parse', '--verify', `${ref}^{commit}`);
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('A full SHA-1 commit is required by market format 1');
// Read version and metadata from the pinned tree, never from uncommitted working files.
const pinned = JSON.parse(git('show', `${commit}:package.json`));
if (pinned.private === true || !pinned.dsh?.bundle) throw new Error('Pinned package must be a discoverable DSH bundle (private must not be true)');
const icon = execFileSync('git', ['show', `${commit}:icon.svg`], { cwd: root });
const index = {
  format: 1,
  title: { en: 'Session Tools', zh: '会话工具' },
  description: { en: 'Git-distributed DSH session tools.', zh: '通过 Git 分发的 DSH 会话工具。' },
  plugins: [{
    name: pinned.name,
    title: { en: 'Session Tools', zh: '会话工具' },
    description: { en: 'Task notifications, independent conversations and automatic archiving.', zh: '任务通知、独立对话与自动归档。' },
    icon: `data:image/svg+xml;base64,${icon.toString('base64')}`,
    author: typeof pinned.author === 'string' ? pinned.author : pinned.author?.name || 'yu1745',
    homepage: `${url.href.replace(/\/$/, '')}#readme`,
    repository: { url: url.href },
    versions: [{
      version: pinned.version,
      publishTimestamp: Number(git('show', '-s', '--format=%ct', commit)),
      source: { type: 'git', url: url.href, commit },
      ...(pinned.engines?.dsh ? { engines: { dsh: pinned.engines.dsh } } : {}),
    }],
  }],
};
const output = resolve(root, values.output || 'market/index.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(index, null, 2)}\n`);
console.log(`Generated ${output} for ${pinned.name}@${pinned.version} at ${commit}`);
