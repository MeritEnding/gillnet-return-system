const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

// QR 코드를 저장할 폴더
const outputDir = './gear_qr_codes_custom';

// 1. QR 코드를 저장할 폴더 생성
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ '${outputDir}' 폴더를 생성했습니다.`);
}

// 2. 커맨드 라인에서 어구 코드 인자들을 가져옵니다.
const gearCodes = process.argv.slice(2);

if (gearCodes.length === 0) {
    console.log('⚠️ 생성할 어구 코드를 커맨드 라인 인자로 전달해주세요.');
    console.log('💡 예시: node generateCustomGearQRCodes.js 88012345678901 88012345678902');
    process.exit(1);
}

console.log(`--- 총 ${gearCodes.length}개의 어구 QR 코드 생성을 시작합니다... ---`);

// 3. 각 어구 코드별로 QR 코드 이미지 생성
const promises = gearCodes.map((gearCode) => {
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

// 4. 모든 작업이 완료되면 종료
Promise.all(promises)
    .then(() => {
        console.log('--- 모든 어구 QR 코드 생성이 완료되었습니다. ---');
    })
    .catch(err => {
        console.error('QR 코드 생성 중 오류 발생:', err);
    });
