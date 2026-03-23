// src/certificationPage/GearTypeSelectScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import './GearTypeSelectScreen.css';

// ★ 이미지 경로를 실제 프로젝트에 맞게 임포트 해주세요! ★
import StandardTrapImg from '../assets/원통형의 통발.png';
import EelTrapImg from '../assets/스프링이 설치된 장구형의 통발.png';
import BuoyTrapImg from '../assets/원뿔대형(반구형)의 통발.png';
import SquareTrapImg from '../assets/사각형 통발.png';
import GillNetImg from '../assets/자망어구.png'; 

const GearTypeSelectScreen = () => {
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    // ★ 중복 코드 제거! 오직 mbr_no(회원번호) 유무로만 확실하게 검증합니다.
    // 기존어구는 회원번호가 필수이므로, 비회원은 절대 볼 수 없습니다.
    const mbrNo = localStorage.getItem('mbr_no');
    
    if (mbrNo && mbrNo !== 'undefined' && mbrNo !== 'null' && mbrNo.trim() !== '') {
      setIsMember(true);
    } else {
      setIsMember(false);
    }
  }, []);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSelect = (gvbkType, clsfCd, clsfNm) => {
    localStorage.setItem('selected_gvbk_type', gvbkType); 
    localStorage.setItem('selected_fsgr_clsf_cd', clsfCd); 
    localStorage.setItem('selected_fsgr_clsf_nm', clsfNm); 

    navigate('/certificationPage/scan');
  };

  return (
    <div className="gear-wrapper" style={{ backgroundImage: `url(${BgImage})` }}>
      <Header />
      
      <button className="gear-back-btn" onClick={handleGoBack}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        처음으로
      </button>

      {/* 메인 콘텐츠 영역 */}
      <div className="gear-content-area">
        
        <h2 className="gear-page-title">반환하실 어구를 터치해주세요</h2>
        <p className="gear-page-subtitle">동일한 어구를 선택하고 반납을 해야 보증금이 환급됩니다.</p>
        
        <div className="gear-card">
          
          {/* 1. 보증금어구 섹션 */}
          <div className="gear-section">
            <h3 className="gear-section-title deposit">
             보증금어구 반환 (현금 환급)
            </h3>
            
            <div className="gear-grid">
              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'FISGE', '통발어구')}>
                <img src={StandardTrapImg} alt="통발 어구" className="gear-btn-img" />
                <span className="gear-btn-text">통발 어구</span>
              </button>

              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'EELTP', '장어통발어구')}>
                <img src={EelTrapImg} alt="장어통발 어구" className="gear-btn-img" />
                <span className="gear-btn-text">장어통발 어구</span>
              </button>

              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'GILNT', '자망어구')}>
                <img src={GillNetImg} alt="자망 어구" className="gear-btn-img" />
                <span className="gear-btn-text">자망 어구</span>
              </button>

              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'ABUOY', '부표통발어구')}>
                <img src={BuoyTrapImg} alt="부표통발 어구" className="gear-btn-img" />
                <span className="gear-btn-text">부표통발 어구</span>
              </button>

              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'SQRTAP', '사각형통발')}>
                <img src={SquareTrapImg} alt="사각형 통발" className="gear-btn-img" />
                <span className="gear-btn-text">사각형 통발</span>
              </button>
            </div>
          </div>

          {/* 2. 기존어구 섹션 (★ 회원에게만 보임) */}
          {isMember && (
            <div className="gear-section">
              <h3 className="gear-section-title existing">
                기존어구 반환 (포인트 적립)
              </h3>
              <div className="gear-grid single">
                <button className="gear-btn existing" onClick={() => handleSelect('2', 'FISGE', '통발어구(기존)')}>
                  <span className="gear-btn-text">기존 통발 어구 (포인트)</span>
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