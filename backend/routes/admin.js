// routes/admin.js (★신규 파일★)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database.js'); // DB 연결 가져오기

// (중요) JWT 서명에 사용할 비밀 키 (보안상 중요!)
// 실제 배포 시에는 .env 파일 등을 통해 외부에서 주입해야 합니다.
const JWT_SECRET = process.env.JWT_SECRET;
/**
 * -----------------------------------------------------
 * (공통) 관리자 세션 토큰 검증 미들웨어
 * -----------------------------------------------------
 * - Authorization: Bearer <admin_token> 헤더를 확인합니다.
 * - 유효한 토큰일 경우 req.admin에 관리자 정보를 첨부합니다.
 */
const verifyAdminToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (token == null) {
        console.warn('관리자 토큰 없음');
        return res.status(401).json({ status: 'ERROR', message: '인증 토큰이 없습니다.' });
    }

    // 토큰 검증
    jwt.verify(token, JWT_SECRET, (err, adminUser) => {
        if (err) {
            console.warn('관리자 토큰 검증 실패:', err.message);
            // (토큰 만료, 서명 불일치 등)
            return res.status(403).json({ status: 'ERROR', message: '인증 토큰이 유효하지 않습니다.' });
        }

        // ★성공★: req 객체에 관리자 정보를 심어주고 다음 단계로 진행
        req.admin = adminUser;
        next();
    });
};


/**
 * -----------------------------------------------------
 * API: POST /api/admin/login
 * (관리자 로그인)
 * -----------------------------------------------------
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`--- (API) 관리자 로그인 시도: ${username} ---`);

    if (!username || !password) {
        return res.status(400).json({ status: 'ERROR', message: '아이디와 비밀번호를 모두 입력하세요.' });
    }

    const sql = 'SELECT * FROM administrators WHERE username = ?';
    db.get(sql, [username], (err, admin) => {
        if (err) {
            console.error('Admin Login DB Error:', err.message);
            return res.status(500).json({ status: 'ERROR', message: 'DB 조회 중 오류 발생' });
        }
        if (!admin) {
            console.warn('-> 로그인 실패: 사용자 없음');
            return res.status(401).json({ status: 'ERROR', message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
        }

        // DB에 저장된 해시(password_hash)와 입력된 비밀번호(password) 비교
        bcrypt.compare(password, admin.password_hash, (err, result) => {
            if (err) {
                console.error('Bcrypt Compare Error:', err.message);
                return res.status(500).json({ status: 'ERROR', message: '인증 처리 중 오류 발생' });
            }

            if (result) {
                // --- ★로그인 성공★ ---
                console.log(`-> 로그인 성공: ${admin.username} (Role: ${admin.role})`);

                // JWT 페이로드 (토큰에 담을 정보)
                const payload = {
                    id: admin.id,
                    username: admin.username,
                    role: admin.role
                };

                // JWT 생성 (유효시간 1시간으로 설정)
                const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

                res.json({
                    status: 'SUCCESS',
                    message: '로그인 성공',
                    token: token // 프론트엔드(AdminScreen.jsx)로 토큰 전송
                });

            } else {
                // --- 비밀번호 불일치 ---
                console.warn('-> 로그인 실패: 비밀번호 불일치');
                res.status(401).json({ status: 'ERROR', message: '아이디 또는 비밀번호가 일치하지 않습니다.' });
            }
        });
    });
});

/**
 * -----------------------------------------------------
 * API: GET /api/admin/status
 * (키오스크 상태 조회 - ★인증 필요★)
 * -----------------------------------------------------
 */
router.get('/status', verifyAdminToken, (req, res) => {
    // verifyAdminToken 미들웨어를 통과했으므로 req.admin 에 관리자 정보가 있음
    console.log(`--- (API) 관리자(${req.admin.username}) 키오스크 상태 조회 ---`);

    // setup.js에서 kiosk_info의 id=1 로 고정했음
    const sql = 'SELECT kiosk_uid, name, location_area, status, storage_status FROM kiosk_info WHERE id = 1';

    db.get(sql, [], (err, kiosk) => {
        if (err) {
            console.error('Kiosk Status DB Error:', err.message);
            return res.status(500).json({ status: 'ERROR', message: 'DB 조회 중 오류 발생' });
        }
        if (!kiosk) {
            return res.status(404).json({ status: 'ERROR', message: '키오스크 정보를 찾을 수 없습니다.' });
        }
        res.json(kiosk); // 조회된 키오스크 정보 반환 (AdminScreen.jsx로)
    });
});

/**
 * -----------------------------------------------------
 * API: GET /api/admin/history
 * (최근 반납 내역 조회 - ★인증 필요★)
 * -----------------------------------------------------
 */
router.get('/history', verifyAdminToken, (req, res) => {
    console.log(`--- (API) 관리자(${req.admin.username}) 최근 반납 내역 조회 ---`);

    // 최근 20건의 완료된 반납 내역
    const sql = `
      SELECT id, confirmed_at, fisherman_name, returned_items, total_deposit, photo_filenames 
      FROM confirmed_returns 
      ORDER BY confirmed_at DESC 
      LIMIT 20`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Return History DB Error:', err.message);
            return res.status(500).json({ status: 'ERROR', message: 'DB 조회 중 오류 발생' });
        }
        // AdminScreen.jsx 는 프론트에서 returned_items를 JSON.parse() 하므로
        // DB에서 읽은 텍스트 그대로 전송합니다.
        res.json(rows); // 조회된 내역 배열 반환 (AdminScreen.jsx로)
    });
});

router.get('/fishermen', verifyAdminToken, async (req, res) => {
    console.log(`--- (API) 관리자(${req.admin.username}) 어부 목록 조회 ---`);

    try {
        // 1. 모든 어부 조회
        const sqlFishermen = `
            SELECT id, name, contact, birthdate, borrowing_status 
            FROM fishermen 
            ORDER BY name ASC`;
        const fishermen = await new Promise((resolve, reject) => {
            db.all(sqlFishermen, [], (err, rows) => err ? reject(err) : resolve(rows));
        });

        //★[추가]★) 현재 대여 중인 모든 어구 조회
        const sqlBorrowedGear = `
            SELECT code, current_fisherman_id 
            FROM gear_master 
            WHERE status = 'BORROWED' AND current_fisherman_id IS NOT NULL`;
        const borrowedGear = await new Promise((resolve, reject) => {
            db.all(sqlBorrowedGear, [], (err, rows) => err ? reject(err) : resolve(rows));
        });

        // 3. (★[추가]★) 어구 목록을 어부 ID 기준으로 매핑 (id -> [code1, code2, ...])
        const gearMap = new Map();
        borrowedGear.forEach(gear => {
            if (!gearMap.has(gear.current_fisherman_id)) {
                gearMap.set(gear.current_fisherman_id, []);
            }
            gearMap.get(gear.current_fisherman_id).push(gear.code);
        });

        // 4. (★[추가]★) 어부 목록(fishermen)에 대여 어구 목록(borrowed_gear) 주입
        const results = fishermen.map(fisherman => {
            return {
                ...fisherman,
                borrowed_gear: gearMap.get(fisherman.id) || [] // 대여 어구가 없으면 빈 배열
            };
        });

        res.json(results); // (★[수정]★) 향상된 결과 전송

    } catch (err) {
        console.error('Fishermen List DB Error:', err.message);
        return res.status(500).json({ status: 'ERROR', message: 'DB 조회 중 오류 발생' });
    }
});
/**
 * -----------------------------------------------------
 * API: GET /api/admin/gear
 * (어구 마스터 목록 조회 - ★인증 필요★)
 * -----------------------------------------------------
 */
router.get('/gear', verifyAdminToken, (req, res) => {
    console.log(`--- (API) 관리자(${req.admin.username}) 어구 목록 조회 ---`);

    const sql = `
    SELECT 
        gm.code, 
        gm.type, 
        gm.reward, 
        gm.status, 
        f.name as fisherman_name
    FROM gear_master gm
    LEFT JOIN fishermen f ON gm.current_fisherman_id = f.id
    ORDER BY gm.code ASC`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Gear List DB Error:', err.message);
            return res.status(500).json({ status: 'ERROR', message: 'DB 조회 중 오류 발생' });
        }
        // 프론트엔드로 어구 마스터 목록 배열 전송
        res.json(rows);
    });
});

router.post('/gear/borrow', verifyAdminToken, async (req, res) => {
    const { gear_code, fisherman_id } = req.body;
    console.log(`--- (API) 관리자(${req.admin.username}) 어구 강제 대여 시도 ---`);
    console.log(`Gear Code: ${gear_code}, Fisherman ID: ${fisherman_id}`);

    if (!gear_code || !fisherman_id) {
        return res.status(400).json({ status: 'ERROR', message: '어구 코드와 어부 ID가 모두 필요합니다.' });
    }

    await db.run('BEGIN TRANSACTION');
    try {
        // 1. 어구(gear_master) 상태를 BORROWED로 변경
        // (안전장치) AVAILABLE 상태일 때만 대여 가능하도록 함
        const sqlUpdateGear = `
            UPDATE gear_master 
            SET status = 'BORROWED', current_fisherman_id = ?
            WHERE code = ? AND status = 'AVAILABLE'`;

        // this.changes를 쓰기 위해 function() 사용
        const gearResult = await new Promise((resolve, reject) => {
            db.run(sqlUpdateGear, [fisherman_id, gear_code], function (err) {
                if (err) return reject(err);
                resolve(this);
            });
        });

        if (gearResult.changes === 0) {
            // 어구가 AVAILABLE 상태가 아니었거나, 코드가 없는 경우
            throw new Error('이미 대여 중이거나 유효하지 않은 어구 코드입니다.');
        }

        // 2. 어부(fishermen) 상태를 BORROWING으로 변경
        const sqlUpdateFisherman = `
            UPDATE fishermen 
            SET borrowing_status = 'BORROWING' 
            WHERE id = ?`;

        await new Promise((resolve, reject) => {
            db.run(sqlUpdateFisherman, [fisherman_id], function (err) {
                if (err) return reject(err);
                resolve(this);
            });
        });

        // 3. 트랜잭션 커밋
        await db.run('COMMIT');

        console.log(`-> 대여 성공: ${gear_code} -> fisherman ${fisherman_id}`);
        res.json({ status: 'SUCCESS', message: '어구 대여 처리가 완료되었습니다.' });

    } catch (err) {
        // 4. 오류 시 롤백
        await db.run('ROLLBACK');
        console.error('Admin Borrow Gear Error:', err.message);
        res.status(500).json({ status: 'ERROR', message: err.message || '서버 오류로 대여에 실패했습니다.' });
    }
});

// (필수) 이 라우터 파일을 모듈로 내보내기
module.exports = router;