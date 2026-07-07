# 2PIX AI 工作台

一个基于 React + TypeScript + Vite 前端和 Express + SQLite 后端的全栈 AI 创作平台，支持聊天、图片、视频、音频等多模型调用与统一工作bench。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **后端**：Express.js + TypeScript + better-sqlite3
- **状态管理**：Zustand
- **部署**：Node.js + PM2 + Nginx（配置位于 `deploy/`）

## 目录结构

```
.
├── api/              # 后端 API（Express）
│   ├── db/           # 数据库初始化与连接
│   ├── routes/       # 路由
│   │   └── admin/    # 管理后台路由
│   ├── services/     # 业务逻辑
│   └── utils/        # 工具函数
├── src/              # 前端源码（React）
│   ├── pages/        # 页面组件
│   │   └── admin/    # 管理后台页面
│   ├── components/   # 公共组件
│   └── store/        # Zustand 状态管理
├── deploy/           # 部署脚本与 Nginx/PM2 配置
├── data/             # SQLite 运行时数据库（不会被 Git 提交）
└── docs/             # 项目文档
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（同时启动前端 Vite 和后端 Nodemon）
npm run dev

# 前端默认地址：http://localhost:5173（若被占用会自动递增端口）
# 后端默认地址：http://localhost:3001

# 类型检查
npm run check

# 生产构建
npm run build
```

开发环境首次启动时会自动初始化 SQLite 数据库，并创建默认管理员账号：

- 用户名：`admin`
- 密码：`admin123456`（可通过环境变量 `ADMIN_DEFAULT_PASSWORD` 覆盖）

## 生产部署

项目已提供基础部署配置，位于 `deploy/` 目录：

- `deploy/deploy.sh`：一键部署脚本示例
- `deploy/ecosystem.config.cjs`：PM2 进程配置
- `deploy/nginx.conf`：Nginx 反向代理配置

部署前请确保：

1. 服务器已安装 Node.js（建议 v20+）和 PM2
2. 已创建 `.env` 文件并配置好 JWT 密钥、支付回调密钥等敏感信息
3. 生产环境数据库文件位于 `data/` 目录，部署时不会被覆盖（已加入 `.gitignore`）
4. 已配置好 Nginx 反向代理到 Node.js 服务

## 主要功能模块

- **统一工作bench（`/home`）**：基于模型库的动态内容切换
- **模型管理**：后台配置模型接口、价格、分类
- **用户系统**：注册登录、角色权限、个人中心
- **计费系统**：积分充值、消费记录、订单管理、支付回调
- **充值套餐**：后台配置套餐，前台动态加载
- **兑换码**：后台生成兑换码，前台兑换积分
- **退款管理**：管理员对订单进行部分或全额退款
- **内容审核**：作品发布默认进入待审核状态
- **系统配置**：LOGO、首页文案、版权信息等自定义

## 维护建议

- **定期提交代码**：功能完成后及时 `git commit`，保持提交信息清晰
- **备份数据库**：`data/*.db` 是运行数据，生产环境建议定期备份
- **不要提交敏感信息**：`.env`、支付私钥、数据库文件均已加入 `.gitignore`
- **先测试再上线**：重大改动在本地或测试环境验证后再部署生产

## 许可证

MIT
