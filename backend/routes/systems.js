// routes/systems.js

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

router.post('/error-report', async (req, res) => {
    try {
        const { kioskId, location, time, errorDetails } = req.body;

        // ★ 구글 원격 데스크톱 웹 접속 주소 (이 링크를 누르면 내 기기 목록 창이 열립니다)
        const remoteDesktopLink = "https://remotedesktop.google.com/access";

        // 1. 발송자 계정 설정
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'dksldsk@gmail.com',       
                pass: 'zybrxlwtjblnttpq'         // 16자리 앱 비밀번호
            }
        });

        // 2. 메일 내용 세팅 (원격 접속 버튼 추가)
        const mailOptions = {
            from: 'dksldsk@gmail.com',
            //'dksldsk@naver.com, jch@fira.or.kr, jiseob@ketg.co.kr, dksldsk@ketg.mail.kakaowork.com'
            to: 'dksldsk@naver.com, jch@fira.or.kr, jiseob@ketg.co.kr, dksldsk@ketg.mail.kakaowork.com', 
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
                        <p style="font-size: 12px; color: #888; margin-top: 12px;">(클릭 시 구글 원격 접속 페이지로 이동합니다)</p>
                    </div>

                    <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">※ 본 메일은 키오스크 시스템에서 자동 발송되었습니다.</p>
                </div>
            `
        };

        // 3. 메일 전송
        await transporter.sendMail(mailOptions);
        console.log(`=> 📧 dksldsk@naver.com 으로 오류 신고 이메일 전송 완료!`);
        
        res.status(200).json({ status: 'SUCCESS', message: 'Email sent successfully' });

    } catch (error) {
        console.error("이메일 전송 에러:", error);
        res.status(500).json({ status: 'FAILURE', message: error.message });
    }
});

module.exports = router;