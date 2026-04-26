module.exports = {
  apps: [
    {
      name: 'myapp',
      script: 'server/index.js',
      cwd: '/home/appuser/The_app',
      instances: 1,
      exec_mode: 'fork',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      env_production: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '500M',
      error_file: '/home/appuser/.pm2/logs/myapp-error.log',
      out_file: '/home/appuser/.pm2/logs/myapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
