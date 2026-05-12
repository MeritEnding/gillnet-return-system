// src/certificationPage/GearTypeSelectScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import './GearTypeSelectScreen.css';

// ★ 불필요한 이미지 삭제하고 딱 필요한 2개만 남겼습니다.
import ImgHourglass from '../assets/스프링이 설치된 장구형의 통발.png';
import ImgConeCrab from '../assets/기존 어구.png';

const GearTypeSelectScreen = () => {
  const { t } = useTranslation();
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
        {t('gear_btn_home') || '처음으로'}
      </button>

      <div className="gear-content-area">
        
        <h2 className="gear-page-title">{t('gear_page_title') || '반환하실 어구를 터치해주세요'}</h2>
        <p className="gear-page-subtitle">{t('gear_page_subtitle') || '동일한 어구를 선택하고 반납을 해야 보증금이 환급됩니다.'}</p>
        
        <div className="gear-card massive-layout">
          
          {/* 1. 보증금어구 버튼 (초대형) */}
          <button 
            className="gear-btn-massive deposit-massive" 
            onClick={() => handleSelect('1', 'FISGE', '장구형의통발')}
          >
            <div className="massive-badge deposit-badge">
              {t('gear_section_deposit') || '보증금어구 반환 (현금 환급)'}
            </div>
            <img src={ImgHourglass} alt="장구형의 통발" className="gear-img-massive" />
            <div className="gear-text-massive">{t('gear_type_hourglass') || '장구형의 통발'}</div>
          </button>

          {/* 2. 기존어구 버튼 (초대형) - 회원일 경우에만 노출 */}
          {isMember && (
            <button 
              className="gear-btn-massive existing-massive" 
              onClick={() => handleSelect('2', 'FISGE', '기존통발어구(바코드)')}
            >
              <div className="massive-badge existing-badge">
                {t('gear_section_existing') || '기존어구 반환 (포인트 적립)'}
              </div>
              <img src={ImgConeCrab} alt="기존 통발 어구" className="gear-img-massive" />
              <div className="gear-text-massive">{t('gear_type_existing_trap') || '기존 통발 어구 (포인트)'}</div>
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default GearTypeSelectScreen;