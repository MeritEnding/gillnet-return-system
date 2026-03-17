// routes/completion.js (신규 파일)

const express = require('express');
const router = express.Router();
const db = require('../db/database.js');

/**
 * (Helper) ISO 날짜 문자열을 "YYYY.MM.DD / HH:MM" 형식으로 변환
 */
const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}.${m}.${d} / ${h}:${min}`;
    } catch (e) {
        return 'N/A';
    }
};

/**
 * [GET] /api/completion/summary
 * return_session_id를 받아 최종 확정된 영수증 데이터를 반환합니다.
 */
router.get('/summary', async (req, res) => {
    // 1. 쿼리 파라미터에서 세션 ID를 받습니다. (e.g., /summary?id=RS-...)
    const { id } = req.query; 

    if (!id) {
        return res.status(400).json({ status: 'FAILURE', message: '세션 ID가 필요합니다.' });
    }

    try {
        // 2. DB에서 해당 세션의 최종 반납 데이터를 조회합니다.
        const sql = `SELECT * FROM confirmed_returns WHERE return_session_id = ?`;
        const row = await new Promise((resolve, reject) => {
            db.get(sql, [id], (err, row) => (err ? reject(err) : resolve(row)));
        });

        if (!row) {
            return res.status(404).json({ status: 'FAILURE', message: '해당 반납 내역을 찾을 수 없습니다.' });
        }

        // 3. 영수증에 필요한 데이터 가공
        const returnedItems = JSON.parse(row.returned_items || '[]'); 
        
        // 💡 실제 DB 데이터 사용
        const totalDeposit = row.total_deposit;
        const formattedDate = formatDateTime(row.return_time); // 👈 실제 반납 시간
        const kioskName = "부산광역시 / 무인반납 센터 1점"; // (원래는 row.kiosk_id로 DB 조회)

        // 💡 시뮬레이션 데이터 (DB에 없으므로)
        const weightCollected = (returnedItems.length * 2.5).toFixed(1); // (임시) 개당 2.5kg
        const co2Saved = (returnedItems.length * 0.15).toFixed(1); // (임시) 개당 0.15kg

        // 4. 최종 영수증 데이터 응답
        res.status(200).json({
            status: 'SUCCESS',
            summary: {
                totalDeposit: totalDeposit,
                formattedDate: formattedDate,
                locationName: kioskName,
                co2Saved: co2Saved,
                weightCollected: weightCollected,
            }
        });

    } catch (err) {
        console.error('영수증 데이터 조회 오류:', err.message);
        res.status(500).json({ status: 'FAILURE', message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;