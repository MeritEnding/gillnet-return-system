// src/mainPage/modals/GuideContainerModal.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import GuideMethodModal from '../GuideMethodModal';
import GuidePolicyModal from '../GuidePolicyModal';
import GuideFaqModal from '../GuideFaqModal';

// ★ [수정됨] 기기 오류 시나리오 6가지로 확장 (소프트웨어 오류 추가)
const ERROR_TYPES = [
  { id: 'FULL', title: '🚨 만재(전체) 알림', detail: '기기 내부에 폐어구가 가득 차서 더 이상 투입할 수 없습니다.\n신속한 수거가 필요합니다.' },
  { id: 'BACK_DOOR', title: '🚪 후문 열림 알림', detail: '기기 후문이 열려 있어 안전을 위해 시스템이 정지되었습니다.\n문을 닫고 잠금 상태를 확인해주세요.' },
  { id: 'FRONT_DOOR', title: '⚠️ 정문 열림 알림', detail: '기기 정문(투입구)이 비정상적으로 열려 있습니다.\n안전을 위해 작동이 중단되었습니다.' },
  { id: 'EMERGENCY', title: '🆘 비상 신호', detail: '비상 정지 버튼이 눌렸거나 심각한 시스템 이상이 감지되었습니다.\n즉각적인 현장 점검이 필요합니다.' },
  { id: 'MOTOR', title: '⚙️ 기계 장치 모터 과부하', detail: '컨베이어 또는 압축 모터에 과부하가 발생했습니다.\n장치 파손 방지를 위해 기기 가동이 차단되었습니다.' },
  { id: 'SW_ERROR', title: '💻 소프트웨어 시스템 오류', detail: '키오스크 내부 프로그램 또는 서버 통신에 오류가 발생했습니다.\n시스템 재부팅 및 원격 네트워크 점검이 필요합니다.' } // ★ 신규 추가
];

const GuideContainerModal = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const isIndonesian = i18n.language.startsWith('id');

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);

  // ★ 오류 시뮬레이션 관련 상태
  const [showErrorSelector, setShowErrorSelector] = useState(false); 
  const [simulatedError, setSimulatedError] = useState(null);        
  const [emailStatus, setEmailStatus] = useState('idle');

  // ★ 특정 오류를 선택했을 때 실행되는 함수
  const triggerErrorSimulation = async (errorObj) => {
    setShowErrorSelector(false);  
    setSimulatedError(errorObj);  
    setEmailStatus('sending');    

    try {
      await axios.post('http://localhost:8080/api/system/error-report', {
        kioskId: 'BUSAN-001',
        location: '부산광역시 기장군 월전리 무인 반납 1호기',
        time: new Date().toLocaleString(),
        errorDetails: `[${errorObj.title}] ${errorObj.detail}`
      });
      console.log("자동 이메일 전송 성공!");
      setEmailStatus('success');
    } catch (err) {
      console.error("자동 이메일 전송 실패:", err);
      setEmailStatus('fail');
    }
  };

  if (showMethodModal) return <GuideMethodModal onClose={() => setShowMethodModal(false)} />;
  if (showPolicyModal) return <GuidePolicyModal onClose={() => setShowPolicyModal(false)} />;
  if (showFaqModal) return <GuideFaqModal onClose={() => setShowFaqModal(false)} />;

  // ==========================================
  // 🚨 1. 가상 오류 발생 시 (화면 전체를 까맣게 덮음)
  // ==========================================
  if (simulatedError) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#1a1a1a', color: '#fff', zIndex: 999999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif'
      }}>
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#d9534f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '30px' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>

        <h1 style={{ fontSize: '3.5rem', margin: '0 0 20px 0', color: '#d9534f' }}>
          {simulatedError.title}
        </h1>
        
        <p style={{ fontSize: '1.8rem', lineHeight: '1.6', textAlign: 'center', color: '#ccc' }}>
          {simulatedError.detail.split('\n').map((line, i) => (
            <React.Fragment key={i}>{line}<br/></React.Fragment>
          ))}
          <br/><br/>관리자에게 자동으로 알림이 전송되었습니다.
        </p>

        <div style={{ marginTop: '40px', padding: '15px 30px', backgroundColor: '#333', borderRadius: '8px', fontSize: '1.2rem' }}>
          관리자 호출 상태: &nbsp;
          {emailStatus === 'sending' && <span style={{ color: '#f0ad4e' }}>전송 중... ⏳</span>}
          {emailStatus === 'success' && <span style={{ color: '#5cb85c' }}>전송 완료 (원격 조치 대기중) ✅</span>}
          {emailStatus === 'fail' && <span style={{ color: '#d9534f' }}>전송 실패 ❌</span>}
        </div>

        <button 
          onClick={() => {
            setSimulatedError(null);
            setEmailStatus('idle');
          }}
          style={{
            marginTop: '60px', padding: '10px 20px', fontSize: '1rem', 
            backgroundColor: 'transparent', color: '#666', border: '1px solid #666', 
            borderRadius: '5px', cursor: 'pointer'
          }}
        >
          [테스트 종료] 시스템 복구하기
        </button>
      </div>
    );
  }

  // ==========================================
  // 🟢 2. 정상 화면 렌더링
  // ==========================================
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="guide-modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="guide-modal-header">
          <button className="guide-back-btn" onClick={onClose}>
            <div className="back-arrow-icon">◀</div>
            <span>{t('btn_back') || '뒤로가기'}</span>
          </button>
          <h1 className="guide-header-title">{t('guide_title') || '이용 안내'}</h1>
        </div>

        <div className="guide-menu-list">
          <button className={`guide-menu-btn ${isIndonesian ? 'auto-height-id' : ''}`} onClick={() => setShowMethodModal(true)}>
            <div className="guide-btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <span className="guide-btn-text">{t('guide_method_button')}</span>
          </button>

          <button className={`guide-menu-btn ${isIndonesian ? 'auto-height-id' : ''}`} onClick={() => setShowPolicyModal(true)}>
            <div className="guide-btn-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M12 3v18" strokeWidth="2.5"/><path d="M6 8l12 0" strokeWidth="2.5"/><path d="M6 8L3 16h6L6 8z" fill="white" fillOpacity="0.2"/><path d="M18 8l-3 8h6l-3-8z" fill="white" fillOpacity="0.2"/><circle cx="12" cy="5" r="2" /><path d="M2 21h20" strokeWidth="2.5"/>
              </svg>
            </div>
            <span className="guide-btn-text">{t('guide_policy_button')}</span>
          </button>

          <button className={`guide-menu-btn ${isIndonesian ? 'auto-height-id' : ''}`} onClick={() => setShowFaqModal(true)}>
            <div className="guide-btn-icon">
              <svg viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
                 <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="8" y1="9" x2="16" y2="9" stroke="#0093D7" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="13" x2="13" y2="13" stroke="#0093D7" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="guide-btn-text">{t('guide_faq_button')}</span>
          </button>

          <button 
            className={`guide-menu-btn ${isIndonesian ? 'auto-height-id' : ''}`} 
            onClick={() => setShowErrorSelector(true)} 
            style={{ backgroundColor: '#fff0f0', border: '2px solid #ffcccc' }}
          >
            <div className="guide-btn-icon">
              <span style={{ fontSize: '2.5rem' }}>🚨</span>
            </div>
            <span className="guide-btn-text" style={{ color: '#d9534f', fontWeight: 'bold' }}>
              오류 테스트
            </span>
          </button>
        </div>

        <div className="guide-info-box">
          <h3>{t('guide_title') || '이용 안내'}</h3>
          <p>
            {(t('guide_caution_text') || '모두의 원활한 이용을 위해\n키오스크와 스캐너는\n정해진 순서대로만 터치하고 사용해주세요.\n기기가 파손되면\n다음 분들이 이용할 수 없습니다.').split('\n').map((line, i) => (
              <React.Fragment key={i}>{line}<br /></React.Fragment>
            ))}
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. 오류 종류 선택 팝업 모달 (6가지로 늘어남) */}
      {/* ============================================================== */}
      {showErrorSelector && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ backgroundColor: '#fff', width: '500px', borderRadius: '12px', padding: '30px', borderTop: '5px solid #d9534f' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#d9534f', fontSize: '1.5rem', marginTop: 0, marginBottom: '20px' }}>테스트할 시스템 오류 선택</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ERROR_TYPES.map((err) => (
                <button
                  key={err.id}
                  onClick={() => triggerErrorSimulation(err)}
                  style={{
                    padding: '12px 20px', fontSize: '1.1rem', fontWeight: 'bold',
                    backgroundColor: '#fff', border: '2px solid #d9534f', color: '#d9534f',
                    borderRadius: '8px', cursor: 'pointer', textAlign: 'left'
                  }}
                  onMouseEnter={(e) => { e.target.style.backgroundColor = '#d9534f'; e.target.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.target.style.backgroundColor = '#fff'; e.target.style.color = '#d9534f'; }}
                >
                  {err.title}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowErrorSelector(false)}
                style={{ padding: '12px 30px', fontSize: '1.2rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GuideContainerModal;