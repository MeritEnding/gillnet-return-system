// src/mainPage/modals/PassModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const PassModal = ({ onClose, onNonMember }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRunRef = useRef(false);
  const popupRef = useRef(null);

  const [alertInfo, setAlertInfo] = useState({ show: false, message: '' });

  useEffect(() => {
    if (isRunRef.current) return;
    isRunRef.current = true;
    handleStartPass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1. 비회원 전용 다이렉트 처리 함수
  const processNonMember = (fallbackUser) => {
    console.log('-> 비회원 플로우 다이렉트 진입', fallbackUser);
    if (fallbackUser) {
      localStorage.setItem('fisherman_name', fallbackUser.name || '');
      localStorage.setItem('fisherman_phone', fallbackUser.phone || '');

      // ★ 추가: 백엔드에서 넘겨준 PASS 생년월일을 로컬 스토리지에 저장
      if (fallbackUser.birthdate) {
        localStorage.setItem('birthdate', fallbackUser.birthdate);
      } else {
        // 만약 백엔드에서 못 받았을 경우를 대비한 보험용 기본값
        localStorage.setItem('birthdate', '19900101');
      }
    }

    localStorage.setItem('is_member', 'false');
    localStorage.setItem('fisherman_id', 'NON_MEMBER');

    // 팝업 강제 닫기
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }

    // Home.jsx로 비회원 신호 전달하여 계좌 모달 띄우기
    if (onNonMember) {
      onNonMember();
    } else {
      if (onClose) onClose();
      navigate('/auth/alternate-auth');
    }
  };


  const handlePassVerification = async (diValue, fallbackUser) => {
    try {
      const response = await axios.post('http://localhost:8080/api/v1/proxy/user/check-member', {
        di: diValue
      });

      // 1. 서버 응답이 200이면서 데이터가 명확히 있는 경우만 '회원'으로 처리
      if (response.data.status == 200 && response.data.data && response.data.data.mbr_no) {
        const userData = response.data.data;

        localStorage.setItem('fisherman_id', userData.user_fshnd_no || '');
        localStorage.setItem('fisherman_name', userData.mbr_nm || '');
        localStorage.setItem('mbr_no', userData.mbr_no || '');
        localStorage.setItem('is_member', 'true');

        // 계좌 정보가 있다면 저장 (회원용 STEP 2: 기존 계좌 사용)
        if (userData.actno) {
          localStorage.setItem('bank_cd', userData.bank_cd || '');
          localStorage.setItem('actno', userData.actno);
          localStorage.setItem('acct_nm', userData.dpstr_nm || userData.mbr_nm);
        }

        console.log('-> 회원 확인 완료: 어구 선택으로 이동');
        if (onClose) onClose();
        navigate('/select-gear');
      } else {
        // 2. 응답은 성공이나 회원이 아닌 경우 (데이터가 비어있음) -> 비회원 처리
        console.log('-> 서버 응답 성공이나 회원이 아님: 비회원 로직 시작');
        processNonMember(fallbackUser);
      }
    } catch (error) {
      // 3. 404 에러(회원 없음)인 경우 확실하게 비회원 처리로 유도
      if (error.response && error.response.status === 404) {
        console.log('-> 외부 API: 비회원 확인됨 (404)');
        processNonMember(fallbackUser);
      } else {
        console.error("인증 에러:", error);
        showAlert("회원 확인 중 오류가 발생했습니다.");
      }
    }
  };

  // --- 2. 메시지 수신 로직 수정 ---
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || typeof event.data !== 'object' || !event.data.type) return;
      const { type, payload } = event.data;

      // 백엔드 DB 로직이 사라졌으므로, 이제 PASS_AUTH_SUCCESS 하나만 들어옵니다!
      if (type === 'PASS_AUTH_SUCCESS') {
        console.log(`[프론트] PASS 인증 성공. 외부 파란샘 API에 회원 여부를 묻습니다.`);
        // ★ 외부 API 찔러보기 (DI값과 비회원 대비용 백업 데이터를 함께 넘김)
        handlePassVerification(payload.di, payload.user);
      }
      else if (type === 'FAIL' || type === 'SYSTEM_ERROR') {
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
        const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
        const screenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
        const innerWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        const innerHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
        const left = screenLeft + (innerWidth / 2) - (popupWidth / 2);
        const top = screenTop + (innerHeight / 2) - (popupHeight / 2);

        popupRef.current = window.open('', popupName, `width=${popupWidth}, height=${popupHeight}, top=${top}, left=${left}, fullscreen=no, menubar=no, status=no, toolbar=no, titlebar=yes, location=no, scrollbar=no, resizable=yes`);

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
      console.error('PASS Request Error:', error);
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