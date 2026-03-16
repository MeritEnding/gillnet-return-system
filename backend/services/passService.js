// services/passService.js
const { exec } = require('child_process');
const path = require('path');
const iconv = require('iconv-lite'); // ★ 방금 설치한 패키지 사용

// 설정값 (환경변수 또는 하드코딩)
const SITE_CODE = process.env.NICE_SITE_CODE || "CD296"; 
const SITE_PASSWORD = process.env.NICE_SITE_PW || "aM1BzX5pf5LI";

// Java Class 및 Jar 경로
const LIB_PATH = path.join(__dirname, '../nice_lib');
// OS 구분 (Windows: ';', Mac/Linux: ':')
const CP_SEPARATOR = process.platform === 'win32' ? ';' : ':';
const FINAL_CLASSPATH = `${LIB_PATH}${CP_SEPARATOR}${path.join(LIB_PATH, 'NiceID_v1.1.jar')}`;

/**
 * Java Bridge 실행 함수 (인코딩 처리 강화)
 */
const runJavaBridge = (mode, data) => {
  return new Promise((resolve, reject) => {
    // 명령어 구성
    const cmd = `java -cp "${FINAL_CLASSPATH}" NiceBridge ${mode} "${SITE_CODE}" "${SITE_PASSWORD}" "${data}"`;

    // ★ 핵심 1: encoding을 'buffer'로 설정 (글자가 깨지기 전 원본 바이트 상태로 받음)
    exec(cmd, { cwd: LIB_PATH, encoding: 'buffer' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Java Exec Error: ${error}`);
        return reject(error);
      }
      
      // ★ 핵심 2: EUC-KR -> UTF-8 변환
      const output = iconv.decode(stdout, 'EUC-KR').trim();

      if (output.startsWith('SUCCESS:')) {
        const resultStr = output.substring(8); // "SUCCESS:" 제거
        resolve(resultStr);
      } else {
        // 에러 메시지도 한글일 수 있으므로 변환된 값을 사용
        reject(new Error(output));
      }
    });
  });
};

module.exports = {
  getEncryptedData: async (reqSeq, returnUrl, errorUrl) => {
    const plainData = [
      `7:REQ_SEQ${reqSeq.length}:${reqSeq}`,
      `8:SITECODE${SITE_CODE.length}:${SITE_CODE}`,
      `9:AUTH_TYPE1:M`, 
      `7:RTN_URL${returnUrl.length}:${returnUrl}`,
      `7:ERR_URL${errorUrl.length}:${errorUrl}`,
      `11:POPUP_GUBUN1:N`,
      `9:CUSTOMIZE0:`,
      `6:MOBILE0:`
    ].join('');

    return await runJavaBridge('ENC', plainData);
  },

  decryptData: async (encData) => {
    const jsonStr = await runJavaBridge('DEC', encData);
    return JSON.parse(jsonStr);
  }
};