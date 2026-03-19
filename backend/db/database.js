// db/database.js

const sqlite3 = require('sqlite3').verbose();

// (중요) DB 파일 경로. './kiosk.db'라는 파일명으로 DB가 생성됩니다.
const DBSOURCE = './kiosk.db'; 

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    // DB 연결 실패
    console.error(err.message);
    throw err;
  } else {
    console.log('로컬 SQLite DB에 성공적으로 연결되었습니다.');
  }
});

// 다른 파일에서 db 객체를 import할 수 있도록 export
module.exports = db;