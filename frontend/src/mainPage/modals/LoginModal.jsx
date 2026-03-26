// src/mainPage/modals/LoginModal.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './LoginModal.css';
import AccountInputModal from './AccountInputModal';

const LoginModal = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeField, setActiveField] = useState(null);
  const [isShift, setIsShift] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!userId || !password) {
      alert(t('login_alert_empty') || "아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:8080/api/v1/proxy/user/login', {
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
        alert(t('login_alert_fail') || "아이디 또는 비밀번호가 일치하지 않습니다.");
      }
    } catch (error) {
      alert(t('login_alert_error') || "로그인 처리 중 오류가 발생했습니다.");
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
                <strong>{localStorage.getItem('fisherman_name')}</strong>{t('login_success_greeting_2')}
              </p>
              <div className="loading-bar-container">
                <div className="loading-bar-fill"></div>
              </div>
              <p className="auto-move-text">{t('login_success_auto_move') || '잠시 후 계좌 확인 화면으로 이동합니다...'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginModal;