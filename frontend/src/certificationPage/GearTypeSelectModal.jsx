// src/mainPage/modals/GearTypeSelectModal.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './GearTypeSelectModal.css';

const API_BASE_URL = 'http://localhost:8080/api/v1/proxy';

const GearTypeSelectModal = ({ onClose }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  // 어구 선택 시 처리 함수 (API 호출 후 이동)
  const handleSelect = async (gvbkType, clsfCd, clsfNm) => {
    if (isLoading) return; // 중복 클릭 방지
    setIsLoading(true);

    try {
      // 1. 서버에 보낼 페이로드 구성
      const payload = {
        user_fshnd_no: localStorage.getItem('fisherman_id') || '',
        fsgr_clsf_cd: clsfCd,
        korn_flnm: localStorage.getItem('fisherman_name') || '비회원',
        brdt: localStorage.getItem('birthdate') || '1990-01-01',
        mbl_telno: localStorage.getItem('fisherman_phone') || '',
        bank_cd: localStorage.getItem('bank_cd') || '',
        actno: localStorage.getItem('actno') || '',
        acct_nm: localStorage.getItem('acct_nm') || '',
        kiosk_no: 'KIOSK_01'
      };

      // 2. 어구 타입에 따른 API 주소 선택
      const url = gvbkType === '1' 
        ? `${API_BASE_URL}/deposit/return/remg/start` 
        : `${API_BASE_URL}/deposit/return/romg/start`;

      console.log("🚀 [반환 시작 요청]:", url, payload);
      const res = await axios.post(url, payload);
      console.log("✅ [반환 시작 응답]:", res.data);

      // 3. 서버 응답 성공 시
      if (res.data && (res.data.status == 200 || res.data.message?.includes('시작') || res.data.message?.includes('성공'))) {
        
        // 보증금어구는 gvbk_mng_no, 기존어구는 bfr_fsgr_gvbk_no 로 넘어옴 [cite: 243, 463]
        const mngNo = gvbkType === '1' 
          ? res.data.data?.gvbk_mng_no 
          : res.data.data?.bfr_fsgr_gvbk_no;

        if (!mngNo) throw new Error("서버 응답에 반환 관리번호가 없습니다.");

        // ★ 성공 시 발급받은 '세션 관리번호'와 '어구 정보'를 로컬 스토리지에 저장
        localStorage.setItem('session_mng_no', mngNo); 
        localStorage.setItem('selected_gvbk_type', gvbkType); 
        localStorage.setItem('selected_fsgr_clsf_cd', clsfCd); 
        localStorage.setItem('selected_fsgr_clsf_nm', clsfNm); 

        // 4. 스캔 화면으로 이동
        if(onClose) onClose();
        navigate('/certificationPage/scan');

      } else {
        throw new Error(res.data.message || "세션 발급 실패");
      }
    } catch (err) {
      console.error("❌ [반환 시작 에러]:", err);
      const serverErrorMsg = err.response?.data?.message || err.message;
      alert(`반납 세션을 시작할 수 없습니다.\n사유: ${serverErrorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop gear-modal-backdrop" onClick={onClose}>
      <div className="modal-content gear-select-modal" onClick={(e) => e.stopPropagation()}>
        
        <button className="gear-close-btn" onClick={onClose}>✖</button>

        <h2 className="gear-modal-title">반환하실 어구를 선택해주세요</h2>
        <p className="gear-modal-subtitle">정확한 어구 종류를 선택해야 올바른 보증금이 환급됩니다.</p>
        
        {/* 로딩 중일 때 화면을 살짝 덮어줌 */}
        {isLoading && (
          <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(255,255,255,0.7)', zIndex:10, display:'flex', justifyContent:'center', alignItems:'center', fontSize:'2rem', fontWeight:'bold', color:'#00A0E9'}}>
            서버와 연결 중입니다...
          </div>
        )}

        <div className="gear-section">
          <h3 className="gear-section-title">
            <span className="icon-coin">💰</span> 보증금어구 반환 (현금 환급)
          </h3>
          <div className="gear-grid">
            <button className="gear-card-btn deposit-btn" onClick={() => handleSelect('1', 'FISGE', '통발어구')}>
              <div className="gear-icon">🦀</div>
              <span className="gear-name">장구형의 통발 어구</span>
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