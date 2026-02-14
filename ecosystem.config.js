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
          script: 'src/games/luckywheel/test.js',
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
    },
    {
      name: 'topix99-quiz',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        MODE: 'quiz'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/quiz-err.log',
      out_file: './logs/quiz-out.log',
      log_file: './logs/quiz-combined.log',
      time: true,
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000
    },
    {
      name: 'topix99-quiz-test',
      script: 'src/games/quiz/test.js',
      env: {
        NODE_ENV: 'development',
        MODE: 'quiz',
        TEST_MODE: 'true'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/quiz-test-err.log',
      out_file: './logs/quiz-test-out.log',
      log_file: './logs/quiz-test-combined.log',
      time: true,
      merge_logs: true,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 10000
    }
  ]
};
