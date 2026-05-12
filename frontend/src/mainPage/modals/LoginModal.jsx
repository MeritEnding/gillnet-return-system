// src/mainPage/modals/LoginModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './LoginModal.css';
import AccountInputModal from './AccountInputModal';

const LoginModal = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // ★ 음성 제어용 참조 추가
  const voiceListCache = useRef([]);
  window.utterances = window.utterances || [];

  // ★ TTS 함수 정의
  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.utterances.push(utterance);
    const langMap = { 'ko': 'ko-KR', 'en': 'en-US', 'vi': 'vi-VN', 'tl': 'fil-PH', 'id': 'id-ID', 'my': 'my-MM' };
    utterance.lang = langMap[i18n.language.substring(0, 2)] || 'ko-KR';
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.lang.includes(utterance.lang));
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onend = () => {
      const idx = window.utterances.indexOf(utterance);
      if (idx > -1) window.utterances.splice(idx, 1);
    };
    window.speechSynthesis.speak(utterance);
  };
  useEffect(() => {
    // ★ 화면 진입 시 나레이션 실행 (아이디 로그인 안내)
    // JSON에 관련 키가 없다면 직접 텍스트를 넣거나 t('login_title') 등을 활용하세요.
    const loginGuide = t('auth_login_voice_guide');
    speak(loginGuide);

    return () => window.speechSynthesis.cancel();
  }, []);

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeField, setActiveField] = useState(null);
  const [isShift, setIsShift] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [kioskAlert, setKioskAlert] = useState({ show: false, message: '' });


  // 컴포넌트 상단에 추가
  const maskName = (name) => {
    if (!name || typeof name !== 'string' || name.length < 2) return name || 'Guest';
    if (name.length === 2) return name.substring(0, 1) + '*';
    return name.substring(0, 1) + '*'.repeat(name.length - 2) + name.substring(name.length - 1);
  };

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!userId || !password) {
      setKioskAlert({ 
        show: true, 
        message: t('login_alert_empty') || "입력되지 않은 정보가 있습니다.\n아이디와 비밀번호를 모두 채워주세요." 
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/v1/proxy/user/login`, {
        id: userId, password: password
      });

      if (response.data.status === "200" || response.data.message.includes("성공")) {
        const userData = response.data.data;

        localStorage.setItem('mbr_no', userData.mbr_no);
        localStorage.setItem('fisherman_id', userData.user_fshnd_no);
        localStorage.setItem('fisherman_name', userData.mbr_nm);
        localStorage.setItem('is_member', 'true');

        if (userData.actno) {
          localStorage.setItem('bank_cd', userData.bank_cd || '');
          localStorage.setItem('bank_nm', userData.bank_nm || '');
          localStorage.setItem('actno', userData.actno);
          localStorage.setItem('acct_nm', userData.dpstr_nm || userData.mbr_nm || '');
        }

        setShowSuccessAlert(true);
        setTimeout(() => {
          setShowSuccessAlert(false);
          setShowAccountModal(true);
        }, 2000);
      } else {
        // ▼ 정보 불일치 시
        setKioskAlert({ 
          show: true, 
          message: t('login_alert_fail') || "아이디(로그인 전화번호, 로그인 전용 아이디) 또는\n비밀번호가 잘못 되었습니다.\n아이디와 비밀번호를 정확히 입력해 주세요." 
        });
      }
    } catch (error) {
      // ▼ 통신 지연/오류 시에도 똑같은 메시지로 통일
      setKioskAlert({ 
        show: true, 
        message: t('login_alert_fail') || "아이디(로그인 전화번호, 로그인 전용 아이디) 또는\n비밀번호가 잘못 되었습니다.\n아이디와 비밀번호를 정확히 입력해 주세요." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (key) => {
    if (!activeField) return;

    const setter = activeField === 'userId' ? setUserId : setPassword;
    const value = activeField === 'userId' ? userId : password;

    if (key === 'DEL') {
      setter(value.slice(0, -1));
    } else if (key === 'CLEAR') {
      setter('');
    } else if (key === 'SHIFT') {
      setIsShift(!isShift);
    } else if (key === 'SPACE') {
      setter(value + ' ');
    } else {
      setter(value + key);
      if (isShift) setIsShift(false);
    }
  };

  const renderKeyboard = () => {
    if (activeField === null) return null;

    const layoutNormal = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'DEL'],
      ['!', '@', '#', '_', '.', '/', '&', '*', 'SPACE', 'CLEAR']
    ];

    const layoutShift = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
      ['!', '@', '#', '_', '.', '/', '&', '*', 'SPACE', 'CLEAR']
    ];

    const currentLayout = isShift ? layoutShift : layoutNormal;

    return (
      <div className="vkb-container keyboard-appear-animation">
        {currentLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="vkb-row">
            {row.map((key) => {
              let keyClass = 'vkb-key';
              let displayKey = key;

              if (key === 'SHIFT') {
                keyClass += isShift ? ' shift-active wide' : ' special wide';
                displayKey = 'Shift';
              } else if (key === 'DEL') {
                keyClass += ' special wide';
                displayKey = t('login_keyboard_delete') || '삭제';
              } else if (key === 'CLEAR') {
                keyClass += ' special wide';
                displayKey = t('login_keyboard_clear') || '전체삭제';
              } else if (key === 'SPACE') {
                keyClass += ' space';
                displayKey = 'SPACE';
              }

              return (
                <button
                  key={key}
                  type="button"
                  className={keyClass}
                  onClick={(e) => { e.preventDefault(); handleKeyPress(key); }}
                >
                  {displayKey}
                </button>
              );
            })}
          </div>
        ))}
        <button type="button" className="vkb-close-btn" onClick={() => setActiveField(null)}>
          {t('login_keyboard_close') || '자판 닫기'}
        </button>
      </div>
    );
  };

  if (showAccountModal) return <AccountInputModal onClose={onClose} />;

  return (
    <div className="login-modal-backdrop" onClick={onClose}>
      <div className="login-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="login-modal-title">{t('login_title') || '어업인 로그인'}</h2>

        <form onSubmit={handleLoginSubmit}>
          <div className="login-input-row">
            <div className={`login-input-group ${activeField === 'userId' ? 'focused' : ''}`}>
              <label>{t('login_id_label') || '아이디'}</label>
              <input
                type="text" readOnly value={userId}
                onClick={() => setActiveField('userId')}
                className="login-input"
                placeholder={t('login_id_placeholder') || '아이디를 입력하세요'}
              />
            </div>

            <div className={`login-input-group ${activeField === 'password' ? 'focused' : ''}`}>
              <label>{t('login_pw_label') || '비밀번호'}</label>
              <input
                type="password" readOnly value={password}
                onClick={() => setActiveField('password')}
                className="login-input"
                placeholder={t('login_pw_placeholder') || '비밀번호를 입력하세요'}
              />
            </div>
          </div>

          {renderKeyboard()}

          <div className="login-actions">
            <button type="submit" disabled={isLoading} className="login-btn-submit">
              {t('login_btn_submit') || '로그인'}
            </button>
            <button type="button" onClick={onClose} className="login-btn-cancel">
              {t('login_btn_cancel') || '취소'}
            </button>
          </div>
        </form>
      </div>

      {showSuccessAlert && (
        <div className="alert-overlay">
          <div className="alert-content success-box-v2">
            <div className="alert-header-success-v2">
              {t('login_success_title') || '로그인 성공'}
            </div>
            <div className="alert-body-v2">
              <div className="success-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="#003b5c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <p className="alert-msg-v2">
                <span className="greeting-text-top">{t('login_success_greeting_1')}</span>
                <br />
                <strong>{maskName(localStorage.getItem('fisherman_name'))}</strong>{t('login_success_greeting_2')}
              </p>
              <div className="loading-bar-container">
                <div className="loading-bar-fill"></div>
              </div>
              <p className="auto-move-text">{t('login_success_auto_move') || '잠시 후 계좌 확인 화면으로 이동합니다...'}</p>
            </div>
          </div>
        </div>
      )}

      {kioskAlert.show && (
        <div className="alert-overlay" onClick={(e) => e.stopPropagation()} style={{ zIndex: 10005 }}>
          <div className="alert-content" style={{ 
            backgroundColor: 'white', 
            borderRadius: '40px', 
            border: '8px solid #FF9800', /* 새빨간색 -> 주황색으로 변경 */
            overflow: 'hidden', 
            width: '95%', 
            maxWidth: '800px', 
            textAlign: 'center', 
            animation: 'popIn 0.3s ease-out', 
            boxShadow: '0 40px 80px rgba(0,0,0,0.4)' 
          }}>
            <div style={{ backgroundColor: '#FF9800', padding: '35px' }}> {/* 배경도 주황색 */}
              <h2 style={{ color: 'white', margin: 0, fontSize: '4rem', fontWeight: '900' }}>
                {/* 에러가 아닌 단순 확인 텍스트로 변경 */}
                {t('login_alert_title_warning') || '확인이 필요해요'}
              </h2>
            </div>
            
            <div style={{ padding: '70px 40px' }}>
              <p style={{ fontSize: '3.4rem', marginBottom: '50px', lineHeight: '1.6', color: '#333', fontWeight: '800', wordBreak: 'keep-all' }}>
                {kioskAlert.message.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}<br />
                  </React.Fragment>
                ))}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setKioskAlert({ show: false, message: '' })}
                  style={{ 
                    backgroundColor: '#495057', color: 'white', border: 'none', 
                    borderRadius: '15px', width: '250px', height: '90px', 
                    fontSize: '2.5rem', fontWeight: 'bold', cursor: 'pointer', 
                    boxShadow: '0 5px 0 #343a40' 
                  }}
                >
                  {t('login_alert_btn_confirm') || '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginModal;