// src/components/AlternateAuthModal.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import hangul from 'hangul-js';
import './AlternateAuthScreen.css';
// ★ [추가됨] 인증 성공 영상
import AuthSuccessVideo from '../assets/사용자 인증 완료.mp4'; 

const KIOSK_ID = "BUSAN-001";

// ★ [추가됨] 은행 정보 매핑 (DB용 한글 이름 <-> 화면용 다국어 이름)
// 한국어를 제외한 다른 언어(영어, 베트남어, 등)는 통상적인 영문 은행명을 사용합니다.
const BANK_LIST = [
  { dbName: '농협은행',   enName: 'NH Bank' },
  { dbName: '국민은행',   enName: 'KB Bank' },
  { dbName: '토스뱅크',   enName: 'Toss Bank' },
  { dbName: '하나은행',   enName: 'Hana Bank' },
  { dbName: '우리은행',   enName: 'Woori Bank' },
  { dbName: '카카오뱅크', enName: 'Kakao Bank' },
];

// --- 로딩 컴포넌트 ---
const LoadingOverlay = () => (
  <div className="alt-modal-overlay inner-overlay">
    <div className="loading-spinner"></div>
  </div>
);

// --- 인증 실패 팝업 ---
const AltAuthFailPopup = ({ onRetry, onGoBack, message, t }) => {
  return (
    <div className="alt-modal-overlay inner-overlay">
      <div className="fail-popup-content">
        <div className="fail-popup-header">
            <h2 className="fail-popup-title">{t('alt_auth_fail_popup_title')}</h2>
        </div>
        <div className="fail-popup-body">
          <p className="fail-popup-message">
            {message || t('alt_auth_fail_popup_message')}
          </p>
          <div className="fail-popup-actions">
            <button className="fail-popup-btn retry" onClick={onRetry}>
              {t('alt_auth_fail_popup_retry_button')}
            </button>
            <button className="fail-popup-btn cancel" onClick={onGoBack}>
              {t('btn_cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 인증 성공 팝업 (영상 재생) ---
const AltAuthSuccessPopup = ({ userInfo, t }) => {
  return (
    <div className="alt-modal-overlay inner-overlay">
      <div className="success-popup-content">
        <div className="success-popup-header">
            <h2 className="success-popup-title">{t('auth_success_popup_title')}</h2>
        </div>
        <div className="success-popup-body">
          <video 
            src={AuthSuccessVideo} 
            autoPlay 
            loop 
            muted 
            playsInline 
            style={{ 
              width: '80%',       
              maxHeight: '250px', 
              objectFit: 'contain', 
              marginBottom: '20px',
              borderRadius: '10px'
            }}
          />
          <p className="success-message">
            <strong>{userInfo?.name}</strong>{t('auth_success_popup_welcome_strong')}<br />
            {t('auth_success_popup_welcome')}
          </p>
        </div>
      </div>
    </div>
  );
};

// --- ★ [수정됨] 은행 선택 모달 ---
const BankSelectModal = ({ onSelect, onClose, t, currentLang }) => {
  // 현재 언어가 한국어('ko')가 아니면 영어 이름을 보여줌
  const getDisplayName = (bank) => {
    return currentLang.includes('ko') ? bank.dbName : bank.enName;
  };

  return (
    <div className="alt-modal-overlay inner-overlay">
      <div className="bank-select-content">
        <h3 className="bank-select-title">{t('alt_auth_bank_select_title') || 'Select Bank'}</h3>
        <div className="bank-grid">
          {BANK_LIST.map((bank) => (
            <button 
              key={bank.dbName} 
              className="bank-btn" 
              onClick={() => onSelect(bank.dbName)} // ★ 선택 시 DB용 한글 이름 전달
            >
              {getDisplayName(bank)}
            </button>
          ))}
        </div>
        <button className="bank-close-btn" onClick={onClose}>{t('btn_close') || 'Close'}</button>
      </div>
    </div>
  );
};

// --- 입력 필드 컴포넌트 ---
const InputRow = ({ label, value, isActive, onClick, placeholder }) => (
  <div className="input-row-container">
    <div className="input-label-left">{label}</div>
    <div 
      className={`input-box-right ${isActive ? 'active' : ''}`} 
      onClick={onClick}
    >
      {value ? value : <span className="placeholder">{placeholder}</span>}
    </div>
  </div>
);

// --- 메인 모달 컴포넌트 ---
const AlternateAuthModal = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // 상태 관리
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState(''); // ★ 여기에는 항상 한글 은행명('농협은행' 등)이 저장됨
  const [accountNum, setAccountNum] = useState('');
  
  const [activeInput, setActiveInput] = useState('name');
  const [showBankList, setShowBankList] = useState(false);
  const [isUppercase, setIsUppercase] = useState(true);

  const [authStatus, setAuthStatus] = useState('idle');
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [failMessage, setFailMessage] = useState('');

  // 성공 후 페이지 이동
  useEffect(() => {
    if (authStatus === 'success') {
      const timer = setTimeout(() => {
        navigate('/certificationPage/scan'); 
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [authStatus, navigate]);

  // ★ [추가됨] 화면 표시용 은행 이름 변환 함수
  const getDisplayBankName = (koreanBankName) => {
    if (!koreanBankName) return '';
    const bank = BANK_LIST.find(b => b.dbName === koreanBankName);
    if (!bank) return koreanBankName;
    // 현재 언어가 한국어면 DB이름(한글), 아니면 영어 이름 반환
    return i18n.language.includes('ko') ? bank.dbName : bank.enName;
  };

  const handleBankSelect = (selectedDbName) => {
    setBankName(selectedDbName); // 상태에는 한글 이름 저장
    setShowBankList(false);
    setActiveInput('accountNum');
  };

  const handleKeyClick = (key) => {
    if (authStatus === 'loading') return;
    if (key === 'shift') { setIsUppercase(!isUppercase); return; }

    const setters = { name: setName, birthdate: setBirthdate, phone: setPhone, accountNum: setAccountNum };
    const values = { name, birthdate, phone, accountNum };
    const maxLengths = { name: 20, birthdate: 8, phone: 11, accountNum: 20 }; 

    if (showBankList) return;
    if (!activeInput || activeInput === 'bank') return;
    if (activeInput !== 'name' && !/^[0-9]$/.test(key) && key !== 'backspace' && key !== 'clear') return;

    const currentSetter = setters[activeInput];
    const currentValue = values[activeInput];
    const maxLength = maxLengths[activeInput];

    if (!currentSetter) return;

    // 한국어 모드일 때만 한글 자판 로직 적용
    const isKoreanMode = i18n.language.includes('ko');

    if (activeInput === 'name' && isKoreanMode) {
      if (key === 'backspace') currentSetter((prev) => hangul.d(prev, true) || '');
      else if (key === 'clear') currentSetter('');
      else if (currentValue.length < maxLength) currentSetter((prev) => hangul.a(prev + key));
    } else {
      // 영문 또는 숫자 입력
      if (key === 'backspace') currentSetter((prev) => prev.slice(0, -1));
      else if (key === 'clear') currentSetter('');
      else if (currentValue.length < maxLength) {
        if (activeInput === 'name' || /^[0-9]$/.test(key)) currentSetter((prev) => prev + key);
      }
    }
  };

  const handleAuthSubmit = async () => {
    if (authStatus === 'loading') return;
    if (!name || birthdate.length !== 8 || phone.length < 10 || !bankName || !accountNum) {
      setFailMessage(t('alt_auth_alert_all_fields'));
      setAuthStatus('failed');
      return;
    }

    setAuthStatus('loading');
    setFailMessage('');

    localStorage.removeItem('session_token');
    localStorage.removeItem('return_session_id');
    localStorage.removeItem('fisherman_name');
    localStorage.removeItem('fisherman_id');

    try {
      // bankName은 이미 한글('농협은행' 등)로 저장되어 있으므로 그대로 전송
      const authResponse = await fetch('http://localhost:8080/api/auth/alternate/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kiosk_id: KIOSK_ID,
          name: name,
          birthdate: birthdate,
          phone_number: phone,
          bank_name: bankName, // DB 체크용 한글 이름 전송
          account_number: accountNum
        })
      });

      const authData = await authResponse.json();

      if (!authResponse.ok || authData.status !== 'SUCCESS') {
        throw new Error(authData.message || t('alt_auth_fail_popup_message'));
      }

      const sessionResponse = await fetch('http://localhost:8080/api/certification/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session_token}`
        },
        body: JSON.stringify({ kiosk_id: KIOSK_ID })
      });

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok || sessionData.status !== 'SUCCESS') {
        throw new Error(sessionData.message || 'Session Start Failed');
      }

      localStorage.setItem('session_token', authData.session_token);
      localStorage.setItem('fisherman_name', authData.fisherman_info.name);
      localStorage.setItem('fisherman_id', authData.fisherman_info.id);
      localStorage.setItem('return_session_id', sessionData.return_session_id);

      setAuthenticatedUser(authData.fisherman_info);
      setAuthStatus('success');

    } catch (error) {
      console.error("Auth Error:", error);
      setFailMessage(t('alt_auth_fail_popup_message'));
      setAuthStatus('failed');
    }
  };

  // --- 자판 배열 설정 ---
  const isKorean = i18n.language.includes('ko');
  const enRow1 = ['Q','W','E','R','T','Y','U','I','O','P'];
  const enRow2 = ['A','S','D','F','G','H','J','K','L'];
  const enRow3 = ['Z','X','C','V','B','N','M'];
  const koRow1 = ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'];
  const koRow2 = ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'];
  const koRow3 = ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'];
  
  let keypadRow1, keypadRow2, keypadRow3;
  
  if (activeInput === 'name') {
    if (isKorean) {
      keypadRow1 = koRow1; keypadRow2 = koRow2; keypadRow3 = [...koRow3, 'clear', 'backspace'];
    } else {
      keypadRow1 = isUppercase ? enRow1 : enRow1.map(k=>k.toLowerCase());
      keypadRow2 = isUppercase ? enRow2 : enRow2.map(k=>k.toLowerCase());
      const baseRow3 = isUppercase ? enRow3 : enRow3.map(k=>k.toLowerCase());
      keypadRow3 = ['shift', ...baseRow3, 'clear', 'backspace'];
    }
  }

  return (
    <div className="alt-modal-backdrop" onClick={(e) => { if(e.target === e.currentTarget) onClose(); }}>
      <div className="alt-modal-container">
        <div className="alt-auth-header">
          <h1>{t('alt_auth_title')}</h1>
        </div>
        <div className="alt-auth-body">
          <div className="form-section">
            <InputRow 
                label={t('alt_auth_label_name')} 
                value={name} 
                placeholder={t('alt_auth_label_name')} 
                isActive={activeInput === 'name'} 
                onClick={() => setActiveInput('name')} 
            />
            <InputRow 
                label={t('alt_auth_label_birthdate')} 
                value={birthdate} 
                placeholder="YYYYMMDD" 
                isActive={activeInput === 'birthdate'} 
                onClick={() => setActiveInput('birthdate')} 
            />
            <InputRow 
                label={t('alt_auth_label_phone')} 
                value={phone} 
                placeholder={t('alt_auth_label_phone')} 
                isActive={activeInput === 'phone'} 
                onClick={() => setActiveInput('phone')} 
            />
            
            <div className="bank-section-row">
              <div className="bank-col">
                <div className="top-label">{t('alt_auth_bank_label') || 'Bank'}</div>
                <button className="bank-select-trigger" onClick={() => setShowBankList(true)}>
                  {/* ★ [수정됨] 화면에는 다국어 이름 표시 */}
                  {bankName ? getDisplayBankName(bankName) : (t('alt_auth_bank_placeholder') || "Select")}
                </button>
              </div>
              <div className="account-col">
                <div className="top-label">{t('alt_auth_account_label') || 'Account No'}</div>
                <div className={`input-box-right ${activeInput === 'accountNum' ? 'active' : ''}`} onClick={() => setActiveInput('accountNum')}>
                  {accountNum ? accountNum : <span className="placeholder">{t('alt_auth_account_label') || 'Account No'}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="keypad-section">
             {activeInput === 'name' ? (
               <div className="char-keypad">
                  <div className="key-row">{keypadRow1.map(k => <KeyButton key={k} val={k} onClick={handleKeyClick}/>)}</div>
                  <div className="key-row">{keypadRow2.map(k => <KeyButton key={k} val={k} onClick={handleKeyClick}/>)}</div>
                  <div className="key-row">{keypadRow3.map(k => <KeyButton key={k} val={k} onClick={handleKeyClick} isSpecial={['shift','clear','backspace'].includes(k)} isActive={k==='shift' && isUppercase}/>)}</div>
               </div>
             ) : (
               <div className="num-keypad-full">
                  <div className="num-row">
                    {['1','2','3','4','5','6','7','8','9','0'].map(k => <KeyButton key={k} val={k} onClick={handleKeyClick}/>)}
                  </div>
                  <div className="num-func-row">
                    <KeyButton val="clear" onClick={() => handleKeyClick('clear')} isSpecial />
                    <KeyButton val="backspace" onClick={() => handleKeyClick('backspace')} isSpecial />
                  </div>
               </div>
             )}
          </div>

          <div className="action-buttons">
            <button className="action-btn auth-btn" onClick={handleAuthSubmit}>{t('alt_auth_submit_button')}</button>
            <button className="action-btn cancel-btn" onClick={onClose}>{t('btn_cancel')}</button>
          </div>
        </div>

        {/* ★ [수정됨] 언어 정보 전달 */}
        {showBankList && 
          <BankSelectModal 
            onSelect={handleBankSelect} 
            onClose={() => setShowBankList(false)} 
            t={t} 
            currentLang={i18n.language}
          />
        }
        
        {authStatus === 'loading' && <LoadingOverlay />}
        {authStatus === 'success' && <AltAuthSuccessPopup userInfo={authenticatedUser} t={t} />}
        {authStatus === 'failed' && (
          <AltAuthFailPopup 
            message={failMessage}
            onRetry={() => { setAuthStatus('idle'); setFailMessage(''); }}
            onGoBack={onClose}
            t={t}
          />
        )}
      </div>
    </div>
  );
};

const KeyButton = ({ val, onClick, isSpecial, isActive }) => {
  let displayVal = val;
  if (val === 'backspace') displayVal = '⌫';
  if (val === 'clear') displayVal = 'Clear'; 
  if (val === 'shift') displayVal = 'Shift';

  return (
    <button className={`key-btn ${isSpecial ? 'special' : ''} ${isActive ? 'active' : ''}`} onClick={() => onClick(val)}>
      {displayVal}
    </button>
  );
};

export default AlternateAuthModal;