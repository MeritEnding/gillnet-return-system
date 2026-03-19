// src/mainPage/modals/GearTypeSelectModal.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './GearTypeSelectModal.css'; // 새로 만들 CSS 파일 연결

const GearTypeSelectModal = ({ onClose }) => {
  const navigate = useNavigate();

  // 어구 선택 시 처리 함수
  const handleSelect = (gvbkType, clsfCd, clsfNm) => {
    localStorage.setItem('selected_gvbk_type', gvbkType); 
    localStorage.setItem('selected_fsgr_clsf_cd', clsfCd); 
    localStorage.setItem('selected_fsgr_clsf_nm', clsfNm); 

    if(onClose) onClose();
    // 선택 완료 후 바코드 스캔 화면으로 이동
    navigate('/certificationPage/scan');
  };

  return (
    <div className="modal-backdrop gear-modal-backdrop" onClick={onClose}>
      <div className="modal-content gear-select-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* 모달 닫기 버튼 */}
        <button className="gear-close-btn" onClick={onClose}>✖</button>

        <h2 className="gear-modal-title">반환하실 어구를 선택해주세요</h2>
        <p className="gear-modal-subtitle">정확한 어구 종류를 선택해야 올바른 보증금이 환급됩니다.</p>
        
        <div className="gear-section">
          <h3 className="gear-section-title">
            <span className="icon-coin">💰</span> 보증금어구 반환 (현금 환급)
          </h3>
          <div className="gear-grid">
            <button className="gear-card-btn deposit-btn" onClick={() => handleSelect('1', 'FISGE', '통발어구')}>
              <div className="gear-icon">🦀</div>
              <span className="gear-name">통발 어구</span>
            </button>
            <button className="gear-card-btn deposit-btn" onClick={() => handleSelect('1', 'EELTP', '장어통발어구')}>
              <div className="gear-icon">🐍</div>
              <span className="gear-name">장어통발 어구</span>
            </button>
            <button className="gear-card-btn deposit-btn" onClick={() => handleSelect('1', 'GILNT', '자망어구')}>
              <div className="gear-icon">🕸️</div>
              <span className="gear-name">자망 어구</span>
            </button>
            <button className="gear-card-btn deposit-btn" onClick={() => handleSelect('1', 'ABUOY', '부표통발어구')}>
              <div className="gear-icon">🎈</div>
              <span className="gear-name">부표통발 어구</span>
            </button>
          </div>
        </div>

        <div className="gear-section" style={{ marginTop: '40px' }}>
          <h3 className="gear-section-title">
            <span className="icon-gift">🎁</span> 기존어구 반환 (포인트 적립 - 회원 전용)
          </h3>
          <div className="gear-grid" style={{ gridTemplateColumns: '1fr' }}>
            <button className="gear-card-btn existing-btn" onClick={() => handleSelect('2', 'FISGE', '통발어구(기존)')}>
              <div className="gear-icon">📦</div>
              <span className="gear-name">기존 통발 어구</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default GearTypeSelectModal;