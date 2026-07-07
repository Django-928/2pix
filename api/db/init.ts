import bcrypt from 'bcryptjs';
import db from './index.js';
import { seedDefaultPlans } from '../services/membershipPlanService.js';

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      permission_id INTEGER NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      UNIQUE(role_id, permission_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      avatar TEXT,
      role_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      balance REAL NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      used_tokens INTEGER NOT NULL DEFAULT 0,
      last_login_at DATETIME,
      last_login_ip TEXT,
      preferences TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      ip_address TEXT,
      user_agent TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS token_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL UNIQUE,
      model_name TEXT NOT NULL,
      category TEXT NOT NULL,
      input_price REAL NOT NULL DEFAULT 0,
      output_price REAL NOT NULL DEFAULT 0,
      cost_multiplier REAL NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS token_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      category TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      task_id TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_before REAL NOT NULL,
      balance_after REAL NOT NULL,
      description TEXT,
      related_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      tokens INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      payment_time DATETIME,
      expires_at DATETIME,
      closed_at DATETIME,
      close_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_callbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT,
      payment_method TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'callback',
      amount REAL,
      verification_status TEXT NOT NULL,
      process_status TEXT NOT NULL,
      message TEXT,
      raw_payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT NOT NULL DEFAULT '{}',
      description TEXT,
      updated_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS redeem_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      tokens INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      total_usage INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      valid_start DATETIME,
      valid_end DATETIME,
      description TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS redeem_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      before_balance REAL NOT NULL,
      after_balance REAL NOT NULL,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (code_id) REFERENCES redeem_codes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON redeem_codes(code);
    CREATE INDEX IF NOT EXISTS idx_redeem_codes_status ON redeem_codes(status);
    CREATE INDEX IF NOT EXISTS idx_redeem_records_user ON redeem_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_redeem_records_code ON redeem_records(code_id);

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_logs_user ON operation_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_action ON operation_logs(action);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON operation_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_user ON token_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_model ON token_usage(model);
    CREATE INDEX IF NOT EXISTS idx_usage_created ON token_usage(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE TABLE IF NOT EXISTS refund_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      processed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      tokens INTEGER NOT NULL,
      badge TEXT,
      tone TEXT,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_membership_plans_status ON membership_plans(status);
    CREATE INDEX IF NOT EXISTS idx_refunds_order ON refund_records(order_id);
    CREATE INDEX IF NOT EXISTS idx_refunds_user ON refund_records(user_id);

    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE TABLE IF NOT EXISTS login_failures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      count INTEGER NOT NULL DEFAULT 0,
      last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
      locked_until DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'chat,image,video,audio',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      reward INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, checkin_date)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '新对话',
      model TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      content TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inviter_id INTEGER NOT NULL,
      invitee_id INTEGER NOT NULL,
      invite_code TEXT NOT NULL,
      reward_amount REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(inviter_id, invitee_id)
    );

    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('image', 'video', 'audio')),
      status TEXT NOT NULL DEFAULT 'complete' CHECK(status IN ('pending', 'complete', 'failed')),
      input_params TEXT NOT NULL DEFAULT '{}',
      output_url TEXT,
      provider TEXT,
      model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      read_at DATETIME,
      related_type TEXT,
      related_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
    CREATE INDEX IF NOT EXISTS idx_user_checkins_user ON user_checkins(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_checkins_date ON user_checkins(checkin_date);
    CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);
    CREATE INDEX IF NOT EXISTS idx_invites_invitee ON invites(invitee_id);
    CREATE INDEX IF NOT EXISTS idx_works_user ON works(user_id);
    CREATE INDEX IF NOT EXISTS idx_works_type ON works(type);
    CREATE INDEX IF NOT EXISTS idx_works_created ON works(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read_at);
    CREATE INDEX IF NOT EXISTS idx_payment_callbacks_order ON payment_callbacks(order_no);
    CREATE INDEX IF NOT EXISTS idx_admin_configs_key ON admin_configs(config_key);
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_login_failures_user ON login_failures(user_id);

    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT '✨',
      category TEXT NOT NULL DEFAULT 'chat',
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER DEFAULT 0,
      is_new INTEGER DEFAULT 0,
      is_hot INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ai_models_category ON ai_models(category);
    CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);
  `);

  const addColumnIfMissing = (table: string, column: string, definition: string) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((item) => item.name === column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
    }
  };

  addColumnIfMissing('orders', 'expires_at', 'DATETIME');
  addColumnIfMissing('orders', 'closed_at', 'DATETIME');
  addColumnIfMissing('orders', 'close_reason', 'TEXT');
  db.prepare('CREATE INDEX IF NOT EXISTS idx_orders_expires ON orders(expires_at)').run();

  addColumnIfMissing('works', 'review_status', "TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending', 'approved', 'violated', 'taken_down'))");
  addColumnIfMissing('works', 'review_reason', 'TEXT');
  addColumnIfMissing('works', 'reviewed_by', 'INTEGER');
  addColumnIfMissing('works', 'reviewed_at', 'DATETIME');
  db.prepare('CREATE INDEX IF NOT EXISTS idx_works_review ON works(review_status)').run();

  const permissionCount = db.prepare('SELECT COUNT(*) as count FROM permissions').get() as { count: number };
  if (permissionCount.count === 0) {
    const permissions = [
      { name: 'user:view', description: '查看用户', module: 'user', action: 'view' },
      { name: 'user:create', description: '创建用户', module: 'user', action: 'create' },
      { name: 'user:edit', description: '编辑用户', module: 'user', action: 'edit' },
      { name: 'user:delete', description: '删除用户', module: 'user', action: 'delete' },
      { name: 'role:view', description: '查看角色', module: 'role', action: 'view' },
      { name: 'role:create', description: '创建角色', module: 'role', action: 'create' },
      { name: 'role:edit', description: '编辑角色', module: 'role', action: 'edit' },
      { name: 'role:delete', description: '删除角色', module: 'role', action: 'delete' },
      { name: 'log:view', description: '查看日志', module: 'log', action: 'view' },
      { name: 'billing:view', description: '查看账单', module: 'billing', action: 'view' },
      { name: 'billing:manage', description: '管理计费', module: 'billing', action: 'manage' },
      { name: 'price:view', description: '查看价格', module: 'price', action: 'view' },
      { name: 'price:edit', description: '编辑价格', module: 'price', action: 'edit' },
      { name: 'system:config', description: '系统配置', module: 'system', action: 'config' },
      { name: 'work:review', description: '审核作品', module: 'work', action: 'review' },
      { name: 'export:data', description: '导出数据', module: 'export', action: 'data' },
      { name: 'backup:manage', description: '管理备份', module: 'backup', action: 'manage' },
      { name: 'health:view', description: '查看健康', module: 'health', action: 'view' },
      { name: 'notification:manage', description: '管理通知', module: 'notification', action: 'manage' },
      { name: 'order:view', description: '查看订单', module: 'order', action: 'view' },
      { name: 'model:view', description: '查看模型', module: 'model', action: 'view' },
      { name: 'model:create', description: '创建模型', module: 'model', action: 'create' },
      { name: 'model:edit', description: '编辑模型', module: 'model', action: 'edit' },
      { name: 'model:delete', description: '删除模型', module: 'model', action: 'delete' },
    ];

    const insertPerm = db.prepare(
      'INSERT INTO permissions (name, description, module, action) VALUES (?, ?, ?, ?)'
    );
    const insertPermMany = db.transaction((perms: typeof permissions) => {
      for (const p of perms) {
        insertPerm.run(p.name, p.description, p.module, p.action);
      }
    });
    insertPermMany(permissions);

    const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
    if (roleCount.count === 0) {
      const insertRole = db.prepare(
        'INSERT INTO roles (name, description) VALUES (?, ?)'
      );
      const adminRoleId = insertRole.run('admin', '系统管理员，拥有所有权限').lastInsertRowid;
      insertRole.run('user', '普通用户，基础使用权限');
      const vipRoleId = insertRole.run('vip', 'VIP用户，高级功能权限').lastInsertRowid;

      const allPerms = db.prepare('SELECT id FROM permissions').all() as { id: number }[];
      const insertRolePerm = db.prepare(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
      );
      const insertRolePermMany = db.transaction((roleId: number | bigint, perms: { id: number }[]) => {
        for (const p of perms) {
          insertRolePerm.run(roleId, p.id);
        }
      });
      insertRolePermMany(adminRoleId, allPerms);

      const userPerms = db.prepare(
        "SELECT id FROM permissions WHERE name IN ('user:view')"
      ).all() as { id: number }[];
      const userId = db.prepare("SELECT id FROM roles WHERE name = 'user'").get() as { id: number };
      insertRolePermMany(userId.id, userPerms);

      const vipPerms = db.prepare(
        "SELECT id FROM permissions WHERE name IN ('user:view', 'billing:view')"
      ).all() as { id: number }[];
      insertRolePermMany(vipRoleId, vipPerms);
    }

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count === 0) {
      const adminRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get() as { id: number };
      const defaultAdminPwd = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456';
      const passwordHash = bcrypt.hashSync(defaultAdminPwd, 10);
      db.prepare(`
        INSERT INTO users (username, email, password_hash, nickname, role_id, status, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('admin', 'admin@2pix.ai', passwordHash, '系统管理员', adminRole.id, 'active', 99999);
    }

    const priceCount = db.prepare('SELECT COUNT(*) as count FROM token_prices').get() as { count: number };
    if (priceCount.count === 0) {
      const prices = [
        { model: 'gpt-5.5', model_name: 'GPT-5.5', category: 'chat', input_price: 0.01, output_price: 0.03, cost_multiplier: 0.6 },
        { model: 'gpt-image-2', model_name: 'GPT Image 2', category: 'image', input_price: 0.04, output_price: 0.04, cost_multiplier: 0.5 },
        { model: 'sora-2', model_name: 'Sora 2', category: 'video', input_price: 0.5, output_price: 0.5, cost_multiplier: 0.4 },
        { model: 'suno-v4', model_name: 'Suno V4.5', category: 'audio', input_price: 0.1, output_price: 0.1, cost_multiplier: 0.5 },
        { model: 'claude-opus', model_name: 'Claude Opus', category: 'chat', input_price: 0.015, output_price: 0.075, cost_multiplier: 0.6 },
        { model: 'gemini-3-pro', model_name: 'Gemini 3 Pro', category: 'chat', input_price: 0.005, output_price: 0.015, cost_multiplier: 0.5 },
      ];
      const insertPrice = db.prepare(`
        INSERT INTO token_prices (model, model_name, category, input_price, output_price, cost_multiplier)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertPriceMany = db.transaction((priceList: typeof prices) => {
        for (const p of priceList) {
          insertPrice.run(p.model, p.model_name, p.category, p.input_price, p.output_price, p.cost_multiplier);
        }
      });
      insertPriceMany(prices);
    }

    // 为已有数据库补充新增的细粒度权限
    const newPermissions = [
      { name: 'work:review', description: '审核作品', module: 'work', action: 'review' },
      { name: 'export:data', description: '导出数据', module: 'export', action: 'data' },
      { name: 'backup:manage', description: '管理备份', module: 'backup', action: 'manage' },
      { name: 'health:view', description: '查看健康', module: 'health', action: 'view' },
      { name: 'notification:manage', description: '管理通知', module: 'notification', action: 'manage' },
      { name: 'order:view', description: '查看订单', module: 'order', action: 'view' },
      { name: 'model:view', description: '查看模型', module: 'model', action: 'view' },
      { name: 'model:create', description: '创建模型', module: 'model', action: 'create' },
      { name: 'model:edit', description: '编辑模型', module: 'model', action: 'edit' },
      { name: 'model:delete', description: '删除模型', module: 'model', action: 'delete' },
    ];
    const insertOrIgnorePerm = db.prepare(
      'INSERT OR IGNORE INTO permissions (name, description, module, action) VALUES (?, ?, ?, ?)'
    );
    for (const p of newPermissions) {
      insertOrIgnorePerm.run(p.name, p.description, p.module, p.action);
    }

    // 种子数据：AI 模型列表
    const modelCount = db.prepare('SELECT COUNT(*) as count FROM ai_models').get() as { count: number };
    if (modelCount.count === 0) {
      const seedModels = [
        { id: 'multi-model-collab', name: '多模型协作', description: '多个模型并行回答问题，最终由一个模型统一总结，给你更全面、更可靠的答案。', icon: '🤝', category: 'chat', sort_order: 0, is_new: 0, is_hot: 0 },
        { id: 'gpt-5.5', name: 'GPT-5.5', description: 'OpenAI 最新一代大语言模型，推理能力与创意表现全面提升。', icon: '🟢', category: 'chat', sort_order: 1, is_new: 0, is_hot: 1 },
        { id: 'gpt-4o', name: 'GPT-4o', description: '多模态大模型，支持文本、图像、语音的理解与生成。', icon: '🟢', category: 'chat', sort_order: 2, is_new: 0, is_hot: 0 },
        { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: '轻量级多模态模型，速度更快，性价比更高。', icon: '🟢', category: 'chat', sort_order: 3, is_new: 0, is_hot: 0 },
        { id: 'claude-opus', name: 'Claude 3.7 Opus', description: 'Anthropic 旗舰模型，长文本理解与深度思考能力卓越。', icon: '🟠', category: 'chat', sort_order: 4, is_new: 1, is_hot: 0 },
        { id: 'claude-sonnet', name: 'Claude 3.7 Sonnet', description: '平衡性能与速度的智能模型，适合大多数日常任务。', icon: '🟠', category: 'chat', sort_order: 5, is_new: 0, is_hot: 0 },
        { id: 'gemini-3-pro', name: 'Gemini 3 Pro', description: 'Google 最新多模态模型，原生支持视频理解与生成。', icon: '🔵', category: 'chat', sort_order: 6, is_new: 1, is_hot: 0 },
        { id: 'gemini-flash', name: 'Gemini 3 Flash', description: '高速响应的轻量模型，适合实时交互场景。', icon: '🔵', category: 'chat', sort_order: 7, is_new: 0, is_hot: 0 },
        { id: 'grok-3', name: 'Grok 3', description: 'xAI 旗舰模型，实时联网搜索，数学与推理能力出色。', icon: '⚫', category: 'chat', sort_order: 8, is_new: 0, is_hot: 1 },
        { id: 'deepseek-v3', name: 'DeepSeek V3', description: '深度求索最新开源模型，中文理解能力优秀。', icon: '🔷', category: 'chat', sort_order: 9, is_new: 0, is_hot: 0 },
        { id: 'deepseek-r1', name: 'DeepSeek R1', description: '推理增强模型，复杂数学与逻辑问题表现突出。', icon: '🔷', category: 'chat', sort_order: 10, is_new: 1, is_hot: 0 },
        { id: 'qwen-3.7', name: '通义千问 3.7', description: '阿里巴巴最新大模型，中文能力强，支持超长上下文。', icon: '🦋', category: 'chat', sort_order: 11, is_new: 0, is_hot: 0 },
        { id: 'glm-5.2', name: 'GLM-5.2', description: '智谱 AI 最新模型，代码生成与创意写作俱佳。', icon: '🌟', category: 'chat', sort_order: 12, is_new: 0, is_hot: 0 },
        { id: 'kimi-k2', name: 'Kimi K2', description: '月之暗面最新模型，超长上下文支持 200 万字。', icon: '🌙', category: 'chat', sort_order: 13, is_new: 0, is_hot: 0 },
        { id: 'doubao-pro', name: '豆包 Pro', description: '字节跳动最新大模型，创意生成与对话体验优秀。', icon: '🫘', category: 'chat', sort_order: 14, is_new: 0, is_hot: 0 },
        { id: 'gpt-image-2', name: 'GPT Image 2', description: 'OpenAI 最新一代图像生成模型，语义理解与细节表现更强，支持文生图与图生图。', icon: '🟢', category: 'image', sort_order: 0, is_new: 0, is_hot: 1 },
        { id: 'midjourney-v7', name: 'Midjourney V7', description: '业界顶尖的图像生成模型，艺术风格表现卓越，适合创意设计。', icon: '🎨', category: 'image', sort_order: 1, is_new: 0, is_hot: 0 },
        { id: 'flux-1-pro', name: 'FLUX 1 Pro', description: 'Black Forest Labs 旗舰模型，真实感与细节表现力惊人。', icon: '⚡', category: 'image', sort_order: 2, is_new: 1, is_hot: 1 },
        { id: 'flux-dev', name: 'FLUX 1 Dev', description: 'FLUX 开发者版本，开源可微调，社区生态丰富。', icon: '⚡', category: 'image', sort_order: 3, is_new: 0, is_hot: 0 },
        { id: 'nano-banana', name: 'Nano Banana', description: '快速高质量图像生成，专为电商和产品图优化。', icon: '🍌', category: 'image', sort_order: 4, is_new: 1, is_hot: 0 },
        { id: 'seedream-5', name: 'Seedream 5.0', description: '腾讯最新图像生成模型，中文理解出色。', icon: '🌙', category: 'image', sort_order: 5, is_new: 0, is_hot: 0 },
        { id: 'jimeng-3', name: '即梦 3.0', description: '字节跳动图像生成模型，风格多样，创意十足。', icon: '💫', category: 'image', sort_order: 6, is_new: 0, is_hot: 0 },
        { id: 'wan-2.1', name: 'Wan 2.1', description: '阿里巴巴最新图像生成模型，支持多种风格。', icon: '🦋', category: 'image', sort_order: 7, is_new: 0, is_hot: 0 },
        { id: 'hunyuan-image', name: '混元图像', description: '腾讯混元图像生成模型，中文提示词理解精准。', icon: '🔮', category: 'image', sort_order: 8, is_new: 0, is_hot: 0 },
        { id: 'stable-diffusion-3', name: 'Stable Diffusion 3', description: 'Stability AI 最新开源模型，社区生态最丰富。', icon: '🟣', category: 'image', sort_order: 9, is_new: 0, is_hot: 0 },
        { id: 'dall-e-3', name: 'DALL·E 3', description: 'OpenAI 经典图像生成模型，语义理解准确。', icon: '🟢', category: 'image', sort_order: 10, is_new: 0, is_hot: 0 },
        { id: 'sora-2', name: 'Sora 2', description: 'OpenAI 最新视频生成模型，电影级画质，支持复杂场景与长视频生成。', icon: '🟢', category: 'video', sort_order: 0, is_new: 1, is_hot: 1 },
        { id: 'veo-3.1', name: 'Veo 3.1', description: 'Google 视频生成旗舰模型，4K 分辨率，电影级运镜。', icon: '🔵', category: 'video', sort_order: 1, is_new: 0, is_hot: 0 },
        { id: 'kling-3', name: '可灵 3.0', description: '快手最新视频生成模型，中文理解出色，人物表现优秀。', icon: '🎬', category: 'video', sort_order: 2, is_new: 0, is_hot: 1 },
        { id: 'grok-video', name: 'Grok Video', description: 'xAI 视频生成模型，实时风格，速度极快。', icon: '⚫', category: 'video', sort_order: 3, is_new: 1, is_hot: 0 },
        { id: 'luma-dream', name: 'Luma Dream Machine', description: 'Luma AI 旗舰视频模型，3D 运镜效果卓越。', icon: '💫', category: 'video', sort_order: 4, is_new: 0, is_hot: 0 },
        { id: 'runway-gen3', name: 'Runway Gen-3', description: 'Runway 最新视频生成模型，专业级影视制作工具。', icon: '🎥', category: 'video', sort_order: 5, is_new: 0, is_hot: 0 },
        { id: 'vidu-q3', name: 'Vidu Q3', description: '生数科技最新视频模型，角色一致性出色。', icon: '🎞️', category: 'video', sort_order: 6, is_new: 0, is_hot: 0 },
        { id: 'seedance', name: 'Seedance', description: '腾讯视频生成模型，舞蹈动作精准还原。', icon: '💃', category: 'video', sort_order: 7, is_new: 0, is_hot: 0 },
        { id: 'hailuo-video', name: '海螺 AI 视频', description: 'MiniMax 视频生成模型，支持超长视频。', icon: '🐚', category: 'video', sort_order: 8, is_new: 0, is_hot: 0 },
        { id: 'pixverse-v3', name: 'PixVerse V3', description: '爱诗科技视频模型，风格化视频表现出色。', icon: '✨', category: 'video', sort_order: 9, is_new: 0, is_hot: 0 },
        { id: 'suno-v4-5', name: 'Suno V4.5', description: '业界领先的 AI 音乐生成模型，支持多种风格，高质量作曲与演唱。', icon: '🎵', category: 'audio', sort_order: 0, is_new: 0, is_hot: 1 },
        { id: 'suno-v3', name: 'Suno V3', description: '经典音乐生成模型，稳定可靠，风格多样。', icon: '🎵', category: 'audio', sort_order: 1, is_new: 0, is_hot: 0 },
        { id: 'hailuo-music', name: '海螺音乐', description: 'MiniMax 音乐生成模型，中文歌曲表现优秀。', icon: '🐚', category: 'audio', sort_order: 2, is_new: 0, is_hot: 0 },
        { id: 'gemini-tts', name: 'Gemini 3.1 TTS', description: 'Google 最新语音合成模型，多语言多音色，自然度极高。', icon: '🔵', category: 'audio', sort_order: 3, is_new: 1, is_hot: 0 },
        { id: 'elevenlabs-v3', name: 'ElevenLabs V3', description: '顶级语音合成模型，声音克隆与情感表现卓越。', icon: '🎙️', category: 'audio', sort_order: 4, is_new: 0, is_hot: 0 },
        { id: 'openai-tts', name: 'OpenAI TTS', description: 'OpenAI 文字转语音，自然流畅，支持多种音色。', icon: '🟢', category: 'audio', sort_order: 5, is_new: 0, is_hot: 0 },
        { id: 'fish-speech', name: 'Fish Speech', description: '开源语音合成模型，中文效果优秀，可本地部署。', icon: '🐟', category: 'audio', sort_order: 6, is_new: 0, is_hot: 0 },
        { id: 'edge-tts', name: 'Edge TTS', description: '微软语音合成，多语言多方言，稳定免费。', icon: '💙', category: 'audio', sort_order: 7, is_new: 0, is_hot: 0 },
        { id: 'doubao-tts', name: '豆包语音', description: '字节跳动语音合成，音色丰富，情感表现力强。', icon: '🫘', category: 'audio', sort_order: 8, is_new: 0, is_hot: 0 },
        { id: 'xfyun-tts', name: '讯飞语音', description: '科大讯飞语音合成，中文发音标准，支持多方言。', icon: '🎤', category: 'audio', sort_order: 9, is_new: 0, is_hot: 0 },
      ];

      const insertModel = db.prepare(`
        INSERT INTO ai_models (id, name, description, icon, category, sort_order, is_new, is_hot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertModelMany = db.transaction((modelList: typeof seedModels) => {
        for (const m of modelList) {
          insertModel.run(m.id, m.name, m.description, m.icon, m.category, m.sort_order, m.is_new, m.is_hot);
        }
      });
      insertModelMany(seedModels);
    }
  }

  seedDefaultPlans();

  console.log('Database initialized successfully');
}

export default initDatabase;
