// src/App.js (이전 경로가 같다면 파일명 확인)
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import './CompletionScreen.css';

import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png'; 

import FinalGreetingVideo from '../assets/최종인사.mp4'; 
import IconMoney from '../assets/image_2.png';
import IconScale from '../assets/image_3.png';
import IconEarth from '../assets/image_4.png';
import IconPoint from '../assets/image_5.png'; 
import LoadingSpinner from '../assets/loading-spinner.png';

/* --- 1. TTS 헬퍼 함수 --- */
const getBestVoice = (langCode, voiceList) => {
  if (!voiceList || voiceList.length === 0) return null;
  let bestVoice = null;
  if (langCode.includes('ko')) { bestVoice = voiceList.find(v => v.lang.includes('ko')); }
  else if (langCode.includes('vi')) { bestVoice = voiceList.find(v => v.lang.includes('vi')); }
  else if (langCode.includes('id')) { bestVoice = voiceList.find(v => v.lang.includes('id')); }
  else if (langCode.includes('tl') || langCode.includes('fil')) { bestVoice = voiceList.find(v => v.lang.includes('fil') || v.lang.includes('tl')); }
  else if (langCode.includes('my')) { bestVoice = voiceList.find(v => v.lang.includes('my')); }
  else { bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en')); }
  return bestVoice;
};

const speak = (text, lang, voiceList) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const langMap = { 'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN', 'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM' };
  const shortLang = lang.substring(0, 2);
  utterance.lang = langMap[shortLang] || 'en-US';
  const selectedVoice = getBestVoice(utterance.lang, voiceList);
  if (selectedVoice) utterance.voice = selectedVoice;
  window.speechSynthesis.speak(utterance);
};

/* --- 2. 로딩 컴포넌트 --- */
const LoadingOverlay = () => (
  <div className="completion-overlay">
    <img src={LoadingSpinner} alt="Loading" className="loading-spinner" />
  </div>
);

const CompletionScreen = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { t, i18n } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [receiptData, setReceiptData] = useState({
    totalDeposit: 0,
    totalPoint: 0, 
    weightCollected: '0 kg',
    co2Saved: '0 kg',
  });
  const voiceListCache = useRef([]);

  // --- TTS 초기화 ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceListCache.current = voices;
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // --- 환경 기여도 계산 로직 및 데이터 세팅 ---
  useEffect(() => {
    if (location.state) {
      const { totalDeposit, totalPoint, totalCount } = location.state;
      const count = totalCount || 0; // 데이터가 없을 경우 0으로 처리
      
      // 1. 무게 계산: 어구 1개당 평균 2.5kg
      const calculatedWeight = count * 2.5; 
      
      // 2. CO2 절감량 계산: 폐어구 1kg 재활용 시 약 1.5kg의 CO2 감축
      const calculatedCo2 = calculatedWeight * 1.5;

      setReceiptData({
        totalDeposit: totalDeposit || 0,
        totalPoint: totalPoint || 0, 
        weightCollected: `${calculatedWeight.toFixed(1)} kg`,
        co2Saved: `${calculatedCo2.toFixed(1)} kg`,
      });
    }
  }, [location.state]);

  // --- TTS 및 자동 이동 ---
  useEffect(() => {
    const key = 'COMP_02';
    const textToSpeak = t(key);
    setTimeout(() => {
      if (textToSpeak && textToSpeak !== key) {
        speak(textToSpeak, i18n.language, voiceListCache.current);
      }
    }, 300);

    const timer = setTimeout(() => {
      handleFinish(); 
    }, 30000); 

    return () => clearTimeout(timer);
    
  }, [t, i18n.language]);

  // --- 완전 종료 ---
  const handleFinish = () => {
    localStorage.removeItem('session_token');
    localStorage.removeItem('return_session_id');
    navigate('/');
  };

  // --- 추가 반납 ---
  const handleAddMore = () => {
    window.speechSynthesis.cancel();
    navigate('/select-gear');
  };

  if (isLoading) return <LoadingOverlay />;
  
  if (error) {
      return (
        <div className="completion-wrapper">
          <Header />
          <div className="completion-error-box">
            <h2>{t('completion_error_title')}</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/')} className="btn-finish-green">
              {t('completion_error_redirect') || 'Home'}
            </button>
          </div>
        </div>
      );
  }

  if (!receiptData) return null;

  return (
    <div className="completion-wrapper">
      <Header />

      <div className="completion-body">
        {/* 1. 상단 영상 영역 */}
        <div className="video-section">
           <video 
             src={FinalGreetingVideo} 
             autoPlay 
             loop 
             muted 
             playsInline 
             className="video-player"
           />
        </div>

        {/* 2. 하단 정보 영역 */}
        <div 
            className="completion-card-container"
            style={{ backgroundImage: `url(${BgImage})` }}
        >
            <div className="completion-info-card">
                
                {/* 제목 */}
                <h2 className="card-title">
                  {t('completion_step_label') || "반납 완료"}
                </h2>
                
                {/* 하얀색 정보 박스 */}
                <div className="white-info-box">
                    {/* 반환 보증금 */}
                    <div className="info-row deposit-row">
                        <img src={IconMoney} alt="Won" className="info-icon" />
                        <span className="info-label">{t('completion_summary_deposit_label')} :</span>
                        <span className="info-value highlight">
                          {receiptData.totalDeposit.toLocaleString()} 
                          <span className="unit-text">{t('gearscan_table_deposit_amount').replace('{{amount}}', '').trim()}</span>
                        </span>
                    </div>

                    {/* 적립 포인트 표시 */}
                    {receiptData.totalPoint > 0 && (
                      <div className="info-row deposit-row" style={{ marginTop: '8px' }}>
                          <img src={IconPoint} alt="Point" className="info-icon" />
                          <span className="info-label">적립 포인트 :</span>
                          <span className="info-value highlight" style={{ color: '#28a745' }}>
                            {receiptData.totalPoint.toLocaleString()} 
                            <span className="unit-text"> P</span>
                          </span>
                      </div>
                    )}

                    {/* 구분선 */}
                    <div className="card-divider"></div>

                    {/* 오늘 수거된 어구 */}
                    <div className="info-row">
                        <img src={IconScale} alt="Net" className="info-icon" />
                        <span className="info-label">{t('completion_summary_collected_label') || '오늘 수거된 어구'} :</span>
                        <span className="info-value">{receiptData.weightCollected}</span>
                    </div>

                    {/* CO2 감소 (아래첨자 적용) */}
                    <div className="info-row">
                        <img src={IconEarth} alt="Leaf" className="info-icon" />
                        <span className="info-label">CO<sub>2</sub> 감소량 :</span>
                        <span className="info-value">{receiptData.co2Saved}</span>
                    </div>
                </div> 

                {/* 버튼 그룹 */}
                <div className="completion-btn-group">
                  <button className="btn-add-more" onClick={handleAddMore}>
                    {t('completion_add_more') || '추가 반납하기'}
                  </button>

                  <button className="btn-finish-green" onClick={handleFinish}>
                      {t('tagscan_fail_popup_exit_button').split(' ')[2] || '종료'} 
                  </button>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default CompletionScreen;