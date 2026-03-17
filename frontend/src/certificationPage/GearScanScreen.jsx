import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import './GearScanScreen.css';
import LoadingSpinner from '../assets/loading-spinner.png';
import BgImage from '../assets/bg_all.png'; 
import Header from '../mainPage/Header'; 
import GearBarcodeVideo from '../assets/어구바코드.mp4'; 

/* API 기본 주소 */
const API_BASE_URL = 'http://localhost:8080/api/v1/proxy';

// 뒤로가기 아이콘
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// 스캐너(손) 아이콘 컴포넌트
const ScannerHandIcon = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 20 H70 A10 10 0 0 1 80 30 V50 A5 5 0 0 1 75 55 H40 L35 80 H15 L20 40 Z" fill="#333" stroke="#222" strokeWidth="2"/>
    <path d="M70 20 H85 V50 H75" fill="#444" />
    <rect x="83" y="25" width="4" height="20" fill="#ff3b3b" />
    <path d="M40 35 Q45 30 55 35 Q60 40 50 45 L40 40" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/>
    <path d="M35 45 Q45 45 45 55 Q45 65 35 65 Q25 65 25 55" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/>
    <path d="M36 55 Q46 55 46 65 Q46 75 36 75" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/>
    <path d="M37 65 Q47 65 47 75 Q47 85 37 85 L32 80" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/>
  </svg>
);

// 어구 표식(태그) 아이콘 컴포넌트
const GearTagIcon = () => (
  <svg viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 10 C30 0, 70 0, 70 10 V35 H30 V10 Z" fill="#FF4500" stroke="#CC3700" strokeWidth="2"/>
    <rect x="15" y="30" width="70" height="100" rx="8" fill="#FF4500" stroke="#CC3700" strokeWidth="2"/>
    <rect x="25" y="50" width="50" height="60" fill="white" opacity="0.9"/>
    <rect x="28" y="55" width="4" height="50" fill="#333"/>
    <rect x="34" y="55" width="2" height="50" fill="#333"/>
    <rect x="38" y="55" width="6" height="50" fill="#333"/>
    <rect x="46" y="55" width="3" height="50" fill="#333"/>
    <rect x="52" y="55" width="5" height="50" fill="#333"/>
    <rect x="60" y="55" width="2" height="50" fill="#333"/>
    <rect x="65" y="55" width="4" height="50" fill="#333"/>
  </svg>
);

// 다국어 지원을 위한 음성 선택 함수 (확장됨)
const getBestVoice = (langCode, voiceList) => {
  if (!voiceList || voiceList.length === 0) return null;
  let bestVoice = null;
  
  if (langCode.includes('ko')) bestVoice = voiceList.find(v => v.lang.includes('ko'));
  else if (langCode.includes('vi')) bestVoice = voiceList.find(v => v.lang.includes('vi'));
  else if (langCode.includes('id')) bestVoice = voiceList.find(v => v.lang.includes('id'));
  else if (langCode.includes('tl') || langCode.includes('fil')) bestVoice = voiceList.find(v => v.lang.includes('fil') || v.lang.includes('tl')); // 필리핀어
  else if (langCode.includes('my')) bestVoice = voiceList.find(v => v.lang.includes('my')); // 미얀마어 (지원 기기 한정)
  else bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en')); // 기본 영어
  
  return bestVoice;
};

const LoadingOverlay = ({ text }) => (
  <div className="gear-overlay">
    {/* CSS 원형 바 대신, import된 이미지(동기화 그림)를 사용 */}
    <img src={LoadingSpinner} alt="loading" className="loading-spinner-img" />
    
    {/* 텍스트가 있을 경우 아래에 표시 */}
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

  const [userTotalBarcodeDB, setUserTotalBarcodeDB] = useState([]); 
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const voiceListCache = useRef([]);
  const listRef = useRef(null);
  
  const handleGoBack = () => {
    window.speechSynthesis.cancel();
    navigate('/'); 
  };

  const speak = (text, lang, voiceList) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 언어 코드 매핑 확장
    const langMap = { 
        'ko': 'ko-KR', 
        'en': 'en-US',
        'vi': 'vi-VN',
        'id': 'id-ID',
        'tl': 'fil-PH', // 필리핀어
        'my': 'my-MM'   // 미얀마어
    };
    
    // i18n 언어 코드가 'ko-KR' 처럼 길게 올 수도 있고 'ko' 처럼 짧게 올 수도 있음
    const shortLang = lang.substring(0, 2);
    utterance.lang = langMap[shortLang] || 'en-US';
    
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

  // 데이터 로딩
  useEffect(() => {
    const fetchUserAllGears = async () => {
      const mbrNo = localStorage.getItem('mbr_no');
      if (!mbrNo) {
        setIsDataLoaded(true);
        return; 
      }

      setIsLoading(true);
      setLoadingText(t('loading_gear_info') || "잠시만 기다려주세요..."); 

      try {
        const [remgRes, romgRes] = await Promise.all([
          // fId 대신 mbrNo 사용
          axios.get(`${API_BASE_URL}/user/${mbrNo}/rentals/remg`),
          axios.get(`${API_BASE_URL}/user/${mbrNo}/rentals/romg`)
        ]);

        const depositGroups = remgRes.data?.data?.list || [];
        const existingGroups = romgRes.data?.data?.list || [];
        const allGroups = [...depositGroups, ...existingGroups];

        const detailPromises = allGroups.map(group => {
          const id = group.spmt_mng_no || group.fsgr_reg_mng_no;
          const endpoint = group.spmt_mng_no 
            ? `${API_BASE_URL}/rentals/${id}/remg` 
            : `${API_BASE_URL}/rentals/${id}/romg`;
          
          return axios.get(endpoint).then(res => ({
            groupInfo: group,
            barcodes: res.data?.data?.barcodes || []
          })).catch(err => ({ groupInfo: group, barcodes: [] }));
        });

        const detailsResults = await Promise.all(detailPromises);
        const barcodeDB = [];
        detailsResults.forEach(result => {
          result.barcodes.forEach(b => {
            // 어구 종류도 다국어 처리가 필요할 수 있으나, 보통 DB에서 오는 값은 그대로 씀.
            // 여기서는 구분값만 키로 변환하거나 그대로 둠.
            const gearTypeKey = b.grnte_amt ? 'gear_type_deposit' : 'gear_type_existing';
            
            barcodeDB.push({
              bacod_nm: b.bacod_nm,
              fsgr_nm: result.groupInfo.fsgr_nm, 
              gvbk_type: b.grnte_amt ? t('deposit_gear') : t('existing_gear'), // ★ 번역 적용 (보증금 어구 / 기존 어구)
              gvbk_amt: Number(b.grnte_amt) || 0,
              gvbk_pnt: Number(b.rmbr_pnt) || 0,
              fullData: b
            });
          });
        });

        setUserTotalBarcodeDB(barcodeDB);
        setIsDataLoaded(true);

      } catch (err) {
        console.error("데이터 조회 실패:", err);
        setErrorMessage(t('error_load_gear') || "어구 정보를 불러오는데 실패했습니다."); // 번역 적용
      } finally {
        setIsLoading(false);
        setLoadingText("");
      }
    };
    fetchUserAllGears();
  }, [navigate, t]); // t 의존성 추가

  // 스피치
  useEffect(() => {
    if (isDataLoaded) {
        const key = 'AUTH_07'; 
        const textToSpeak = t(key);
        setTimeout(() => speak(textToSpeak, i18n.language, voiceListCache.current), 300);
    }
  }, [isDataLoaded, t, i18n.language]);

  // 스크롤 자동 이동
  useEffect(() => {
    if (listRef.current) {
        listRef.current.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  }, [scannedGears]);

  // 스캔 핸들러
  // const handleBarcodeScan = useCallback((scannedData) => {
  //   if (!scannedData || !isDataLoaded) return;

  //   if (scannedGears.some(gear => gear.bacod_nm === scannedData)) {
  //     setIsDuplicate(true);
  //     setTimeout(() => setIsDuplicate(false), 1500);
  //     setBarcodeScanInput('');
  //     return;
  //   }

  //   const foundGear = userTotalBarcodeDB.find(gear => gear.bacod_nm === scannedData);
  //   if (foundGear) {
  //     setScannedGears(prev => [...prev, foundGear]);
  //     setErrorMessage('');
  //   } else {
  //     setErrorMessage(t('error_barcode_not_found') || "대여 목록에 없는 바코드입니다."); // 번역 적용
  //     setTimeout(() => setErrorMessage(''), 2000);
  //   }
  //   setBarcodeScanInput('');
  // }, [scannedGears, userTotalBarcodeDB, isDataLoaded, t]);

  // 키보드 입력
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setBarcodeScanInput((prev) => prev + e.key);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); 

  // 스캔 핸들러
  const handleBarcodeScan = useCallback((scannedData) => {
    if (!scannedData || !isDataLoaded) return;

    // 1. 중복 스캔 방지 (이미 찍은 건지 확인)
    if (scannedGears.some(gear => gear.bacod_nm === scannedData)) {
      setIsDuplicate(true);
      setTimeout(() => setIsDuplicate(false), 1500);
      setBarcodeScanInput('');
      return;
    }

    // 2. 회원/비회원 여부 확인
    const isMember = localStorage.getItem('is_member') === 'true';

    if (isMember) {
      // [회원 로직] 내 대여 목록에 있는 바코드인지 깐깐하게 검사
      const foundGear = userTotalBarcodeDB.find(gear => gear.bacod_nm === scannedData);
      if (foundGear) {
        setScannedGears(prev => [...prev, foundGear]);
        setErrorMessage('');
      } else {
        setErrorMessage(t('error_barcode_not_found') || "대여 목록에 없는 바코드입니다.");
        setTimeout(() => setErrorMessage(''), 2000);
      }
    } else {
      // [비회원 로직] 주워온 어구도 반납할 수 있도록 무조건 통과 (길 뚫어주기!)
      // 이전 화면에서 선택한 어구 정보를 가져옵니다.
      const selectedTypeNm = localStorage.getItem('selected_fsgr_clsf_nm') || '통발어구';
      const gvbkTypeStr = localStorage.getItem('selected_gvbk_type') === '2' ? '기존어구' : '보증금어구';

      // 가짜 데이터 객체를 만들어서 스캔 목록에 강제로 밀어 넣습니다.
      const newNonMemberGear = {
        bacod_nm: scannedData, // 방금 찍은 바코드
        fsgr_nm: selectedTypeNm, // 선택했던 어구 이름
        gvbk_type: gvbkTypeStr, // 보증금어구 여부
        gvbk_amt: 0, // 금액은 일단 0원 (나중에 서버에 전송하면 서버가 정확한 금액을 줍니다)
        gvbk_pnt: 0,
        fullData: null
      };

      setScannedGears(prev => [...prev, newNonMemberGear]);
      setErrorMessage('');
    }

    setBarcodeScanInput('');
  }, [scannedGears, userTotalBarcodeDB, isDataLoaded, t]);
  // 입력 감지
  useEffect(() => {
    if (!barcodeInput) return;
    const inputTimer = setTimeout(() => {
      handleBarcodeScan(barcodeInput);
    }, 300); 
    return () => clearTimeout(inputTimer);
  }, [barcodeInput, handleBarcodeScan]);

  const totalAmount = scannedGears.reduce((sum, gear) => sum + gear.gvbk_amt, 0);
  const totalPoints = scannedGears.reduce((sum, gear) => sum + gear.gvbk_pnt, 0);

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
            
            <div className="step-tabs">
              <div className="step-tab inactive">
                <div className="step-num-circle">1</div>
                <span className="step-label">{t('step_1_auth') || '사용자 인증'}</span>
              </div>
              <div className="step-tab active">
                <div className="step-num-circle">2</div>
                <span className="step-label">{t('step_2_gear') || '어구보증금표식 인증'}</span>
              </div>
              <div className="step-tab inactive">
                <div className="step-num-circle">3</div>
                <span className="step-label">{t('step_3_input') || '투입'}</span>
              </div>
            </div>

            <h2 className="step-main-title">{t('scan_title_step2') || '2단계: 어구보증금표식 바코드 스캔'}</h2>

            <div className="gear-content-box">
              
              <div className="main-display-area">
                
                {scannedGears.length === 0 ? (
                    <div className="empty-scan-box">
                        <div className="empty-anim-area">
                            <div className="anim-scanner-large">
                                <ScannerHandIcon />
                                <div className="anim-beam-large"></div>
                            </div>
                            <div className="anim-target-large">
                                <GearTagIcon />
                                <div className="anim-laser-line-large"></div>
                            </div>
                        </div>
                        <p className="empty-scan-text">
                            {/* 줄바꿈 처리를 위해 split map 사용 */}
                            {(t('scan_instruction_msg') || '어구보증금표식 바코드를\n인식 시켜주세요.').split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}<br/>
                                </React.Fragment>
                            ))}
                        </p>
                    </div>
                ) : (
                    <div className="scanned-list-wrapper">
                        
                        <div className="list-title-row">
                             <h3>{t('scanned_barcode_title') || '스캔된 바코드'} ({scannedGears.length})</h3>
                        </div>

                        <div className="list-header-row">
                            <span className="header-col code">{t('col_gear_code') || '어구 코드'}</span>
                            <span className="header-col info">{t('col_gear_type') || '어구 종류'}</span>
                            <span className="header-col amt">{t('col_deposit_return') || '보증금 반환'}</span>
                        </div>
                        
                        <ul className="scanned-detail-list" ref={listRef}>
                            {scannedGears.map((gear, index) => (
                                <li key={index} className="scanned-item-row">
                                <div className="item-col code">{gear.bacod_nm}</div>
                                
                                <div className="item-col info">
                                    <div className="gear-name-wrapper">
                                        <span className={`gear-type-badge ${gear.gvbk_type === t('existing_gear') ? 'gray' : ''}`}>
                                            {gear.gvbk_type}
                                        </span>
                                        <span className="gear-real-name">
                                            {gear.fsgr_nm}
                                        </span>
                                    </div>
                                </div>

                                <div className="item-col amt">
                                    {gear.gvbk_amt > 0 ? `${gear.gvbk_amt.toLocaleString()}${t('currency_unit') || '원'}` : `${gear.gvbk_pnt.toLocaleString()}P`}
                                </div>
                                </li>
                            ))}
                        </ul>

                        <div className="scan-summary-box">
                            <div className="summary-item">
                                <span className="label">{t('total_deposit_acc') || '총 적립 보증금'}</span>
                                <span className="value">
                                    {totalAmount.toLocaleString()}{t('currency_unit') || '원'}
                                    <span className="separator"> / </span>
                                    <span className="point-sub">{totalPoints.toLocaleString()}P</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                
                {isDuplicate && <p className="duplicate-warning">{t('duplicate_barcode_warning')}</p>}
                {errorMessage && <p className="duplicate-warning" style={{color: 'red'}}>{errorMessage}</p>}
              </div>

              <button 
                className={`next-button ${scannedGears.length > 0 ? 'active' : ''}`}
                onClick={() => navigate('/deposit', { state: { scannedGears: scannedGears } })}
                disabled={scannedGears.length === 0}
              >
                {t('btn_next_scan_complete') || '다음 (스캔 완료)'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {isLoading && <LoadingOverlay text={loadingText} />}
    </div>
  );
};

export default GearScanScreen;