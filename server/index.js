const express = require('express');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { setupSocketHandlers } = require('./gameLogic');

// 필수 환경변수 검증
if (!process.env.TEACHER_PIN) {
  console.error('FATAL: TEACHER_PIN 환경변수가 설정되지 않았습니다.');
  console.error('  .env 파일에 TEACHER_PIN=<비밀번호> 를 추가하세요.');
  process.exit(1);
}

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  }
});

setupSocketHandlers(io);

// Serve static React build files in production
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO Server listening on port ${PORT}`);
});
