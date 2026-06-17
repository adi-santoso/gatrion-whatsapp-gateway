export default {
  apps: [{
    name: 'whatsapp-gateway',
    script: './src/index.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    autorestart: true,
    watch: false,
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    }
  }]
};
