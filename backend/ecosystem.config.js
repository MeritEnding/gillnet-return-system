module.exports = {
  apps: [
    {
      name: "kiosk-backend",
      script: "./server.js",
      instances: 1,
      autorestart: true,
      watch: true,  // 파일 변경 감지 켜기
      ignore_watch: [ // ★ 중요: 이 폴더들이 변해도 재시작 하지 않음
        "node_modules",
        "uploads",
        "captures",
        "logs",
        "*.log",
        ".git"
      ],
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 8080
      }
    }
  ]
};