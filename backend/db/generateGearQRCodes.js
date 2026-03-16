const sqlite3 = require('sqlite3').verbose();
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const DBSOURCE = './kiosk.db';
// '어업인' QR과 구분하기 위해 새 폴더 이름을 사용합니다.
const outputDir = './gear_qr_codes'; 

// 1. QR 코드를 저장할 폴더 생성
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ '${outputDir}' 폴더를 생성했습니다.`);
}

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error('DB 연결 실패:', err.message);
        throw err;
    }
    console.log('✅ DB 연결 성공. (kiosk.db)');

    // 2. 'gear_master' 테이블에서 모든 어구 코드를 조회합니다.
    const sql = "SELECT code FROM gear_master";
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('어구 정보 조회 실패:', err.message);
            return db.close();
        }

        if (rows.length === 0) {
            console.log('⚠️ DB에 어구 데이터가 없습니다. 먼저 setup.js를 실행하세요.');
            return db.close();
        }

        console.log(`--- 총 ${rows.length}개의 어구 QR 코드 생성을 시작합니다... ---`);

        // 3. 각 어구 코드별로 QR 코드 이미지 생성
        const promises = rows.map((row) => {
            const gearCode = row.code; // 예: '88012345678901'
            const filePath = path.join(outputDir, `${gearCode}.png`);

            // qrcode.toFile(파일경로, 데이터, [옵션])
            return qrcode.toFile(filePath, gearCode, { width: 300 })
                .then(() => {
                    console.log(`✅ [${gearCode}] QR 코드 생성 완료! -> ${filePath}`);
                })
                .catch(err => {
                    console.error(`❌ [${gearCode}] QR 코드 생성 실패:`, err);
                });
        });

        // 4. 모든 작업이 완료되면 DB 연결 종료
        Promise.all(promises)
            .then(() => {
                console.log('--- 모든 어구 QR 코드 생성이 완료되었습니다. ---');
                db.close((err) => {
                    if (err) console.error('DB 닫기 오류:', err.message);
                    else console.log('✅ DB 연결이 종료되었습니다.');
                });
            })
            .catch(err => {
                console.error('QR 코드 생성 중 오류 발생:', err);
                db.close();
            });
    });
});