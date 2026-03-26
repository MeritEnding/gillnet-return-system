// src/mainPage/modals/PassModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginModal.css'; // 기존 로그인 성공 스타일 재사용
import AccountInputModal from './AccountInputModal';

const PassModal = ({ onClose, onNonMember }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRunRef = useRef(false);
  const popupRef = useRef(null);

  const [alertInfo, setAlertInfo] = useState({ show: false, message: '' });
  
  const [isProcessing, setIsProcessing] = useState(false);

  const [successInfo, setSuccessInfo] = useState({ 
    show: false, 
    name: '', 
    isMember: false 
  });

  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    if (isRunRef.current) return;
    isRunRef.current = true;
    handleStartPass();
  }, []);

  const closeNicePopup = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
  };

  const showSuccessAndRedirect = async (name, isMember, redirectFn) => {
    setSuccessInfo({ show: true, name, isMember });

    setTimeout(() => {
      setSuccessInfo({ show: false, name: '', isMember: false });
      redirectFn();
    }, 2000);
  };

  const processNonMember = (fallbackUser) => {
    const userName = fallbackUser?.name || t('pass_default_guest_name') || '고객';
    if (fallbackUser) {
      localStorage.setItem('fisherman_name', userName);
      localStorage.setItem('fisherman_phone', fallbackUser.phone || '');
      localStorage.setItem('birthdate', fallbackUser.birthdate || '19900101');
    }
    localStorage.setItem('is_member', 'false');
    localStorage.setItem('fisherman_id', 'NON_MEMBER');

    closeNicePopup();

    showSuccessAndRedirect(userName, false, () => {
      if (onNonMember) {
        onNonMember();
      } else {
        setShowAccountModal(true);
      }
    });
  };

  const handlePassVerification = async (diValue, fallbackUser) => {
    setIsProcessing(true);

    try {
      const response = await axios.post('http://localhost:8080/api/v1/proxy/user/check-member', {
        di: diValue
      });

      setIsProcessing(false);

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

        showSuccessAndRedirect(userData.mbr_nm, true, () => {
          setShowAccountModal(true);
        });

      } else {
        processNonMember(fallbackUser);
      }
    } catch (error) {
      setIsProcessing(false);

      if (error.response && error.response.status === 404) {
        processNonMember(fallbackUser);
      } else {
        showAlert(t('pass_alert_verify_error') || "회원 확인 중 오류가 발생했습니다.");
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
        showAlert(payload.message || t('pass_alert_auth_fail') || "인증에 실패했습니다.");
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
        
        const popupWidth = 500; 
        const popupHeight = 800;

        const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
        const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

        const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : window.screen.width;
        const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : window.screen.height;

        const left = dualScreenLeft + (width / 2) - (popupWidth / 2);
        const top = dualScreenTop + (height / 2) - (popupHeight / 2);

        popupRef.current = window.open('', popupName, `scrollbars=yes, width=${popupWidth}, height=${popupHeight}, top=${top}, left=${left}`);

        const form = document.createElement('form');
        form.action = 'https://nice.checkplus.co.kr/CheckPlusSafeModel/checkplus.cb';
        form.method = 'POST'; form.target = popupName;
        const inputM = document.createElement('input'); inputM.type = 'hidden'; inputM.name = 'm'; inputM.value = 'checkplusService';
        const inputEnc = document.createElement('input'); inputEnc.type = 'hidden'; inputEnc.name = 'EncodeData'; inputEnc.value = encData;

        form.appendChild(inputM); form.appendChild(inputEnc);
        document.body.appendChild(form); form.submit(); document.body.removeChild(form);
      } else {
        showAlert(t('pass_alert_request_fail') || "인증 요청을 생성할 수 없습니다.");
      }
    } catch (error) {
      showAlert(t('pass_alert_server_error') || "서버 통신 중 오류가 발생했습니다.");
    }
  };

  const showAlert = (msg) => setAlertInfo({ show: true, message: msg });
  const handleCloseAlert = () => { setAlertInfo({ ...alertInfo, show: false }); if (onClose) onClose(); };

  return (
    <>
      {!showAccountModal && (
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

            {/* 인증 서버 확인 중 알림창 */}
            {isProcessing && (
              <div className="alert-overlay">
                <div className="alert-content success-box-v2">
                  <div className="alert-header-success-v2" style={{ backgroundColor: '#6c757d' }}>
                    {t('pass_loading_title') || '인증 진행 중'}
                  </div>
                  <div className="alert-body-v2">
                    <div className="success-icon-circle" style={{ backgroundColor: 'transparent' }}>
                      <div className="loading-spinner" style={{ width: '80px', height: '80px', borderTopColor: '#6c757d' }}></div>
                    </div>
                    <p className="alert-msg-v2">
                      {t('pass_loading_desc_1') || '시스템에서 사용자 정보를'}<br/>
                      {t('pass_loading_desc_2') || '안전하게 확인하고 있습니다...'}
                    </p>
                    <p className="auto-move-text">{t('pass_loading_wait') || '잠시만 기다려주세요.'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* PASS 인증 성공 알림창 */}
            {successInfo.show && (
              <div className="alert-overlay">
                <div className="alert-content success-box-v2">
                  <div className="alert-header-success-v2" style={{ backgroundColor: successInfo.isMember ? '#00A0E9' : '#28a745' }}>
                    {successInfo.isMember ? (t('pass_success_member') || '회원 인증 성공') : (t('pass_success_non_member') || '비회원 인증 성공')}
                  </div>
                  <div className="alert-body-v2">
                    <div className="success-icon-circle">
                      <svg viewBox="0 0 24 24" fill="none" stroke={successInfo.isMember ? '#00A0E9' : '#28a745'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <p className="alert-msg-v2">
                      <span className="greeting-text-top">{t('login_success_greeting_1')}</span>
                      <br />
                      <strong>{successInfo.name}</strong>{t('login_success_greeting_2')}
                    </p>
                    <div className="loading-bar-container">
                      <div className="loading-bar-fill" style={{ backgroundColor: successInfo.isMember ? '#00A0E9' : '#28a745' }}></div>
                    </div>
                    <p className="auto-move-text">{t('login_success_auto_move') || '잠시 후 계좌 확인 화면으로 이동합니다...'}</p>
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
                  <button className="custom-alert-btn" onClick={handleCloseAlert}>{t('account_alert_btn_confirm') || '확인'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAccountModal && (
        <AccountInputModal onClose={onClose} />
      )}
    </>
  );
};

export default PassModal;