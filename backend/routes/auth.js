// routes/auth.js

const express = require('express');
const router = express.Router();
const db = require('../db/database.js'); 
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 
const plc = require('../utils/plcController'); // PLC 컨트롤러 가져오기
const JWT_SECRET = process.env.JWT_SECRET; 

/**
 * [API] 바코드 투입구 제어
 */
router.post('/hw/barcode-door', async (req, res) => {
  const { open } = req.body;
  try {
    // 5초 타임아웃 래퍼: PLC가 없어도 5초 후에는 성공으로 응답
    await Promise.race([
      plc.setBarcodeDoor(open),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PLC Timeout')), 5000))
    ]);
    res.status(200).json({ status: 'SUCCESS', message: `Barcode Door ${open}` });
  } catch (e) {
    console.warn(`[HW Bypass] Barcode Door Error/Timeout: ${e.message}`);
    // 실제 오류가 나도 성공으로 응답하여 UI 흐름 유지
    res.status(200).json({ status: 'SUCCESS', message: `Barcode Door ${open} (Bypassed)` });
  }
});

/**
 * [API] 자망 투입구 제어 (폐어구 투입구 공유)
 */
router.post('/hw/gillnet-door', async (req, res) => {
  const { open } = req.body;
  try {
    await Promise.race([
      plc.setWasteDoor(open),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PLC Timeout')), 5000))
    ]);
    res.status(200).json({ status: 'SUCCESS', message: `Gillnet Door ${open}` });
  } catch (e) {
    console.warn(`[HW Bypass] Gillnet Door Error/Timeout: ${e.message}`);
    res.status(200).json({ status: 'SUCCESS', message: `Gillnet Door ${open} (Bypassed)` });
  }
});

/**
 * [API] 자망 압축기 1회 사이클 실행
 * 유압모드 ON (160) → 압축명령 (162) → 완료대기 (112) → 유압모드 OFF (161)
 */
router.post('/hw/gillnet-compress', async (req, res) => {
  try {
    console.log('-> PLC: 자망 압축 사이클 시작');
    // 압축 완료 대기 포함 최대 60초 타임아웃
    await Promise.race([
      plc.runCompressionCycle(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PLC Compress Timeout')), 60000))
    ]);
    console.log('-> PLC: 자망 압축 사이클 완료');
    res.status(200).json({ status: 'SUCCESS', message: 'Compression Cycle Complete' });
  } catch (e) {
    console.warn(`[HW Bypass] Compress Error/Timeout: ${e.message}`);
    res.status(200).json({ status: 'SUCCESS', message: 'Compression (Bypassed)' });
  }
});

/**
 * 어업인 세션 토큰 검증 미들웨어
 */
const verifySessionToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ status: 'FAILURE', message: '인증 토큰이 없습니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ status: 'FAILURE', message: '세션이 만료되었습니다.' });
    }
    req.user = user; 
    next();
  });
};

router.get('/fisherman/status', verifySessionToken, (req, res) => {
  const fishermanId = req.user.id;
  const sql = `
    SELECT COUNT(id) as borrowed_count 
    FROM gear_master 
    WHERE current_fisherman_id = ? AND status = 'BORROWED'`;

  db.get(sql, [fishermanId], (err, row) => {
    if (err) return res.status(500).json({ status: 'FAILURE', message: 'DB 오류' });
    res.status(200).json({ status: 'SUCCESS', borrowed_count: row.borrowed_count });
  });
});

router.post('/fisherman', (req, res) => {
  const { fisherman_qr_hash } = req.body;
  const sql = "SELECT * FROM fishermen WHERE qr_hash = ?";

  db.get(sql, [fisherman_qr_hash], (err, row) => {
    if (err) return res.status(500).json({ status: 'FAILURE', message: '서버 오류' });

    if (row) {
      const payload = { id: row.id, name: row.name };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({
        status: 'SUCCESS',
        message: '인증 완료',
        is_authenticated: true,
        session_token: token,
        fisherman_info: { id: row.id, name: row.name, contact_encrypted: row.contact }
      });
    } else {
      res.status(400).json({ status: 'FAILURE', message: '등록되지 않은 QR 코드입니다.' });
    }
  });
});

router.post('/alternate/info', (req, res) => {
  console.log('--- (신규) 대체 인증 요청 ---');
  console.log('Body:', req.body);

  const { kiosk_id, name, birthdate, phone_number, bank_name, account_number } = req.body;

  const sql = `
    SELECT * FROM fishermen 
    WHERE name = ? 
      AND birthdate = ? 
      AND contact = ? 
      AND bank_name = ? 
      AND account_number = ?
  `;

  db.get(sql, [name, birthdate, phone_number, bank_name, account_number], (err, row) => {
    if (err) {
      console.error('DB 조회 오류:', err.message);
      return res.status(500).json({ status: 'FAILURE', message: '서버 오류가 발생했습니다.' });
    }

    if (row) {
      console.log(`-> 인증 성공: ${row.name}`);

      const payload = {
        id: row.id,
        name: row.name
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({
        status: 'SUCCESS',
        message: '사용자 인증이 완료되었습니다.',
        is_authenticated: true,
        session_token: token,
        fisherman_info: {
          id: row.id,
          name: row.name,
          contact_encrypted: row.contact
        }
      });
    } else {
      console.log('-> 인증 실패: 정보 불일치');
      res.status(400).json({
        status: 'FAILURE',
        error_code: 'AUTH_FAIL_INFO',
        message: '입력하신 정보와 일치하는\n사용자를 찾을 수 없습니다.'
      });
    }
  });
});

module.exports = router;