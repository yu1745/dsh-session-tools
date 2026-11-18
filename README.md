# DSH Session Tools 会话工具

独立的 DSH 插件：任务完成通知、不在工作区工作的独立会话目录、可调时间自动归档。运行和开发均不依赖原来的 `dsh-extensions` 仓库。

为兼容既有安装，DSH package/module ID 保持 `@local/dsh-task-bell`，入口 ID 保持 `task-bell`。源码按 Git 分发维护；没有 npm 发布流程，也没有安装期间自动构建脚本。`package.json` 用作 DSH 元数据及本地开发依赖声明。预构建的 `lib/` 保留在仓库中，使用者无需在安装时构建。源码仓库：[yu1745/dsh-session-tools](https://github.com/yu1745/dsh-session-tools)。

## 插件源

| 插件 | 功能 |
| --- | --- |
| 会话工具 | 任务通知、独立对话目录（原 No Workspace）和自动归档 |
| [AGY ACP](https://github.com/yu1745/dsh-agy-acp) | Antigravity ACP 模型和原生会话 |
| [Web Reader](https://github.com/yu1745/dsh-web-reader) | 通过浏览器渲染并读取网页 |
| [Codex Fast](https://github.com/yu1745/dsh-codex-fast) | 在 Codex 模型的推理等级下方切换普通和 Fast |
| [会话快捷键](https://github.com/yu1745/dsh-session-shortcuts) | 用键盘在已打开的会话之间前后循环 |

## Git 安装与实验性插件市场

遵循 [DSH 官方插件索引指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/plugin-market.zh.md) 的 format 1；索引版本的来源仅为 `git`，固定 HTTPS 仓库地址和完整 40 位提交 SHA，不使用 npm 来源。`package.json` 的 `private` 不设为 `true`，便于官方参考生成器发现本组合包。

在 DSH 中开启“自定义插件索引”实验性组合包，在“发现 → 添加索引源”填入静态 JSON 地址：

```text
https://raw.githubusercontent.com/yu1745/dsh-session-tools/main/market/index.json
```

`market/index.json` 指向发布代码的固定提交，而不是跟随可变分支。也可以直接安装相同的 Git 提交：

```sh
# 使用 market/index.json 中 source.commit 的完整值。
dsh plugin --profile web add 'git+https://github.com/yu1745/dsh-session-tools.git#<40位提交SHA>'
```

依赖仍由 DSH 内置的 pnpm 安装；这与把插件发布到 npm 是两件事。仓库已提交 `lib/`，没有安装期间的 `prepare` 编译或自动执行脚本。安装前仍应核对 DSH 显示的 Git 仓库和提交。

维护者更新时先提升 `package.json.version`、构建并提交代码，然后创建版本标签并生成索引：

```sh
pnpm run check
git add .
git commit -m 'Release 2.0.1'
git tag v2.0.1
node scripts/generate-market-index.mjs --ref v2.0.1
git add market/index.json
git commit -m 'Index 2.0.1 Git release'
```

生成器读取标签对应提交中的包清单与图标，不读取未提交工作副本。索引独立提交，避免索引的 SHA 自引用。推送版本标签时，GitHub Actions 还会生成可发布到其他静态 HTTPS 主机的索引 artifact；没有自动 npm 发布。市场更新要求同一 Git 仓库、同一包目录和更高的 SemVer 版本，仅移动分支不会升级已安装插件。

## 独立开发

需要 Node.js 22 或更高版本以及 pnpm。在本仓库根目录运行：

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm run test
pnpm run verify
# 或统一检查：
pnpm run check
```

首次调整依赖后先运行 `pnpm install` 更新锁文件。没有 `preinstall`、`postinstall`、`prepare` 或其他安装期间自动构建脚本；修改源码后必须显式构建。`pnpm run test` 不隐式修改构建产物，修改 TypeScript 后应先运行构建。常规测试只依赖本仓库安装的依赖；设置 `DSH_INSTALL_DIR` 才会额外验证该 DSH 安装的真实会话投影注册表。

## 文件结构

- `index.js`：统一 Host 入口、认证接口和事件分发。
- `client.js`：通知 UI 和浏览器逻辑源码；通知区只有一个开启／关闭按钮，可用时“安装为应用”位于右侧操作区。
- `push.js`、`worker.js`：Web Push、测试回执、去重和通知点击路由。
- `src/`：独立目录创建、归档、浏览器分组、设置和兼容远程协议，仅包含必要模块。
- `session-tools.ts`、`session-client.ts`：统一 Host 和 Client 组合入口。
- `build.mjs`：构建 Host 测试入口及 DSH 聚合客户端到 `lib/`。
- 根目录的 `*.test.mjs`、`tests/` 和 `verify.mjs`：通知、独立会话及集成验证。

## 独立会话与自动归档

“新对话”在配置目录下原子创建独立 `chat-*` 子目录。浏览器把这些目录合并显示为“不在工作区工作”，实际目录与 Host 工作区仍相互独立。显式项目保持原生行为。

`directory` 默认是 `$DSH_HOME/extensions/session-tools/workspaces`；未设置 `DSH_HOME` 时使用当前用户家目录下 `.dsh/extensions/session-tools/workspaces`。不依赖固定用户名或机器路径。迁移旧安装必须显式保留旧目录，才能继续分组和归档原有独立会话。

`autoArchiveDays` 默认 `0`（关闭），可选 `1、2、3、7、14、30、90、180` 天。在设置 → 通用中修改后即时生效。服务端每分钟按最后持久化活动检查，仅归档本插件管理的独立根会话，跳过运行中、置顶、空白、已归档和子代理会话。归档不删除目录，之后可恢复；关闭网页不影响检查。

## 任务通知

在设置 → 通用 → 任务完成通知点击“开启通知”。此点击申请浏览器权限、建立订阅，并在内部验证。状态检查与验证不展示技术列表；遇到错误只显示简短提示。授权、Worker 和订阅操作有超时，失败后按钮恢复可操作，迟到的旧操作不会继续更改新状态。只有订阅成功后才保存开启状态；“关闭通知”取消当前浏览器与服务端双方订阅。

支持普通标签页，无需安装 PWA，也不依赖 Tailscale Serve。支持 HTTPS 和本机 `http://localhost`、`http://127.0.0.1`、`http://[::1]`（可带端口）；普通远程 HTTP 不支持。浏览器仍须支持通知、Service Worker、Push API，并将来源视为安全上下文。不同协议、主机或端口的权限和订阅各自独立。DSH 持续运行、浏览器后台能力和联网条件也会影响送达。

通知显示会话标题，缺失时回退为短 ID。被动的后台命令完成、时间快照、目录更新不会单独触发通知；有效人类请求、目标续跑、定时任务及子代理结果仍可通知。点击通知会激活现有匹配页面并打开会话，没有匹配页面时打开完整会话 URL。访问会话仍需正常登录。

可选 `vapidSubject` 配置为部署者真实的 HTTPS 联系地址或 `mailto:` 邮箱。默认使用应用 origin；HTTP 回环地址仅在 VAPID 联系地址中升级为 HTTPS，不改变应用 URL。Apple 推送不接受 localhost 联系地址，需要时应配置有效的非 localhost 联系地址。系统横幅、声音、后台接收和窗口置前能力需在用户设备实际确认，推送服务接受不保证横幅显示。

## 兼容与迁移

保留 `/dsh-task-bell/*` URLs、`taskBellSession` URL 参数、浏览器偏好和 Worker 数据库标识，以及凭据记录 `task-bell/web-push-v1`，因此不需要迁移原订阅或 VAPID 密钥。凭据由 DSH 凭据服务保存，不应放入 Git、配置或源码。

远程协议 package 字符串 `@yu1745/dsh-extensions/no-workspace`、`yuNoWorkspace` 服务名和页面共享注册标识也保留，保证旧主包客户端与本插件共存时不会重复注册同一远程接口或重复包装 UI。这个兼容字符串是协议身份，不是对旧 npm 包或父仓库的依赖。

如果原来启用旧 Host 插件 `@yu1745/dsh-extensions/no-workspace`，集成时应停用旧 Host entry，并将原 `directory` 与 `autoArchiveDays` 移到本插件。不要让两个 Host 同时提供同一远程服务。本目录的开发或构建不会修改任何已安装 profile。

## 配置示例

通知过滤列表默认均为空；插件不内置 QQ 或特定机器规则。以下为可选部署示例：

```yaml
- id: task-bell
  config:
    autoArchiveDays: 7
    skipSessionIdPrefixes: ['qqb-']
    skipAgentPresetPrefixes: ['qq-']
    skipCwdSegments: ['qq-bridge']
```

三个规则以“或”关系匹配，并在 Host 分发 SSE 与 Web Push 之前过滤。空列表关闭对应规则，`skipCwdSegments` 按完整目录段及连字符变体匹配。

## License

MIT；见 `LICENSE`。源码拆出来源与保留的历史版权说明见 `NOTICE.md`。未包含原仓库的 provider、vendor、preset、个人配置、凭据或用户状态。
