// src/certificationPage/GearScanScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // ★ 다국어 훅 적용
import axios from 'axios';

import './GearScanScreen.css';
import LoadingSpinner from '../assets/loading-spinner.png';
import BgImage from '../assets/bg_all.png';
import Header from '../mainPage/Header';
import GearBarcodeVideo from '../assets/어구바코드.mp4';

const API_BASE_URL = `${process.env.REACT_APP_API_URL}/api/v1/proxy`;

// 아이콘 컴포넌트 생략 (기존 코드 그대로 유지)
const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const ScannerHandIcon = () => (<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 20 H70 A10 10 0 0 1 80 30 V50 A5 5 0 0 1 75 55 H40 L35 80 H15 L20 40 Z" fill="#333" stroke="#222" strokeWidth="2" /><path d="M70 20 H85 V50 H75" fill="#444" /><rect x="83" y="25" width="4" height="20" fill="#ff3b3b" /><path d="M40 35 Q45 30 55 35 Q60 40 50 45 L40 40" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" /><path d="M35 45 Q45 45 45 55 Q45 65 35 65 Q25 65 25 55" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" /><path d="M36 55 Q46 55 46 65 Q46 75 36 75" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" /><path d="M37 65 Q47 65 47 75 Q47 85 37 85 L32 80" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" /></svg>);
const GearTagIcon = () => (<svg viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 10 C30 0, 70 0, 70 10 V35 H30 V10 Z" fill="#FF4500" stroke="#CC3700" strokeWidth="2" /><rect x="15" y="30" width="70" height="100" rx="8" fill="#FF4500" stroke="#CC3700" strokeWidth="2" /><rect x="25" y="50" width="50" height="60" fill="white" opacity="0.9" /><rect x="28" y="55" width="4" height="50" fill="#333" /><rect x="34" y="55" width="2" height="50" fill="#333" /><rect x="38" y="55" width="6" height="50" fill="#333" /><rect x="46" y="55" width="3" height="50" fill="#333" /><rect x="52" y="55" width="5" height="50" fill="#333" /><rect x="60" y="55" width="2" height="50" fill="#333" /><rect x="65" y="55" width="4" height="50" fill="#333" /></svg>);

const getBestVoice = (langCode, voiceList) => {
  if (!voiceList || voiceList.length === 0) return null;
  let bestVoice = null;
  if (langCode.includes('ko')) bestVoice = voiceList.find(v => v.lang.includes('ko'));
  else bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
  return bestVoice;
};

const LoadingOverlay = ({ text }) => (
  <div className="gear-overlay">
    <img src={LoadingSpinner} alt="loading" className="loading-spinner-img" />
    {text && <p className="loading-text">{text}</p>}
  </div>
);

const GearScanScreen = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [barcodeInput, setBarcodeScanInput] = useState('');
  const [scannedGears, setScannedGears] = useState([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 프론트엔드 비교용 DB
  const [userTotalBarcodeDB, setUserTotalBarcodeDB] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const voiceListCache = useRef([]);
  const listRef = useRef(null);

  const gearType = localStorage.getItem('selected_gvbk_type'); // 1: 보증금, 2: 기존

  // =========================================================================
  // ★ [신규 추가] 화면 진입 시 바코드 투입구가 열려있는지 확인(확보)하는 로직
  // =========================================================================
  useEffect(() => {
    const ensureBarcodeDoorOpen = async () => {
      try {
        // 주의: 이전에 확인하신 정확한 API 경로를 넣어주세요. (예: /api/auth/hw/barcode-door)
        await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/hw/barcode-door`, { 
          open: true 
        });
        console.log('✅ 바코드 투입구 개방 상태 확보 완료');
      } catch (error) {
        console.error('❌ 바코드 투입구 개방 실패:', error);
      }
    };

    ensureBarcodeDoorOpen();
  }, []); // 빈 배열을 넣어 화면이 켜질 때 딱 1번만 실행되게 합니다.
  // =========================================================================

  const handleGoBack = () => {
    window.speechSynthesis.cancel();
    navigate(-1);
  };

  const speak = (text, lang, voiceList) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang.includes('ko') ? 'ko-KR' : 'en-US';
    const selectedVoice = getBestVoice(utterance.lang, voiceList);
    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceListCache.current = voices;
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    setIsDataLoaded(true); // 로딩 즉시 완료 처리
  }, [gearType]);

  // 스피치 안내
  useEffect(() => {
    if (isDataLoaded) {
      const textToSpeak = t('AUTH_07') || "어구보증금표식 바코드를 인식 시켜주세요.";
      setTimeout(() => speak(textToSpeak, i18n.language, voiceListCache.current), 300);
    }
  }, [isDataLoaded, t, i18n.language]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [scannedGears]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); return; }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setBarcodeScanInput((prev) => prev + e.key);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!barcodeInput) return;
    const inputTimer = setTimeout(() => {
      handleBarcodeScan(barcodeInput);
    }, 500);
    return () => clearTimeout(inputTimer);
  }, [barcodeInput]);

  // ★ 2. 바코드 스캔 핸들러 (서버 대기 없이 즉각 처리)
 const handleBarcodeScan = useCallback(async (scannedData) => {
    const cleanBarcode = scannedData.trim();
    if (!cleanBarcode || !isDataLoaded) return;

    const isNumeric = /^\d+$/.test(cleanBarcode);
    if (!isNumeric) {
      // 다국어 적용
      setErrorMessage(t('scan_err_not_gear') || '어구 바코드가 아닙니다.\n정상적인 어구를 스캔해주세요.');
      setBarcodeScanInput('');
      return;
    }

    if (scannedGears.some(gear => gear.bacod_nm === cleanBarcode)) {
      // 다국어 적용
      setErrorMessage(t('duplicate_barcode_warning') || '이미 스캔된 바코드입니다.');
      setBarcodeScanInput('');
      return;
    }

    setIsLoading(true);
    setLoadingText(t('deposit_loading_default') || '바코드 정보를 확인 중입니다...');
    setErrorMessage('');

    try {
      const res = await axios.get(`${API_BASE_URL}/barcode/${cleanBarcode}/info`);
      
      if (res.data?.status !== "200" && res.data?.status !== 200) {
        throw new Error(t('scan_err_not_found') || '어구 정보를 찾을 수 없습니다.');
      }

      const gearInfo = res.data.data;

      if (gearInfo.return_status !== "AVAILABLE") {
        // 서버에서 온 문구도 번역(t)을 거치도록 수정
        throw new Error(`${t('scan_err_not_available') || '반환 불가 어구입니다.'}\n(${t(gearInfo.return_status_desc) || gearInfo.return_status_desc})`);
      }

      if (gearType === '1' && gearInfo.gvbk_type !== '01') {
        throw new Error(t('scan_err_not_deposit') || '보증금어구가 아닙니다.\n이전 화면에서 기존어구를 선택해주세요.');
      }
      if (gearType === '2' && gearInfo.gvbk_type !== '02') {
        throw new Error(t('scan_err_not_existing') || '기존어구가 아닙니다.\n이전 화면에서 보증금어구를 선택해주세요.');
      }

      if (gearInfo.gvbk_type === '02') {
        const myFishermanId = localStorage.getItem('fisherman_id');
        if (gearInfo.user_fshnd_no !== myFishermanId) {
          throw new Error(t('scan_err_stolen') || '타인 명의의 기존어구는\n반납할 수 없습니다.');
        }
      }

      const newGear = {
        bacod_nm: gearInfo.bacod_nm,
        fsgr_nm: gearInfo.fsgr_nm,
        gvbk_type: gearInfo.gvbk_type_nm,
        gvbk_amt: gearInfo.gvbk_amt || 0,
        gvbk_pnt: gearInfo.rmbr_pnt || 0,
      };
      
      setScannedGears(prev => [...prev, newGear]);

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
      setBarcodeScanInput('');
    }
  }, [scannedGears, isDataLoaded, gearType, t]);

  const totalAmount = scannedGears.reduce((sum, gear) => sum + gear.gvbk_amt, 0);
  const totalPoints = scannedGears.reduce((sum, gear) => sum + gear.gvbk_pnt, 0);

  const handleProceed = () => {
    navigate('/deposit', { state: { scannedGears: scannedGears } });
  };

  return (
    <div className="gear-wrapper">
      <Header />
      <div className="gear-body">

        <div className="camera-box">
          <button className="gear-back-btn" onClick={handleGoBack}>
            <BackIcon />
            <span className="gear-back-text">{t('btn_back') || '뒤로가기'}</span>
          </button>
          <video src={GearBarcodeVideo} autoPlay loop muted playsInline />
        </div>

        <div className="gear-card-container" style={{ backgroundImage: `url(${BgImage})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }}>
          <div className="gear-info-card">

            {/* ★ 상단 단계 표시 바 다국어 적용 */}
            <div className="step-tabs">
              <div className="step-tab inactive"><div className="step-num-circle">1</div><span className="step-label">{t('auth_step_1') || '사용자 인증'}</span></div>
              <div className="step-tab active"><div className="step-num-circle">2</div><span className="step-label">{t('auth_step_2') || '어구보증금표식 인증'}</span></div>
              <div className="step-tab inactive"><div className="step-num-circle">3</div><span className="step-label">{t('auth_step_3') || '투입'}</span></div>
            </div>

            <h2 className="step-main-title">{t('scan_page_title') || '2단계: 어구보증금표식 바코드 스캔'}</h2>

            <div className="gear-content-box">
              <div className="main-display-area">

                {scannedGears.length === 0 ? (
                  <div className="empty-scan-box">
                    <div className="empty-anim-area">
                      <div className="anim-scanner-large"><ScannerHandIcon /><div className="anim-beam-large"></div></div>
                      <div className="anim-target-large"><GearTagIcon /><div className="anim-laser-line-large"></div></div>
                    </div>
                    <p className="empty-scan-text">
                      {/* ★ 안내 메시지 (줄바꿈 대응) */}
                      {(t('scan_instruction_msg') || '어구보증금표식 바코드를\n인식 시켜주세요.').split('\n').map((line, i) => (
                        <React.Fragment key={i}>{line}<br /></React.Fragment>
                      ))}
                    </p>
                  </div>
                ) : (
                  <div className="scanned-list-wrapper">
                    <div className="list-title-row">
                      {/* ★ 스캔된 바코드 갯수 */}
                      <h3>{t('scan_list_title') || '스캔된 바코드'} ({scannedGears.length})</h3>
                    </div>

                    {/* ★ 테이블 헤더 */}
                    <div className="list-header-row">
                      <span className="header-col code">{t('scan_table_code') || '어구 코드'}</span>
                      <span className="header-col info">{t('scan_table_type') || '어구 종류'}</span>
                      <span className="header-col amt">{t('scan_table_amt') || '보증금/포인트'}</span>
                    </div>

                    <ul className="scanned-detail-list" ref={listRef}>
                      {scannedGears.map((gear, index) => (
                        <li key={index} className="scanned-item-row">
                          <div className="item-col code">{gear.bacod_nm}</div>
                          <div className="item-col info">
                            <div className="gear-name-wrapper">
                              {/* ★ 뱃지 다국어 처리 (gvbk_type 값에 따라 번역 키 매핑) */}
                              <span className={`gear-type-badge ${gear.gvbk_type === '기존어구' ? 'gray' : ''}`}>
                                {gear.gvbk_type === '기존어구' ? t('gear_badge_existing') : t('gear_badge_deposit')}
                              </span>
                              {/* 어구 종류명은 앞서 선택한 화면(GearTypeSelectScreen)의 로컬스토리지 값 (UI 노출용) */}
                              <span className="gear-real-name">{t(gear.fsgr_nm) || gear.fsgr_nm}</span>
                            </div>
                          </div>
                          <div className="item-col amt">
                            {gearType === '1'
                              ? <span style={{ color: '#00A0E9' }}>{gear.gvbk_amt.toLocaleString()}{t('currency_unit') || '원'}</span>
                              : <span style={{ color: '#28a745' }}>{gear.gvbk_pnt.toLocaleString()}P</span>
                            }
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="scan-summary-box">
                      <div className="summary-item">
                        {/* ★ 총 예정 금액 텍스트 */}
                        <span className="label">{gearType === '1' ? t('scan_total_deposit') : t('scan_total_points')}</span>
                        <span className="value">
                          {gearType === '1'
                            ? <>{totalAmount.toLocaleString()}{t('currency_unit') || '원'}</>
                            : <span className="point-sub" style={{ color: '#28a745', fontSize: '1.2em' }}>{totalPoints.toLocaleString()}P</span>
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {isDuplicate && <p className="duplicate-warning">{t('duplicate_barcode_warning') || '이미 스캔된 바코드입니다.'}</p>}
                {errorMessage && <p className="duplicate-warning" style={{ color: '#d9534f' }}>{errorMessage}</p>}
              </div>

              <button
                className={`next-button ${scannedGears.length > 0 ? 'active' : ''}`}
                onClick={handleProceed}
                disabled={scannedGears.length === 0}
              >
                {t('scan_btn_next') || '다음 (스캔 완료)'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {isLoading && <LoadingOverlay text={loadingText} />}
      {errorMessage && (
        <div className="deposit-alert-overlay" onClick={() => setErrorMessage('')} style={{ zIndex: 99999 }}>
          <div className="deposit-alert-content" onClick={(e) => e.stopPropagation()} style={{
            backgroundColor: 'white',
            borderRadius: '40px',
            border: '8px solid #00A0E9', // ★ 테두리 하늘색
            overflow: 'hidden',
            width: '95%',
            maxWidth: '800px',
            textAlign: 'center',
            animation: 'popIn 0.3s ease-out',
            boxShadow: '0 40px 80px rgba(0,0,0,0.4)'
          }}>
            <div style={{ backgroundColor: '#00A0E9', padding: '35px' }}> {/* ★ 헤더 하늘색 */}
              <h2 style={{ color: 'white', margin: 0, fontSize: '4rem', fontWeight: '900' }}>
                {t('scan_alert_title_warning') || '안내'}
              </h2>
            </div>
            
            <div style={{ padding: '70px 40px' }}>
              <p style={{ fontSize: '3.4rem', marginBottom: '50px', lineHeight: '1.6', color: '#333', fontWeight: '800', wordBreak: 'keep-all' }}>
                {errorMessage.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}<br />
                  </React.Fragment>
                ))}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setErrorMessage('')}
                  style={{
                    backgroundColor: '#495057', color: 'white', border: 'none',
                    borderRadius: '15px', width: '250px', height: '90px',
                    fontSize: '2.5rem', fontWeight: 'bold', cursor: 'pointer',
                    boxShadow: '0 5px 0 #343a40'
                  }}
                >
                  {t('btn_confirm') || '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GearScanScreen;