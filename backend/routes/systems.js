// routes/systems.js

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const plc = require('../utils/plcController');

// 1. 하드웨어 상태 데이터 (테스트용 강제 에러 저장소)
// ★ 키값을 우리가 사용할 0base 주소로 업데이트했습니다.
let currentTestAlarms = {
    "83": false, "85": false, "87": false, "88": false,
    "97": false, "99": false, "104": false, "105": false
};

// =========================================================
// ★ [신규 추가] 프론트엔드 생존 신고 (Heartbeat) 감시 로직
// =========================================================
let lastFrontendHeartbeat = Date.now();
let isFrontendDown = false;

// 프론트엔드가 10초마다 찌르는 API
router.post('/heartbeat', (req, res) => {
    lastFrontendHeartbeat = Date.now(); // 생존 시간 갱신!

    if (isFrontendDown) {
        console.log("🎊 [System] 프론트엔드(화면) 연결 복구 완료!");
        isFrontendDown = false;
    }
    res.status(200).send('Alive');
});

// 백엔드 스스로 5초마다 프론트엔드가 살아있는지 검사하는 타이머
setInterval(async () => {
    const elapsedSeconds = Math.floor((Date.now() - lastFrontendHeartbeat) / 1000);

    // 프론트엔드에서 65초 이상 연락이 없으면 죽은 것으로 판단
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
                // to: 'dksldsk@naver.com, dksldsk@ketg.mail.kakaowork.com, jch@fira.or.kr, jiseob@ketg.co.kr',
                to: 'dksldsk@naver.com',
                subject: `🚨 [시스템 알림] 무인반납기(BUSAN-001) 화면(프론트엔드) 꺼짐 발생`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2 style="color: #dc2626;">⚠️ 키오스크 화면(프로그램) 종료 감지</h2>
                        <p>관리자님, 키오스크의 메인 화면(React) 프로그램이 종료되었거나 PC가 멈춘 것으로 감지되었습니다.</p>
                        <p><strong>- 최종 생존 신고 시간:</strong> ${new Date(lastFrontendHeartbeat).toLocaleString()}</p>
                        <p>현장 점검이나 원격 데스크톱 접속을 통해 화면 프로그램(브라우저)이 정상적으로 켜져 있는지 확인해 주시기 바랍니다.</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log("=> 📧 프론트엔드 장애 이메일 발송 완료!");
        } catch (err) {
            console.error("❌ 프론트엔드 장애 이메일 발송 실패:", err.message);
        }
    }
}, 5000);
// =========================================================
// 프론트엔드 상태 모니터링 API
// =========================================================
router.get('/hw/status', async (req, res) => {
    try {
        // 1. 실제 PLC에서 상태 읽어오기
        let alarms = await plc.getAlarmStatus();

        // 2. ★ 테스트 모드 덮어쓰기: 만약 테스트 API로 강제 에러를 켰다면 그 값을 우선 적용
        for (const key in currentTestAlarms) {
            if (currentTestAlarms[key] === true) {
                alarms[key] = true;
            }
        }

        res.status(200).json(alarms);
    } catch (error) {
        console.error("PLC 상태 읽기 실패:", error.message);
        res.status(500).json({ status: 'FAILURE', message: 'PLC 통신 에러' });
    }
});

// =========================================================
// 에러 리포트 이메일 발송 API
// =========================================================
router.post('/error-report', async (req, res) => {
    try {
        const { kioskId, location, time, errorDetails } = req.body;
        const remoteDesktopLink = "https://remotedesktop.google.com/access";

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: 'dksldsk@gmail.com',
            to: 'dksldsk@naver.com, dksldsk@ketg.mail.kakaowork.com, jch@fira.or.kr, jiseob@ketg.co.kr',
            subject: `🚨 [긴급] 무인 키오스크 시스템 오류 알림 (${kioskId || 'BUSAN-001'})`,
            html: `
                <div style="font-family: 'Malgun Gothic', sans-serif; padding: 30px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px; margin: 0 auto; background-color: #fcfcfc;">
                    <h2 style="color: #d9534f; margin-top: 0;">⚠️ 시스템 자동/수동 오류 감지</h2>
                    <p style="font-size: 16px; color: #555;">키오스크 시스템에서 오류가 보고되어 원격 조치가 필요합니다.</p>
                    <div style="background-color: #fff; padding: 20px; border-radius: 8px; border: 1px solid #eee; margin: 20px 0;">
                        <ul style="line-height: 1.8; font-size: 15px; color: #333; margin: 0; padding-left: 20px;">
                            <li><b>기기 ID :</b> ${kioskId || 'BUSAN-001'}</li>
                            <li><b>설치 위치 :</b> ${location || '부산광역시 기장군 월전리 무인 반납 1호기'}</li>
                            <li><b>발생 시간 :</b> ${time || new Date().toLocaleString()}</li>
                            <li><b style="color: #d9534f;">오류 내용 :</b> ${errorDetails || '시스템 오류 신고 (수동/자동)'}</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${remoteDesktopLink}" target="_blank" style="background-color: #4285F4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            💻 구글 원격 데스크톱 접속하기
                        </a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">※ 본 메일은 키오스크 시스템에서 자동 발송되었습니다.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`=> 📧 이메일 전송 완료!`);
        res.status(200).json({ status: 'SUCCESS' });
    } catch (error) {
        console.error("=> 📧 이메일 전송 실패:", error.message);
        res.status(500).json({ status: 'FAILURE', message: error.message });
    }
});

// =========================================================
// 관리자용 시뮬레이션 테스트 API
// =========================================================
// 예: 브라우저 주소창에 http://localhost:8080/api/system/test/88 입력 시 '만재(전체)' 에러 강제 발생
// 1. [순서 변경] 구체적인 주소인 clear를 먼저 매칭하도록 위로 올립니다.
// 브라우저 주소창에 http://localhost:8080/api/system/test/clear 입력 시 강제 에러 해제
router.get('/test/clear', (req, res) => {
    for (const key in currentTestAlarms) {
        currentTestAlarms[key] = false;
    }
    res.send("✅ 모든 테스트용 강제 에러가 초기화되었습니다.");
});

// 2. [순서 변경] 동적 파라미터(:id)를 받는 주소를 아래로 내립니다.
// 예: 브라우저 주소창에 http://localhost:8080/api/system/test/88 입력 시 '만재(전체)' 에러 강제 발생
router.get('/test/:id', (req, res) => {
    const errorId = req.params.id;
    if (currentTestAlarms[errorId] !== undefined) {
        currentTestAlarms[errorId] = true;
        res.send(`🚨 ${errorId}번 에러 강제 발생 성공! 3초 뒤 프론트엔드 화면이 바뀝니다.`);
    } else {
        res.send(`❌ ${errorId}번은 등록되지 않은 에러 코드입니다.`);
    }
});

module.exports = router;