// routes/certification.js (★보안 미들웨어 적용★)

const express = require('express');
const router = express.Router();
const db = require('../db/database.js');
const jwt = require('jsonwebtoken'); // (★추가★)
const JWT_SECRET = process.env.JWT_SECRET; // (★추가★)

/**
 * (★추가★) routes/auth.js에서 토큰 검증 미들웨어 가져오기
 * 이 미들웨어를 통과하면 req.user.id 에 어부 ID가 담깁니다.
 */
const verifySessionToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (token == null) {
    return res.status(401).json({ status: 'FAILURE', message: '인증 토큰이 없습니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn('어부 세션 토큰 검증 실패:', err.message);
      return res.status(403).json({ status: 'FAILURE', message: '세션이 만료되었거나 유효하지 않습니다.' });
    }
    req.user = user; // req.user.id (어부 ID)
    next();
  });
};

/**
 * [POST] /api/certification/start
 * 반납 세션 시작 (★미들웨어 추가 및 fisherman_id 수정★)
 */
// (★수정★) verifySessionToken 미들웨어 추가
router.post('/start', verifySessionToken, (req, res) => {
  console.log('--- 반납 세션 시작 요청 받음 (1-by-1 Flow) ---');
  
  // (★수정★) fisherman_id를 req.body가 아닌, 토큰에서 검증된 req.user.id 로부터 가져옴
  const { kiosk_id } = req.body;
  const fisherman_id = req.user.id; 
  const session_token = req.headers['authorization'].split(' ')[1]; // 토큰 자체도 저장

  if (!fisherman_id) {
    console.log('-> 반납 실패: 인증된 어부 ID가 없습니다. (토큰 오류)');
    return res.status(401).json({ status: 'FAILURE', error_code: 'AUTH_004', message: '어부 인증 정보가 만료되었습니다.' });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = Date.now().toString().slice(-5);
  const newSessionId = `RS-${dateStr}-${timeStr}`;

  // (★수정★) expected_quantity 제거됨, session_token 저장
  const sql = `INSERT INTO return_sessions (return_session_id, kiosk_id, session_token, fisherman_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [newSessionId, kiosk_id, session_token, fisherman_id, 'PENDING', new Date().toISOString()];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('DB INSERT 오류:', err.message);
      return res.status(500).json({ status: 'FAILURE', error_code: 'DB_INSERT_ERROR', message: '세션 생성 중 서버 오류가 발생했습니다.' });
    }
    console.log(`-> 반납 세션 생성 성공 (ID: ${newSessionId})`);
    res.status(200).json({
      status: 'SUCCESS', message: '반납 세션을 시작합니다. 첫 번째 어구 표식을 인증해 주세요.', 
      return_session_id: newSessionId,
    });
  });
});

/**
 * [POST] /api/certification/tag/verify
 * 어구 표식 진위 (Authenticity) 확인
 */
// (★수정★) verifySessionToken 미들웨어 추가
router.post('/tag/verify', verifySessionToken, (req, res) => {
  console.log('--- 표식 진위 확인 요청 받음 ---');
  // req.user.id (어부 ID)가 있으므로, 필요시 여기서도 사용자 검증 가능
  console.log(`(인증된 사용자: ${req.user.id})`);
  
  const { tag_sensor_data } = req.body;

  if (tag_sensor_data === 'GENUINE_TAG_HW') {
    console.log('-> 인증 성공 (정품 표식)');
    res.status(200).json({ status: 'SUCCESS', message: '정품 표식 인증 완료. 바코드를 스캔해 주세요.', is_genuine: true });
  } else {
    console.log('-> 인증 실패 (위변조 의심)');
    res.status(400).json({ status: 'FAILURE', error_code: 'TAG_001', message: '표식 진위 확인 불가. 담당자에게 문의해 주십시오.', is_genuine: false });
  }
});


/**
 * [POST] /api/certification/scan
 * 정품 표식인증된 반납 어구 스캔 (★보안 강화★)
 */
// (★수정★) verifySessionToken 미들웨어 추가
router.post('/scan', verifySessionToken, async (req, res) => {
  console.log('--- 어구 바코드 스캔 요청 받음 ---');
  console.log('요청 본문 (Body):', req.body);
  const { return_session_id, gear_code } = req.body;
  
  // (★수정★) fishermanId를 토큰에서 가져와서 보안 강화
  const fishermanId = req.user.id; 

  try {
    // 1. (★삭제★) 세션에서 fishermanId를 가져오는 SQL (더 이상 필요 없음)
    
    // 2. 유효 바코드 확인 (수정 없음)
    const sqlGetItem = "SELECT * FROM gear_master WHERE code = ?";
    const item = await new Promise((resolve, reject) => {
      db.get(sqlGetItem, [gear_code], (err, row) => err ? reject(err) : resolve(row));
    });
    if (!item) {
      console.log('-> 스캔 실패: 유효하지 않은 바코드');
      return res.status(400).json({ status: 'FAILURE', error_code: 'SCAN_002', message: '유효하지 않은 어구 바코드입니다.' });
    }

    // 3. (★수정★) 소유권 확인 (DB 대신 토큰 ID와 비교)
    if (item.current_fisherman_id !== fishermanId) {
      console.log(`-> 스캔 실패: 소유권 불일치 (Gear Owner: ${item.current_fisherman_id}, Token User: ${fishermanId})`);
      return res.status(400).json({
        status: 'FAILURE',
        error_code: 'SCAN_004', 
        message: '이 어구는 현재 회원님이 대여한 어구가 아닙니다.'
      });
    }

    // 4. 중복 스캔 확인 (수정 없음)
    const sqlCheckDuplicate = "SELECT * FROM scanned_items WHERE return_session_id = ? AND gear_item_code = ?";
    const duplicate = await new Promise((resolve, reject) => {
      db.get(sqlCheckDuplicate, [return_session_id, gear_code], (err, row) => err ? reject(err) : resolve(row));
    });
    if (duplicate) {
      console.log('-> 스캔 실패: 이미 스캔된 어구');
      return res.status(400).json({ status: 'FAILURE', error_code: 'SCAN_001', message: '이미 스캔된 어구입니다.' });
    }

    // 5. (★삭제★) 목표 개수 초과 확인 로직 (1-by-1이므로 불필요)

    // 6. 스캔 기록 INSERT (수정 없음)
    const sqlInsert = "INSERT INTO scanned_items (return_session_id, gear_item_code, scanned_at) VALUES (?, ?, ?)";
    await new Promise((resolve, reject) => {
      db.run(sqlInsert, [return_session_id, gear_code, new Date().toISOString()], function (err) { err ? reject(err) : resolve(this); });
    });

    // 7. 총 보증금 계산 (수정 없음)
    const sqlSumDeposit = `SELECT SUM(gm.reward) as total_deposit FROM scanned_items si JOIN gear_master gm ON si.gear_item_code = gm.code WHERE si.return_session_id = ?`;
    const depositResult = await new Promise((resolve, reject) => {
      db.get(sqlSumDeposit, [return_session_id], (err, row) => err ? reject(err) : resolve(row));
    });
    const currentTotalDeposit = depositResult?.total_deposit || 0;

    // 8. 최종 성공 응답 (수정 없음)
    console.log(`-> 스캔 성공: ${item.code}`);
    res.status(200).json({
      status: 'VALIDATED', message: '유효성 확인 및 목록에 등록 완료.', is_valid: true,
      tag_info: { gear_code: item.code, gear_type: item.type, deposit_amount: item.reward },
      current_total_deposit: currentTotalDeposit
    });

  } catch (err) {
    console.error('API 처리 중 오류:', err.message);
    res.status(500).json({ status: 'FAILURE', message: '서버 내부 오류가 발생했습니다.' });
  }
});


module.exports = router;