// src/gillnetPage/GillnetBarcodeScanScreen.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import ScanGuideVideo from '../assets/gillnet_scan.mp4'; 
import './GillnetBarcodescanscreen.css';
import axios from 'axios';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ScannerHandIcon = () => (
  <svg width="110" height="110" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 20 H70 A10 10 0 0 1 80 30 V50 A5 5 0 0 1 75 55 H40 L35 80 H15 L20 40 Z" fill="#333" stroke="#222" strokeWidth="2" />
    <path d="M70 20 H85 V50 H75" fill="#444" />
    <rect x="83" y="25" width="4" height="20" fill="#ff3b3b" />
    <path d="M40 35 Q45 30 55 35 Q60 40 50 45 L40 40" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" />
    <path d="M35 45 Q45 45 45 55 Q45 65 35 65 Q25 65 25 55" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" />
    <path d="M36 55 Q46 55 46 65 Q46 75 36 75" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" />
    <path d="M37 65 Q47 65 47 75 Q47 85 37 85 L32 80" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2" />
  </svg>
);

const GillnetBarcodeScanScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const GILLNET_NAME_MAP = {
    '자망(그물)': 'gear_type_gillnet',
    '자망': 'gear_type_gillnet',
    '갈망': 'gear_type_gillnet',
    '인망': 'gear_type_gillnet',
  };
  const translateGearName = (name) => {
    const key = GILLNET_NAME_MAP[name];
    return key ? t(key) : (name || t('gear_type_gillnet'));
  };

  const sack100 = parseInt(localStorage.getItem('gillnet_sack_100') || '0', 10);
  const sack200 = parseInt(localStorage.getItem('gillnet_sack_200') || '0', 10);
  const requiredCount = parseInt(localStorage.getItem('gillnet_total_gear') || '0', 10);

  const [scannedList, setScannedList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const voiceListCache = useRef([]);
  const scanTimer = useRef(null);
  const listRef = useRef(null);
  const bufferRef = useRef('');

  // ★ 처리 중 락 (Ref로 관리 → 클로저 문제 없음)
  const isLoadingRef = useRef(false);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  const speak = useCallback((text) => {
    if (!text || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const langMap = { ko: 'ko-KR', en: 'en-US', vi: 'vi-VN', tl: 'fil-PH', id: 'id-ID', my: 'my-MM' };
      const currentLang = i18n.language ? i18n.language.substring(0, 2) : 'ko';
      u.lang = langMap[currentLang] || 'ko-KR';
      
      if (voiceListCache.current.length > 0) {
        const v = voiceListCache.current.find(x => x.lang.includes(u.lang.substring(0, 2)));
        if (v) u.voice = v;
      }
      window.speechSynthesis.speak(u);
    } catch (e) { console.error("TTS Error:", e); }
  }, [i18n.language]);

  useEffect(() => {
    const load = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) voiceListCache.current = v;
      } catch (e) { console.error("Voices Load Error:", e); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;

    const timer = setTimeout(() => {
      speak(t('gillnet_dmc_voice', { count: requiredCount }) || `구입증에 부착된 DMC 바코드 ${requiredCount}장을 모두 스캔해 주세요.`);
    }, 500);

    return () => {
      clearTimeout(timer);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [requiredCount, t, speak]);

  // ★ 바코드 스캔 처리 (이미 반납된 구입증 차단 강화)
  const handleBarcodeScan = useCallback(async (raw) => {
    const code = raw.trim();
    if (!code) return;

    if (isLoadingRef.current) {
      console.log('⏳ 이전 스캔 처리 중, 무시:', code);
      return;
    }

    console.log('🔍 바코드 스캔 시도:', code);

    let isFull = false;
    let isDuplicate = false;
    setScannedList(prev => {
      if (prev.length >= requiredCount) isFull = true;
      else if (prev.some(item => item.bacod_nm === code)) isDuplicate = true;
      return prev;
    });

    if (isFull) {
      setErrorMessage(t('gillnet_dmc_full') || '모든 구입증을 스캔했습니다.');
      return;
    }
    if (isDuplicate) {
      setErrorMessage(t('duplicate_barcode_warning') || '이미 스캔된 바코드입니다.');
      speak('이미 스캔된 바코드입니다.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    const startTime = Date.now();

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api/v1/proxy/barcode/${code}/info`
      );
      const info = res.data?.data;

      if (!info || (res.data?.status !== '200' && res.data?.status !== 200)) {
        throw new Error(t('scan_err_not_found') || '등록되지 않은 바코드입니다.\n구입증을 다시 확인해 주세요.');
      }

      // [수정] PDF v1.3 기준: return_status가 'AVAILABLE' 또는 '반환가능'이어야 함
      const statusCode = (info.return_status || '').toUpperCase().trim();
      const statusDesc = (info.return_status_desc || '').trim();

      // 반환 가능한 상태인지 확인 (영문 AVAILABLE 또는 한글 반환가능)
      const isAvailable = (statusCode === 'AVAILABLE' || statusCode === '반환가능' || statusDesc.includes('가능'));

      if (!isAvailable) {
        console.warn('❌ 반납 불가 상태 감지:', { statusCode, statusDesc, code });
        
        let userMessage = '';
        if (statusCode === 'COMPLETED' || statusCode === '반환완료' || statusDesc.includes('완료') || statusDesc.includes('반환완료')) {
          userMessage = `이미 반납된 구입증입니다.\n다른 구입증을 스캔해 주세요.\n\n(바코드: ${code})`;
          speak('이미 반납된 구입증입니다. 다른 구입증을 스캔해 주세요.');
        } else if (statusCode === 'CANCELED' || statusCode === '취소' || statusDesc.includes('취소')) {
          userMessage = `취소 처리된 구입증입니다.\n사용할 수 없습니다.\n\n(바코드: ${code})`;
          speak('취소된 구입증입니다.');
        } else if (statusCode === 'EXPIRED' || statusCode === '만료' || statusDesc.includes('만료')) {
          userMessage = `만료된 구입증입니다.\n사용할 수 없습니다.\n\n(바코드: ${code})`;
          speak('만료된 구입증입니다.');
        } else {
          userMessage = `반납할 수 없는 구입증입니다.\n${statusDesc ? `사유: ${statusDesc}` : ''}\n\n(바코드: ${code})`;
          speak('반납할 수 없는 구입증입니다.');
        }
        throw new Error(userMessage);
      }

      if (info.gvbk_type !== '01') {
        throw new Error(
          t('gillnet_dmc_err_not_deposit') || 
          '보증금 자망 구입증이 아닙니다.\n흰색 보증금 구입증을 스캔해 주세요.'
        );
      }

      if (info.fsgr_clsf_cd && info.fsgr_clsf_cd !== 'GILNT') {
        throw new Error(
          `자망 구입증이 아닙니다.\n(인식된 어구: ${info.gvbk_type_nm || info.fsgr_nm || '알 수 없음'})`
        );
      }

      if (!info.gvbk_amt || info.gvbk_amt <= 0) {
        throw new Error(`보증금 정보가 비정상입니다.\n관리자에게 문의해 주세요.\n(바코드: ${code})`);
      }

      const newItem = {
        bacod_nm: info.bacod_nm || code,
        fsgr_nm: info.fsgr_nm,
        gvbk_amt: info.gvbk_amt || 0,
      };

      setScannedList(prev => {
        // [수정] 이미 목록에 있는 경우 중복 추가 방지 (코드 비교 시 trim 적용)
        if (prev.some(item => (item.bacod_nm || '').trim() === code)) return prev;
        
        const newList = [...prev, newItem];
        const remain = requiredCount - newList.length;
        if (remain > 0) speak(`인식되었습니다. 남은 수량 ${remain}장.`);
        else speak('모든 구입증 인식이 완료되었습니다.');
        return newList;
      });

      console.log('✅ 구입증 인식 성공:', code, info);

    } catch (err) {
      console.error('❌ 스캔 오류:', err);
      const serverMsg = err.response?.data?.message;
      const finalMsg = serverMsg || err.message || '바코드 처리 중 오류가 발생했습니다.';
      setErrorMessage(finalMsg);
    } finally {
      const wait = Math.max(0, 800 - (Date.now() - startTime));
      setTimeout(() => setIsLoading(false), wait);
    }
  }, [requiredCount, t, speak]);

  // ★ 복구된 바코드 스캐너 키보드 감지 로직 (CLI 오류 수정 부분)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        const bc = bufferRef.current.trim();
        if (bc) handleBarcodeScan(bc);
        bufferRef.current = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        bufferRef.current += e.key;
        clearTimeout(scanTimer.current);
        
        // 데이터 삭제가 아닌 "전송(handleBarcodeScan)" 후 초기화하도록 완벽 복구
        scanTimer.current = setTimeout(() => { 
          if (bufferRef.current) {
            handleBarcodeScan(bufferRef.current.trim());
            bufferRef.current = ''; 
          }
        }, 300);
      }
    };
    
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(scanTimer.current);
    };
  }, [handleBarcodeScan]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [scannedList]);

  const handleProceed = () => {
    if (scannedList.length < requiredCount) return;
    localStorage.setItem('gillnet_scanned_gears', JSON.stringify(scannedList));
    navigate('/gillnet/deposit');
  };

  return (
    <div className="gnt-scan-wrapper" style={{ backgroundImage: `url(${BgImage})` }}>
      <Header />
      <button className="auth-back-btn" onClick={() => navigate('/gillnet/sack-select')}>
        <BackIcon /><span className="auth-back-text">{t('btn_back') || '뒤로가기'}</span>
      </button>

      <div className="gnt-video-section">
        <video className="gnt-scan-video" src={ScanGuideVideo} autoPlay loop muted playsInline />
      </div>

      <div className="gnt-scan-content-area">
        <div className="gnt-main-card">
          <div className="step-tabs">
            <div className="step-tab"><div className="step-num-circle">1</div><span className="step-label">{t('auth_step_1')}</span></div>
            <div className="step-tab active"><div className="step-num-circle">2</div><span className="step-label">{t('gillnet_step_dmc')}</span></div>
            <div className="step-tab"><div className="step-num-circle">3</div><span className="step-label">{t('auth_step_3')}</span></div>
          </div>

          <h2 className="gnt-step-title">{t('gillnet_dmc_title')}</h2>

          <div className="gnt-inner-blue-box">
            <p className="gnt-instruction-text">
              {t('gillnet_dmc_instruction')}
              <br/><span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#666' }}>{t('gillnet_dmc_count_info', { s100: sack100, s200: sack200, total: requiredCount })}</span>
            </p>

            <div className="gnt-vertical-layout">
              <div className="gnt-progress-strip">
                <span className="gnt-strip-label">{t('gillnet_dmc_progress')}</span>
                <div className="gnt-strip-bar-bg"><div className="gnt-strip-bar-fill" style={{ width: `${requiredCount > 0 ? (scannedList.length / requiredCount) * 100 : 0}%` }} /></div>
                <div className="gnt-strip-count"><span className="curr">{scannedList.length}</span><span className="sep">/</span><span className="total">{requiredCount}</span><span className="unit">{t('gillnet_dmc_unit')}</span></div>
              </div>

              <div className="scanned-list-wrapper">
                <div className="list-header-row"><span>번호</span><span>{t('gillnet_dmc_table_code')}</span><span>{t('gillnet_dmc_table_type')}</span><span>{t('gillnet_dmc_table_amt')}</span></div>
                <ul className="scanned-detail-list" ref={listRef}>
                  {scannedList.length === 0 ? (
                    <li className="gnt-empty-row">
                      <div className="gnt-barcode-anim-wrapper">
                        <div className="gnt-anim-scanner-part">
                          <ScannerHandIcon />
                          <div className="gnt-anim-scanner-beam"></div>
                        </div>
                        <div className="gnt-anim-barcode-card">
                          <div className="gnt-anim-barcode-stripes">
                            {[5,2,4,2,5,3,2,5,2,4,3,5,2,4].map((w, i) => (
                              <div key={i} className="gnt-anim-stripe" style={{ width: `${w}px` }} />
                            ))}
                          </div>
                          <div className="gnt-anim-barcode-laser"></div>
                          <div className="gnt-anim-card-label">어구보증금</div>
                        </div>
                      </div>
                      <span className="gnt-empty-text">{t('gillnet_dmc_empty')}</span>
                    </li>
                  ) : (
                    scannedList.map((item, i) => (
                      <li key={i} className="scanned-item-row"><span>{i + 1}</span><span className="code">{item.bacod_nm}</span><span className="type">{translateGearName(item.fsgr_nm)}</span><span className="amt">{item.gvbk_amt?.toLocaleString()}{t('currency_unit')}</span></li>
                    ))
                  )}
                </ul>
                {scannedList.length > 0 && (<div className="scan-summary-box"><span className="summary-label">{t('gillnet_dmc_total')}</span><strong className="summary-value">{scannedList.reduce((s, x) => s + (x.gvbk_amt || 0), 0).toLocaleString()}{t('currency_unit')}</strong></div>)}
              </div>
            </div>

            <div className="gnt-action-row">
              <button className={`gnt-action-btn next ${(scannedList.length === requiredCount && requiredCount > 0) ? 'active' : ''}`} onClick={handleProceed} disabled={scannedList.length !== requiredCount}>
                {scannedList.length === requiredCount ? t('gillnet_dmc_btn_proceed') : t('gillnet_dmc_btn_waiting', { remain: requiredCount - scannedList.length })}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="gnt-alert-overlay">
          <div className="gnt-loading-spinner" />
          <p className="large-text" style={{ color: 'white', marginTop: '30px', fontWeight: '900', fontSize: '2.5rem' }}>{t('gillnet_dmc_sync_desc')}</p>
        </div>
      )}

      {errorMessage && (
        <div className="gnt-alert-overlay" onClick={() => setErrorMessage('')}>
          <div className="gnt-alert-box large" onClick={e => e.stopPropagation()}>
            <div className="gnt-alert-header"><h3>{t('alert_title')}</h3></div>
            <div className="gnt-alert-body"><p className="large-text">{errorMessage.split('\n').map((l, i) => <React.Fragment key={i}>{l}<br /></React.Fragment>)}</p></div>
            <div className="gnt-alert-footer"><button className="gnt-alert-btn" onClick={() => setErrorMessage('')}>{t('btn_confirm')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GillnetBarcodeScanScreen;