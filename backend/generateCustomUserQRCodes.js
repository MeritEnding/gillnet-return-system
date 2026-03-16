const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

// QR 코드를 저장할 폴더
const outputDir = './user_qr_codes_custom';

// 1. QR 코드를 저장할 폴더 생성
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ '${outputDir}' 폴더를 생성했습니다.`);
}

// 2. 커맨드 라인에서 사용자 코드(qr_hash 또는 사용자 식별자) 인자들을 가져옵니다.
const userCodes = process.argv.slice(2);

if (userCodes.length === 0) {
    console.log('⚠️ 생성할 사용자 코드를 커맨드 라인 인자로 전달해주세요.');
    console.log('💡 예시: node generateCustomUserQRCodes.js userhash123 userhash456');
    process.exit(1);
}

console.log(`--- 총 ${userCodes.length}개의 사용자 QR 코드 생성을 시작합니다... ---`);

// 3. 각 사용자 코드별로 QR 코드 이미지 생성
const promises = userCodes.map((userCode) => {
    // 파일명은 입력된 사용자 코드로 설정합니다.
    const filePath = path.join(outputDir, `${userCode}.png`);

    // qrcode.toFile(파일경로, 데이터, [옵션])
    return qrcode.toFile(filePath, userCode, { width: 300 })
        .then(() => {
            console.log(`✅ [${userCode}] QR 코드 생성 완료! -> ${filePath}`);
        })
        .catch(err => {
            console.error(`❌ [${userCode}] QR 코드 생성 실패:`, err);
        });
});

// 4. 모든 작업이 완료되면 종료
Promise.all(promises)
    .then(() => {
        console.log('--- 모든 사용자 QR 코드 생성이 완료되었습니다. ---');
    })
    .catch(err => {
        console.error('QR 코드 생성 중 오류 발생:', err);
    });