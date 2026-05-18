// routes/systems.js
// ★ [수정] 폐자망 키오스크 - 화면 오류 자동 발생 방지를 위해 heartbeat / 알람 감시 임시 중단
//        → 프론트엔드에서 65초 무응답 시 발송되던 "화면 꺼짐" 이메일 알림 OFF
//        → /hw/status 도 강제 에러 모두 false 반환 (오류 팝업 안 뜸)
//        → 실서비스 안정화되면 USE_SYSTEM_MONITORING = true 로만 바꿔주면 원복

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const plc = require('../utils/plcController');

// =========================================================
//  ★ 전체 ON/OFF 스위치 (true 로 바꾸면 기존 감시 동작 그대로)
// =========================================================
const USE_SYSTEM_MONITORING = false;

// 1. 하드웨어 상태 데이터 (테스트용 강제 에러 저장소)
let currentTestAlarms = {
    "83": false, "85": false, "87": false, "88": false,
    "97": false, "99": false, "104": false, "105": false
};

// =========================================================
// 프론트엔드 생존 신고 (Heartbeat) 감시 로직 - 감시 중단 가능하게
// =========================================================
let lastFrontendHeartbeat = Date.now();
let isFrontendDown = false;

// 프론트엔드가 10초마다 찌르는 API (정상 응답은 유지 - 프론트에서 호출 중)
router.post('/heartbeat', (req, res) => {
    lastFrontendHeartbeat = Date.now();
    if (isFrontendDown) {
        console.log("🎊 [System] 프론트엔드(화면) 연결 복구 완료!");
        isFrontendDown = false;
    }
    res.status(200).send('Alive');
});

// ★ 감시 타이머는 USE_SYSTEM_MONITORING = true 일 때만 동작
if (USE_SYSTEM_MONITORING) {
    setInterval(async () => {
        const elapsedSeconds = Math.floor((Date.now() - lastFrontendHeartbeat) / 1000);
        if (elapsedSeconds >= 65 && !isFrontendDown) {
            console.log(`🚨 [System] 프론트엔드(화면) 통신 단절 (${elapsedSeconds}초 경과)! 비상 메일 발송`);
            isFrontendDown = true;
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: { user: 'dksldsk@gmail.com', pass: 'zybrxlwtjblnttpq' }
                });
                const mailOptions = {
                    from: 'dksldsk@gmail.com',
                    to: 'dksldsk@naver.com',
                    subject: `🚨 [시스템 알림] 무인반납기(BUSAN-001) 화면(프론트엔드) 꺼짐 발생`,
                    html: `<div><h2>키오스크 화면 종료 감지</h2>
                           <p>최종 생존 신고: ${new Date(lastFrontendHeartbeat).toLocaleString()}</p></div>`
                };
                await transporter.sendMail(mailOptions);
                console.log("=> 📧 프론트엔드 장애 이메일 발송 완료!");
            } catch (err) {
                console.error("❌ 프론트엔드 장애 이메일 발송 실패:", err.message);
            }
        }
    }, 5000);
} else {
    console.log("ℹ️  [System] USE_SYSTEM_MONITORING=false → heartbeat 감시 / 장애 메일 OFF (폐자망 키오스크)");
}

// =========================================================
// 프론트엔드 상태 모니터링 API
// =========================================================
router.get('/hw/status', async (req, res) => {
    // ★ 모니터링 OFF 모드: 무조건 정상(false) 상태로만 응답해 화면 오류 팝업 차단
    if (!USE_SYSTEM_MONITORING) {
        return res.status(200).json({
            "83": false, "85": false, "87": false, "88": false,
            "97": false, "99": false, "104": false, "105": false
        });
    }

    try {
        let alarms = await plc.getAlarmStatus();
        for (const key in currentTestAlarms) {
            if (currentTestAlarms[key] === true) alarms[key] = true;
        }
        res.status(200).json(alarms);
    } catch (error) {
        console.error("PLC 상태 읽기 실패:", error.message);
        // 실패해도 화면 오류는 안 띄움
        res.status(200).json({
            "83": false, "85": false, "87": false, "88": false,
            "97": false, "99": false, "104": false, "105": false
        });
    }
});

// =========================================================
// 에러 리포트 이메일 발송 API (수동 신고는 그대로 유지)
// =========================================================
router.post('/error-report', async (req, res) => {
    if (!USE_SYSTEM_MONITORING) {
        // 모니터링 OFF 시: 메일은 안 보내고 로그만 남기고 정상응답
        console.log("ℹ️  [System] error-report 수신 (메일 발송 OFF):", req.body);
        return res.status(200).json({ status: 'SUCCESS', skipped: true });
    }

    try {
        const { kioskId, location, time, errorDetails } = req.body;
        const remoteDesktopLink = "https://remotedesktop.google.com/access";
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        const mailOptions = {
            from: 'dksldsk@gmail.com',
            to: 'dksldsk@naver.com',
            subject: `🚨 [긴급] 무인 키오스크 시스템 오류 알림 (${kioskId || 'GILLNET-001'})`,
            html: `<div>키오스크 오류 신고: ${errorDetails}</div>`
        };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ status: 'SUCCESS' });
    } catch (error) {
        res.status(500).json({ status: 'FAILURE', message: error.message });
    }
});

// =========================================================
// 관리자용 시뮬레이션 테스트 API (그대로 유지)
// =========================================================
router.get('/test/clear', (req, res) => {
    for (const key in currentTestAlarms) currentTestAlarms[key] = false;
    res.send("✅ 모든 테스트용 강제 에러가 초기화되었습니다.");
});

router.get('/test/:id', (req, res) => {
    const errorId = req.params.id;
    if (currentTestAlarms[errorId] !== undefined) {
        currentTestAlarms[errorId] = true;
        res.send(`🚨 ${errorId}번 에러 강제 발생 성공!`);
    } else {
        res.send(`❌ ${errorId}번은 등록되지 않은 에러 코드입니다.`);
    }
});

module.exports = router;