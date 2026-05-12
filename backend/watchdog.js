// watchdog.js
const axios = require('axios');
const nodemailer = require('nodemailer');

console.log("--------------------------------------------------");
console.log("🐕 [Watchdog] 듀얼 관제 시스템 스톱워치 모드 가동 중...");
console.log("📢 백엔드(8080) 또는 프론트엔드(3000) 통신 단절 65초 경과 시 비상벨을 울립니다.");
console.log("--------------------------------------------------");

// ★ 감시할 두 서버의 주소입니다. (프론트엔드 포트가 다르다면 3000 부분을 수정해 주세요)
const BACKEND_URL = 'http://127.0.0.1:8080/api/system/hw/status';
const FRONTEND_URL = 'http://127.0.0.1:3000'; 

let isBackendDown = false;
let isFrontendDown = false;

let lastBackendSuccess = Date.now();
let lastFrontendSuccess = Date.now();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'dksldsk@gmail.com',
        pass: 'zybrxlwtjblnttpq' 
    }
});

// ★ [신규] 이메일 발송용 공통 함수 (어느 서버가 죽었는지 매개변수로 받습니다)
const sendEmergencyEmail = (serverName) => {
    const mailOptions = {
        from: 'dksldsk@gmail.com',
        //to: 'dksldsk@naver.com, dksldsk@ketg.mail.kakaowork.com, jch@fira.or.kr, jiseob@ketg.co.kr',
        to: 'dksldsk@naver.com',
        subject: `[시스템 알림] 어구보증금 무인반납기(BUSAN-001) ${serverName} 장애 발생`,
        html: `
            <div style="max-width: 650px; margin: 0 auto; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background-color: #dc2626; padding: 25px 30px;">
                    <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">
                        시스템 ${serverName} 통신 장애 발생 안내
                    </h2>
                </div>
                <div style="padding: 35px 30px; background-color: #ffffff;">
                    <p style="margin: 0 0 20px; font-size: 16px; color: #1f2937; line-height: 1.6;">
                        관리자님, 안녕하십니까.<br>
                        어구보증금 무인반납기 관제 시스템에서 <strong>${serverName} 장기 오프라인(프로세스 다운)</strong>이 감지되었습니다.
                    </p>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #dc2626; padding: 25px; margin: 30px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #374151;">
                            <tr>
                                <td style="padding: 8px 0; width: 100px; font-weight: bold; color: #6b7280;">기기 ID</td>
                                <td style="padding: 8px 0; font-weight: bold; color: #111827;">BUSAN-001</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">장애 내용</td>
                                <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${serverName} 프로세스 다운 또는 통신 단절</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">발생 일시</td>
                                <td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString('ko-KR')}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
                        <a href="https://remotedesktop.google.com/access" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                            원격 데스크톱 접속 (Google)
                        </a>
                    </div>
                </div>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.error(`❌ ${serverName} 비상 메일 발송 실패:`, err);
        else console.log(`📧 관리자 비상 메일 발송 완료! (${serverName})`);
    });
};

// 5초 주기로 검사
setInterval(async () => {
    // -------------------------
    // 1. 백엔드 서버 상태 검사 (8080)
    // -------------------------
    try {
        await axios.get(BACKEND_URL, { timeout: 4000 });
        lastBackendSuccess = Date.now();
        if (isBackendDown) {
            console.log("🎊 [Watchdog] 백엔드 서버 복구 완료!");
            isBackendDown = false;
        }
    } catch (error) {
        if (error.response) { // 에러 코드가 와도 서버가 켜져 응답한 것이면 정상 간주
            lastBackendSuccess = Date.now();
            if (isBackendDown) isBackendDown = false;
        }
    }

    // -------------------------
    // 2. 프론트엔드 웹 서버 상태 검사 (3000)
    // -------------------------
    try {
        await axios.get(FRONTEND_URL, { timeout: 4000 });
        lastFrontendSuccess = Date.now();
        if (isFrontendDown) {
            console.log("🎊 [Watchdog] 프론트엔드 서버 복구 완료!");
            isFrontendDown = false;
        }
    } catch (error) {
        if (error.response) {
            lastFrontendSuccess = Date.now();
            if (isFrontendDown) isFrontendDown = false;
        }
    }

    // -------------------------
    // 3. 시간 초과 확인 및 이메일 발송
    // -------------------------
    const now = Date.now();
    const backendElapsed = Math.floor((now - lastBackendSuccess) / 1000);
    const frontendElapsed = Math.floor((now - lastFrontendSuccess) / 1000);

    if (backendElapsed >= 65 && !isBackendDown) {
        console.log("🚨 [Watchdog] 백엔드 서버 통신 단절 감지! 즉시 메일을 발송합니다.");
        isBackendDown = true;
        sendEmergencyEmail("백엔드 서버");
    }

    if (frontendElapsed >= 65 && !isFrontendDown) {
        console.log("🚨 [Watchdog] 프론트엔드 서버 통신 단절 감지! 즉시 메일을 발송합니다.");
        isFrontendDown = true;
        sendEmergencyEmail("프론트엔드 서버");
    }

}, 5000);