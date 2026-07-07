import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '2PIX API 文档',
      version: '1.0.0',
      description: '2PIX AI 内容生成平台接口文档。包含用户认证、支付充值、内容生成、后台管理等模块。',
      contact: {
        name: '2PIX',
        email: 'admin@2pix.ai',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API 基础路径',
      },
    ],
    tags: [
      { name: '认证', description: '用户注册、登录、API Key 管理' },
      { name: '账户', description: '用户信息、余额、签到、邀请' },
      { name: '支付', description: '充值订单、支付回调' },
      { name: '计费', description: '账单、用量查询' },
      { name: '内容生成', description: '图片、视频、音频生成' },
      { name: '聊天', description: 'AI 对话' },
      { name: '作品', description: '用户作品查询' },
      { name: '通知', description: '站内通知、系统公告' },
      { name: '系统', description: '系统配置、首页数据' },
      { name: '后台-用户', description: '用户管理' },
      { name: '后台-角色', description: '角色权限管理' },
      { name: '后台-日志', description: '操作日志' },
      { name: '后台-计费', description: '订单、价格、用量管理' },
      { name: '后台-内容审核', description: '作品审核管理' },
      { name: '后台-通知', description: '系统通知管理' },
      { name: '后台-配置', description: '系统配置管理' },
      { name: '后台-导出', description: '数据导出' },
      { name: '后台-备份', description: '数据库备份管理' },
      { name: '后台-健康', description: '系统健康监控' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'JWT Token（登录后获取）',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
            error: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                list: { type: 'array', items: { type: 'object' } },
                total: { type: 'number', example: 100 },
                page: { type: 'number', example: 1 },
                pageSize: { type: 'number', example: 20 },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./api/routes/*.ts', './api/routes/**/*.ts'],
};

export default swaggerJsdoc(options);
