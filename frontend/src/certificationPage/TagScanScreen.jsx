import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './TagScanScreen.css';

import LoadingSpinner from '../assets/loading-spinner.png';
import BgImage from '../assets/bg_all.png';
import Header from '../mainPage/Header';

import TagSuccessVideo from '../assets/폐어구 반납 준비.mp4';
import TagGuideVideo from '../assets/어구바코드.mp4';
import TagFailVideo from '../assets/텍스트 설명 배경.mp4';

/* --- SVG 아이콘 컴포넌트 --- */

// 뒤로가기 아이콘
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ★ [수정] 막대형 리더기 (Stick Reader) 아이콘
const ScannerIcon = () => (
  <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 그림자 */}
    <ellipse cx="50" cy="85" rx="15" ry="3" fill="black" opacity="0.2" />

    {/* 리더기 몸통 (비스듬하게 기울어진 원통형) */}
    <g transform="rotate(-30 50 50)">
      {/* 본체 */}
      <rect x="35" y="10" width="30" height="80" rx="8" fill="#2c3e50" />
      <rect x="38" y="10" width="24" height="80" rx="5" fill="#34495e" /> {/* 입체감용 하이라이트 */}

      {/* 상단 센서 캡 */}
      <path d="M35 15 C35 5 65 5 65 15 V18 H35 V15 Z" fill="#1a252f" />

      {/* 텍스트/로고 라인 */}
      <rect x="42" y="30" width="16" height="2" fill="rgba(255,255,255,0.7)" />
      <rect x="42" y="35" width="10" height="2" fill="rgba(255,255,255,0.7)" />
      <rect x="42" y="45" width="16" height="2" fill="rgba(255,255,255,0.5)" />

      {/* 작동 불빛 (초록색 점) */}
      <circle cx="50" cy="65" r="4" fill="#2ecc71" opacity="0.9" />
    </g>
  </svg>
);

// ★ [수정] 주황색 꼬리표 (Orange Tag) 아이콘
const TagIcon = () => (
  <svg width="80" height="120" viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 꼬리 고리 (Zip tie loop) */}
    <path d="M25 10 C 15 10, 10 25, 20 35 L 30 40" stroke="#FF5722" strokeWidth="6" fill="none" strokeLinecap="round" />

    {/* 태그 연결부 */}
    <rect x="30" y="35" width="20" height="10" rx="2" fill="#D84315" />

    {/* 태그 몸통 (주황색) */}
    <rect x="15" y="42" width="50" height="70" rx="6" fill="#FF5722" />
    <rect x="18" y="45" width="44" height="64" rx="4" fill="#FF7043" />

    {/* 바코드 영역 (흰색 박스) */}
    <rect x="22" y="55" width="36" height="40" rx="2" fill="white" />
    <path d="M25 60 V90 M28 60 V90 M32 60 V90 M35 60 V90 M40 60 V90 M45 60 V90 M48 60 V90 M52 60 V90" stroke="black" strokeWidth="2" />

    {/* 하단 텍스트 라인 */}
    <rect x="25" y="98" width="30" height="3" fill="white" opacity="0.8" />
  </svg>
);

/* --- TTS 헬퍼 함수 --- */
const getBestVoice = (langCode, voiceList) => {
  if (!voiceList || voiceList.length === 0) return null;
  let bestVoice = null;
  if (langCode.includes('ko')) {
    bestVoice = voiceList.find(v => v.lang.includes('ko'));
  } else if (langCode.includes('vi')) {
    bestVoice = voiceList.find(v => v.lang.includes('vi'));
  } else if (langCode.includes('id')) {
    bestVoice = voiceList.find(v => v.lang.includes('id'));
  } else if (langCode.includes('tl') || langCode.includes('fil')) {
    bestVoice = voiceList.find(v => v.lang.includes('fil') || v.lang.includes('tl'));
  } else if (langCode.includes('my')) {
    bestVoice = voiceList.find(v => v.lang.includes('my'));
  } else {
    bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
  }
  return bestVoice;
};

/* --- 로딩 오버레이 --- */
const LoadingOverlay = () => {
  return (
    <div className="tag-overlay">
      <div className="loading-spinner large"></div>
    </div>
  );
};

/* --- 메인 컴포넌트 --- */
const TagScanScreen = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [scanState, setScanState] = useState('idle');
  const [sensorInput, setSensorInput] = useState('');
  const voiceListCache = useRef([]);

  /* --- 뒤로가기 핸들러 --- */
  const handleGoBack = () => {
    window.speechSynthesis.cancel();
    navigate('/select-gear');
  };

  /* --- TTS 로직 --- */
  const speak = (text, lang, voiceList, onEndCallback = null) => {
    if (!('speechSynthesis' in window)) {
      if (onEndCallback) onEndCallback();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const langMap = { 'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN', 'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM' };
    const shortLang = lang.substring(0, 2);
    utterance.lang = langMap[shortLang] || 'en-US';

    const selectedVoice = getBestVoice(utterance.lang, voiceListCache.current);
    if (selectedVoice) utterance.voice = selectedVoice;

    if (onEndCallback) {
      utterance.onend = onEndCallback;
    }
    utterance.onerror = () => {
      if (onEndCallback) onEndCallback();
    };
    window.speechSynthesis.speak(utterance);
  };

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

  useEffect(() => {
    let textToSpeak = '';
    let key = '';
    let onEndCallback = null;

    if (scanState === 'idle') {
      key = 'AUTH_04';
      textToSpeak = t(key);
    } else if (scanState === 'success') {
      key = 'AUTH_05';
      textToSpeak = t(key);
      onEndCallback = () => {
        setTimeout(() => {
          navigate('/certificationPage/gear-scan');
        }, 50);
      };
    } else if (scanState === 'failed') {
      key = 'AUTH_06';
      textToSpeak = t(key);
    } else {
      window.speechSynthesis.cancel();
      return;
    }

    const delay = (scanState === 'idle') ? 50 : 0;
    const speakTimer = setTimeout(() => {
      if (textToSpeak) {
        speak(textToSpeak, i18n.language, voiceListCache.current, onEndCallback);
      } else if (scanState === 'success' && onEndCallback) {
        onEndCallback();
      }
    }, delay);

    return () => clearTimeout(speakTimer);
  }, [scanState, t, i18n.language, navigate]);

  /* --- API 검증 로직 --- */
  const handleVerifyScan = async (scannedData) => {
    if (scanState !== 'idle') return;

    setScanState('loading');

    // [테스트 로직]
    if (scannedData === 'GENUINE_TAG_HW' || scannedData === 'GENUINE') {
      setTimeout(() => setScanState('success'), 50);
      return;
    } else if (scannedData === 'FAKE_TAG_123') {
      setTimeout(() => setScanState('failed'), 50);
      return;
    }

    // [실제 API 로직]
    const session_token = localStorage.getItem('session_token');
    const return_session_id = localStorage.getItem('return_session_id');

    if (!session_token || !return_session_id) {
      alert(t('tagscan_alert_session_expired'));
      setScanState('idle');
      navigate('/');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/certification/tag/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session_token}`
        },
        body: JSON.stringify({
          kiosk_id: "BUSAN-001",
          return_session_id: return_session_id,
          tag_sensor_data: scannedData
        }),
      });
      const data = await response.json();

      if (response.ok && data.is_genuine) {
        setScanState('success');
      } else {
        setScanState('failed');
      }
    } catch (error) {
      console.error('API Error:', error);
      setScanState('failed');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (scanState !== 'idle') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (sensorInput.length > 0) {
          handleVerifyScan(sensorInput);
          setSensorInput('');
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setSensorInput((prev) => prev + e.key);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scanState, sensorInput]);

  const handleRetry = () => {
    setScanState('idle');
    setSensorInput('');
  };

  const handleExit = () => {
    navigate('/');
  };

  const getHeaderText = () => {
    if (scanState === 'success') return t('tagscan_success_popup_title');
    return t('tagging_title') || t('auth_step_2');
  };

  return (
    <div className="tag-wrapper">
      <Header />

      <div className="tag-body">
        {/* 1. 상단 카메라 영역 */}
        <div className="camera-box">

          {/* 뒤로가기 버튼 */}
          <button className="tag-back-btn" onClick={handleGoBack}>
            <BackIcon />
            <span className="tag-back-text">{t('go_home') || '뒤로가기'}</span>
          </button>

          <div className="camera-text" style={{ width: '100%', height: '100%', padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

            {scanState === 'success' ? (
              <video
                src={TagSuccessVideo}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'fill' }}
              />
            ) : scanState === 'failed' ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <video
                  src={TagFailVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                />
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 40px', boxSizing: 'border-box'
                }}>
                  <p style={{
                    fontSize: '1.8rem', fontWeight: 'bold', color: '#333', textAlign: 'center',
                    lineHeight: '1.4', whiteSpace: 'pre-wrap'
                  }}>
                    {t('tagscan_fail_popup_message')}
                  </p>
                </div>
              </div>
            ) : (
              <video
                src={TagGuideVideo}
                autoPlay
                loop
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'fill' }}
              />
            )}

          </div>
        </div>

        {/* 2. 하단 컨텐츠 영역 */}
        <div
          className="tag-card-container"
          style={{
            backgroundImage: `url(${BgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="tag-info-card">

            {/* ★ [수정] 성공 상태일 때는 '탭'과 '기본 타이틀'을 숨기고, 성공 전용 화면만 보여줍니다. */}
            {scanState === 'success' ? (
              <div className="success-content">
                {/* 1. 타이틀 */}
                <h2 className="success-title">{t('tagscan_success_popup_title')}</h2>

                {/* 2. 흰색 메시지 박스 */}
                <div className="success-msg-box">
                  <p>
                    {t('tagscan_success_popup_message').split('\n').map((line, i) => (
                      <React.Fragment key={i}>{line}<br /></React.Fragment>
                    ))}
                  </p>
                </div>

                {/* 3. 하단 로딩 푸터 */}
                <div className="success-footer">
                  <img src={LoadingSpinner} alt="loading" className="spin-icon" />
                  <div className="success-footer-text">
                    {t('tagscan_success_popup_loading_text').split('\n').map((line, i) => (
                      <React.Fragment key={i}>{line}<br /></React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* 성공이 아닐 때 (기본/실패) 보여줄 내용 */
              <>
                <div className="step-tabs">
                  <div className="step-tab inactive">
                    <div className="step-num-circle">1</div>
                    <span className="step-label">{t('auth_step_1').replace(/^\d+\.\s*/, '')}</span>
                  </div>
                  <div className="step-tab active">
                    <div className="step-num-circle">2</div>
                    <span className="step-label">{t('auth_step_2').replace(/^\d+\.\s*/, '')}</span>
                  </div>
                  <div className="step-tab inactive">
                    <div className="step-num-circle">3</div>
                    <span className="step-label">{t('auth_step_3').replace(/^\d+\.\s*/, '')}</span>
                  </div>
                </div>

                <h2 className="step-main-title">
                  {getHeaderText()}
                </h2>

                {scanState === 'failed' ? (
                  <div className="tag-content-box fail">
                    <div className="fail-msg-box">
                      <p>
                        {t('tagscan_fail_popup_message').split('\n').map((line, i) => (
                          <React.Fragment key={i}>{line}<br /></React.Fragment>
                        ))}
                      </p>
                    </div>
                    <div className="fail-buttons-row">
                      <button className="fail-btn retry" onClick={handleRetry}>
                        {t('tagscan_fail_popup_retry_button')}
                      </button>
                      <button className="fail-btn confirm" onClick={handleExit}>
                        {t('tagscan_fail_popup_exit_button')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="tag-content-box idle">
                    {/* 안내 영역: 막대 리더기 + 태그 애니메이션 */}
                    <div className="instruction-box">
                      <div className="tag-scan-animation">
                        <div className="tag-scanner-part">
                          <ScannerIcon />
                          <div className="tag-scanner-wave"></div>
                        </div>
                        <div className="tag-target-part">
                          <TagIcon />
                        </div>
                      </div>

                      <p
                        className="instruction-text"
                        dangerouslySetInnerHTML={{ __html: t('tagscan_instruction') }}
                      >
                      </p>
                    </div>

                    <div className="test-btn-group">
                      <button className="test-btn success" onClick={() => handleVerifyScan('GENUINE')}>
                        {t('tagscan_test_button_success')}
                      </button>
                      <button className="test-btn fail" onClick={() => handleVerifyScan('FAKE_TAG_123')}>
                        {t('tagscan_test_button_fail')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {scanState === 'loading' && <LoadingOverlay />}
    </div>
  );
};

export default TagScanScreen;