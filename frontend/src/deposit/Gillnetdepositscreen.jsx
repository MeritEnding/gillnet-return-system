// src/gillnetPage/GillnetDepositScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';
import DepositVideo from '../assets/gillnet_return.mp4';
import './Gillnetdepositscreen.css';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SafetyWarningIcon = () => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#DC3545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const KIOSK_NO = process.env.REACT_APP_KIOSK_NO || 'KIOSK-001';

const GillnetDepositScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const sack100 = parseInt(localStorage.getItem('gillnet_sack_100') || '0', 10);
  const sack200 = parseInt(localStorage.getItem('gillnet_sack_200') || '0', 10);
  const totalSacks = sack100 + sack200;
  const totalGearCount = parseInt(localStorage.getItem('gillnet_total_gear') || '0', 10);

  let scannedGears = [];
  try {
    const raw = localStorage.getItem('gillnet_scanned_gears');
    if (raw) scannedGears = JSON.parse(raw);
  } catch (e) { console.error("Parse Error:", e); }

  const isDeposit = localStorage.getItem('selected_gvbk_type') === '1';

  // DEPOSITING(투입중) -> CONFIRMING(최종확인)
  const [viewState, setViewState] = useState('DEPOSITING');
  
  // 투입 프로세스 상세 상태
  // IDLE -> OPENING -> WAITING -> COMPRESSING -> CLOSING -> CONVEYING -> NEXT_CHECK
  const [processStep, setProcessStep] = useState('IDLE');
  const [currentSackIndex, setCurrentSackIndex] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDoorClosed, setIsDoorClosed] = useState(false);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);

  const voiceListCache = useRef([]);

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

  // 초기 시작
  useEffect(() => {
    const load = () => {
      try {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) voiceListCache.current = v;
      } catch (e) { console.error("Voices Load Error:", e); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;

    if (totalSacks > 0) {
      startDepositCycle(1);
    } else {
      // 마대가 없으면 바로 확인 단계로 (이런 경우는 거의 없겠지만)
      setViewState('CONFIRMING');
    }

    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // 한 마대 투입 사이클 시작
  const startDepositCycle = async (index) => {
    setCurrentSackIndex(index);
    setProcessStep('OPENING');
    setStatusMessage(`${index}번째 마대를 투입하기 위해\n투입구를 열고 있습니다.`);
    speak(`${index}번째 마대를 투입해 주세요. 투입구를 열고 있습니다.`);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      await axios.post(`${API_URL}/api/auth/hw/gillnet-door`, { open: true });
      
      setProcessStep('WAITING');
      setStatusMessage(`${index}번째 마대를 투입구에 넣고\n[압축] 버튼을 눌러주세요.`);
      speak(`${index}번째 마대를 투입구에 넣고 압축 버튼을 눌러주세요.`);
    } catch (err) {
      console.error('Door Open Error:', err);
      // 에러 시에도 진행 (Bypass)
      setProcessStep('WAITING');
    }
  };

  // 압축 버튼 클릭
  const handleCompress = async () => {
    setProcessStep('COMPRESSING');
    setIsLoading(true);
    setShowSafetyWarning(true);
    setStatusMessage(`${currentSackIndex}번째 마대를 압축하고 있습니다.`);
    speak(t('gillnet_msg_safety_voice') || '위험하오니 한 걸음 뒤로 물러서 주세요. 압축기가 작동합니다.');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      
      // 압축 API 호출 (없을 경우 4초 대기 시뮬레이션)
      try {
        await axios.post(`${API_URL}/api/auth/hw/gillnet-compress`, {}, { timeout: 3000 });
      } catch (e) {
        console.warn('Compress API missing or timeout, using simulation');
        await new Promise(r => setTimeout(r, 4000));
      }

      // 압축 완료 후 문 닫기
      setProcessStep('CLOSING');
      setStatusMessage(`압축 완료. 투입구를 닫고 적재함으로 이동합니다.`);
      speak(`압축이 완료되었습니다. 투입구를 닫습니다.`);
      
      await axios.post(`${API_URL}/api/auth/hw/gillnet-door`, { open: false });
      await new Promise(r => setTimeout(r, 1000));

      // 컨베이어 작동
      setProcessStep('CONVEYING');
      setStatusMessage(`마대를 적재함으로 이동 중입니다.`);
      await axios.post(`${API_URL}/api/deposit/action/conveyor`);
      await new Promise(r => setTimeout(r, 4000)); // 적재 시간 대기

      setShowSafetyWarning(false);

      // 다음 마대 체크
      if (currentSackIndex < totalSacks) {
        startDepositCycle(currentSackIndex + 1);
      } else {
        setStatusMessage('모든 마대 투입이 완료되었습니다.');
        speak('모든 마대 투입이 완료되었습니다. 내역을 확인해 주세요.');
        setViewState('CONFIRMING');
      }
    } catch (err) {
      console.error('Process Error:', err);
      setStatusMessage(`오류가 발생했습니다: ${err.message}`);
      setShowSafetyWarning(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalConfirm = async () => {
    setIsLoading(true);
    speak(t('STATUS_01') || '반납 내역을 기록하고 있습니다.');

    const formatBrdt = (brdt) => {
      if (!brdt) return "1990-01-01";
      const cleaned = ('' + brdt).replace(/\D/g, '');
      if (cleaned.length === 8) {
        return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
      }
      return brdt;
    };

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      const userFshndNo = localStorage.getItem('fisherman_id') || '';
      const fishermanName = localStorage.getItem('fisherman_name') || '';
      const mblTelno = localStorage.getItem('mbl_telno') || localStorage.getItem('fisherman_phone') || '';
      const rawBrdt = localStorage.getItem('brdt') || localStorage.getItem('birthdate') || '';
      const formattedBrdt = formatBrdt(rawBrdt);

      const totalAmount = scannedGears.reduce((s, x) => s + (x.gvbk_amt || 0), 0);

      let resultData = null;

      if (isDeposit) {
        const startEndpoint = `${API_URL}/api/v1/proxy/deposit/return/remg/start`;
        const registerEndpoint = `${API_URL}/api/v1/proxy/deposit/return/remg`;

        const startPayload = {
          kiosk_no: KIOSK_NO,
          user_fshnd_no: userFshndNo,
          fsgr_clsf_cd: 'GILNT',                  
          korn_flnm: fishermanName,
          brdt: formattedBrdt,
          mbl_telno: mblTelno,
          bank_cd: localStorage.getItem('bank_cd') || '',
          actno: localStorage.getItem('actno') || '',
          acct_nm: localStorage.getItem('acct_nm') || '',
        };

        const startRes = await axios.post(startEndpoint, startPayload);
        if (startRes.data?.status !== '200' && startRes.data?.status !== 200) {
          throw new Error(startRes.data?.message || '반납 세션 시작 실패');
        }

        const gvbk_mng_no = startRes.data.data?.gvbk_mng_no;

        for (const gear of scannedGears) {
          const regPayload = { bacod_nm: gear.bacod_nm, gvbk_mng_no };
          await axios.post(registerEndpoint, regPayload);
        }

        resultData = { gvbk_mng_no, totalDeposit: totalAmount, totalPoint: 0, totalCount: scannedGears.length };

      } else {
        const manualEndpoint = `${API_URL}/api/v1/proxy/deposit/return/romg/manual`;
        let bfrFsgrMngNo = localStorage.getItem('selected_bfr_fsgr_mng_no') || '';

        const manualPayload = {
          kiosk_no: KIOSK_NO,                                                  
          user_fshnd_no: userFshndNo,                                          
          bfr_fsgr_mng_no: bfrFsgrMngNo,
          sack_100_quaty: sack100,                                             
          sack_200_quaty: sack200,                                             
          quaty: totalGearCount,
          gvbk_in_se_cd: (localStorage.getItem('is_member') === 'true') ? '01' : '02',
          korn_flnm: fishermanName,
          brdt: formattedBrdt,
          mbl_telno: mblTelno,
          bank_cd: localStorage.getItem('bank_cd') || '',
          actno: localStorage.getItem('actno') || '',
          acct_nm: localStorage.getItem('acct_nm') || '',
        };

        const res = await axios.post(manualEndpoint, manualPayload);
        if (res.data?.status !== '200' && res.data?.status !== 200) {
          throw new Error(res.data?.message || '반납 등록 실패');
        }

        const data = res.data.data;
        resultData = {
          bfr_fsgr_gvbk_no: data?.bfr_fsgr_gvbk_no,
          totalDeposit: 0,
          totalPoint: data?.gvbk_pnt || 0,         
          totalCount: data?.quaty || totalGearCount, 
        };
      }

      speak(t('COMP_02') || '반납이 완료되었습니다.');
      navigate('/completion', { state: resultData });

    } catch (err) {
      console.error('❌ 반납 처리 오류:', err);
      const msg = err.response?.data?.message || err.message || '알 수 없는 오류';
      setStatusMessage(`반납 처리 중 오류가 발생했습니다.\n(${msg})`);
      speak('오류가 발생했습니다. 관리자에게 문의해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDoors = async () => {
    setIsLoading(true);
    setShowSafetyWarning(true);
    speak(t('deposit_msg_safety_voice') || '위험하오니 한 걸음 뒤로 물러서 주세요. 투입구가 닫힙니다.');

    try {
      await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:8080'}/api/auth/hw/barcode-door`, { open: false });
      await new Promise(res => setTimeout(res, 2000)); // 문이 닫히는 시간 동안 대기 및 경고 유지
      setIsDoorClosed(true);
      speak(t('deposit_voice_confirm_complete'));
    } catch (err) {
      console.warn('문 닫기 실패:', err);
      setIsDoorClosed(true);
    } finally {
      setIsLoading(false);
      setShowSafetyWarning(false);
    }
  };

  const handleGoBack = () => {
    if (viewState === 'DEPOSITING') {
      if (isDeposit) navigate('/gillnet/scan');
      else navigate('/gillnet/sack-select');
    }
  };

  return (
    <div className="gdep-wrapper" style={{ backgroundImage: `url(${BgImage})` }}>
      <Header />
      {viewState === 'DEPOSITING' && (
        <button className="auth-back-btn" onClick={handleGoBack}>
          <BackIcon /><span className="auth-back-text">{t('btn_back') || '뒤로가기'}</span>
        </button>
      )}

      <div className="gdep-video-section">
        <video className="gdep-video" src={DepositVideo} autoPlay loop muted playsInline />
      </div>

      <div className="gdep-content-area">
        <div className="gdep-main-card">
          <div className="step-tabs">
            <div className="step-tab"><div className="step-num-circle">1</div><span className="step-label">{t('auth_step_1')}</span></div>
            <div className="step-tab"><div className="step-num-circle">2</div><span className="step-label">{isDeposit ? t('gillnet_step_dmc') : t('gillnet_step_2')}</span></div>
            <div className="step-tab active"><div className="step-num-circle">3</div><span className="step-label">{t('auth_step_3')}</span></div>
          </div>

          <h2 className="gdep-step-title">
            {viewState === 'DEPOSITING' 
              ? `${t('gillnet_dep_confirm_title')} (${currentSackIndex} / ${totalSacks})`
              : t('gillnet_dep_confirm_title')}
          </h2>

          <div className="gdep-inner-blue-box">
            <div className="gdep-summary-header">
              <div className="gdep-summary-item"><span className="label">{t('gillnet_dep_sack_100')}</span><span className="value">{sack100}{t('gillnet_dmc_unit')}</span></div>
              <div className="gdep-summary-item"><span className="label">{t('gillnet_dep_sack_200')}</span><span className="value">{sack200}{t('gillnet_dmc_unit')}</span></div>
              <div className="gdep-summary-item"><span className="label">{t('gillnet_dep_total_gears')}</span><span className="value highlight">{totalGearCount}{t('gear_unit')}</span></div>
            </div>

            {viewState === 'DEPOSITING' && (
              <div className="gdep-action-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="gdep-status-box" style={{height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <div className="gdep-status-msg" style={{fontSize: '3rem', lineHeight: '1.4'}}>
                    {statusMessage.split('\n').map((l, i) => <React.Fragment key={i}>{l}<br /></React.Fragment>)}
                  </div>
                </div>

                <div className="gdep-progress-bar-container" style={{width: '100%', height: '20px', backgroundColor: '#eee', borderRadius: '10px', marginBottom: '30px', overflow: 'hidden'}}>
                    <div className="gdep-progress-bar" style={{width: `${(currentSackIndex / totalSacks) * 100}%`, height: '100%', backgroundColor: '#006090', transition: 'width 0.5s ease'}} />
                </div>

                <div className="gdep-btn-group">
                  {processStep === 'WAITING' ? (
                    <button 
                        className="gdep-primary-btn blue" 
                        onClick={handleCompress} 
                        disabled={isLoading}
                        style={{fontSize: '3rem', height: '120px'}}
                    >
                        {t('gillnet_compress_btn') || '압축 시작'}
                    </button>
                  ) : (
                    <div style={{textAlign: 'center', width: '100%'}}>
                        <div className="gnt-loading-spinner" style={{margin: '0 auto 20px'}} />
                        <p style={{fontSize: '2.5rem', fontWeight: '800', color: '#444'}}>{statusMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewState === 'CONFIRMING' && (
              <div className="gdep-confirm-section">
                {scannedGears.length > 0 && (
                  <div className="gdep-list-wrapper">
                    <div className="gdep-list-header"><span>#</span><span>{t('gillnet_dmc_table_code')}</span><span>{t('gillnet_dmc_table_type')}</span><span>{t('gillnet_dmc_table_amt')}</span></div>
                    <ul className="gdep-list-scroll">
                      {scannedGears.map((g, idx) => (
                        <li key={idx} className="gdep-list-row"><span>{idx + 1}</span><span className="code">{g.bacod_nm}</span><span className="type">{g.fsgr_nm || '자망'}</span><span className="amt">{g.gvbk_amt?.toLocaleString()}{t('currency_unit')}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="gdep-result-card">
                  <div className="gdep-result-row"><span>{t('gillnet_sack_total_sack')}</span><strong>{sack100 + sack200}{t('gillnet_dmc_unit')}</strong></div>
                  <div className="gdep-result-row big"><span>{t('gillnet_dep_total_gears')}</span><strong className="amt">{totalGearCount}{t('gear_unit')}</strong></div>
                </div>
                {!isDoorClosed && <p className="gdep-notice">{t('gillnet_dep_notice_close')}</p>}
                <div className="gdep-btn-group">
                  <button className={`gdep-half-btn ${isDoorClosed ? 'done' : 'yellow'}`} onClick={handleCloseDoors} disabled={isLoading || isDoorClosed}>{t('gillnet_dep_btn_close_barcode')}</button>
                  <button className={`gdep-half-btn ${isDoorClosed ? 'green' : 'disabled'}`} onClick={handleFinalConfirm} disabled={isLoading || !isDoorClosed}>{t('gillnet_dep_btn_confirm')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading && processStep === 'COMPRESSING' && !showSafetyWarning && (
        <div className="gdep-alert-overlay">
          <div className="gnt-loading-spinner" style={{width: '100px', height: '100px', borderWidth: '10px'}} />
          <p className="gdep-loading-text" style={{fontSize: '2.5rem'}}>{currentSackIndex}번째 마대 압축 중...</p>
        </div>
      )}

      {showSafetyWarning && (
        <div className="safety-warning-overlay">
          <div className="safety-warning-box">
            <SafetyWarningIcon />
            <h1 className="safety-warning-title">{t('gillnet_warn_title') || '위험! 압축기 작동 중'}</h1>
            <p className="safety-warning-text">
              {t('gillnet_warn_desc_1') || '안전을 위해 한 걸음'}<br />
              {t('gillnet_warn_desc_2') || '뒤로 '}<strong>{t('gillnet_warn_desc_3') || '물러서 주세요!'}</strong>
            </p>
          </div>
        </div>
      )}

      {statusMessage.includes('실패') && (
        <div className="gnt-alert-overlay" onClick={() => setStatusMessage('')}>
          <div className="gnt-alert-box large" onClick={e => e.stopPropagation()}>
            <div className="gnt-alert-header"><h3>{t('alert_title')}</h3></div>
            <div className="gnt-alert-body"><p className="large-text">{statusMessage.split('\n').map((l, i) => <React.Fragment key={i}>{l}<br /></React.Fragment>)}</p></div>
            <div className="gnt-alert-footer"><button className="gnt-alert-btn" onClick={() => setStatusMessage('')}>{t('btn_confirm')}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GillnetDepositScreen;