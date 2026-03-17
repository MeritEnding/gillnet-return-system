import React from 'react';
import { useTranslation } from 'react-i18next';
import MascotImage from '../assets/mascot.png';

const InfoBanner = ({ onContactClick }) => {
  const { t, i18n } = useTranslation();

  return (
    // ★ [수정] data-lang 속성 추가 (CSS에서 언어별 스타일 적용 위해)
    <div className="info-banner-card" data-lang={i18n.language}>
      
      {/* [왼쪽] 마스코트 + 텍스트 */}
      <div className="banner-left-group">
        <div className="banner-mascot-circle">
          <img src={MascotImage} alt="Mascot" />
        </div>
        <div className="banner-text-col">
          {/* 긴 텍스트가 와도 레이아웃 유지 */}
          <p className="banner-title">{t('main_info_1')}</p>
          <p className="banner-desc">{t('main_info_2')}</p>
          <p className="banner-contact">{t('main_info_3')}</p>
        </div>
      </div>

      {/* [오른쪽] 고객센터 */}
      <div className="banner-right-group">
        <div className="right-icon-box clickable-box" onClick={onContactClick}>
          <span className="right-icon-label">{t('btn_customer_center')}</span>
          <div className="icon-row">
            <svg className="right-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 11V16C3 18.7614 5.23858 21 8 21H9V16H5V11C5 7.13401 8.13401 4 12 4C15.866 4 19 7.13401 19 11V16H15V21H16C18.7614 21 21 18.7614 21 16V11C21 6.02944 16.9706 2 12 2C7.02944 2 3 6.02944 3 11Z" fill="#105E7C"/>
              <rect x="15" y="16" width="4" height="5" rx="1" fill="#105E7C"/>
              <rect x="5" y="16" width="4" height="5" rx="1" fill="#105E7C"/>
            </svg>
            <span className="icon-text-small">{t('btn_inquiry')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoBanner;