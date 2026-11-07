# MM Lab Hub — SaaS 设计与部署指南

## 1. 产品边界

平台服务冯汶乐主持的 MM / MGTS 文献研读小组。七位预置账号中，陈海生（`chs`）为 PI 只读账号，冯汶乐为管理员与常见主持人；A 组为龙星光、盛诣桉；B 组为陈怡希、李芷琪、李佩琳。团队还可将主持轮值交给任意成员。它是单团队协作应用，当前不提供多租户计费，因此“ SaaS ”指通过浏览器持续使用的团队服务，而非已经实现租户隔离的商业产品。

需求依据是本地 `Meeting_transcript/26.11.04.txt` 的四段会议转录。转录存在口语识别误差，界面不预置医学结论与真实病例数值；记录人应回看原文与 DOI。老师明确提出固定会议号、每日主持与记录、文献汇报、每人 1–2 问、原始记录可溯源、每日 Word、周总结、半月提出论文方案，以及干湿实验和成本可行性。单日“2–3 汇报 + 1 记录、最多 4 位核心任务成员”按产品规则执行；主持单列。某些改期会让原日期少于 2 位汇报，界面提示管理员补位，允许成员先自助完成改期，避免个人任务被锁死。

## 2. 信息架构与权限

左侧：概览、会议日程、会议记录、团队文档；底部“我的账户”。移动端折叠为抽屉，保留全部入口。概览回答“今天谁讲、谁记、还有什么待处理”；日程回答“哪天有空位与谁需要互换”；记录页回答“今天形成了什么证据与下一步”；文档页以方法手册组织团队知识：分类目录、长文正文、本页章节索引及上一页/下一页；账户页管理个人密码、主题与管理员设置。

管理员可以生成/增删排班、配置会议号并生成成员一次性邀请码、编辑任意日记录。成员可以修改自己的汇报日期，记录人可向另一日记录人发起互换，目标记录人同意/拒绝。每日记录、发布和出席名单由当天记录人或管理员管理；其他成员以只读方式查看每日记录，仍可登记自己的提问。记录人和管理员可以代录现场提问。文献仅允许当日汇报人、当日记录人或管理员添加；汇报人只能为自己添加，当日记录人可为当日汇报人代录。团队文档创建者及管理员可修改文档。周期总结仅负责人或管理员可修改；成员新建时负责人为自己，只有管理员可以指定或变更负责人。桌面和手机均向管理员提供主持、汇报、记录任务的移除入口。

PI 可查看日程、会议记录、提问追踪、团队文档与周期总结，并导出已发布记录。PI 不参与日常任务排班和成员必问打卡；所有团队内容写入接口统一返回 403，个人密码与显示偏好可自行修改。管理员可在现有“我的账户”页面为 PI 生成一次性邀请码；专门的管理后台留待后续迭代。既有数据库会事务迁移账号角色约束，保留密码、会话和外键关联。

## 3. 关键流程与约束

**预设排班。** 生成器只填充空白工作日，不覆盖已有日程。A 组两人同日报告，B 组轮流记录；B 组三人同日报告时由 A 组轮流记录。生成后逐人可调整。周末不自动生成，管理员可手工添加。

**汇报改期。** 服务端事务校验身份、目标日期、同日重复任务、汇报人数 `<3`、核心任务人数 `<4`，再修改日期和写审计日志。UI 的“可移入”只作提示，最终以服务端校验为准，防止并发撞位。

**记录互换。** 申请绑定双方排班 ID 与原始日期。只有目标记录人能批准；批准时再次确认两条排班仍有效、双方不会在对方日期重复担任任务，然后原子交换 `user_id`。原记录位不会空缺。相关操作写审计日志。

**会议记录。** 默认提供分享、提问、分析、老师总结、发言五种环节，按实际会议顺序保存。每块可改类型、标题、参与人和内容，支持插入、移除及上下移动；提问和分析可关联某一分享。提问块直接维护问题、按现场顺序排列的多条回答（每条有独立回答人和正文，允许同一人再次补充）、待解决/追踪中/已解决状态和追踪日期，保存记录时事务同步到问题追踪。追踪列表也允许提问人、回答人、当日记录人和管理员更新答案与状态，已解决问题可重新打开。移除提问块仅移除会议环节，问题仍保留在追踪列表和导出中。PI 保持只读。

已有固定栏目和自定义段落按内容转换为可编辑的环节，不删除旧列。新数据保存为 `blocks_json`；记录和问题分别维护 revision；保存前按加载时的原稿、本页修改和服务器最新内容做三方合并，独立字段、其他环节及逐人回答可自动合并。短暂并发冲突自动重试；只有同一处出现不同修改时才显示双方内容，由记录人选择，当前输入始终保留。离开有未保存内容的记录页时提示确认。Word/PDF 以会议环节的顺序导出，再附文献来源及独立登记的问题。当日记录人或管理员可直接发布已保存记录，不检查文献数量、提问打卡、出席情况或内容完整度。保存成功后前端立即同步记录和问题的版本号，即使随后的发布请求失败，也可重试而不会使用旧版本覆盖。

**三级漏斗。** 每日记录可以发布入册；周总结汇总发现与缺口；半月谈记录研究假说、证据、验证方案、负责人和下一步。当前周期总结由人撰写，避免自动拼接生成不可信的科研方案。编辑时以记录 ID 定位，并校验数据库内原有负责人；旧客户端按周期与开始日期保存时同样先校验已有记录权限，不能借新建覆盖他人总结。

**导出。** 已发布的每日记录按日期范围生成 `.docx` 和 `.pdf`；包含文献来源、问答、固定与自定义栏目。PDF 需要服务器配置中文字体 `PDF_FONT_PATH`。年度范围上限 366 天。建议在正式使用前由记录人与导师审阅排版，并对图表/图片另行完善。

**实验方法知识库。** 方法页面沿用 `documents` 数据表和作者/管理员编辑权限，不增加会议关联。正文使用 Markdown，支持章节、列表、表格、代码和链接；原有纯文本仍可阅读。目录为干/湿实验 → 技术家族 → 分类视角，首页展示各类真实方法数。每种技术家族有两个或更多独立维度；测序的代次（Sanger / NGS / 三代）、覆盖范围（WGS / WES / Panel 等）、检测对象及实验环节相互独立，同一方法可在多个分组出现。其他技术分别按实验目的、材料、培养体系、数据类型或分析任务等浏览，不以疾病限制方法。没有“实验设计”板块。全文搜索覆盖标题、简介、正文、中英文别名、关键词与分类选项。页面链接保留 `doc` 参数，章节生成稳定且去重的锚点，支持复制链接及浏览器后退。移动端折叠目录与章节索引；编辑器可维护简介、别名、关键词及多选分类维度，切换技术家族时清空不兼容维度；提供预览，并在离开未保存页面前提醒。保存采用 revision 校验，冲突或失败保留草稿。PI 工作台保持只读。渲染器不执行 HTML，使用安全 URL 处理。图片使用合法的 Markdown 图片地址，不支持直接上传附件。

团队知识正文保存在受登录保护的数据库中，原始转写和私有初始化内容不提交到公开仓库。批量导入使用 `deploy/import-documents.mjs`，输入为包含 `key`、`title`、`category`、`content` 的私有 JSON 数组：

```bash
node deploy/import-documents.mjs --db /path/lab.sqlite --input /private/method-pages.json --actor fwl
# 检查预览后执行；先在线备份并验证完整性，再在事务内新增
node deploy/import-documents.mjs --db /path/lab.sqlite --input /private/method-pages.json --actor fwl --apply
```

导入只由现有管理员拥有页面；导入键记录于审计日志。重复运行保留已经存在或经团队修改过的页面，不覆盖原有文档。VPS 可将脚本放在 `/opt/mm-lab/server/` 下，使用已有 Node 依赖运行。

### 实验目录迁移

分类定义保存在 `apps/server/src/lab-taxonomy.ts`。`documents` 以可重复执行的增列迁移保存 `category_key`、`summary`、`aliases_json`、`tags_json`、`facets_json`、`archived` 和 `revision`，保留原 ID、正文与作者。`GET /api/documents/catalog` 返回登录用户可读的活动目录与分类注册表；归档页面仍可通过原 ID 阅读。编辑权限由服务器校验作者/管理员，PI 只读。

结构化私有内容使用 `deploy/migrate-method-catalog.mjs`。输入包含唯一 `migrationId`、`updates`、`pages` 及可选 `archiveLegacy`；每条方法有 `key/title/categoryKey/summary/content/aliases/tags/facets/archived`，旧条目通过导入审计键或 `expectedTitle` 定位。迁移只补充分类信息和新方法，既有正文、作者与团队修改保留；归档仅退出目录、不删除原文。同一迁移重复执行不会覆盖后续编辑。

```bash
npm run build -w apps/server
node deploy/migrate-method-catalog.mjs --db /path/lab.sqlite --input /private/catalog.json --actor fwl
node deploy/migrate-method-catalog.mjs --db /path/lab.sqlite --input /private/catalog.json --actor fwl --apply
```

正式执行先在线备份并验证 SQLite 完整性，再在事务内迁移。VPS 可将脚本放在 `/opt/mm-lab/server/`；也可显式指定 `--server-dir`。代码回滚可继续读取原字段；需要数据回退时停止服务，从本次验证过的备份恢复，并保留回退前数据库以免丢失其间编辑。

## 4. 系统架构

```
浏览器 → Cloudflare Pages（Next.js 15 App Router 静态导出）
       → 同源 /api/*（Pages Functions）→ HTTPS lab-api.yyael.com → Cloudflare Tunnel → 4C20G Node API（127.0.0.1:4000）
                                             → SQLite WAL（服务器本地盘）
```

Next.js App Router 静态导出不承载 API 路由或 Server Actions。`apps/web/functions/api/[[path]].ts` 是独立的 Pages Function，仅把同站点 `/api/*` 请求转发到 `https://lab-api.yyael.com`；身份验证、业务逻辑和 SQLite 全部继续在 4C20G 运行。静态资源不经过函数，由 `public/_routes.json` 限定函数路由范围。

生产前端始终请求当前网站的 `/api/*`，不直接连接另一个 API 域名。代理保留请求体、会话和下载流，返回 `Cache-Control: no-store`，将会话 Cookie 转为当前站点的 `Secure`、`HttpOnly`、`SameSite=Lax` Cookie，避免手机浏览器的第三方 Cookie 限制。代理拒绝外站 Origin 和上游跳转，目标 API 地址固定，不能当作任意网址代理。服务器 `WEB_ORIGIN` 仍精确允许正式 Pages 域名；自定义域名需要同步加入允许列表。`NEXT_PUBLIC_API_URL` 仅用于本地开发；已有 Pages 同名变量不会再改变生产请求地址。

记录接口返回目标日期的完整排班和操作权限，前端据此展示记录编辑、发布、出席及文献入口，不依赖日程页的分页范围；写入时后端重新校验。切换日期时，前端忽略旧请求的迟到响应。

SQLite 开启 WAL、外键和 `busy_timeout=5000`。对 6–20 人的团队足够轻量，但不承诺固定的亚毫秒响应，也不适合把数据库置于 NFS。5 Mbps 上行容量需要根据文件大小和并发实测；静态资源由 Pages 分发，API 返回 JSON，Word/PDF 导出仍消耗 VPS 带宽。

## 5. 数据模型

`users`：身份、分组、密码哈希（scrypt 加盐）；`sessions`：14 天登录会话，只存 token 哈希；`invites`：7 天一次性邀请码哈希，成员凭姓名拼音首字母账号激活并自行设置密码；`settings`：会议号和链接；`schedules`：日期、成员、任务，唯一约束防重复与双记录人；`swap_requests`：待同意、已同意、拒绝、失效等状态；`attendance`：每天出席名单；`daily_records`：会议环节 JSON、版本号、草稿/发布、兼容旧栏目；`papers`：文献来源；`qa_logs`：提问、追踪状态及有序的 answers_json 回答列表（兼容旧单条回答）；`reviews`：周/半月总结；`documents`：知识库；`audit_log`：关键操作。

初始版本以 SQL `CREATE TABLE IF NOT EXISTS` 建表，后续增加字段须提供显式迁移脚本和回滚方案。SQLite 文件和 WAL/SHM 文件必须同目录备份。仓库中的 `deploy/backup.mjs` 使用 SQLite 在线备份 API 并运行完整性检查；服务器计时器每天北京时间约 04:00 执行，保留最近 14 份本地备份。配置 `RCLONE_TARGET` 后可同步到异地存储；当前 OneDrive 尚未授权，异地同步还未启用。至少每月演练一次恢复。

## 6. 本地开发

根目录执行 `npm ci`，复制 `apps/server/.env.example` 为 `apps/server/.env`，填写至少 12 位 `ADMIN_PASSWORD`。不要在终端历史、聊天或公开仓库中粘贴真实密码。运行 `npm run dev:server` 与 `npm run dev:web`。首次登录后管理员为五位成员分别生成一次性邀请码，通过安全渠道告知本人；成员以姓名拼音首字母账号首次登录并自行设置密码。

## 7. 服务器准备

建议单独系统用户运行应用，目录例如 `/opt/mm-lab`，数据库设在 `/var/lib/mm-lab/lab.sqlite` 且仅服务用户可读写。部署从仓库拉取源码后 `npm ci --omit=dev`，服务端构建可在 CI 或部署机带开发依赖执行 `npm run build -w apps/server`。使用 systemd 守护：

```ini
[Unit]
Description=MM Lab API
After=network.target
[Service]
Type=simple
User=mm-lab
WorkingDirectory=/opt/mm-lab
EnvironmentFile=/etc/mm-lab.env
ExecStart=/usr/bin/node /opt/mm-lab/apps/server/dist/index.js
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/mm-lab
[Install]
WantedBy=multi-user.target
```

`/etc/mm-lab.env` 权限 0600，含 `NODE_ENV=production`、`PORT=4000`、`DB_PATH=/var/lib/mm-lab/lab.sqlite`、`WEB_ORIGIN=https://<你的Pages域名>`、`ADMIN_PASSWORD=<初始密码>`、`PDF_FONT_PATH=<中文字体路径>`、`PDF_FONT_NAME=NotoSansCJKsc-Regular`（TTC 字体集合时）。数据库已有管理员密码后，可从环境文件移除初始密码。反向代理只暴露 HTTPS，API 进程只监听 `127.0.0.1`，限制 `/api` 请求体和请求速率，开启访问日志轮转。服务器为 NAT 环境，公网 80/443 未映射到本机；当前使用服务器已有的 Cloudflare Tunnel，将 `lab-api.yyael.com` 路由至服务器的 `http://127.0.0.1:4000`，由 Cloudflare 提供公网 HTTPS。Tunnel 凭据仅保存在服务器，不放入仓库。`deploy/Caddyfile.example` 仅供未来具备独立公网 80/443 的环境参考。

## 8. Cloudflare Pages

等用户创建 Pages 项目后，连接公开 GitHub 仓库。根目录设 `apps/web`，构建命令 `npm run build`，输出目录 `out`，框架预设选 **Next.js (Static HTML Export)**。生产环境无需设置 `NEXT_PUBLIC_API_URL`，使用同站点 `/api/*`；构建会自动发现 `apps/web/functions/` 并部署转发函数。第一次部署获得 `*.pages.dev` 后，将其加入服务器 `WEB_ORIGIN`。若改为自定义域名，也同步更新 `WEB_ORIGIN`。无需把 API 密钥写到前端变量。

## 9. 公开仓库与数据安全

`.gitignore` 排除 `.env*`、SQLite 数据库及 WAL/SHM、转录稿与构建产物；只提交 `.env.example`。当前应用不设计存放患者可识别信息，正式记录请使用脱敏材料。导出文件包含组会内容，由下载者自行保管。GitHub 公开仓库上的任何历史提交都可被检索；若误提交凭据，需立即轮换而非只删除文件。

## 10. 后续迭代

优先级：① 文献条目的编辑/删除与引用规范；② 记录版本历史和导师审阅签署；③ 文件附件存储及权限；④ 通知（站内或邮件，需单独配置服务）；⑤ 审计页与备份恢复自动化；⑥ 若扩展多团队，再设计租户隔离。当前界面没有声称这些已经完成。

## PI 专属工作台

`/pi/` 复用 `components/workspace.tsx` 的登录、导航、记录阅读、文档、账户与导出；`pi-research.tsx` 提供研究总览、全历史问题分页和阶段总结阅读。PI 登录主站后进入专属入口，普通成员不能进入 PI 工作台。汇总接口 `/api/pi/overview` 独立验证 PI／管理员身份；统计日期区间最多一年。问题每页 200 项，支持未解决／已解决；总结按周期与所选区间重叠查询。首页标记的缺失记录仅表示已排班尚未发布，不代表会议实际举行。

`pi.group-meeting-platform.pages.dev` 使用 Pages 的 `pi` 预览分支别名，根路径进入 `/pi/`。后端允许来源包含此固定域名。`.github/workflows/sync-pi.yml` 在 main 推送后将同一提交同步至 pi，触发该分支的 Pages 构建；Pages 项目须允许 pi 分支预览构建。同步只作正常快进推送，避免覆盖分叉分支。两个域名的 Cookie 独立，使用相同账号密码登录。

本版保持 PI 只读；不包含导师签署、版本审阅、批注写入及证据引用关系。当前“方案就绪”仍是负责人标记的状态。
