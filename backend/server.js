// server.js (수정)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

// --- 기존 라우트 임포트 ---
const authRoutes = require('./routes/auth.js');
const certificationRoutes = require('./routes/certification.js');
const depositRoutes = require('./routes/deposit.js');
const completionRoutes = require('./routes/completion.js');
const adminRoutes = require('./routes/admin.js');
const externalApiRoutes = require('./routes/external_api.js');
const proxyRoutes = require('./routes/proxy.js');
const passRouter = require('./routes/pass_auth');
const systemRouter = require('./routes/systems'); 

// --- 새로운 카메라 라우트 및 WebSocket 초기화 함수 임포트 ---
const { router: cameraRoutes, initializeWebSocket } = require('./routes/camera.js');

require('./db/database.js');

const app = express();
const PORT = 8080;

// --- 미들웨어 설정 ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 정적 파일 서빙 경로 추가 ---
app.use('/uploads', express.static('uploads')); 
app.use('/captures', express.static(path.join(__dirname, 'captures'))); // 👈 [추가] HIKVISION 카메라 캡처 이미지 경로

// --- 라우트 연결 ---
app.use('/api/auth', authRoutes);
app.use('/api/certification', certificationRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/completion', completionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1', externalApiRoutes);
app.use('/api/v1/proxy', proxyRoutes);
app.use('/api/camera', cameraRoutes); // 👈 [추가] 새로운 카메라 API 라우트
app.use('/api/pass', passRouter);
app.use('/api/system', systemRouter);

// --- 서버 생성 및 WebSocket 초기화 ---
const server = http.createServer(app);
initializeWebSocket(server); // 👈 [추가] WebSocket 서버 시작

// --- 서버 실행 ---
server.listen(PORT, () => {
    console.log(`🚀 로컬 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`📹 웹소켓 카메라 스트림은 ws://localhost:${PORT}/ws/camera-stream?device-index=0 에서 사용 가능합니다.`);
});