const sqlite3 = require('sqlite3').verbose();
const qrcode = require('qrcode');
const fs = require('fs'); // 파일 시스템 모듈 (폴더 생성용)
const path = require('path'); // 경로 모듈

const DBSOURCE = './kiosk.db';
const outputDir = './qr_codes'; // QR 코드를 저장할 폴더

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

    const sql = "SELECT id, name, qr_hash FROM fishermen";
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('어업인 정보 조회 실패:', err.message);
            return db.close();
        }

        if (rows.length === 0) {
            console.log('⚠️ DB에 어업인 데이터가 없습니다. 먼저 setup.js를 실행하세요.');
            return db.close();
        }

        console.log(`--- 총 ${rows.length}명의 어업인 QR 코드 생성을 시작합니다... ---`);

        // 각 어업인별로 QR 코드 생성
        const promises = rows.map((row) => {
            const qrData = row.qr_hash; // QR 코드에 담길 데이터 (e.g., 'e1f576b25f464d2e975a6c8e31b01777')
            
            // 파일명: '1_홍길동.png', '2_JOHONDO.png' ...
            const fileName = `${row.id}_${row.name.replace(/\s+/g, '_')}.png`; 
            const filePath = path.join(outputDir, fileName);

            // qrcode.toFile(파일경로, 데이터, [옵션], 콜백)
            return qrcode.toFile(filePath, qrData, { width: 300 })
                .then(() => {
                    console.log(`✅ [${row.name}]님의 QR 코드 생성 완료! -> ${filePath}`);
                })
                .catch(err => {
                    console.error(`❌ [${row.name}]님 QR 코드 생성 실패:`, err);
                });
        });

        // 모든 QR 코드 생성이 완료되면 DB 연결 종료
        Promise.all(promises)
            .then(() => {
                console.log('--- 모든 QR 코드 생성이 완료되었습니다. ---');
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