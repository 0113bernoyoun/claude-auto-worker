module.exports = {
  apps: [
    {
      name: 'claude-auto-worker',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        PORT: 5849,
        LOG_LEVEL: 'info',
        MEM_WATCH_INTERVAL_MS: 15000,
        MEM_WATCH_WARN_MB: 800,
        MEM_WATCH_RESTART_MB: 1024,
        MEM_WATCH_ACTION: 'exit',
      },
      max_memory_restart: '1100M',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      time: true,
    },
  ],
};


