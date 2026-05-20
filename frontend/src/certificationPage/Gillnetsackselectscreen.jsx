// src/gillnetPage/GillnetSackSelectScreen.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import './Gillnetsackselectscreen.css';

// 아이콘 및 이미지 import
import ImgSack100 from '../assets/100L 자망.png';
import ImgSack200 from '../assets/200L 자망.png';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GillnetSackSelectScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [sack100, setSack100] = useState(0);
  const [sack200, setSack200] = useState(0);
  const [isDeposit, setIsDeposit] = useState(true);
  const [alertModal, setAlertModal] = useState({ show: false, message: '' });

  const MAX_SACK_PER_SIZE = 5;
  const voiceListCache = useRef([]);

  const speak = useCallback((msg) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(msg);
    const langMap = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN', tl: 'fil-PH', id: 'id-ID', my: 'my-MM' };
    u.lang = langMap[i18n.language.substring(0, 2)] || 'ko-KR';
    const v = voiceListCache.current.find(x => x.lang.includes(u.lang.substring(0, 2)));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  }, [i18n.language]);

  useEffect(() => {
    const type = localStorage.getItem('selected_gvbk_type');
    setIsDeposit(type === '1');

    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) voiceListCache.current = v;
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;

    const timer = setTimeout(() => {
      speak(t('gillnet_sack_voice') || '투입하실 마대의 규격과 수량을 선택해 주세요.');
    }, 500);

    return () => {
      clearTimeout(timer);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [t, speak]);

  const changeSack = (size, delta) => {
    if (size === 100) setSack100(prev => Math.max(0, Math.min(MAX_SACK_PER_SIZE, prev + delta)));
    else setSack200(prev => Math.max(0, Math.min(MAX_SACK_PER_SIZE, prev + delta)));
  };

  const totalSack = sack100 + sack200;
  const totalGear = (sack100 * 4) + (sack200 * 8);

  const handleProceed = () => {
    if (totalSack === 0) {
      setAlertModal({ show: true, message: t('gillnet_sack_alert_empty') || '마대를 최소 1개 이상\n선택해 주세요.' });
      return;
    }
    localStorage.setItem('gillnet_sack_100', sack100);
    localStorage.setItem('gillnet_sack_200', sack200);
    localStorage.setItem('gillnet_total_gear', totalGear);

    if (isDeposit) navigate('/gillnet/scan');
    else navigate('/gillnet/deposit'); // 압축 프로세스가 통합된 deposit 화면으로 바로 이동
  };

  return (
    <div className="gnt-sack-wrapper" style={{ backgroundImage: `url(${BgImage})` }}>
      <Header />
      <button className="auth-back-btn" onClick={() => navigate('/gillnet/type-select')}>
        <BackIcon /><span className="auth-back-text">{t('btn_back') || '뒤로가기'}</span>
      </button>

      <div className="gnt-sack-content-area">
        <h2 className="gnt-page-title">
          {t('gillnet_sack_title')}
        </h2>
        <p className="gnt-page-subtitle">{t('gillnet_sack_subtitle')}</p>

        <div className="gnt-main-card">
          <div className="step-tabs">
            <div className="step-tab">
              <div className="step-num-circle">1</div>
              <span className="step-label">{t('auth_step_1')}</span>
            </div>
            <div className="step-tab active">
              <div className="step-num-circle">2</div>
              <span className="step-label">{t('gillnet_step_2')}</span>
            </div>
            <div className="step-tab">
              <div className="step-num-circle">3</div>
              <span className="step-label">{t('auth_step_3')}</span>
            </div>
          </div>

          <div className="gnt-massive-layout">
            <div className="gnt-sack-card sack-100" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div className="gnt-sack-img-box"><img src={ImgSack100} alt="100L" className="gnt-sack-img" /></div>
              <div className="gnt-sack-controls">
                <div className="gnt-controls-top">
                  <div className="gnt-badge badge-100">{t('gillnet_dep_sack_100')}</div>
                  <div className="gnt-ratio-text">= {t('gillnet_per_sack_4')}</div>
                </div>
                <div className="gnt-controls-bottom">
                  <div className="gnt-counter-box">
                    <button className="gnt-count-btn minus" onClick={() => changeSack(100, -1)} disabled={sack100 === 0}>−</button>
                    <div className="gnt-count-display">{sack100}</div>
                    <button className="gnt-count-btn plus" onClick={() => changeSack(100, +1)} disabled={sack100 >= MAX_SACK_PER_SIZE}>+</button>
                  </div>
                  <div className="gnt-subtotal-text">
                    {t('gillnet_sack_subtotal')}: <strong>{sack100 * 4}</strong>{t('gear_unit')}
                  </div>
                </div>
              </div>
            </div>

            <div className="gnt-sack-card sack-200" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div className="gnt-sack-img-box"><img src={ImgSack200} alt="200L" className="gnt-sack-img" /></div>
              <div className="gnt-sack-controls">
                <div className="gnt-controls-top">
                  <div className="gnt-badge badge-200">{t('gillnet_dep_sack_200')}</div>
                  <div className="gnt-ratio-text">= {t('gillnet_per_sack_8')}</div>
                </div>
                <div className="gnt-controls-bottom">
                  <div className="gnt-counter-box">
                    <button className="gnt-count-btn minus" onClick={() => changeSack(200, -1)} disabled={sack200 === 0}>−</button>
                    <div className="gnt-count-display">{sack200}</div>
                    <button className="gnt-count-btn plus" onClick={() => changeSack(200, +1)} disabled={sack200 >= MAX_SACK_PER_SIZE}>+</button>
                  </div>
                  <div className="gnt-subtotal-text">
                    {t('gillnet_sack_subtotal')}: <strong>{sack200 * 8}</strong>{t('gear_unit')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="gnt-bottom-area">
            <div className="gnt-summary-box">
              <div className="gnt-summary-text">
                {t('gillnet_sack_total_sack')}: <span className="highlight-dark">{totalSack}</span>{t('gillnet_dmc_unit')}
              </div>
              <div className="gnt-summary-text big">
                {t('gillnet_sack_total_gear')}: <span className="highlight-blue">{totalGear}</span>{t('gear_unit')}
              </div>
            </div>
            <div className="gnt-action-row">
              <button className={`gnt-action-btn next ${totalSack > 0 ? 'active' : ''}`} onClick={handleProceed} disabled={totalSack === 0}>
                {t('gillnet_sack_btn_next')} →
              </button>
            </div>
          </div>
        </div>
      </div>

      {alertModal.show && (
        <div className="gnt-alert-overlay" onClick={() => setAlertModal({ show: false, message: '' })}>
          <div className="gnt-alert-box large" onClick={e => e.stopPropagation()}>
            <div className="gnt-alert-header"><h3>{t('alert_title')}</h3></div>
            <div className="gnt-alert-body">
              <p className="large-text">{alertModal.message.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}</p>
            </div>
            <div className="gnt-alert-footer">
              <button className="gnt-alert-btn" onClick={() => setAlertModal({ show: false, message: '' })}>{t('btn_confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GillnetSackSelectScreen;