// 2PIX PM2 配置
// 适用于 2核2G 香港服务器
//
// 使用方法：
// 1. pm2 start deploy/ecosystem.config.cjs
// 2. pm2 save
// 3. pm2 startup  // 设置开机自启

module.exports = {
  apps: [
    {
      name: '2pix',
      script: 'api/server.ts',
      // 使用 tsx 直接运行 TS（开发部署过渡方案）
      // 生产环境建议先 tsc 编译再用 node 运行
      interpreter: 'tsx',
      cwd: '/opt/2pix',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // 2G 服务器内存限制
      max_memory_restart: '400M',
      // 实例数：2核用 1 个实例即可（SQLite 单进程）
      instances: 1,
      exec_mode: 'fork',
      // 日志管理
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/opt/2pix/logs/error.log',
      out_file: '/opt/2pix/logs/out.log',
      merge_logs: true,
      // 日志文件大小限制（避免磁盘打满）
      log_file_size: '10M',
      log_rotate: true,
      max_restarts: 10,
      restart_delay: 3000,
      // 自动重启间隔控制
      min_uptime: '10s',
      // 监听文件变化（生产环境关闭）
      watch: false,
    },
  ],
};
