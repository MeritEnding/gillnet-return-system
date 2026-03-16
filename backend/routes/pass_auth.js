// routes/pass_auth.js
const express = require('express');
const router = express.Router();
const passService = require('../services/passService');

// [1] PASS 인증 요청
router.post('/request', async (req, res) => {
  try {
    const reqSeq = `REQ${new Date().getTime()}`;
    const baseDomain = 'http://localhost:8080'; 
    const returnUrl = `${baseDomain}/api/pass/success`;
    const errorUrl = `${baseDomain}/api/pass/fail`;

    const encData = await passService.getEncryptedData(reqSeq, returnUrl, errorUrl);
    res.json({ status: 'SUCCESS', encData: encData });
  } catch (error) {
    res.status(500).json({ status: 'FAILURE', message: '암호화 실패' });
  }
});

// [2] PASS 인증 성공 처리 (★ 로컬 DB 완전 제거 ★)
router.all('/success', async (req, res) => {
  const EncodeData = (req.body && req.body.EncodeData) || (req.query && req.query.EncodeData);

  try {
    if (!EncodeData) throw new Error('암호화 데이터 없음');

    // 1. NICE 데이터 복호화 (DB 조회 없이 순수하게 데이터만 추출!)
    const userInfo = await passService.decryptData(EncodeData);
    
    const userName = userInfo.NAME;       
    const userPhone = userInfo.MOBILE_NO; 
    const userDi = userInfo.DI;           
    const userBirth = userInfo.BIRTHDATE; 

    console.log(`[PASS 인증 성공] 이름: ${userName}, 전화번호: ${userPhone}, 생년월일: ${userBirth}`);

    // 2. 과거의 DB 조회(fishermen) 로직 완전 삭제!
    // 무조건 복호화된 데이터를 프론트엔드로 전달합니다. 
    // (프론트에서 DI 값을 가지고 외부 파란샘 API를 찔러서 회원/비회원을 스스로 판별합니다)
    sendPopupScript(res, 'PASS_AUTH_SUCCESS', {
        user: { name: userName, phone: userPhone, birthdate: userBirth },
        di: userDi 
    });

  } catch (error) {
    console.error('PASS 처리 에러:', error);
    sendPopupScript(res, 'FAIL', '인증 데이터 처리 중 오류가 발생했습니다.');
  }
});

router.all('/fail', (req, res) => {
  sendPopupScript(res, 'FAIL', '본인 인증이 취소되었거나 실패했습니다.');
});

// 팝업 응답용 함수
function sendPopupScript(res, type, payload) {
    const data = typeof payload === 'string' ? { message: payload } : payload;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = `
      <!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
      <div style="text-align:center; margin-top:50px;"><h3>처리 중입니다...</h3></div>
      <script>
        if(window.opener) {
            window.opener.postMessage({ type: '${type}', payload: ${JSON.stringify(data)} }, '*');
        }
        setTimeout(() => window.close(), 500);
      </script>
      </body></html>`;
    res.send(html);
}

module.exports = router;