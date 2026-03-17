// utils/plcController.js

const ModbusRTU = require("modbus-serial");

// ▼▼▼▼ [설정] PLC IP 주소 확인 ▼▼▼▼
const PLC_IP = "192.168.1.12"; 
const PLC_PORT = 502;
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

class PlcController {
  constructor() {
    this.client = new ModbusRTU();
  }

  async connect() {
    try {
      if (this.client.isOpen) return;
      await this.client.connectTCP(PLC_IP, { port: PLC_PORT });
      this.client.setID(1);
      this.client.setTimeout(2000);
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
        try { await this.client.close(); } catch(err) {}
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.writeCoilWithRetry(address, value, retryCount - 1);
      }
    }
  }

  // ★ [핵심] 펄스 신호 전송 (1 -> 100ms 대기 -> 0)
  async sendPulse(address) {
    try {
      // 1. ON 신호
      await this.writeCoilWithRetry(address, true);
      
      // 2. 100ms 대기
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. OFF 신호
      await this.writeCoilWithRetry(address, false);
      console.log(`[PLC] Pulse Sent to ${address} (ON->100ms->OFF)`);
    } catch (e) {
      console.error(`[PLC] Pulse Error (${address}):`, e.message);
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
  async runConveyor(durationMs = 3000) {
    try {
      console.log(`[PLC] 컨베이어 가동 시작 (Pulse 161)`);
      // 1. 가동 펄스 전송 (161)
      await this.sendPulse(161);

      // 2. 지정 시간 후 정지 펄스 전송 (162)
      setTimeout(async () => {
        console.log(`[PLC] 컨베이어 정지 신호 전송 (Pulse 162)`);
        await this.sendPulse(162);
      }, durationMs);

    } catch (e) {
      console.error("[PLC] 컨베이어 제어 실패:", e.message);
    }
  }
}

module.exports = new PlcController();