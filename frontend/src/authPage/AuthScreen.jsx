// src/AuthScreen.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import * as Hangul from 'hangul-js';
import './AuthScreen.css';
import LoadingSpinner from '../assets/loading-spinner.png';
import QrGuideVideo from '../assets/qr_guide_video.mp4';
import AuthSuccessVideo from '../assets/사용자 인증 완료.mp4'; 
import BgImage from '../assets/bg_all.png';
import Header from '../mainPage/Header';

const BackIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg> );
const QrCodeIcon = () => ( <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v1h-6zM15 19h1v2h-1zM19 15h2v1h-2zM17 17h2v2h-2zM15 17h1v1h-1zM19 19h2v2h-2z" fill="#333"/><path d="M4 4v4h4V4H4zm12 0v4h4V4h-4zM4 16v4h4v-4H4z" fill="#333"/></svg> );
const ScannerHandIcon = () => ( <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 20 H70 A10 10 0 0 1 80 30 V50 A5 5 0 0 1 75 55 H40 L35 80 H15 L20 40 Z" fill="#333" stroke="#222" strokeWidth="2"/><path d="M70 20 H85 V50 H75" fill="#444" /><rect x="83" y="25" width="4" height="20" fill="#ff3b3b" /><path d="M40 35 Q45 30 55 35 Q60 40 50 45 L40 40" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/><path d="M35 45 Q45 45 45 55 Q45 65 35 65 Q25 65 25 55" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/><path d="M36 55 Q46 55 46 65 Q46 75 36 75" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/><path d="M37 65 Q47 65 47 75 Q47 85 37 85 L32 80" fill="#f4c2c2" stroke="#d4a2a2" strokeWidth="2"/></svg> );

const getBestVoice = (langCode, voiceList) => {
  if (!voiceList || voiceList.length === 0) return null;
  let bestVoice = null;
  if (langCode.includes('ko')) bestVoice = voiceList.find(v => v.lang.includes('ko'));
  else bestVoice = voiceList.find(v => v.lang.includes('en-US') || v.lang.includes('en'));
  return bestVoice;
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

const LoadingOverlay = () => ( <div className="auth-overlay"><div className="loading-spinner large"></div></div> );

const AuthFailPopup = ({ onRetry, t }) => (
  <div className="auth-overlay">
    <div className="fail-popup-content">
      <div className="fail-popup-header"><h2 className="fail-popup-title">{t('auth_fail_popup_title')}</h2></div>
      <div className="fail-popup-body">
        <p className="fail-popup-message">{t('auth_fail_popup_message').split('\n').map((line, i) => (<React.Fragment key={i}>{line}<br /></React.Fragment>))}</p>
        <div className="fail-popup-actions"><button className="fail-popup-btn retry" onClick={onRetry}>{t('auth_fail_popup_retry_button')}</button></div>
      </div>
    </div>
  </div>
);

const maskName = (name) => {
  if (!name || typeof name !== 'string' || name.length < 2) return name || 'Guest';
  if (name.length === 2) return name.substring(0, 1) + '*';
  return name.substring(0, 1) + '*'.repeat(name.length - 2) + name.substring(name.length - 1);
};

const AuthScreen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const voiceListCache = useRef([]);

  const [authState, setAuthState] = useState('idle');
  const [qrInput, setQrInput] = useState('');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  // 통합된 계좌 모달 상태
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [banks, setBanks] = useState([]);
  const [bankCd, setBankCd] = useState('');
  const [actno, setActno] = useState('');
  const [acctNm, setAcctNm] = useState('');
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [showKeypad, setShowKeypad] = useState('');

  const [acctNmJamo, setAcctNmJamo] = useState([]);

  // ★ 커스텀 알림창 상태
  const [kioskAlert, setKioskAlert] = useState({
    show: false,
    message: '',
    type: 'success', 
    onConfirm: null
  });

  const openTextKeypad = () => {
    setAcctNmJamo(Hangul.disassemble(acctNm || ''));
    setShowKeypad('text');
  };

  const handleHangulClick = (char) => {
    let newJamo = [...acctNmJamo];
    
    // 번역된 텍스트와 원본 한글 모두 인식하도록 처리
    if (char === t('account_keypad_delete') || char === '지우기') {
      newJamo.pop();
    } else if (char === t('account_keypad_clear') || char === '초기화') {
      newJamo = [];
    } else {
      newJamo.push(char);
    }
    
    setAcctNmJamo(newJamo);
    setAcctNm(Hangul.assemble(newJamo));
  };

  // ★ [핵심 수정] 화면에 들어오자마자 바코드 문 열기 + 은행 목록 불러오기
  useEffect(() => {
    localStorage.clear(); sessionStorage.clear();
    
    // 1. 은행 목록 로드
    axios.get('http://localhost:8080/api/v1/proxy/banks')
      .then(res => { if(res.data?.data?.banks) setBanks(res.data.data.banks); })
      .catch(err => console.error('은행 목록 로드 실패', err));

    // 2. 바코드 투입구 열기 (첫 번째 코드에서 잘 작동했던 주소 적용)
    axios.post('http://localhost:8080/api/auth/hw/barcode-door', { open: true })
      .then(() => console.log('✅ 바코드 투입구 열기 성공'))
      .catch(err => console.error('❌ 바코드 투입구 열기 실패', err));
  }, []);

  const handleGoBack = () => { window.speechSynthesis.cancel(); navigate('/'); };

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) voiceListCache.current = voices;
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  useEffect(() => {
    let textToSpeak = '';
    if (authState === 'idle') textToSpeak = t('AUTH_01');
    else if (authState === 'success') textToSpeak = t('AUTH_02');
    else if (authState === 'failed') textToSpeak = t('AUTH_03');
    else { window.speechSynthesis.cancel(); return; }

    const delay = authState === 'idle' ? 300 : 0;
    const speakTimer = setTimeout(() => { if (textToSpeak) speak(textToSpeak, i18n.language, voiceListCache.current); }, delay);
    return () => clearTimeout(speakTimer);
  }, [authState, t, i18n.language]);

  const handleQrScanSubmit = useCallback(async (scannedData) => {
    const cleanedData = scannedData.trim();
    if (authState !== 'idle' || !cleanedData) return;
    
    setAuthState('loading'); setAuthenticatedUser(null); localStorage.clear();

    try {
      const authResponse = await fetch('http://localhost:8080/api/v1/proxy/user-auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_fshnd_no: cleanedData }),
      });
      
      const result = await authResponse.json();
      
      if (authResponse.status === 200 && result.data) {
        const userData = result.data;

        localStorage.setItem('fisherman_name', userData.mbr_nm || '');
        localStorage.setItem('fisherman_id', userData.user_fshnd_no || '');
        localStorage.setItem('mbr_no', userData.mbr_no || '');
        localStorage.setItem('is_member', 'true');

        if (userData.actno && userData.actno !== "") {
          setBankCd(userData.bank_cd || '');
          setActno(userData.actno || '');
          setAcctNm(userData.dpstr_nm || userData.mbr_nm || '');

          localStorage.setItem('bank_cd', userData.bank_cd || '');
          localStorage.setItem('actno', userData.actno || '');
          localStorage.setItem('acct_nm', userData.dpstr_nm || userData.mbr_nm || '');
        } else {
          setBankCd('');
          setActno('');
          setAcctNm(userData.mbr_nm || '');
        }

        setAuthenticatedUser({ name: userData.mbr_nm, id: userData.user_fshnd_no });
        setAuthState('success');
      } else {
        throw new Error(result.message || '인증 실패');
      }
    } catch (error) {
      console.error("인증 에러:", error);
      setAuthState('failed');
    } finally {
      setQrInput(''); 
    }
  }, [authState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (authState !== 'idle') return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) setQrInput((prev) => prev + e.key);
      else if (e.key === 'Enter') { e.preventDefault(); if (qrInput) handleQrScanSubmit(qrInput); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [authState, qrInput, handleQrScanSubmit]);

  useEffect(() => {
    if (!qrInput || authState !== 'idle') return;
    const inputTimer = setTimeout(() => handleQrScanSubmit(qrInput), 300);
    return () => clearTimeout(inputTimer);
  }, [qrInput, authState, handleQrScanSubmit]);

  useEffect(() => {
    if (authState === 'success') {
      const timer = setTimeout(() => setShowAccountModal(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [authState]);

  const handleRetry = () => { 
    window.speechSynthesis.cancel();
    setAuthState('idle'); setQrInput(''); setAuthenticatedUser(null); 
    setShowAccountModal(false); setShowKeypad(''); 
    setBankCd(''); setActno(''); setAcctNm(''); 
    localStorage.clear(); 
  };
  const handleAlternate = () => navigate('/auth/alternate-auth');

  const handleVerifyAccount = async () => {
    if (!bankCd || !actno || !acctNm) {
      setKioskAlert({
        show: true,
        message: t('account_alert_empty') || '은행, 예금주명, 계좌번호를\n모두 입력해주세요.',
        type: 'error',
        onConfirm: () => setKioskAlert({ show: false, message: '', type: 'success', onConfirm: null })
      });
      return;
    }
    
    setIsAccountLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/api/v1/proxy/account/verify', {
        bank_cd: bankCd, actno: actno, acct_nm: acctNm
      });
      
      if (res.data?.status === "200" || res.data?.data?.success) {
        localStorage.setItem('bank_cd', res.data.data.bank_cd || bankCd);
        localStorage.setItem('actno', res.data.data.actno || actno);
        localStorage.setItem('acct_nm', res.data.data.acct_nm || acctNm);
        
        setKioskAlert({
          show: true,
          message: t('account_alert_success') || '계좌 정보가\n성공적으로 확인되었습니다.\n잠시 후 다음 화면으로 이동합니다.',
          type: 'success',
          onConfirm: null
        });

        setTimeout(() => {
          setKioskAlert({ show: false, message: '', type: 'success', onConfirm: null });
          setShowAccountModal(false);
          navigate('/select-gear'); 
        }, 1000);

      } else {
        setKioskAlert({
          show: true,
          message: t('account_alert_fail') || '계좌 인증에 실패했습니다.\n정보를 다시 확인해주세요.',
          type: 'error',
          onConfirm: () => setKioskAlert({ show: false, message: '', type: 'error', onConfirm: null })
        });
      }
    } catch (err) { 
      setKioskAlert({
        show: true,
        message: t('account_alert_error') || '서버 통신 오류로\n계좌 인증에 실패했습니다.',
        type: 'error',
        onConfirm: () => setKioskAlert({ show: false, message: '', type: 'error', onConfirm: null })
      });
    } finally { 
      setIsAccountLoading(false); 
    }
  };

  const handleKeypadClick = (val) => {
    if (val === 'DEL' || val === t('account_keypad_delete') || val === '지우기') {
      setActno((prev) => prev.slice(0, -1));
    } else if (val === 'CLEAR' || val === t('account_keypad_clear') || val === '초기화') {
      setActno('');
    } else {
      setActno((prev) => prev + val);
    }
  };

  const renderKeypad = () => {
    // 키패드 배열에 번역 적용
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, t('account_keypad_clear') || '초기화', 0, t('account_keypad_delete') || '지우기'];
    return (
      <div className="account-keypad-container">
        <div className="account-keypad-grid">
          {keys.map((key) => (
            <button 
              key={key} 
              type="button" 
              className={`account-keypad-btn ${typeof key === 'string' ? 'hangul-action-btn' : ''}`}
              onClick={() => handleKeypadClick(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <button className="account-keypad-close" onClick={() => setShowKeypad('')}>
          {t('account_keypad_close') || '키패드 닫기'}
        </button>
      </div>
    );
  };

  return (
    <div className="auth-wrapper">
      <Header />
      <div className="auth-body">
        <div className="camera-box">
          <button className="auth-back-btn" onClick={handleGoBack}>
            <BackIcon /><span className="auth-back-text">{t('btn_back') || '뒤로가기'}</span>
          </button>
          <video src={authState === 'success' ? AuthSuccessVideo : QrGuideVideo} autoPlay loop muted playsInline className="auth-video" />
        </div>
        <div className="auth-card-container" style={{ backgroundImage: `url(${BgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
          <div className="auth-info-card">
            {authState === 'success' ? (
              <div className="success-content">
                <h2 className="success-title">{t('auth_success_popup_title')}</h2>
                <div className="success-msg-box"><p><strong>{authenticatedUser ? maskName(authenticatedUser.name) : ''}{t('auth_success_popup_welcome_strong')}</strong><br />{t('auth_success_popup_welcome')}</p></div>
                <div className="success-footer"><img src={LoadingSpinner} alt="loading" className="spin-icon" /><div className="success-footer-text">{t('auth_success_redirect_msg') || '계좌 정보 화면으로 이동합니다...'}</div></div>
              </div>
            ) : (
              <div className="idle-content">
                <div className="step-tabs">
                  <div className="step-tab active"><div className="step-num-circle">1</div><span className="step-label">{t('auth_step_1') || '사용자 인증'}</span></div>
                  <div className="step-tab"><div className="step-num-circle">2</div><span className="step-label">{t('auth_step_2') || '어구보증금표식 인증'}</span></div>
                  <div className="step-tab"><div className="step-num-circle">3</div><span className="step-label">{t('auth_step_3') || '투입'}</span></div>
                </div>
                <h2 className="step-main-title">{t('auth_title')}</h2>
                <div className="instruction-box">
                  <div className="css-scan-animation">
                    <div className="scanner-part"><ScannerHandIcon /><div className="scanner-beam"></div></div>
                    <div className="scan-phone"><div className="scan-screen"><QrCodeIcon /> <div className="scan-laser"></div> </div></div>
                  </div>
                  <p className="instruction-text">{t('auth_instruction')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {authState === 'loading' && <LoadingOverlay />}
      {authState === 'failed' && <AuthFailPopup onRetry={handleRetry} onAlternate={handleAlternate} t={t} />}

      {/* ★ 초대형 통합 계좌 확인 모달 */}
      {showAccountModal && (
        <div className="auth-overlay">
          <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="account-header">
              <h2 className="account-title">{t('account_title') || '환급받을 계좌를 확인해 주세요'}</h2>
              <p className="account-subtitle">{t('account_subtitle') || '(항목을 터치하여 수정할 수 있습니다)'}</p>
            </div>
            
            <div className="account-form-group">
              <label className="account-label">{t('account_bank_label') || '은행 (필수)'}</label>
              <div 
                className={`account-input-box ${showKeypad === 'bank' ? 'highlight' : ''}`}
                onClick={() => setShowKeypad('bank')}
              >
                {bankCd ? banks.find(b => b.bank_cd === bankCd)?.bank_nm || t('account_bank_selected') : t('account_bank_placeholder')}
              </div>
              
              {showKeypad === 'bank' && (
                <div className="bank-grid-container">
                  {banks.map(b => (
                    <button 
                      key={b.bank_cd} 
                      className="bank-btn"
                      onClick={() => { setBankCd(b.bank_cd); setShowKeypad(''); }}
                    >
                      {b.bank_nm}
                    </button>
                  ))}
                  <button className="bank-btn" onClick={() => setShowKeypad('')} style={{background:'#555', color:'#fff'}}>{t('account_bank_close') || '닫기'}</button>
                </div>
              )}
            </div>

            <div className="account-form-group">
              <label className="account-label">{t('account_name_label') || '예금주명 (필수)'}</label>
              <div 
                className={`account-input-box ${showKeypad === 'text' ? 'highlight' : ''}`}
                onClick={openTextKeypad}
              >
                {acctNm || t('account_name_placeholder')}
              </div>

              {showKeypad === 'text' && (
                <div className="account-keypad-container">
                  <div className="hangul-keypad-grid">
                    {['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ',
                      'ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
                      'ㅏ','ㅑ','ㅓ','ㅕ','ㅗ','ㅛ','ㅜ',
                      'ㅠ','ㅡ','ㅣ','ㅐ','ㅔ', 
                      t('account_keypad_delete') || '지우기', 
                      t('account_keypad_clear') || '초기화'].map((char) => (
                      <button 
                        key={char} 
                        className={`hangul-btn ${char.length > 1 ? 'hangul-action-btn' : ''}`}
                        onClick={() => handleHangulClick(char)}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                  <button className="account-keypad-close" onClick={() => setShowKeypad('')}>
                    {t('account_keypad_close') || '키패드 닫기'}
                  </button>
                </div>
              )}
            </div>

            <div className="account-form-group">
              <label className="account-label">{t('account_number_label') || '계좌번호 (터치하여 수정)'}</label>
              <div 
                className={`account-input-box ${showKeypad === 'number' ? 'highlight' : ''}`}
                onClick={() => setShowKeypad('number')}
              >
                {actno || t('account_number_placeholder')}
              </div>

              {showKeypad === 'number' && renderKeypad()}
            </div>

            <div className="account-action-group">
              <button className="account-btn account-btn-confirm" onClick={handleVerifyAccount} disabled={isAccountLoading}>
                {isAccountLoading ? (t('account_btn_loading') || '확인 중...') : (t('account_btn_confirm') || '이 계좌로 진행')}
              </button>
              <button className="account-btn account-btn-cancel" onClick={handleRetry}>
                {t('auth_btn_reset') || '처음으로'}
              </button>
            </div>
            
          </div>
        </div>
      )}

     {/* ★ 키오스크 전용 커스텀 알림창 */}
      {kioskAlert.show && (
        <div className="auth-overlay" style={{ zIndex: 99999 }}>
          <div className="account-modal-content" style={{ maxWidth: '800px', padding: '0', overflow: 'hidden' }}>
            
            <div 
              className="fail-popup-header" 
              style={{ backgroundColor: kioskAlert.type === 'success' ? '#009CDA' : '#FF4B4B', padding: '35px' }}
            >
              <h2 className="fail-popup-title" style={{ color: 'white', margin: 0, fontSize: '4rem', fontWeight: '900' }}>
                {kioskAlert.type === 'success' ? (t('account_alert_title_success') || '인증 완료') : (t('account_alert_title_error') || '확인 필요')}
              </h2>
            </div>

            <div className="fail-popup-body" style={{ padding: '70px 40px' }}>
              <p className="fail-popup-message" style={{ fontSize: '3.4rem', marginBottom: kioskAlert.type === 'error' ? '50px' : '0', lineHeight: '1.6', textAlign: 'center', color: '#333', fontWeight: '800', wordBreak: 'keep-all' }}>
                {kioskAlert.message.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </p>
              
              {kioskAlert.type === 'error' && (
                <div className="fail-popup-actions" style={{ display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="account-btn account-btn-confirm" 
                    onClick={kioskAlert.onConfirm}
                    style={{ backgroundColor: '#495057', flex: 'none', width: '250px', height: '90px', fontSize: '2.5rem' }} 
                  >
                    {t('account_alert_btn_confirm') || '확인'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;