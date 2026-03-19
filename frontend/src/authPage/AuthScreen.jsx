import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

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
  const [showKeypad, setShowKeypad] = useState(false);

  useEffect(() => {
    localStorage.clear(); sessionStorage.clear();
    axios.get('http://localhost:8080/api/v1/proxy/banks')
      .then(res => { if(res.data?.data?.banks) setBanks(res.data.data.banks); })
      .catch(err => console.error('은행 목록 로드 실패', err));
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
      
      // ★ 디버깅용: 서버가 바코드 인증 시 프론트로 던져주는 진짜 데이터 확인
      console.log("🚨 [디버깅] 바코드 인증 전체 응답:", result);

      if (authResponse.status === 200 && result.data) {
        const userData = result.data;
        
        // ★ 디버깅용: data 안에 계좌번호가 정말 있는지 확인
        console.log("🚨 [디버깅] 추출된 계좌번호(actno):", userData.actno);
        console.log("🚨 [디버깅] 추출된 은행코드(bank_cd):", userData.bank_cd);

        localStorage.setItem('fisherman_name', userData.mbr_nm || '');
        localStorage.setItem('fisherman_id', userData.user_fshnd_no || '');
        localStorage.setItem('mbr_no', userData.mbr_no || '');

        if (userData.actno && userData.actno !== "") {
          setBankCd(userData.bank_cd || '');
          setActno(userData.actno || '');
          setAcctNm(userData.dpstr_nm || userData.mbr_nm || '');

          localStorage.setItem('bank_cd', userData.bank_cd || '');
          localStorage.setItem('actno', userData.actno || '');
          localStorage.setItem('acct_nm', userData.dpstr_nm || userData.mbr_nm || '');
        } else {
          // 데이터가 없으면 빈 값과 이름만 채워둠
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
      const timer = setTimeout(() => setShowAccountModal(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [authState]);

  const handleRetry = () => { 
    window.speechSynthesis.cancel();
    setAuthState('idle'); setQrInput(''); setAuthenticatedUser(null); 
    setShowAccountModal(false); setShowKeypad(false); 
    setBankCd(''); setActno(''); setAcctNm(''); 
    localStorage.clear(); 
  };
  const handleAlternate = () => navigate('/auth/alternate-auth');

  const handleVerifyAccount = async () => {
    if (!bankCd || !actno || !acctNm) { alert("모든 항목을 입력해주세요."); return; }
    setIsAccountLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/api/v1/proxy/account/verify', {
        bank_cd: bankCd, actno: actno, acct_nm: acctNm
      });
      
      if (res.data?.status === "200" || res.data?.data?.success) {
        localStorage.setItem('bank_cd', res.data.data.bank_cd || bankCd);
        localStorage.setItem('actno', res.data.data.actno || actno);
        localStorage.setItem('acct_nm', res.data.data.acct_nm || acctNm);
        
        alert("계좌 정보가 확인되었습니다.");
        setShowAccountModal(false);
        navigate('/select-gear'); 
      } else {
        alert("계좌 인증에 실패했습니다. 정보를 확인해주세요.");
      }
    } catch (err) { alert("서버 오류로 계좌 인증에 실패했습니다."); } 
    finally { setIsAccountLoading(false); }
  };

  const handleKeypadClick = (val) => {
    if (val === 'DEL') setActno((prev) => prev.slice(0, -1));
    else if (val === 'CLEAR') setActno('');
    else setActno((prev) => prev + val);
  };

  const renderKeypad = () => {
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'CLEAR', 0, 'DEL'];
    return (
      <div style={{ marginTop: '10px', padding: '15px', background: '#f1f3f5', borderRadius: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {keys.map((key) => (
            <button key={key} type="button" onClick={() => handleKeypadClick(key)}
              style={{
                padding: '15px', fontSize: '1.5rem', fontWeight: 'bold', cursor: 'pointer', color: '#333',
                backgroundColor: key === 'DEL' || key === 'CLEAR' ? '#dee2e6' : '#fff',
                border: '1px solid #ced4da', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
              {key === 'DEL' ? '지우기' : key === 'CLEAR' ? '초기화' : key}
            </button>
          ))}
        </div>
        <button onClick={() => setShowKeypad(false)} style={{ width: '100%', marginTop: '10px', padding: '12px', backgroundColor: '#495057', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.2rem' }}>
          키패드 닫기
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
                <div className="success-footer"><img src={LoadingSpinner} alt="loading" className="spin-icon" /><div className="success-footer-text">계좌 정보 화면으로 이동합니다...</div></div>
              </div>
            ) : (
              <div className="idle-content">
                <div className="step-tabs">
                  <div className="step-tab active"><div className="step-num-circle">1</div><span className="step-label">사용자 인증</span></div>
                  <div className="step-tab"><div className="step-num-circle">2</div><span className="step-label">어구보증금표식 인증</span></div>
                  <div className="step-tab"><div className="step-num-circle">3</div><span className="step-label">투입</span></div>
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

      {/* ★ 통합된 계좌 확인 모달 (수정 가능 폼) */}
      {showAccountModal && (
        <div className="auth-overlay">
          <div className="fail-popup-content" style={{ width: '600px', maxWidth: showKeypad ? '95%' : '90%', padding: '40px', background: '#fff', borderRadius: '15px', transition: 'max-width 0.3s' }}>
            
            <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.8rem', color: '#333' }}>
              환급받을 계좌를 확인해 주세요.<br/><span style={{fontSize: '1.2rem', color: '#007BFF'}}>(다른 계좌로 수정 가능합니다)</span>
            </h2>
            
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>은행: (필수)</label>
                <select value={bankCd} onChange={(e) => setBankCd(e.target.value)} style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px' }}>
                  <option value="">은행 선택</option>
                  {banks.map(b => <option key={b.bank_cd} value={b.bank_cd}>{b.bank_nm}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>예금주명: (필수)</label>
                <input type="text" value={acctNm} onChange={(e) => setAcctNm(e.target.value)} placeholder="홍길동" style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.2rem', border: '1px solid #ccc', borderRadius: '5px' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>계좌번호: (터치하여 수정 가능)</label>
                <input 
                  type="text" 
                  readOnly 
                  value={actno} 
                  onClick={() => setShowKeypad(true)} 
                  placeholder="터치하여 계좌번호 입력" 
                  style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.3rem', border: '2px solid #007BFF', borderRadius: '5px', cursor: 'pointer', backgroundColor: '#f8f9fa' }} 
                />
              </div>

              {showKeypad && renderKeypad()}

              <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                <button onClick={handleVerifyAccount} disabled={isAccountLoading} style={{ flex: 2, padding: '20px', backgroundColor: '#000', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  {isAccountLoading ? '확인 중...' : '이 계좌로 진행'}
                </button>
                <button onClick={handleRetry} style={{ flex: 1, padding: '20px', backgroundColor: '#6c757d', color: '#fff', fontSize: '1.5rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  처음으로
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;