module.exports = {
  apps: [
    {
      name: 'topix99-luckywheel',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        MODE: 'luckywheel'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000
    },
    {
      name: 'topix99-luckywheel-test',
      script: 'test_luckywheel.js',
      env: {
        NODE_ENV: 'development',
        MODE: 'luckywheel',
        TEST_MODE: 'true'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/test-err.log',
      out_file: './logs/test-out.log',
      log_file: './logs/test-combined.log',
      time: true,
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000
    }
  ]
};
