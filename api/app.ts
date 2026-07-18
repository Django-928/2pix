import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import swaggerSpec from './swagger.js'
import initDatabase from './db/init.js'
import db from './db/index.js'
import { initCleanupService } from './services/cleanupService.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import authRoutes from './routes/auth.js'
import accountRoutes from './routes/account.js'
import systemRoutes from './routes/system.js'
import paymentRoutes from './routes/payment.js'
import billingRoutes from './routes/billing.js'
import imageRoutes from './routes/image.js'
import videoRoutes from './routes/video.js'
import audioRoutes from './routes/audio.js'
import chatRoutes from './routes/chat.js'
import canvasRoutes from './routes/canvas.js'
import worksRoutes from './routes/works.js'
import notificationRoutes from './routes/notifications.js'
import redeemRoutes from './routes/redeem.js'
import membershipPlanRoutes from './routes/membershipPlans.js'
import adminUsersRoutes from './routes/admin/users.js'
import adminRolesRoutes from './routes/admin/roles.js'
import adminLogsRoutes from './routes/admin/logs.js'
import adminBillingRoutes from './routes/admin/billing.js'
import adminImportExportRoutes from './routes/admin/importExport.js'
import adminConfigsRoutes from './routes/admin/configs.js'
import adminNotificationRoutes from './routes/admin/notifications.js'
import adminWorksRoutes from './routes/admin/works.js'
import adminBackupsRoutes from './routes/admin/backups.js'
import adminHealthRoutes from './routes/admin/health.js'
import adminRedeemCodesRoutes from './routes/admin/redeemCodes.js'
import adminRefundsRoutes from './routes/admin/refunds.js'
import adminMembershipPlansRoutes from './routes/admin/membershipPlans.js'
import adminModelsRoutes, { publicRouter as publicModelsRoutes } from './routes/admin/models.js'
import pricingRoutes from './routes/pricing.js'
import kieCallbackRoutes from './routes/kieCallback.js'
import kieTaskRoutes from './routes/kieTasks.js'

dotenv.config()

initDatabase()
initCleanupService(db)

const app: express.Application = express()

// ========== 信任代理（Nginx 反向代理必需） ==========
app.set('trust proxy', 1) // 信任第一层代理

// ========== CORS 配置 ==========
const CORS_ORIGINS = process.env.CORS_ORIGINS
if (CORS_ORIGINS) {
  const allowedOrigins = CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  app.use(cors({
    origin: (origin, callback) => {
      // 允许无 origin 的请求（如服务端调用、Postman）
      if (!origin) {
        callback(null, true)
        return
      }
      // 精确匹配
      if (allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      // 支持子域名匹配（如 .2pix.cn 匹配 www.2pix.cn, app.2pix.cn）
      try {
        const url = new URL(origin)
        const rootDomain = allowedOrigins.some((allowed) => {
          try {
            return url.hostname.endsWith(new URL(allowed).hostname.replace(/^\*\./, '.'))
          } catch {
            return false
          }
        })
        if (rootDomain) {
          callback(null, true)
          return
        }
      } catch {
        // ignore URL parse errors
      }
      console.warn(`[CORS] Blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }))
} else {
  // 开发环境允许所有来源
  app.use(cors({
    origin: true,
    credentials: true,
  }))
}

// ========== 全局限流（所有 API 接口） ==========
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 分钟窗口
  max: 120,                   // 每分钟最多 120 个请求
  message: { success: false, error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 跳过健康检查和KIE任务轮询（轮询频率高但每请求开销低）
    return req.path === '/api/health' || req.path.startsWith('/api/kie/tasks/')
  },
})

// ========== 安全响应头 ==========
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  // 隐藏 Express 和 Node 版本信息
  res.removeHeader('X-Powered-By')
  next()
})

// ========== 请求体大小限制 ==========
app.use(express.json({ limit: '10mb' }))  // 从 50mb 降到 10mb，减少内存压力
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ========== 全局限流中间件 ==========
app.use('/api/', globalLimiter)

// ========== Swagger API 文档（仅非生产环境） ==========
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}

// ========== 敏感接口差异化限流 ==========
// 支付相关：每分钟 10 次
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: '支付操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 内容生成（图片/视频/音频）：每分钟 20 次
const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: '生成请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 聊天接口：每分钟 30 次
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: '聊天请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 导出接口：每分钟 3 次（消耗较大）
const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { success: false, error: '导出请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ========== 路由挂载 ==========
app.use('/api/auth', authRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/account', accountRoutes)
app.use('/api/payment', paymentLimiter, paymentRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/image', generationLimiter, imageRoutes)
app.use('/api/video', generationLimiter, videoRoutes)
app.use('/api/audio', generationLimiter, audioRoutes)
app.use('/api/chat', chatLimiter, chatRoutes)
app.use('/api/canvas', canvasRoutes)
app.use('/api/works', worksRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/redeem', redeemRoutes)
app.use('/api/membership-plans', membershipPlanRoutes)
app.use('/api/admin/users', adminUsersRoutes)
app.use('/api/admin/roles', adminRolesRoutes)
app.use('/api/admin/logs', adminLogsRoutes)
app.use('/api/admin/billing', adminBillingRoutes)
app.use('/api/admin/ie', exportLimiter, adminImportExportRoutes)
app.use('/api/admin/configs', adminConfigsRoutes)
app.use('/api/admin/notifications', adminNotificationRoutes)
app.use('/api/admin/works', adminWorksRoutes)
app.use('/api/admin/backups', adminBackupsRoutes)
app.use('/api/admin/health', adminHealthRoutes)
app.use('/api/admin/redeem-codes', adminRedeemCodesRoutes)
app.use('/api/admin/refunds', adminRefundsRoutes)
app.use('/api/admin/membership-plans', adminMembershipPlansRoutes)
app.use('/api/admin/models', adminModelsRoutes)
app.use('/api/models', publicModelsRoutes)
app.use('/api/pricing', pricingRoutes)
app.use('/api/kie', kieCallbackRoutes)
app.use('/api/kie', kieTaskRoutes)

// ========== 健康检查 ==========
app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    void req
    res.status(200).json({
      success: true,
      message: 'ok',
      timestamp: new Date().toISOString(),
    })
  },
)

// ========== 全局错误处理 ==========
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  void req
  void next
  console.error('[Unhandled Error]', new Date().toISOString(), error.message || error)
  // 不向客户端暴露内部错误详情
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
  })
})

// ========== 视频文件服务 ==========
// 优先从 dist/videos 提供（Vite构建时从public/复制），兜底到项目 public/videos
const distVideoPath = path.resolve(__dirname, '../dist/videos');
const projectVideoPath = path.resolve(__dirname, '../public/videos');
const legacyVideoPath = '/www/sites/www.2pix.cn/index/videos';

// /api/videos 路径（前端通过 /api/videos/bg.mp4 请求，确保被 proxy_pass 转发到 Node.js）
const videoStaticDir = fs.existsSync(distVideoPath) ? distVideoPath
  : fs.existsSync(projectVideoPath) ? projectVideoPath
  : null;
if (videoStaticDir) {
  app.use('/api/videos', express.static(videoStaticDir));
}

// /videos 路径（直接访问）
if (fs.existsSync(distVideoPath)) {
  app.use('/videos', express.static(distVideoPath));
} else if (fs.existsSync(projectVideoPath)) {
  app.use('/videos', express.static(projectVideoPath));
} else if (fs.existsSync(legacyVideoPath)) {
  app.use('/videos', express.static(legacyVideoPath));
}

// ========== 静态文件服务（前端构建产物）==========
const distPath = path.resolve(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // SPA fallback: 所有非 API 请求返回 index.html
  app.get('*', (req: Request, res: Response, _next: NextFunction) => {
    if (req.path.startsWith('/api/')) return _next()
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ========== 404 处理 ==========
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
  })
})

export default app
