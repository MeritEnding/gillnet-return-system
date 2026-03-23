// src/mainPage/modals/PassModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginModal.css'; // 기존 로그인 성공 스타일 재사용

const PassModal = ({ onClose, onNonMember }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRunRef = useRef(false);
  const popupRef = useRef(null);

  const [alertInfo, setAlertInfo] = useState({ show: false, message: '' });
  
  // ★ 성공 알림창 상태 추가
  const [successInfo, setSuccessInfo] = useState({ 
    show: false, 
    name: '', 
    isMember: false 
  });

  useEffect(() => {
    if (isRunRef.current) return;
    isRunRef.current = true;
    handleStartPass();
  }, []);

  // 팝업 닫기 공통 함수
  const closeNicePopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
  };

  // 성공 알림 노출 및 자동 이동 로직
  const showSuccessAndRedirect = (name, isMember, redirectFn) => {
    setSuccessInfo({ show: true, name, isMember });
    
    // 2초 뒤 자동 이동
    setTimeout(() => {
      setSuccessInfo({ show: false, name: '', isMember: false });
      redirectFn();
    }, 2000);
  };

  // 1. 비회원 전용 다이렉트 처리 함수
  const processNonMember = (fallbackUser) => {
    const userName = fallbackUser?.name || '고객';
    if (fallbackUser) {
      localStorage.setItem('fisherman_name', userName);
      localStorage.setItem('fisherman_phone', fallbackUser.phone || '');
      localStorage.setItem('birthdate', fallbackUser.birthdate || '19900101');
    }
    localStorage.setItem('is_member', 'false');
    localStorage.setItem('fisherman_id', 'NON_MEMBER');

    closeNicePopup();

    // ★ 비회원 성공 알림창 띄우기
    showSuccessAndRedirect(userName, false, () => {
      if (onNonMember) {
        onNonMember();
      } else {
        if (onClose) onClose();
        navigate('/auth/alternate-auth');
      }
    });
  };

  const handlePassVerification = async (diValue, fallbackUser) => {
    try {
      const response = await axios.post('http://localhost:8080/api/v1/proxy/user/check-member', {
        di: diValue
      });

      if (response.data.status == 200 && response.data.data && response.data.data.mbr_no) {
        const userData = response.data.data;

        localStorage.setItem('fisherman_id', userData.user_fshnd_no || '');
        localStorage.setItem('fisherman_name', userData.mbr_nm || '');
        localStorage.setItem('mbr_no', userData.mbr_no || '');
        localStorage.setItem('is_member', 'true');

        if (userData.actno) {
          localStorage.setItem('bank_cd', userData.bank_cd || '');
          localStorage.setItem('actno', userData.actno);
          localStorage.setItem('acct_nm', userData.dpstr_nm || userData.mbr_nm);
        }

        closeNicePopup();

        // ★ 회원 성공 알림창 띄우기
        showSuccessAndRedirect(userData.mbr_nm, true, () => {
          if (onClose) onClose();
          navigate('/select-gear');
        });

      } else {
        processNonMember(fallbackUser);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        processNonMember(fallbackUser);
      } else {
        showAlert("회원 확인 중 오류가 발생했습니다.");
      }
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || typeof event.data !== 'object' || !event.data.type) return;
      const { type, payload } = event.data;

      if (type === 'PASS_AUTH_SUCCESS') {
        handlePassVerification(payload.di, payload.user);
      } else if (type === 'FAIL' || type === 'SYSTEM_ERROR') {
        showAlert(payload.message || t('pass_alert_auth_fail'));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleStartPass = async () => {
    try {
      const response = await axios.post('/api/pass/request');
      if (response.data.status === 'SUCCESS') {
        const encData = response.data.encData;
        const popupName = 'nicePopup';
        const popupWidth = 800; const popupHeight = 900;
        const left = (window.screen.width / 2) - (popupWidth / 2);
        const top = (window.screen.height / 2) - (popupHeight / 2);

        popupRef.current = window.open('', popupName, `width=${popupWidth}, height=${popupHeight}, top=${top}, left=${left}, resizable=yes`);

        const form = document.createElement('form');
        form.action = 'https://nice.checkplus.co.kr/CheckPlusSafeModel/checkplus.cb';
        form.method = 'POST'; form.target = popupName;
        const inputM = document.createElement('input'); inputM.type = 'hidden'; inputM.name = 'm'; inputM.value = 'checkplusService';
        const inputEnc = document.createElement('input'); inputEnc.type = 'hidden'; inputEnc.name = 'EncodeData'; inputEnc.value = encData;

        form.appendChild(inputM); form.appendChild(inputEnc);
        document.body.appendChild(form); form.submit(); document.body.removeChild(form);
      } else {
        showAlert(t('pass_alert_request_fail'));
      }
    } catch (error) {
      showAlert(t('pass_alert_server_error'));
    }
  };

  const showAlert = (msg) => setAlertInfo({ show: true, message: msg });
  const handleCloseAlert = () => { setAlertInfo({ ...alertInfo, show: false }); if (onClose) onClose(); };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content privacy-consent-modal-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="privacy-header-title-xl">{t('pass_modal_title') || 'PASS 본인 인증'}</h2>
        <div className="privacy-inner-box-xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '6rem', marginBottom: '30px' }}>⏳</div>
          <p className="privacy-guide-text-xl" style={{ textAlign: 'center', margin: 0 }}>
            {t('pass_modal_desc_1') || '인증 팝업이 뜨면'}<br />{t('pass_modal_desc_2') || '본인인증을 진행해주세요.'}
          </p>
          <div style={{ marginTop: '40px', fontSize: '1.6rem', color: '#666', fontWeight: '600' }}>
            {t('pass_modal_helper_text') || '※ 팝업이 차단되었다면 다시 시도해주세요.'}
          </div>
        </div>
        <div className="privacy-btn-group-xl">
          <button className="privacy-action-btn-xl btn-agree-blue" onClick={handleStartPass}>{t('pass_modal_btn_retry') || '재시도'}</button>
          <button className="privacy-action-btn-xl btn-cancel-green" onClick={onClose}>{t('btn_cancel') || '취소'}</button>
        </div>

        {/* PASS 인증 성공 알림창 (LoginModal 디자인과 동일) */}
        {successInfo.show && (
          <div className="alert-overlay">
            <div className="alert-content success-box-v2">
              <div className="alert-header-success-v2" style={{ backgroundColor: successInfo.isMember ? '#00A0E9' : '#28a745' }}>
                {successInfo.isMember ? '회원 인증 성공' : '비회원 인증 성공'}
              </div>
              <div className="alert-body-v2">
                <div className="success-icon-circle">
                  <svg viewBox="0 0 24 24" fill="none" stroke={successInfo.isMember ? '#00A0E9' : '#28a745'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <p className="alert-msg-v2">
                  <strong>{successInfo.name}</strong>님<br/>
                  인증되었습니다!
                </p>
                <div className="loading-bar-container">
                  <div className="loading-bar-fill" style={{ backgroundColor: successInfo.isMember ? '#00A0E9' : '#28a745' }}></div>
                </div>
                <p className="auto-move-text">잠시 후 다음 화면으로 이동합니다...</p>
              </div>
            </div>
          </div>
        )}

        {alertInfo.show && (
          <div className="custom-alert-backdrop">
            <div className="custom-alert-box">
              <div className="custom-alert-message">
                {alertInfo.message.split('\n').map((line, idx) => (<React.Fragment key={idx}>{line}<br /></React.Fragment>))}
              </div>
              <button className="custom-alert-btn" onClick={handleCloseAlert}>확인</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PassModal;