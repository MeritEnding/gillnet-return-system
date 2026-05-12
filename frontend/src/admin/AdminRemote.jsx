// src/pages/AdminRemote.jsx
import React from 'react';
import axios from 'axios';
import './AdminRemote.css'; // ★ 우리가 만든 산업용 Dark Mode CSS 파일을 불러옵니다.

const AdminRemote = () => {
  // 백엔드 API 주소 (환경에 맞게 수정 가능)
  const API_BASE_URL = 'http://127.0.0.1:8080/api/system';

  // 특정 에러 강제 발생 함수 (테스트용)
  const triggerError = async (errorId, title) => {
    try {
      await axios.get(`${API_BASE_URL}/test/${errorId}`);
      // alert는 브라우저 기본이므로 그대로 유지하거나, 나중에 React 전용 Toast로 바꾸면 더 전문적입니다.
      alert(`🚨 [${title}] 에러 신호 전송 완료!\n키오스크 화면이 3초 내로 점검 화면으로 바뀝니다.`);
    } catch (error) {
      console.error('에러 신호 전송 실패:', error);
      alert('통신 실패: 백엔드 서버가 켜져 있는지 확인해 주세요.');
    }
  };

  // 모든 에러 해제 및 정상 복구 함수
  const clearAllErrors = async () => {
    try {
      await axios.get(`${API_BASE_URL}/test/clear`);
      alert('✅ 모든 에러가 초기화되었습니다.\n키오스크가 정상 작동 상태로 돌아갑니다.');
    } catch (error) {
      console.error('에러 초기화 실패:', error);
      alert('통신 실패: 백엔드 서버를 확인해 주세요.');
    }
  };

  // 에러 버튼 목록 데이터
  const errorButtons = [
    { id: "88", label: "만재 알람 (전체)" },
    { id: "83", label: "만재 알람 (후문쪽)" },
    { id: "85", label: "만재 알람 (가운데)" },
    { id: "87", label: "만재 알람 (정문쪽)" },
    { id: "97", label: "후문 열림 감지" },
    { id: "99", label: "정문 열림 감지" },
    { id: "104", label: "비상 정지 신호" },
    { id: "105", label: "모터 과부하 알람" },
  ];

  return (
    <div className="admin-remote-container">
      <h1 className="admin-title">
        SYSTEM ERROR SIMULATOR (REMOTE)
      </h1>
      <p className="admin-description">
        아래 패널의 버튼을 클릭하여 폐어구 무인 반납기 키오스크의 각 PLC 알람 상태를 강제로 발생시키거나 복구합니다.<br/>
        이 페이지는 회사 내부 관리자 및 유지보수 인력 전용입니다.
      </p>

      {/* 에러 발생 버튼 그리드 */}
      <div className="error-grid">
        {errorButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => triggerError(btn.id, btn.label)}
            className="error-button"
            title={`${btn.label} 시뮬레이션 시작`}
          >
            {/* label과 code를 감싸는 span을 없애서 flex 정렬이 잘 먹도록 수정 */}
            {btn.label}
            <span className="error-code">PLC Address: {btn.id}</span>
          </button>
        ))}
      </div>

      {/* 강력한 복구 버튼 */}
      <button onClick={clearAllErrors} className="recovery-button" title="모든 시스템 알람 해제 및 정상 복구">
         RESET & CLEAR ALL ALARMS
      </button>
    </div>
  );
};

export default AdminRemote;