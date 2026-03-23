// src/certificationPage/GearTypeSelectScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import './GearTypeSelectScreen.css';

// ★ 1. 다운받은 실제 어구 이미지들을 import 합니다.
import ImgHourglass from '../assets/스프링이 설치된 장구형의 통발.png';
import ImgCylinder from '../assets/장어 통발.png';
import ImgGillNet from '../assets/자망어구.png';
import ImgConeSemi from '../assets/원뿔대형(반구형)의 통발.png';
import ImgConeCrab from '../assets/기존 어구.png';

const GearTypeSelectScreen = () => {
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
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
    // ★ 서버 코드와 MyRentals 명칭을 완벽하게 매칭하여 저장
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
              {/* API 1: FISGE (장구형의통발) */}
              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'FISGE', '장구형의통발')}>
                <img src={ImgHourglass} alt="장구형의 통발" className="gear-btn-img" />
                <div className="gear-btn-text">장구형의 통발</div>
              </button>

              {/* API 2: EELTP (장어통발) */}
              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'EELTP', '장어통발')}>
                <img src={ImgCylinder} alt="장어통발" className="gear-btn-img" />
                <div className="gear-btn-text">장어통발</div>
              </button>

              {/* API 3: GILNT (자망) */}
              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'GILNT', '자망(그물)')}>
                <img src={ImgGillNet} alt="자망 (그물)" className="gear-btn-img" />
                <div className="gear-btn-text">자망 (그물)</div>
              </button>

              {/* API 4: FISGE (원뿔대형 통발) */}
              <button className="gear-btn deposit" onClick={() => handleSelect('1', 'FISGE', '원뿔대형(반구형)의 통발')}>
                <img src={ImgConeSemi} alt="원뿔대형 통발" className="gear-btn-img" />
                <div className="gear-btn-text">원뿔대형 통발</div>
              </button>
            </div>
          </div>

          {/* 2. 기존어구 섹션 */}
          {isMember && (
            <div className="gear-section">
              <h3 className="gear-section-title existing">
                기존어구 반환 (포인트 적립)
              </h3>
              <div className="gear-grid single">
                <button className="gear-btn existing" onClick={() => handleSelect('2', 'FISGE', '기존통발어구(바코드)')}>
                  <img src={ImgConeCrab} alt="기존 통발 어구" className="gear-btn-img" />
                  <div className="gear-btn-text">기존 통발 어구 (포인트)</div>
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