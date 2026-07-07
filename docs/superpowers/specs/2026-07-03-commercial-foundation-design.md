# 2PIX 商业化底座第一阶段设计

## 背景

2PIX 当前已经具备前台工作台、个人中心、漫剧工坊、代理商展示页和管理后台雏形。下一阶段目标是从演示型产品升级为可真实收费使用的 SaaS 版本。

用户明确的商业化方向：

- 网站需要支持真实用户注册和登录。
- 用户需要拥有可充值、可消费、可追踪的额度账户。
- 支付准备接入支付宝和微信。
- 模型上游优先接聚合平台，例如 kie.ai。
- 漫剧方向优先做常规剧本分镜生成工作流。
- 代理商系统先保留展示，后续再完善真实返佣。
- 后台主要由站长一个人使用，但保留后续添加管理人员和分配权限的能力。

第一阶段不正式接入支付宝、微信和 kie.ai，而是先把用户、额度、订单、扣费和后台管理底座做稳，并为后续真实接入预留接口。

## 目标

第一阶段完成后，系统应具备以下能力：

- 普通用户可以注册、登录、退出。
- 普通用户登录后可以查看个人资料、额度余额和额度流水。
- 后台管理员可以查看用户列表、用户详情、状态、余额和消费记录。
- 后台管理员可以手动给用户增加或扣减额度。
- 前台生成任务会检查用户余额，并记录额度消费。
- 生成失败时支持退还预扣额度。
- 支付订单数据结构完整，后续可接支付宝和微信。
- 模型聚合平台配置结构完整，后续可接 kie.ai。

## 非目标

第一阶段暂不实现以下内容：

- 不正式接入支付宝和微信真实支付。
- 不正式接入 kie.ai 真实模型调用。
- 不实现代理商真实返佣、提现和邀请绑定。
- 不重构全部 UI 页面，只改商业化必要入口。
- 不把 SQLite 立即替换为云数据库。上线初期可继续使用 SQLite，后续按访问量迁移 PostgreSQL 或 MySQL。

## 推荐方案

采用“渐进真实化”方案。

保留现有 React + Express + SQLite 架构，补齐真实用户体系、额度体系、后台运营接口和前台登录态。现有页面继续使用，只把默认演示用户 `Django` 替换为真实登录用户数据。

选择原因：

- 当前项目已经有后台、权限、用户表、订单表和交易流水雏形。
- 推倒重构会浪费已完成的页面和交互。
- 商业化底座可以在现有结构上快速落地。
- 后续接支付和 kie.ai 时只需要替换 service 层，不影响前台主要页面。

## 架构设计

### 前端

保留现有 React + Zustand + React Router。

新增或完善：

- `useAuthStore`：保存当前用户、token、登录状态。
- `useAccountStore`：保存余额、额度流水、订单摘要。
- 前台路由保护：未登录访问工作台、个人中心、漫剧和生成页面时跳转登录。
- 用户入口：工作台左下角、右上快捷菜单、个人中心统一读取真实用户信息。
- 额度显示：个人中心、快捷菜单、生成按钮附近显示当前额度。

### 后端

保留现有 Express + SQLite。

新增或完善：

- 用户注册登录接口。
- 用户资料接口。
- 额度账户接口。
- 额度流水接口。
- 后台用户管理接口。
- 后台手动调账接口。
- 任务扣费接口。
- 支付订单预留接口。
- 上游模型配置预留接口。

### 数据库

当前 `users`、`transactions`、`orders`、`token_prices`、`token_usage` 已有基础结构。第一阶段建议在现有表基础上增强，而不是新增完全重复的表。

建议字段调整：

- `users.balance` 继续作为用户额度余额。
- `transactions` 作为额度流水表，扩展 `type` 取值语义。
- `orders` 作为充值订单表，扩展支付渠道、第三方交易号和回调数据。
- `token_usage` 作为模型用量和扣费记录。

## 数据模型

### users

用途：保存普通用户和管理员账号。

关键字段：

- `id`
- `username`
- `email`
- `phone`
- `password_hash`
- `nickname`
- `avatar`
- `role_id`
- `status`
- `balance`
- `last_login_at`
- `created_at`

状态规则：

- `active`：正常可用。
- `disabled`：禁止登录和生成。
- `pending`：预留，表示待审核。

### transactions

用途：记录所有额度变动。

建议 `type` 取值：

- `recharge`：充值增加。
- `admin_adjust_add`：后台手动增加。
- `admin_adjust_subtract`：后台手动扣减。
- `consume`：生成任务消费。
- `refund`：任务失败退还。
- `bonus`：活动或邀请奖励。

关键字段：

- `user_id`
- `type`
- `amount`
- `balance_before`
- `balance_after`
- `description`
- `related_id`
- `created_at`

金额规则：

- 增加额度时 `amount` 为正数。
- 扣减额度时 `amount` 为负数。
- 所有余额变化必须写入一条流水。

### orders

用途：记录充值订单。

建议扩展字段：

- `order_no`
- `user_id`
- `amount`
- `tokens`
- `status`
- `payment_method`
- `payment_time`
- `third_party_trade_no`
- `notify_payload`
- `created_at`
- `updated_at`

订单状态：

- `pending`：待支付。
- `paid`：已支付。
- `closed`：已关闭。
- `failed`：支付失败。
- `refunded`：已退款。

### token_usage

用途：记录模型调用和扣费。

建议字段语义：

- `user_id`
- `model`
- `category`
- `input_tokens`
- `output_tokens`
- `cost`
- `task_id`
- `status`
- `created_at`

状态规则：

- `pending`：已预扣，任务处理中。
- `completed`：任务成功，扣费确认。
- `failed`：任务失败，等待退款或已退款。
- `refunded`：已退还额度。

## API 设计

### 用户认证

`POST /api/auth/register`

请求：

```json
{
  "username": "user001",
  "email": "user@example.com",
  "password": "password123456",
  "phone": "13800000000"
}
```

返回：

```json
{
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "user001",
    "nickname": "user001",
    "balance": 0
  }
}
```

`POST /api/auth/login`

支持用户名、邮箱或手机号登录。

`POST /api/auth/logout`

删除当前 session 或让前端清除 token。

`GET /api/auth/me`

返回当前登录用户资料和余额。

### 用户额度

`GET /api/account/balance`

返回当前用户余额。

`GET /api/account/transactions`

返回当前用户额度流水，支持分页和类型筛选。

`GET /api/account/orders`

返回当前用户充值订单。

### 后台用户管理

`GET /api/admin/users`

支持关键词、状态、角色筛选。

`GET /api/admin/users/:id`

返回用户详情、余额、最近消费和最近订单。

`PATCH /api/admin/users/:id/status`

启用或禁用用户。

`POST /api/admin/users/:id/adjust-balance`

后台手动加减额度。

请求：

```json
{
  "amount": 1000,
  "reason": "人工充值补单"
}
```

### 生成任务扣费

`POST /api/billing/precharge`

生成任务开始前预扣额度。

请求：

```json
{
  "model": "kie-video-model",
  "category": "video",
  "estimatedCost": 120,
  "taskId": "task_123"
}
```

规则：

- 用户未登录：返回 401。
- 用户被禁用：返回 403。
- 余额不足：返回 402。
- 余额充足：扣减额度，写入 `transactions` 和 `token_usage`。

`POST /api/billing/confirm`

任务成功后确认扣费，可根据实际上游费用调整。

`POST /api/billing/refund`

任务失败时退还预扣额度。

### 支付订单预留

`POST /api/payments/orders`

创建充值订单。第一阶段只创建订单并返回模拟支付状态。

`POST /api/payments/alipay/notify`

支付宝回调预留。

`POST /api/payments/wechat/notify`

微信支付回调预留。

### 上游聚合平台预留

`GET /api/admin/model-providers`

后台查看上游平台配置。

`POST /api/admin/model-providers`

新增上游平台，例如 kie.ai。

`POST /api/models/generate`

统一生成入口，后续由 service 层决定调用 kie.ai 或其他聚合平台。

## 前端页面改动

### 新增用户登录注册页

建议新增：

- `/login`
- `/register`

登录页支持：

- 用户名 / 邮箱 / 手机号登录。
- 密码登录。
- 登录成功后跳转 `/home`。

注册页支持：

- 用户名。
- 邮箱。
- 手机号，第一阶段可选。
- 密码。
- 确认密码。
- 注册成功后自动登录。

### 工作台

改动：

- 左下角用户信息读取真实登录用户。
- 未登录时显示“登录 / 注册”。
- 生成任务前检查登录态和余额。
- 余额不足时引导到个人中心充值。
- 生成成功或失败后同步余额和任务记录。

### 个人中心

改动：

- 显示真实用户资料。
- 显示真实余额。
- 显示真实额度流水。
- 显示真实充值订单。
- 充值按钮第一阶段创建模拟订单，第二阶段接真实支付。

### 后台用户管理

改动：

- 用户列表显示真实普通用户。
- 支持查看用户详情。
- 支持启用、禁用。
- 支持手动加减额度。
- 支持查看用户额度流水和消费记录。

### 后台模型接口

改动：

- 保留现有模型配置页。
- 新增“上游聚合平台”配置概念。
- 先支持保存 kie.ai 的 API Key、Base URL、启用状态。

## 扣费规则

第一阶段采用“预扣 + 成功确认 + 失败退款”的规则。

流程：

1. 用户点击生成。
2. 前端请求后端预估费用。
3. 后端检查余额。
4. 余额足够则预扣。
5. 任务进入处理中。
6. 任务成功则确认扣费。
7. 任务失败则退还额度。

好处：

- 可以防止用户余额不足仍大量提交任务。
- 可以处理上游任务失败。
- 后续接 kie.ai 时只需要把任务状态和实际费用接入确认逻辑。

## 权限设计

第一阶段保留现有角色权限系统。

角色：

- `admin`：站长，拥有所有权限。
- `user`：普通用户，只能访问自己的数据和生成任务。
- `vip`：预留，可后续做会员权益。

后台默认只有站长使用。后续添加管理人员时，通过后台用户管理分配角色和权限。

## 错误处理

统一错误格式：

```json
{
  "message": "余额不足",
  "code": "INSUFFICIENT_BALANCE"
}
```

常用错误码：

- `UNAUTHORIZED`：未登录。
- `FORBIDDEN`：无权限。
- `ACCOUNT_DISABLED`：账号被禁用。
- `INSUFFICIENT_BALANCE`：余额不足。
- `ORDER_NOT_FOUND`：订单不存在。
- `PAYMENT_PENDING`：订单待支付。
- `TASK_NOT_FOUND`：任务不存在。
- `REFUND_ALREADY_DONE`：已退款，不能重复退款。

## 安全要求

- 密码必须使用 bcrypt 加密。
- JWT 必须设置过期时间。
- 后台接口必须校验管理员权限。
- 普通用户只能访问自己的订单、流水和作品。
- 手动加减额度必须写操作日志。
- 支付回调必须做签名校验，第二阶段实现。
- 所有金额和额度变动必须在数据库事务中完成。

## 测试方案

第一阶段至少验证：

- 用户可注册。
- 用户可登录。
- 登录后可获取 `/api/auth/me`。
- 未登录访问受保护接口返回 401。
- 普通用户不能访问后台接口。
- 后台管理员可查看用户列表。
- 后台管理员可给用户加额度。
- 用户余额变化会生成流水。
- 余额不足时生成任务失败。
- 生成任务预扣成功后余额减少。
- 生成失败退款后余额恢复。
- 重复退款不会重复增加余额。

## 实施顺序

1. 清理会影响实施的 lint 问题，重点清理认证、用户、后台和工作台相关文件。
2. 完善数据库结构和迁移初始化。
3. 完善用户注册、登录、当前用户接口。
4. 新增前端登录注册页和认证 store。
5. 改造工作台用户信息和登录态。
6. 完善额度余额、流水、订单接口。
7. 改造个人中心读取真实账户数据。
8. 完善后台用户管理和手动调账。
9. 接入生成任务预扣、确认、退款逻辑。
10. 预留支付订单和 kie.ai provider 配置。

## 验收标准

第一阶段完成后，应满足：

- 新用户可以注册并登录。
- 登录用户在工作台看到自己的昵称和余额。
- 个人中心展示真实余额和流水。
- 后台管理员可以给用户加减额度。
- 用户生成任务会真实扣减额度。
- 余额不足时不能生成。
- 任务失败时能退还额度。
- 支付宝、微信、kie.ai 的接入点已经预留。
- `npm run check` 和 `npm run build` 通过。
- 与第一阶段相关的 lint 问题清理完成。

