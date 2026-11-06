# MM Lab Hub

多发性骨髓瘤 / MGTS 课题组的排班、文献研读、会议记录和团队知识库。前端为 Next.js App Router 静态导出，部署到 Cloudflare Pages；Node API 和 SQLite 在自有服务器运行。生产浏览器通过同站点 `/api/*` 入口访问，由 Pages Function 转发到服务器，登录不依赖跨站 Cookie。

## 本地运行

Node.js 22+。在项目根目录运行：

```bash
npm ci
cp apps/server/.env.example apps/server/.env
# 编辑 .env，至少设置 ADMIN_PASSWORD（12 位以上）
set -a; source apps/server/.env; set +a
npm run dev:server
```

另开终端：

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev:web
```

打开 http://localhost:3000。首次用冯汶乐账号和 `ADMIN_PASSWORD` 登录，进入“我的账户”为老师或其他成员生成一次性邀请码。成员以姓名拼音首字母账号（如 `lxg`）和邀请码首次登录，自己设置密码；固定会议号和链接由管理员配置。

## 功能

- 陈海生老师账号 `chs`，角色为 PI，只读查看与导出；个人密码和显示偏好可自行调整。

- 管理员按 A/B 组生成工作日排班，也可逐人调整；主持人单独计数。
- 汇报人自助改期，目标日最多三位汇报、核心任务总数最多四人；记录人换班由对方确认后在事务中交换。
- 每日记录按“分享、提问、分析、老师总结、发言”组织；每块可改标题、选人、自由记录、插入、移动和移除，每个问题可按顺序登记多位成员的独立回答，提问状态同步到追踪列表。文献 DOI 独立留存。当日记录人或管理员可直接发布已保存的记录，无文献、提问次数、出席打卡或内容完整度门槛。
- 未解决问题进入跨日追踪池；周总结和半月谈记录研究假说、证据与验证计划。
- 团队知识库可检索；已发布记录可按日期范围导出 Word / PDF。
- 亮色、暗色、跟随系统；桌面侧栏和手机抽屉导航。

详细设计、部署及安全说明见 [docs/DESIGN_GUIDE.md](docs/DESIGN_GUIDE.md)。

## 构建与验证

```bash
npm run build
npm test
```

## 仓库边界

这是公开仓库。`.env`、SQLite 文件、转录稿、备份、成员密码和临床原始数据都不会提交。`Meeting_transcript/` 仅用于本地需求核对。
