// routes/deposit.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../db/database.js');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const plc = require('../utils/plcController'); 
const JWT_SECRET = process.env.JWT_SECRET;

// 1. 투입 화면 진입 시 -> 폐어구 투입구 열기
router.post('/init', async (req, res) => {
    try {
        console.log("-> PLC: 폐어구 투입구 열기 요청");
        await Promise.race([
            plc.setWasteDoor(true),
            new Promise((_, reject) => setTimeout(() => reject(new Error('PLC Timeout')), 3000))
        ]);
        res.status(200).json({ status: 'SUCCESS', message: 'Waste Door Opened' });
    } catch(e) {
        console.warn(`[HW Bypass] Init Door Error/Timeout: ${e.message}`);
        res.status(200).json({ status: 'SUCCESS', message: 'Waste Door (Bypassed)' });
    }
});

// 2. 사진 촬영 후 -> 컨베이어 구동
router.post('/action/conveyor', async (req, res) => {
    try {
        console.log("-> PLC: 컨베이어 가동 요청");
        await Promise.race([
            plc.runConveyor(4000),
            new Promise((_, reject) => setTimeout(() => reject(new Error('PLC Timeout')), 3000))
        ]);
        res.status(200).json({ status: 'SUCCESS', message: 'Conveyor Started' });
    } catch(e) {
        console.warn(`[HW Bypass] Conveyor Error/Timeout: ${e.message}`);
        res.status(200).json({ status: 'SUCCESS', message: 'Conveyor (Bypassed)' });
    }
});

// 3. 투입구 닫기 버튼용 API
router.post('/action/close-doors', async (req, res) => {
    try {
        const isLast = req.body.isLast; 
        console.log(`-> PLC: 투입구 닫음 (마지막 어구 여부: ${isLast})`);
        
        const tasks = [plc.setWasteDoor(false)];
        if (isLast) tasks.push(plc.setBarcodeDoor(false));

        await Promise.race([
            Promise.all(tasks),
            new Promise((_, reject) => setTimeout(() => reject(new Error('PLC Timeout')), 3000))
        ]);

        res.status(200).json({ status: 'SUCCESS', message: 'Doors Closed' });
    } catch(e) {
        console.warn(`[HW Bypass] Close Doors Error/Timeout: ${e.message}`);
        res.status(200).json({ status: 'SUCCESS', message: 'Doors Closed (Bypassed)' });
    }
});

// 4. 클리닝 시퀀스 (확인 완료 시 잔류 어구 완전 적재)
router.post('/action/cleaning', async (req, res) => {
    try {
        console.log("-> PLC: 클리닝 시퀀스 가동 (투입구 닫힘 재확인 및 컨베이어 추가 구동)");
        
        // 안전을 위해 문이 닫혔는지 다시 한번 확실히 제어
        await plc.setWasteDoor(false);
        await plc.setBarcodeDoor(false);
        
        // 벨트 위에 남은 마지막 어구가 적재함으로 완전히 떨어지도록 10초간 추가 구동
        plc.runConveyor(18000); 
        
        res.status(200).json({ status: 'SUCCESS', message: 'Cleaning Sequence Started' });
    } catch(e) {
        console.error("클리닝 시퀀스 실패:", e);
        res.status(500).json({ status: 'FAILURE' });
    }
});


// ----------------------------------------

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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const return_session_id = req.body.return_session_id || 'UNKNOWN_SESSION';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, `${return_session_id}_${uniqueSuffix}`);
    }
});
const upload = multer({ storage: storage }).array('photo', 20);

router.get('/list/:sessionId', verifySessionToken, async (req, res) => {
    const { sessionId } = req.params;
    const fishermanId = req.user.id;

    try {
        const sqlGetScanned = `
            SELECT si.gear_item_code as code, gm.type, gm.reward
            FROM scanned_items si
            JOIN gear_master gm ON si.gear_item_code = gm.code
            WHERE si.return_session_id = ?`;

        const items = await new Promise((resolve, reject) => {
            db.all(sqlGetScanned, [sessionId], (err, rows) => err ? reject(err) : resolve(rows || []));
        });

        const totalDeposit = items.reduce((sum, item) => sum + item.reward, 0);

        res.status(200).json({
            status: 'SUCCESS',
            items: items,
            totalDeposit: totalDeposit
        });
    } catch (err) {
        res.status(500).json({ status: 'FAILURE', message: 'Error' });
    }
});

router.post('/list/confirm-with-photo', verifySessionToken, upload, async (req, res) => {
    console.log('--- 최종 반납 확인 요청 ---');
    const { kiosk_id, return_session_id, confirmation } = req.body;
    const fishermanId = req.user.id;

    if (!req.files || req.files.length === 0) return res.status(400).json({ status: 'FAILURE', message: 'No Photos' });
    
    try {
        await db.run('BEGIN TRANSACTION');

        const fishermanInfo = await new Promise((resolve, reject) => {
            db.get(`SELECT name FROM fishermen WHERE id = ?`, [fishermanId], (err, row) => err ? reject(err) : resolve(row));
        });

        const fishermanName = fishermanInfo.name;
        const currentTime = new Date().toISOString();
        const photoFilenames = JSON.stringify(req.files.map(f => f.filename));

        const sqlGetScanned = `
            SELECT si.gear_item_code as code, gm.type, gm.reward
            FROM scanned_items si
            JOIN gear_master gm ON si.gear_item_code = gm.code
            WHERE si.return_session_id = ?`;
        const scannedItemsList = await new Promise((resolve, reject) => {
            db.all(sqlGetScanned, [return_session_id], (err, rows) => err ? reject(err) : resolve(rows || []));
        });

        const totalDepositAmount = scannedItemsList.reduce((sum, item) => sum + item.reward, 0);
        const returnedItemsJson = JSON.stringify(scannedItemsList);

        const sqlInsertConfirm = `
            INSERT OR IGNORE INTO confirmed_returns 
            (return_session_id, kiosk_id, fisherman_name, return_time, photo_filenames, returned_items, total_deposit, confirmed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await new Promise((resolve, reject) => {
            db.run(sqlInsertConfirm, [
                return_session_id, kiosk_id, fishermanName, currentTime,
                photoFilenames, returnedItemsJson, totalDepositAmount, currentTime
            ], function (err) { err ? reject(err) : resolve(this); });
        });

        const sqlUpdateSession = `UPDATE return_sessions SET status = 'CONFIRMED' WHERE return_session_id = ?`;
        await new Promise((resolve, reject) => {
            db.run(sqlUpdateSession, [return_session_id], function (err) { err ? reject(err) : resolve(this); });
        });

        const sqlUpdateGear = `UPDATE gear_master SET status = 'AVAILABLE', current_fisherman_id = NULL WHERE code = ? AND current_fisherman_id = ?`;
        for (const item of scannedItemsList) {
            await new Promise((resolve, reject) => {
                db.run(sqlUpdateGear, [item.code, fishermanId], function (err) { err ? reject(err) : resolve(this); });
            });
        }

        const sqlCheckRemainingGear = `SELECT COUNT(*) as count FROM gear_master WHERE current_fisherman_id = ? AND status = 'BORROWED'`;
        const remainingGear = await new Promise((resolve, reject) => {
            db.get(sqlCheckRemainingGear, [fishermanId], (err, row) => err ? reject(err) : resolve(row));
        });

        if (remainingGear && remainingGear.count === 0) {
            await new Promise((resolve, reject) => {
                db.run(`UPDATE fishermen SET borrowing_status = 'IDLE' WHERE id = ?`, [fishermanId], function (err) { err ? reject(err) : resolve(this); });
            });
        }

        await db.run('COMMIT');

        // 안전 장치: 최종적으로 확실하게 닫기 신호 전송
        plc.setWasteDoor(false);
        plc.setBarcodeDoor(false);

        res.status(200).json({
            status: 'SUCCESS',
            message: '반납이 최종 확인되었습니다.',
            return_status: 'CONFIRMED'
        });

    } catch (err) {
        try { await db.run('ROLLBACK'); } catch (e) {}
        console.error('오류:', err.message);
        res.status(500).json({ status: 'FAILURE', message: 'Server Error' });
    }
});

module.exports = router;