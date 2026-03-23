// src/certificationPage/GearScanScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import './GearScanScreen.css';
import LoadingSpinner from '../assets/loading-spinner.png';
import BgImage from '../assets/bg_all.png';
import Header from '../mainPage/Header';
import GearBarcodeVideo from '../assets/어구바코드.mp4';

const API_BASE_URL = 'http://localhost:8080/api/v1/proxy';

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

  // ★ 1. 선택한 어구 종류의 바코드 목록만 "미리" 싹 가져와서 저장해둠 (반납 처리 아님!)
  // useEffect(() => {
  //   const fetchUserGears = async () => {
  //     const mbrNo = localStorage.getItem('mbr_no');
  //     const isMember = localStorage.getItem('is_member') === 'true' || (mbrNo && mbrNo.trim() !== '');
  //     if (!isMember || !mbrNo) {
  //       setIsDataLoaded(true);
  //       return;
  //     }

  //     setIsLoading(true);
  //     setLoadingText("어구 데이터를 동기화 중입니다...");

  //     try {
  //       let allGroups = [];
  //       // ★ 속도 최적화: 사용자가 선택한 모드(보증금/기존)의 목록 하나만 가져옵니다!
  //       if (gearType === '1') {
  //         const res = await axios.get(`${API_BASE_URL}/user/${mbrNo}/rentals/remg`);
  //         allGroups = res.data?.data?.list || [];
  //       } else {
  //         const res = await axios.get(`${API_BASE_URL}/user/${mbrNo}/rentals/romg`);
  //         allGroups = res.data?.data?.list || [];
  //       }

  //       const detailPromises = allGroups.map(group => {
  //         const id = group.spmt_mng_no || group.fsgr_reg_mng_no;
  //         const endpoint = group.spmt_mng_no
  //           ? `${API_BASE_URL}/rentals/${id}/remg`
  //           : `${API_BASE_URL}/rentals/${id}/romg`;

  //         return axios.get(endpoint).then(res => ({
  //           groupInfo: group,
  //           barcodes: res.data?.data?.barcodes || []
  //         })).catch(err => ({ groupInfo: group, barcodes: [] }));
  //       });

  //       const detailsResults = await Promise.all(detailPromises);
  //       const barcodeDB = [];

  //       detailsResults.forEach(result => {
  //         result.barcodes.forEach(b => {
  //           // ★ 0원 오류 완벽 해결: 서버가 내려주는 정확한 키값(grnte_amt, rmbr_pnt) 사용
  //           barcodeDB.push({
  //             bacod_nm: b.bacod_nm,
  //             fsgr_nm: b.fsgr_nm || result.groupInfo.fsgr_nm,
  //             gvbk_type: gearType === '1' ? '보증금어구' : '기존어구',
  //             gvbk_amt: Number(b.grnte_amt) || 0, // 보증금 금액
  //             gvbk_pnt: Number(b.rmbr_pnt) || 0,  // 기존어구 포인트
  //             fullData: b
  //           });
  //         });
  //       });

  //       setUserTotalBarcodeDB(barcodeDB);
  //       setIsDataLoaded(true);

  //     } catch (err) {
  //       console.error("데이터 동기화 실패:", err);
  //       setErrorMessage("대여 목록을 불러오지 못했습니다.");
  //     } finally {
  //       setIsLoading(false);
  //       setLoadingText("");
  //     }
  //   };

  //   fetchUserGears();
  // }, [gearType]);
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
    }, 300);
    return () => clearTimeout(inputTimer);
  }, [barcodeInput]);

  // ★ 2. 바코드 스캔 핸들러 (비회원/테스트 시 금액 정확하게 계산)
  // ★ 2. 바코드 스캔 핸들러 (서버 대기 없이 즉각 처리)
  const handleBarcodeScan = useCallback((scannedData) => {
    const cleanBarcode = scannedData.trim();
    if (!cleanBarcode || !isDataLoaded) return;

    if (scannedGears.some(gear => gear.bacod_nm === cleanBarcode)) {
      setIsDuplicate(true);
      setTimeout(() => setIsDuplicate(false), 1500);
      setBarcodeScanInput('');
      return;
    }

    // 💡 프론트엔드에서 무거운 검증 없이 바로 스캔 목록에 추가! 
    // (진짜 검증은 3단계 투입 시 서버가 안전하게 처리합니다)
    const selectedTypeNm = localStorage.getItem('selected_fsgr_clsf_nm') || '장구형의통발';
    const selectedCd = localStorage.getItem('selected_fsgr_clsf_cd') || 'FISGE';

    let depositAmount = 0; 
    if (selectedTypeNm.includes('장구형')) depositAmount = 1000;       
    else if (selectedTypeNm.includes('장어')) depositAmount = 300;   
    else if (selectedTypeNm.includes('자망')) depositAmount = 2000;  
    else if (selectedTypeNm.includes('원뿔대형')) depositAmount = 2000;  
    else if (selectedTypeNm.includes('사각형')) depositAmount = 3000;  
    else depositAmount = 1000; // 기본값

    // 기존 어구일 경우 포인트 400P 고정
    const pointAmount = gearType === '2' ? 400 : 0;

    const newGear = {
      bacod_nm: cleanBarcode,
      fsgr_nm: selectedTypeNm,
      gvbk_type: gearType === '1' ? '보증금어구' : '기존어구',
      gvbk_amt: gearType === '1' ? depositAmount : 0,
      gvbk_pnt: pointAmount,
    };
    
    setScannedGears(prev => [...prev, newGear]);
    setErrorMessage('');
    setBarcodeScanInput('');
  }, [scannedGears, isDataLoaded, gearType]);

  
  const totalAmount = scannedGears.reduce((sum, gear) => sum + gear.gvbk_amt, 0);
  const totalPoints = scannedGears.reduce((sum, gear) => sum + gear.gvbk_pnt, 0);

  const handleProceed = () => {
    // 이제 진짜 반납(서버 통신)은 3단계 (DepositScreen)로 넘겨서 거기서 진행합니다!
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

            <div className="step-tabs">
              <div className="step-tab inactive"><div className="step-num-circle">1</div><span className="step-label">사용자 인증</span></div>
              <div className="step-tab active"><div className="step-num-circle">2</div><span className="step-label">어구보증금표식 인증</span></div>
              <div className="step-tab inactive"><div className="step-num-circle">3</div><span className="step-label">투입</span></div>
            </div>

            <h2 className="step-main-title">2단계: 어구보증금표식 바코드 스캔</h2>

            <div className="gear-content-box">
              <div className="main-display-area">

                {scannedGears.length === 0 ? (
                  <div className="empty-scan-box">
                    <div className="empty-anim-area">
                      <div className="anim-scanner-large"><ScannerHandIcon /><div className="anim-beam-large"></div></div>
                      <div className="anim-target-large"><GearTagIcon /><div className="anim-laser-line-large"></div></div>
                    </div>
                    <p className="empty-scan-text">
                      {(t('scan_instruction_msg') || '어구보증금표식 바코드를\n인식 시켜주세요.').split('\n').map((line, i) => (
                        <React.Fragment key={i}>{line}<br /></React.Fragment>
                      ))}
                    </p>
                  </div>
                ) : (
                  <div className="scanned-list-wrapper">
                    <div className="list-title-row">
                      <h3>스캔된 바코드 ({scannedGears.length})</h3>
                    </div>

                    <div className="list-header-row">
                      <span className="header-col code">어구 코드</span>
                      <span className="header-col info">어구 종류</span>
                      <span className="header-col amt">보증금/포인트</span>
                    </div>

                    <ul className="scanned-detail-list" ref={listRef}>
                      {scannedGears.map((gear, index) => (
                        <li key={index} className="scanned-item-row">
                          <div className="item-col code">{gear.bacod_nm}</div>
                          <div className="item-col info">
                            <div className="gear-name-wrapper">
                              <span className={`gear-type-badge ${gear.gvbk_type === '기존어구' ? 'gray' : ''}`}>{gear.gvbk_type}</span>
                              <span className="gear-real-name">{gear.fsgr_nm}</span>
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
                        <span className="label">{gearType === '1' ? '총 환급 예정 금액' : '총 적립 예정 포인트'}</span>
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

                {isDuplicate && <p className="duplicate-warning">{t('duplicate_barcode_warning')}</p>}
                {errorMessage && <p className="duplicate-warning" style={{ color: '#d9534f' }}>{errorMessage}</p>}
              </div>

              <button
                className={`next-button ${scannedGears.length > 0 ? 'active' : ''}`}
                onClick={handleProceed}
                disabled={scannedGears.length === 0}
              >
                다음 (스캔 완료)
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