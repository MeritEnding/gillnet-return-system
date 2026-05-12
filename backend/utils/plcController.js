// utils/plcController.js

const ModbusRTU = require("modbus-serial");

// ▼▼▼ [서버 죽음 방지 완벽 쉴드] ▼▼▼
// modbus-serial 라이브러리 내부에서 우리가 try-catch로 잡을 수 없게 던지는 
// 비동기 타임아웃 에러를 여기서 낚아채서 Node.js 서버가 뻗는 것을 원천 차단합니다.
process.on('uncaughtException', (err) => {
  if (err.message.includes('TCP Connection Timed Out') || err.message.includes('ECONNRESET')) {
    console.warn('⚠️ [PLC 백그라운드 끊김 감지 - 무시하고 서버 정상 유지]');
  } else {
    console.error('❌ [예상치 못한 치명적 에러]:', err);
  }
});
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// ▼▼▼▼ [설정] PLC IP 주소 확인 ▼▼▼▼
const PLC_IP = "192.168.1.12"; 
const PLC_PORT = 502;
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

class PlcController {
  constructor() {
    this.client = new ModbusRTU();

    this.client.on('error', (err) => {
      console.warn('⚠️ [PLC 클라이언트 에러 감지 - 무시됨]:', err.message);
    });
  }

  async connect() {
    try {
      if (this.client.isOpen) return;
      await this.client.connectTCP(PLC_IP, { port: PLC_PORT });
      this.client.setID(1);
      
      // ★ 핵심 1: 300ms는 '통신 안 한 지 0.3초 지나면' 바로 끊어버리라는 뜻이라 너무 가혹합니다.
      // 1000ms(1초)로 늘려서 즉각 반응은 유지하되 억울하게 끊기는 일은 없도록 수정했습니다.
      this.client.setTimeout(1000); 
      
      console.log("✅ PLC 연결 성공");
    } catch (e) {
      console.error("❌ PLC 연결 실패:", e.message);
      throw e;
    }
  }

  // 기본 코일 쓰기 (재시도 로직 포함)
  async writeCoilWithRetry(address, value, retryCount = 1) {
    try {
      await this.connect();
      await this.client.writeCoil(address, value);
      console.log(`[PLC] Write Addr:${address} Val:${value}`);
    } catch (error) {
      console.error(`⚠️ PLC 오류 (Address: ${address}):`, error.message);
      if (retryCount > 0) {
        // 죽은 소켓을 확실하게 끊어줌
        try { this.client.close(); } catch(err) {} 
        
        // ★ 핵심 2: 재시도 대기 시간 50ms 유지 (끊겨도 0.05초만에 즉각 재연결)
        await new Promise(resolve => setTimeout(resolve, 50)); 
        return this.writeCoilWithRetry(address, value, retryCount - 1);
      }
      throw error; // 재시도 끝내 실패하면 에러 던짐
    }
  }
  
  // ★ [핵심] 펄스 신호 전송 (1 -> 100ms 대기 -> 0)
  async sendPulse(address) {
    try {
      // 1. ON 신호
      await this.writeCoilWithRetry(address, true);
      
      // 2. 500ms 대기 (100ms -> 500ms로 변경: PLC가 확실히 인식하도록)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. OFF 신호
      await this.writeCoilWithRetry(address, false);
      console.log(`[PLC] Pulse Sent to ${address} (ON->500ms->OFF)`);
    } catch (e) {
      console.error(`[PLC] Pulse Error (${address}):`, e.message);
      throw e; // ❌ 에러를 무시하지 않고 바깥으로 던짐!
    }
  }

  // --- [외부 제어 함수] ---

  /** 폐어구 투입구 (100) - 유지형 */
  async setWasteDoor(isOpen) {
    await this.writeCoilWithRetry(100, isOpen);
  }

  /** 바코드 투입구 (101) - 유지형 */
  async setBarcodeDoor(isOpen) {
    await this.writeCoilWithRetry(101, isOpen);
  }

  /** * 컨베이어 작동 (펄스 제어)
   * 161번 Pulse -> Start
   * 3초 후
   * 162번 Pulse -> Stop
   */
  async runConveyor(durationMs = 8000) {
    try {
      console.log(`[PLC] 컨베이어 가동 시작 (Pulse 161)`);
      // 1. 가동 펄스 전송 (161)
      await this.sendPulse(161);

      // 2. 지정 시간 후 정지 펄스 전송 (162)
      setTimeout(async () => {
        try {
          console.log(`[PLC] 컨베이어 정지 신호 전송 (Pulse 162)`);
          await this.sendPulse(162);
        } catch (err) {
          console.error("[PLC] 컨베이어 정지 실패:", err.message);
        }
      }, durationMs);

    } catch (e) {
      console.error("[PLC] 컨베이어 가동 제어 실패:", e.message);
      throw e; // ❌ 가동 펄스 전송 실패 시 에러 던짐!
    }
  }
  // --- [상태 모니터링 함수] ---
  async getAlarmStatus() {
    try {
      await this.connect();
      // 알람 주소가 83부터 105까지 분포되어 있으므로, 83번부터 총 23개의 비트를 한 번에 읽어옵니다.
      const res = await this.client.readCoils(83, 23);
      const bits = res.data;

      // 읽어온 배열(bits)의 인덱스 0번은 83번 주소를 의미합니다.
      return {
        "83": bits[0],  // 만재(후문쪽)
        "85": bits[2],  // 만재(가운데)
        "87": bits[4],  // 만재(정문쪽)
        "88": bits[5],  // 만재(전체)
        "97": bits[14], // 후문 열림
        "99": bits[16], // 정문 열림
        "104": bits[21], // 비상 신호
        "105": bits[22]  // 모터 과부하
      };
    } catch (e) {
      console.error("❌ PLC 알람 상태 읽기 실패:", e.message);
      throw e;
    }
  }
}

module.exports = new PlcController();