// src/certificationPage/GearTypeSelectScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';

// 필요하다면 기존 모달에서 쓰던 CSS를 가져와서 사용하세요.
// import '../mainPage/modals/GearTypeSelectModal.css'; 

const GearTypeSelectScreen = () => {
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에 저장된 'is_member' 값을 통해 회원 여부를 판단합니다.
    // 기존어구는 비회원이 반환할 수 없으므로 이 값이 중요합니다. 
    const memberStatus = localStorage.getItem('is_member');
    setIsMember(memberStatus === 'true');
  }, []);

  // 뒤로 가기 핸들러
  const handleGoBack = () => {
    navigate(-1);
  };

  // 어구 선택 시 처리 함수
  const handleSelect = (gvbkType, clsfCd, clsfNm) => {
    // 1: 보증금어구, 2: 기존어구 [cite: 502]
    localStorage.setItem('selected_gvbk_type', gvbkType); 
    // API 요청에 필요한 어구분류코드 (FISGE, EELTP 등) [cite: 201, 213]
    localStorage.setItem('selected_fsgr_clsf_cd', clsfCd); 
    localStorage.setItem('selected_fsgr_clsf_nm', clsfNm); 

    // 선택 완료 후 바코드 스캔 화면으로 이동합니다.
    navigate('/certificationPage/scan');
  };

  return (
    <div className="wrapper" style={{ backgroundImage: `url(${BgImage})`, minHeight: '100vh', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <Header />
      
      {/* 상단 뒤로가기 버튼 영역 (다른 스크린들과 통일감 부여) */}
      <div style={{ padding: '20px 40px' }}>
        <button 
          onClick={handleGoBack}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', 
            background: 'transparent', border: 'none', color: '#fff', 
            fontSize: '1.5rem', cursor: 'pointer', fontWeight: 'bold' 
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          뒤로가기
        </button>
      </div>

      <div className="gear-select-container" style={{ padding: '0 50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <h2 style={{ fontSize: '3rem', color: '#fff', marginBottom: '10px' }}>반환하실 어구를 선택해주세요</h2>
        <p style={{ fontSize: '1.5rem', color: '#ddd', marginBottom: '40px' }}>정확한 어구 종류를 선택해야 올바른 보증금이 환급됩니다.</p>
        
        <div style={{ width: '100%', maxWidth: '800px', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          
          {/* 1. 보증금어구 섹션 (회원/비회원 공통) */}
          <div className="gear-section">
            <h3 style={{ fontSize: '2rem', color: '#105E7C', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
              <span className="icon-coin">💰</span> 보증금어구 반환 (현금 환급)
            </h3>
            
            {/* 확장된 보증금어구 목록 [cite: 8] */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <button 
                onClick={() => handleSelect('1', 'FISGE', '통발어구')}
                style={{ padding: '20px', fontSize: '1.5rem', borderRadius: '15px', border: '2px solid #009BD9', backgroundColor: '#fff', color: '#333', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🦀 통발 어구
              </button>
              <button 
                onClick={() => handleSelect('1', 'EELTP', '장어통발어구')}
                style={{ padding: '20px', fontSize: '1.5rem', borderRadius: '15px', border: '2px solid #009BD9', backgroundColor: '#fff', color: '#333', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🐍 장어통발 어구
              </button>
              <button 
                onClick={() => handleSelect('1', 'GILNT', '자망어구')}
                style={{ padding: '20px', fontSize: '1.5rem', borderRadius: '15px', border: '2px solid #009BD9', backgroundColor: '#fff', color: '#333', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🕸️ 자망 어구
              </button>
              <button 
                onClick={() => handleSelect('1', 'ABUOY', '부표통발어구')}
                style={{ padding: '20px', fontSize: '1.5rem', borderRadius: '15px', border: '2px solid #009BD9', backgroundColor: '#fff', color: '#333', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🎈 부표통발 어구
              </button>
            </div>
          </div>

          {/* 2. 기존어구 섹션 (회원 전용)  */}
          {isMember && (
            <div className="gear-section" style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '2rem', color: '#28a745', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <span className="icon-gift">🎁</span> 기존어구 반환 (포인트 적립 - 회원 전용)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                <button 
                  onClick={() => handleSelect('2', 'FISGE', '통발어구(기존)')}
                  style={{ padding: '20px', fontSize: '1.5rem', borderRadius: '15px', border: '2px solid #28a745', backgroundColor: '#fff', color: '#333', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  📦 기존 통발 어구
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default GearTypeSelectScreen;