// routes/proxy.js

const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
// const EXTERNAL_API_URL = 'https://fdp.or.kr/api/v1';
const EXTERNAL_API_URL = 'http://54.116.22.80:8083/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

const PARANSAEM_API_KEY = process.env.PARANSAEM_API_KEY;

if (!PARANSAEM_API_KEY) {
  console.error("[경고] .env 파일에 PARANSAEM_API_KEY가 설정되지 않았습니다!");
} else {
  // 파란샘 API로 나가는 모든 axios 요청 헤더에 API KEY 자동 삽입
  axios.defaults.headers.common['x-api-key'] = PARANSAEM_API_KEY;
}

//  [핵심] 파란샘 서버가 뱉는 진짜 에러 이유를 터미널에 상세히 출력합니다.
const handleProxyError = (res, error, customMessage) => {
  console.log("\n==================================================");
  console.log(`🚨 파란샘(Java) 서버 내부 에러 발생! (${customMessage})`);
  console.log(`- HTTP 상태 코드: ${error.response?.status}`);
  console.log(`- 파란샘 서버의 실제 응답 메시지:`, JSON.stringify(error.response?.data, null, 2));
  console.log("==================================================\n");
  
  if (error.response) {
    res.status(error.response.status).json(error.response.data);
  } else {
    res.status(500).json({ status: 'ERROR', message: customMessage, error: error.message });
  }
};

router.post('/user-auth', async (req, res) => {
  const { user_fshnd_no } = req.body;
  if (!user_fshnd_no) return res.status(400).json({ status: 'ERROR', message: '어업인코드가 필요합니다.' });

  try {
    const authUrl = `${EXTERNAL_API_URL}/user/${user_fshnd_no}/auth.json`;
    const authRes = await axios.get(authUrl);

    if (authRes.status === 200 && authRes.data.data) {
      const basicData = authRes.data.data;
      const payload = { id: basicData.user_fshnd_no, name: basicData.mbr_nm };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });
      res.status(200).json({ ...authRes.data, session_token: token });
    } else {
      res.status(authRes.status).json(authRes.data);
    }
  } catch (error) { handleProxyError(res, error, '인증 중 상세 정보 조회 실패'); }
});

router.post('/user/check-member', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/user/check-member.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, 'DI 기반 회원 확인 실패'); }
});

router.post('/user/login', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/user/login.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '사용자 로그인 실패'); }
});

router.post('/deposit/return/remg/start', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/remg/start.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '보증금어구 반환 시작 실패'); }
});

router.post('/deposit/return/remg', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/remg.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '보증금어구 바코드 반환 등록 실패'); }
});

router.post('/deposit/image/remg', upload.array('files'), async (req, res) => {
  try {
    const form = new FormData();
    form.append('gvbk_mng_no', req.body.gvbk_mng_no || '');

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => { form.append('files', fs.createReadStream(file.path), file.originalname); });
    }
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/image/remg.json`, form, { headers: form.getHeaders() });
    req.files?.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
    res.status(response.status).json(response.data);
  } catch (error) {
    req.files?.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
    handleProxyError(res, error, '보증금어구 사진 등록 실패');
  }
});

router.post('/deposit/return/remg/sms', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/remg/sms.json`, req.body, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '보증금어구 SMS 문자 발송 실패'); }
});

router.post('/deposit/return/romg/start', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/romg/start.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '기존어구 반환 시작 실패'); }
});

router.post('/deposit/return/romg', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/romg.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '기존어구 바코드 반환 등록 실패'); }
});

router.post('/deposit/image/romg', upload.array('files'), async (req, res) => {
  try {
    const form = new FormData();
    form.append('bfr_fsgr_gvbk_no', req.body.bfr_fsgr_gvbk_no || '');

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => { form.append('files', fs.createReadStream(file.path), file.originalname); });
    }
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/image/romg.json`, form, { headers: form.getHeaders() });
    req.files?.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
    res.status(response.status).json(response.data);
  } catch (error) {
    req.files?.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
    handleProxyError(res, error, '기존어구 사진 등록 실패');
  }
});

router.post('/deposit/return/romg/sms', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return/romg/sms.json`, req.body, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '기존어구 SMS 문자 발송 실패'); }
});

const proxyGetRequest = (path, paramName) => async (req, res) => {
  const paramValue = req.params[paramName];
  try {
    const apiUrl = `${EXTERNAL_API_URL}${path.replace(`:${paramName}`, paramValue)}`;
    const response = await axios.get(apiUrl, { params: req.query });
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '조회 API 호출 실패'); }
};

router.get('/banks', async (req, res) => {
  try {
    const response = await axios.get(`${EXTERNAL_API_URL}/banks.json`);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '은행코드 조회 실패'); }
});

router.post('/account/verify', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/account/verify.json`, req.body);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '계좌 인증 실패'); }
});

router.post('/gears-type', async (req, res) => {
  try {
    const response = await axios.post(`${EXTERNAL_API_URL}/gears-type.json`);
    res.status(response.status).json(response.data);
  } catch (error) { handleProxyError(res, error, '어구분류코드 조회 실패'); }
});

// =========================================================================
//  바코드 단건 정보 조회 API 프록시
// =========================================================================
router.get('/barcode/:bacod_nm/info', async (req, res) => {
  try {
    const { bacod_nm } = req.params;
    const response = await axios.get(`${EXTERNAL_API_URL}/barcode/${bacod_nm}/info.json`);
    res.status(response.status).json(response.data);
  } catch (error) { 
    handleProxyError(res, error, '바코드 단건 정보 조회 실패'); 
  }
});

router.get('/user/:mbr_no/rentals/remg', proxyGetRequest('/user/:mbr_no/rentals/remg.json', 'mbr_no'));
router.get('/user/:mbr_no/rentals/romg', proxyGetRequest('/user/:mbr_no/rentals/romg.json', 'mbr_no'));
router.get('/rentals/:spmt_mng_no/remg', proxyGetRequest('/rentals/:spmt_mng_no/remg.json', 'spmt_mng_no'));
router.get('/rentals/:fsgr_reg_mng_no/romg', proxyGetRequest('/rentals/:fsgr_reg_mng_no/romg.json', 'fsgr_reg_mng_no'));

// 8. 키오스크 목록 조회 -------------------------------------------------------
router.get('/kiosks', async (req, res) => {
  try {
    const response = await axios.get(`${EXTERNAL_API_URL}/kiosks.json`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '키오스크 목록 조회 실패');
  }
});

// 2.7 기존어구 종류 목록 조회 (직접입력용) ------------------------------------
router.get('/romg/fishing-gears', async (req, res) => {
  try {
    const response = await axios.get(`${EXTERNAL_API_URL}/romg/fishing-gears.json`);
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '기존어구 종류 목록 조회 실패');
  }
});

// 2.8 기존어구 직접입력 반납 (회원/비회원 공용) -------------------------------
router.post('/deposit/return/romg/manual', async (req, res) => {
  try {
    console.log("📡 [폐자망 manual 반납 요청]:", JSON.stringify(req.body));
    const response = await axios.post(
      `${EXTERNAL_API_URL}/deposit/return/romg/manual.json`,
      req.body,
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
    console.log("✅ [폐자망 manual 반납 응답]:", JSON.stringify(response.data));
    res.status(response.status).json(response.data);
  } catch (error) {
    handleProxyError(res, error, '기존어구 직접입력 반납 실패');
  }
});




module.exports = router;