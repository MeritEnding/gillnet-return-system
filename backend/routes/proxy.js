// routes/proxy.js

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
// 개발 URL 
const EXTERNAL_API_URL = 'https://fdp.or.kr/api/v1';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// --- 공통 에러 핸들러 ---
const handleProxyError = (res, error, customMessage) => {
  console.error(`[Proxy Error] ${customMessage}:`, error.message);
  if (error.response) {
    res.status(error.response.status).json(error.response.data);
  } else {
    res.status(500).json({ status: 'ERROR', message: customMessage, error: error.message });
  }
};

// ==========================================================
// 1. 사용자 인증 관련 API
// ==========================================================

/**
 * [복구] 사용자 인증 프록시 + JWT 토큰 발급 (AuthScreen.jsx 용)
 */
// [proxy.js] 사용자 인증 부분 수정
router.post('/user-auth', async (req, res) => {
  const { user_fshnd_no } = req.body;
  if (!user_fshnd_no) {
    return res.status(400).json({ status: 'ERROR', message: '어업인코드가 필요합니다.' });
  }

  try {
    // 1. 기본 인증 호출 (현재 스크린샷에 나온 데이터)
    const authUrl = `${EXTERNAL_API_URL}/user/${user_fshnd_no}/auth.json`;
    const authRes = await axios.get(authUrl);

    if (authRes.status === 200 && authRes.data.data) {
      const basicData = authRes.data.data;

      // 2. [추가] 상세 정보 조회를 위해 '사용자 로그인' 또는 '회원 확인' 로직 연동
      // 여기서는 예시로 로그인 응답 구조를 참고하여 상세 정보를 구성합니다.
      // 실제 서버 환경에 따라 계좌 정보를 가진 상세 API를 여기서 한 번 더 호출해야 할 수 있습니다.
      
      const payload = {
        id: basicData.user_fshnd_no,
        name: basicData.mbr_nm
      };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

      // 만약 외부 API에서 인증 시 계좌를 안 준다면, 
      // 아래와 같이 '사용자 로그인' 정보를 조회하는 API를 추가로 호출하도록 구성하세요.
      // 현재는 프론트엔드가 동작하도록 응답 구조를 맞춰서 전달합니다.
      
      res.status(200).json({
        ...authRes.data,
        session_token: token
      });
    } else {
      res.status(authRes.status).json(authRes.data);
    }
  } catch (error) {
    handleProxyError(res, error, '인증 중 상세 정보 조회 실패');
  }
});
// 본인인증 DI 기반 회원 확인 
router.post('/user/check-member', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/user/check-member.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, 'DI 기반 회원 확인 실패');
  }
});

// 사용자 로그인 (앱/웹 기존 로직 대응용) 
router.post('/user/login', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/user/login.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '사용자 로그인 실패');
  }
});


// ==========================================================
// 2. 보증금어구 (REMG) API 라우트 [cite: 188]
// ==========================================================

// 2.1 보증금어구 반환 시작 [cite: 221]
router.post('/deposit/return/remg/start', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/remg/start.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '보증금어구 반환 시작 실패');
  }
});

// 2.2 보증금어구 반환 등록 (바코드 스캔 시) [cite: 253]
router.post('/deposit/return/remg', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/remg.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '보증금어구 바코드 반환 등록 실패');
  }
});

// 2.3 보증금어구 반납 사진 정보 등록 [cite: 285, 287]
router.post('/deposit/image/remg', upload.array('files'), async (req, res) => {
  try {
    const form = new FormData();
    form.append('gvbk_mng_no', req.body.gvbk_mng_no);
    
    if (req.files) {
      req.files.forEach(file => {
        form.append('files', fs.createReadStream(file.path), file.originalname);
      });
    }

    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/image/remg.json`, form, {
      headers: { ...form.getHeaders() }
    });

    req.files?.forEach(file => fs.unlinkSync(file.path)); // 파일 정리
    res.status(response.status).json(response.data);
  } catch (error) {
    req.files?.forEach(file => fs.unlinkSync(file.path));
    handleProxyError(res, error, '보증금어구 사진 등록 실패');
  }
});

// 2.4 보증금어구 반환 문자 발송 [cite: 425]
router.post('/deposit/return/remg/sms', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/remg/sms.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '보증금어구 문자 발송 실패');
  }
});


// ==========================================================
// 3. 기존어구 (ROMG) API 라우트 [cite: 439]
// ==========================================================

// 3.1 기존어구 반환 시작 [cite: 440]
router.post('/deposit/return/romg/start', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/romg/start.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '기존어구 반환 시작 실패');
  }
});

// 3.2 기존어구 반환 등록 (바코드 스캔 시) [cite: 474]
router.post('/deposit/return/romg', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/romg.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '기존어구 바코드 반환 등록 실패');
  }
});

// 3.3 기존어구 반납 사진 정보 등록 [cite: 506, 508]
router.post('/deposit/image/romg', upload.array('files'), async (req, res) => {
  try {
    const form = new FormData();
    form.append('bfr_fsgr_gvbk_no', req.body.bfr_fsgr_gvbk_no);
    
    if (req.files) {
      req.files.forEach(file => {
        form.append('files', fs.createReadStream(file.path), file.originalname);
      });
    }

    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/image/romg.json`, form, {
      headers: { ...form.getHeaders() }
    });

    req.files?.forEach(file => fs.unlinkSync(file.path));
    res.status(response.status).json(response.data);
  } catch (error) {
    req.files?.forEach(file => fs.unlinkSync(file.path));
    handleProxyError(res, error, '기존어구 사진 등록 실패');
  }
});

// 3.4 기존어구 반환 문자 발송 [cite: 650]
router.post('/deposit/return/romg/sms', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/romg/sms.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '기존어구 문자 발송 실패');
  }
});


// ==========================================================
// 4. 공통 조회 라우트 (기존 코드 유지 및 최적화)
// ==========================================================
const proxyGetRequest = (path, paramName) => async (req, res) => {
  const paramValue = req.params[paramName];
  try {
    const apiUrl = `${EXTERNAL_API_URL}${path.replace(`:${paramName}`, paramValue)}`;
    const response = await axios.get(apiUrl, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '조회 API 호출 실패');
  }
};

// ==========================================================
// 공통 및 계좌 관련 API (proxy.js에 추가)
// ==========================================================

// 5. 은행코드 목록 조회
router.get('/banks', async (req, res) => {
  try {
    const response = await axios.get(`${EXTERNAL_API_URL}/banks.json`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '은행코드 조회 실패');
  }
});

// 6. 계좌 인증
router.post('/account/verify', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/account/verify.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '계좌 인증 실패');
  }
});

// 1.1 어구분류코드 목록 조회 (옵션 - 동적 조회가 필요할 경우)
router.post('/gears-type', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/gears-type.json`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '어구분류코드 조회 실패');
  }
});

router.get('/user/:mbr_no/rentals/remg', proxyGetRequest('/user/:mbr_no/rentals/remg.json', 'mbr_no'));
router.get('/user/:mbr_no/rentals/romg', proxyGetRequest('/user/:mbr_no/rentals/romg.json', 'mbr_no'));
router.get('/rentals/:spmt_mng_no/remg', proxyGetRequest('/rentals/:spmt_mng_no/remg.json', 'spmt_mng_no'));
router.get('/rentals/:fsgr_reg_mng_no/romg', proxyGetRequest('/rentals/:fsgr_reg_mng_no/romg.json', 'fsgr_reg_mng_no'));



module.exports = router;