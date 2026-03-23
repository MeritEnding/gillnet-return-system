// routes/external_api.js

const express = require('express');
const router = express.Router();
const axios = require('axios');

// 외부 API의 기본 URL
// const EXTERNAL_API_URL = 'http://221.143.131:8080/api/v1';
// 외부 API의 기본 URL (환경 변수 우선 적용, 없으면 배포 서버 도메인 사용)
const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'https://fdp.or.kr/api/v1';
/**
 * 1. 서버 시스템 상태
 * [GET] /api/v1/health.json
 */
router.get('/health.json', async (req, res) => {
    try {
        const response = await axios.get(`${EXTERNAL_API_URL}/health.json`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('External API (health) error:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: 'External API request failed' };
        res.status(status).json(data);
    }
});

/**
 * 2. 사용자 인증
 * [GET] /api/v1/user/:user_fshnd_no/auth.json
 */
router.get('/user/:user_fshnd_no/auth.json', async (req, res) => {
    const { user_fshnd_no } = req.params;

    if (!user_fshnd_no) {
        return res.status(400).json({ message: 'user_fshnd_no is required' });
    }

    try {
        const response = await axios.get(`${EXTERNAL_API_URL}/user/${user_fshnd_no}/auth.json`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`External API (user auth) error for ${user_fshnd_no}:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: 'External API request failed' };
        res.status(status).json(data);
    }
});

/**
 * 3. 어구 표식 바코드 반환 등록
 * [POST] /api/v1/deposit/return.json
 */
router.post('/deposit/return.json', async (req, res) => {
    const { bacod_nm, user_fshnd_no } = req.body;

    if (!bacod_nm || !user_fshnd_no) {
        return res.status(400).json({ message: 'bacod_nm and user_fshnd_no are required' });
    }

    try {
        const response = await axios.post(`${EXTERNAL_API_URL}/deposit/return.json`, {
            bacod_nm,
            user_fshnd_no
        });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`External API (deposit return) error:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: 'External API request failed' };
        res.status(status).json(data);
    }
});

// external_api.js에 문자 발송 함수 추가
router.post('/send-sms', async (req, res) => {
    const { return_no, isDeposit } = req.body;
    // 보증금어구인지 기존어구인지에 따라 엔드포인트 분기
    const endpoint = isDeposit ? '/deposit/return/remg/sms.json' : '/deposit/return/romg/sms.json';
    
    try {
        const payload = isDeposit ? { gvbk_mng_no: return_no } : { bfr_fsgr_gvbk_no: return_no };
        const response = await axios.post(`${EXTERNAL_API_URL}${endpoint}`, payload);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('SMS 발송 실패:', error.message);
        res.status(500).json({ message: 'SMS failed' });
    }
});



module.exports = router;
