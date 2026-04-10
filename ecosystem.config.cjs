module.exports = {
  apps: [
    {
      name: 'trace-scope-api',
      cwd: './apps/api',
      script: './dist/main.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '.env.production',
      },
    },
  ],
};
