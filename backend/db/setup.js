// db/setup.js

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); 
const DBSOURCE = './kiosk.db';

const saltRounds = 10;
const testPin = '1234'; 
const testAdminPin = 'admin1234';

// React Mockup 데이터
const ALL_EXPECTED_ITEMS = [
    { code: '88012345678901', type: '자망형', reward: 3000 },
    { code: '88012345678902', type: '자망형', reward: 2000 },
    { code: '88012345678903', type: '자망형', reward: 1000 },
    { code: '88012345678904', type: '자망형', reward: 3000 },
    { code: '88012345678905', type: '자망형', reward: 2000 },
    { code: '88012345678906', type: '자망형', reward: 1000 },
    { code: '88012345678907', type: '통발', reward: 2000 },
    { code: '88012345678908', type: '통발', reward: 1000 },
    { code: '88012345678909', type: '자망형', reward: 3000 },
    { code: '88012345678910', type: '자망형', reward: 2000 },
    { code: '88012345678911', type: '통발', reward: 1000 },
    { code: '88012345678912', type: '자망형', reward: 3000 },
];

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) { console.error(err.message); throw err; }

    console.log('--- DB 초기 설정(setup)을 시작합니다... ---');

    db.serialize(() => {
        // 1. 'fishermen' 테이블 (★수정: 은행, 계좌번호 컬럼 추가)
        db.run(`CREATE TABLE IF NOT EXISTS fishermen (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            name TEXT NOT NULL, 
            qr_hash TEXT UNIQUE NOT NULL, 
            contact TEXT NOT NULL,
            birthdate TEXT, 
            pin_hash TEXT,
            bank_name TEXT, 
            account_number TEXT,
            borrowing_status TEXT NOT NULL DEFAULT 'IDLE',
            UNIQUE(name, birthdate, contact)
        )`);

        // 2. 'return_sessions' 테이블
        db.run(`CREATE TABLE IF NOT EXISTS return_sessions (
            return_session_id TEXT PRIMARY KEY,          
            kiosk_id TEXT, 
            session_token TEXT, 
            fisherman_id INTEGER,
            expected_quantity INTEGER, 
            status TEXT DEFAULT 'PENDING', 
            created_at TEXT,
            FOREIGN KEY(fisherman_id) REFERENCES fishermen(id)
        )`);

        // 3. 'gear_master' 테이블
        db.run(`CREATE TABLE IF NOT EXISTS gear_master (
            code TEXT PRIMARY KEY, 
            type TEXT, 
            reward INTEGER,
            current_fisherman_id INTEGER,
            status TEXT NOT NULL DEFAULT 'AVAILABLE',
            FOREIGN KEY (current_fisherman_id) REFERENCES fishermen(id)
        )`);

        // 4. 'scanned_items' 테이블
        db.run(`CREATE TABLE IF NOT EXISTS scanned_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            return_session_id TEXT NOT NULL, 
            gear_item_code TEXT NOT NULL, 
            scanned_at TEXT,
            FOREIGN KEY (return_session_id) REFERENCES return_sessions(return_session_id),
            FOREIGN KEY (gear_item_code) REFERENCES gear_master(code),
            UNIQUE(return_session_id, gear_item_code)
        )`);

        // 5. 'confirmed_returns' 테이블
        db.run(`CREATE TABLE IF NOT EXISTS confirmed_returns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_session_id TEXT NOT NULL UNIQUE,
            kiosk_id TEXT,
            fisherman_name TEXT, 
            return_time TEXT,
            photo_filenames TEXT, 
            returned_items TEXT,  
            total_deposit INTEGER,
            confirmed_at TEXT,
            FOREIGN KEY (return_session_id) REFERENCES return_sessions(return_session_id)
        )`);

        // 6. 'kiosk_info' 테이블
        db.run(`CREATE TABLE IF NOT EXISTS kiosk_info (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            kiosk_uid TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            location_area TEXT,
            address TEXT,
            contact_info TEXT,
            status TEXT NOT NULL DEFAULT 'ONLINE',
            storage_status TEXT NOT NULL DEFAULT 'NORMAL',
            last_updated TEXT
        )`);

        // 7. 'administrators' 테이블
        db.run(`CREATE TABLE IF NOT EXISTS administrators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'OPERATOR',
            created_at TEXT
        )`);


        // --- 테스트 데이터 삽입 ---
        const setupPromises = [];

        // (★수정) 은행 정보 포함 INSERT 쿼리
        const insertFisherman = 'INSERT OR IGNORE INTO fishermen (name, qr_hash, contact, birthdate, pin_hash, bank_name, account_number, borrowing_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        // '홍길동' 데이터 (농협은행 / 1234567890)
        setupPromises.push(new Promise((resolve, reject) => {
            bcrypt.hash(testPin, saltRounds, (err, hash) => {
                if (err) return reject(err);
                db.run(insertFisherman, 
                    ["홍길동", 'e1f576b25f464d2e975a6c8e31b01777', "01012345678", "19900101", hash, "농협은행", "1234567890", 'BORROWING'], 
                    (dbErr) => {
                        if (dbErr) reject(dbErr);
                        else { console.log(`✅ '홍길동' (농협은행) 데이터 삽입 완료.`); resolve(); }
                    }
                );
            });
        }));

        // 'JOHONDO' 데이터 (국민은행 / 0987654321)
        setupPromises.push(new Promise((resolve, reject) => {
            bcrypt.hash(testPin, saltRounds, (err, hash) => {
                if (err) return reject(err);
                db.run(insertFisherman, 
                    ["JOHONDO", 'e1f576b25f464d2e975a6c8e31b01888', "01098765432", "19951225", hash, "국민은행", "0987654321", 'IDLE'], 
                    (dbErr) => {
                        if (dbErr) reject(dbErr);
                        else { console.log(`✅ 'JOHONDO' (국민은행) 데이터 삽입 완료.`); resolve(); }
                    }
                );
            });
        }));

        // 'gear_master' 데이터
        const insertGear = 'INSERT OR IGNORE INTO gear_master (code, type, reward, current_fisherman_id, status) VALUES (?,?,?,?,?)';
        ALL_EXPECTED_ITEMS.forEach((item, index) => {
            setupPromises.push(new Promise((resolve, reject) => {
                let params;
                if (index < 6) params = [item.code, item.type, item.reward, 1, 'BORROWED'];
                else if (index < 8) params = [item.code, item.type, item.reward, 2, 'BORROWED'];
                else params = [item.code, item.type, item.reward, null, 'AVAILABLE'];
                db.run(insertGear, params, (err) => err ? reject(err) : resolve());
            }));
        });

        // 'kiosk_info' 데이터
        const insertKiosk = `INSERT OR IGNORE INTO kiosk_info (id, kiosk_uid, name, location_area, address, contact_info) VALUES (?, ?, ?, ?, ?, ?)`;
        setupPromises.push(new Promise((resolve, reject) => {
            db.run(insertKiosk, [1, "BUSAN-001", "무인반납 센터 1점", "부산광역시", "부산광역시 수영구", "010-1111-0000"], (e) => e ? reject(e) : resolve());
        }));

        // 'administrators' 데이터
        const insertAdmin = 'INSERT OR IGNORE INTO administrators (username, password_hash, created_at) VALUES (?,?,?)';
        setupPromises.push(new Promise((resolve, reject) => {
            bcrypt.hash(testAdminPin, saltRounds, (err, hash) => {
                db.run(insertAdmin, ["admin_busan", hash, new Date().toISOString()], (e) => e ? reject(e) : resolve());
            });
        }));

        Promise.all(setupPromises)
            .then(() => {
                console.log('--- DB 초기 설정 완료 ---');
                db.close();
            })
            .catch(err => {
                console.error('설정 중 오류 발생:', err);
                db.close();
            });
    });
});