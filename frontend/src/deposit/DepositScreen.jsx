// src/depositPage/DepositScreen.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import './DepositScreen.css';
import LoadingSpinner from '../assets/loading-spinner.png';
import DepositGuideVideo from '../assets/어구 반납.mp4';
import ReturnCompleteVideo from '../assets/어구반납완료.mp4';
import Header from '../mainPage/Header';
import BgImage from '../assets/bg_all.png';

const urlToBlob = async (url) => {
  const response = await fetch(url);
  return await response.blob();
};

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LoadingOverlay = ({ text }) => {
  const { t } = useTranslation();
  return (
    <div className="deposit-overlay">
      <div className="loading-column">
        <img src={LoadingSpinner} alt="loading" className="deposit-spinner large" />
        <p className="loading-text">{text || t('deposit_loading_default') || "처리 중입니다..."}</p>
      </div>
    </div>
  );
};

const SafetyWarningIcon = () => (
  <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="#DC3545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DepositScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [viewState, setViewState] = useState('DEPOSITING');

  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [depositSubState, setDepositSubState] = useState('READY_CAPTURE');

  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isDoorClosed, setIsDoorClosed] = useState(false);

  const [scannedGears, setScannedGears] = useState([]);
  const [scannedList, setScannedList] = useState([]);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [totalPoint, setTotalPoint] = useState(0);

  const [showSafetyWarning, setShowSafetyWarning] = useState(false);

  const [capturedImages, setCapturedImages] = useState([]);
  const [returnMngNos, setReturnMngNos] = useState({ remg: '', romg: '' });

  const LOCAL_API_URL = 'http://localhost:8080';
  const PROXY_API_URL = 'http://localhost:8080/api/v1/proxy';

  const showMessage = (msg, isErr = false) => {
    setStatusMessage(msg);
    setIsError(isErr);
  };

  useEffect(() => {
    axios.post(`${LOCAL_API_URL}/api/deposit/init`).catch(() => console.log("하드웨어 초기화 건너뜀"));
  }, []);

  useEffect(() => {
    const gears = location.state?.scannedGears;
    if (gears && gears.length > 0) {
      setScannedGears(gears);
    } else {
      showMessage(t('deposit_alert_no_items') || "스캔된 어구가 없습니다.", true);
    }
  }, [location.state, t]);

  const handleBack = () => {
    if (viewState === 'CONFIRMING') {
      setViewState('DEPOSITING');
      setScannedList([]);
      setStatusMessage('');
      setIsDoorClosed(false);
      setDepositSubState('READY_CAPTURE');
      setCurrentItemIndex(0);
      setCapturedImages([]);
    } else {
      navigate(-1);
    }

  };

  // 1. 함수 추가 (handleBack 바로 아래에 작성)
  const forceRunConveyor = async () => {
    alert("컨베이어 강제 구동 신호를 보냅니다!");
    try {
      await axios.post(`${LOCAL_API_URL}/api/deposit/action/conveyor`);
    } catch (e) {
      alert("통신 실패: " + e.message);
    }
  };

  // 실제 카메라 촬영
  const handleCapture = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setStatusMessage('');

    try {
      setLoadingText(t('deposit_msg_capture_loading') || "카메라 촬영 중입니다...");
      const captureRes = await axios.post(`${LOCAL_API_URL}/api/camera/devices/0/capture`);
      if (!captureRes.data.success) throw new Error(t('deposit_msg_capture_fail') || "로컬 카메라 촬영에 실패했습니다.");

      const localImageUrl = `${LOCAL_API_URL}${captureRes.data.imageUrl}`;
      const imageBlob = await urlToBlob(localImageUrl);
      const imageFile = new File([imageBlob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });

      setCapturedImages(prev => [...prev, imageFile]);
      setDepositSubState('WAITING_CLOSE');
      showMessage(t('deposit_msg_capture_success') || "어구가 확인되었습니다. [투입구 닫기] 버튼을 눌러주세요.");

    } catch (error) {
      showMessage(t('deposit_msg_cam_error') || `카메라 연결 오류가 발생했습니다.`, true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAndRunConveyor = async () => {

    if (isLoading) return;

    setIsLoading(true);

    // 안전 경고 켜고 음성 재생
    setShowSafetyWarning(true);
    speakSafetyWarning();

    setLoadingText(t('deposit_msg_conveyor_run') || "어구를 처리하고 컨베이어를 작동합니다... (8초)");

    // ▼▼▼ 진짜 제대로 돌아가는 정공법 구현 (무시 없음, 순서 엄수) ▼▼▼
    try {
      // 1. 투입구 닫기 명령
      await axios.post(`${LOCAL_API_URL}/api/deposit/action/close-doors`, { isLast: false });

      // ★ [핵심] PLC 기기가 물리적으로 문을 닫고 다음 통신을 받을 준비를 할 수 있도록 1.5초의 여유를 줍니다.
      await new Promise(resolve => setTimeout(resolve, 8000));

      // 2. 컨베이어 가동 명령 (문이 닫힌 후 안전하게 전송)
      await axios.post(`${LOCAL_API_URL}/api/deposit/action/conveyor`);

      // 3. 컨베이어가 도는 시간 동안 화면 대기
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (hwError) {
      console.error("❌ 하드웨어 통신 에러 발생! 진행을 멈춥니다:", hwError);
      showMessage("하드웨어 통신에 실패했습니다. 다음 단계로 넘어갈 수 없습니다.", true);
      setIsLoading(false);
      setShowSafetyWarning(false);
      return; // ⛔ 에러 시 여기서 함수 즉시 종료! 무시하고 넘어가지 않음.
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // 정상 작동 완료 시 안전 경고 끄기
    setShowSafetyWarning(false);

    try {
      const nextIndex = currentItemIndex + 1;
      const isLastItem = nextIndex >= scannedGears.length;

      if (!isLastItem) {
        try { await axios.post(`${LOCAL_API_URL}/api/deposit/init`); } catch (e) { }
        setCurrentItemIndex(nextIndex);
        setDepositSubState('READY_CAPTURE');
        showMessage(t('deposit_msg_next_capture', { next: nextIndex + 1 }) || `다음 ${nextIndex + 1}번째 어구를 위해 촬영 버튼을 눌러주세요.`);
        setIsLoading(false);
      } else {
        await handleProcessScans();
      }
    } catch (error) {
      showMessage(t('deposit_msg_process_err') || "처리 중 오류가 발생했습니다. 다시 시도해주세요.", true);
      setIsLoading(false);
    }

  };

  const speakSafetyWarning = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(t('deposit_msg_safety_voice') || "위험하오니 한 걸음 뒤로 물러서 주세요. 투입구가 닫힙니다.");
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return "010-0000-0000";
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return phone;
  };

  const formatBrdt = (brdt) => {
    if (!brdt) return "1990-01-01";
    const cleaned = ('' + brdt).replace(/\D/g, '');
    if (cleaned.length === 8) {
      return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 6)}-${cleaned.substring(6, 8)}`;
    }
    return brdt;
  };

  const handleProcessScans = async () => {
    setIsLoading(true);
    setLoadingText(t('deposit_msg_server_upload') || "반환 정보를 서버에 등록하는 중입니다...");
    const mbrNo = localStorage.getItem('mbr_no') || '';
    const isMember = localStorage.getItem('is_member') === 'true';
    const fishermanId = localStorage.getItem('fisherman_id');
    const fishermanName = localStorage.getItem('fisherman_name') || '비회원';

    const rawPhone = localStorage.getItem('fisherman_phone') || localStorage.getItem('mbl_telno');
    const rawBrdt = localStorage.getItem('brdt') || localStorage.getItem('birthdate');
    const bankCd = localStorage.getItem('bank_cd') || '';
    const actno = localStorage.getItem('actno') || '';
    const acctNm = localStorage.getItem('acct_nm') || fishermanName;
    const selectedClsfCd = localStorage.getItem('selected_fsgr_clsf_cd') || 'FISGE';

    const commonPayload = {
      user_fshnd_no: fishermanId === 'NON_MEMBER' ? '' : fishermanId,
      fsgr_clsf_cd: selectedClsfCd,
      korn_flnm: fishermanName,
      brdt: formatBrdt(rawBrdt),
      telno: formatPhone(rawPhone),
      mbl_telno: formatPhone(rawPhone),
      bank_cd: bankCd,
      actno: actno.replace(/-/g, ''),
      acct_nm: acctNm,
      kiosk_no: "K001",
      mbr_no: mbrNo
    };

    if (isMember && fishermanId && fishermanId !== 'NON_MEMBER') {
      commonPayload.user_fshnd_no = fishermanId;
    }

    const depositGears = scannedGears.filter(g => g.gvbk_type.includes('보증금'));
    const existingGears = scannedGears.filter(g => g.gvbk_type.includes('기존'));

    let remgMngNo = '';
    let finalRemgMngNo = '';
    let romgMngNo = '';
    const successfulReturns = [];
    let calcDeposit = 0;
    let calcPoint = 0;

    try {
      if (depositGears.length > 0) {
        const remgPayload = {
          ...commonPayload,
          telno: formatPhone(rawPhone),
          fsgr_clsf_cd: selectedClsfCd,
          kiosk_no: "KIOSK-001"
        };

        const startRes = await axios.post(`${PROXY_API_URL}/deposit/return/remg/start`, remgPayload);

        if (startRes.data?.status === "400" || startRes.data?.status === "500" || startRes.data?.status === 400) {
          throw new Error(`${t('deposit_err_start_remg') || '[보증금어구 시작 거부]'} ${startRes.data?.message}`);
        }

        remgMngNo = startRes.data?.data?.gvbk_mng_no;
        finalRemgMngNo = remgMngNo;

        if (remgMngNo) {
          const remgPromises = depositGears.map(gear =>
            axios.post(`${PROXY_API_URL}/deposit/return/remg`, {
              bacod_nm: gear.bacod_nm,
              gvbk_mng_no: remgMngNo
            }).then(retRes => {
              if (retRes.data?.status === "200" || retRes.data?.status === 200 || retRes.data?.message === "OK") {
                return { success: true, gear, mngNo: retRes.data.data?.gvbk_mng_no };
              } else {
                throw new Error(`${t('deposit_err_register') || '[등록 거부]'} ${retRes.data?.message}`);
              }
            })
          );

          const remgResults = await Promise.all(remgPromises);
          remgResults.forEach(res => {
            const realAmount = res.gear.gvbk_amt || 0;
            successfulReturns.push({ code: res.gear.bacod_nm, type: '보증금어구', reward: realAmount, point: 0 });
            calcDeposit += realAmount;
            if (res.mngNo) finalRemgMngNo = res.mngNo;
          });
        }
      }

      if (existingGears.length > 0 && isMember) {
        const romgPayload = {
          ...commonPayload,
          telno: formatPhone(rawPhone),
          kiosk_no: "KIOSK-001"
        };

        const startRes = await axios.post(`${PROXY_API_URL}/deposit/return/romg/start`, romgPayload);

        if (startRes.data?.status === "400" || startRes.data?.status === "500") {
          throw new Error(`${t('deposit_err_start_romg') || '[기존어구 시작 거부]'} ${startRes.data?.message}`);
        }

        romgMngNo = startRes.data?.data?.bfr_fsgr_gvbk_no;

        if (romgMngNo) {
          const romgPromises = existingGears.map(gear =>
            axios.post(`${PROXY_API_URL}/deposit/return/romg`, {
              bacod_nm: gear.bacod_nm,
              bfr_fsgr_gvbk_no: romgMngNo
            }).then(retRes => {
              if (retRes.data?.status === "200" || retRes.data?.status === 200 || retRes.data?.message === "OK") {
                return { success: true, gear };
              } else {
                throw new Error(`${t('deposit_err_register') || '[등록 거부]'} ${retRes.data?.message}`);
              }
            })
          );

          const romgResults = await Promise.all(romgPromises);
          romgResults.forEach(res => {
            const realPoint = res.gear.gvbk_pnt || 0;
            successfulReturns.push({ code: res.gear.bacod_nm, type: '기존어구', reward: 0, point: realPoint });
            calcPoint += realPoint;
          });
        }
      }

      setReturnMngNos({ remg: finalRemgMngNo, romg: romgMngNo });

      if (successfulReturns.length === 0) {
        throw new Error(t('deposit_err_no_normal') || "정상적으로 등록된 어구가 없습니다.");
      }

      setScannedList(successfulReturns);
      setTotalDeposit(calcDeposit);
      setTotalPoint(calcPoint);
      setViewState('CONFIRMING');

    } catch (err) {
      console.error("API 처리 에러 상세:", err);
      const backendErrorMsg = err.response?.data?.message || err.message;
      showMessage(`${t('deposit_err_server_comm') || '서버 통신 오류:'} ${backendErrorMsg}`, true);

      setViewState('DEPOSITING');
      setDepositSubState('READY_CAPTURE');

    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDoors = async () => {

    setIsLoading(true);

    setLoadingText(t('deposit_msg_closing_door') || "투입구를 닫고 있습니다...");

    setShowSafetyWarning(true);

    speakSafetyWarning();

    try {
      await axios.post(`${LOCAL_API_URL}/api/deposit/action/close-doors`, { isLast: true });

      await new Promise(res => setTimeout(res, 2500));

      setIsDoorClosed(true);

      showMessage(t('deposit_msg_door_closed') || "투입구가 닫혔습니다. 확인 완료를 눌러주세요.");

    } catch (e) {
      console.error("❌ 문 닫기 통신 에러! 진행을 멈춥니다.");
      showMessage("투입구를 닫는 중 통신 오류가 발생했습니다. 다시 시도해주세요.", true);
    } finally {
      setIsLoading(false);
      setShowSafetyWarning(false);
    }

  };

  // ✅ 새롭게 추가된 백그라운드 전송 함수
  const uploadImagesAndSendSMSBackground = async () => {
    if (capturedImages.length === 0) return;

    if (returnMngNos.remg) {
      try {
        const formRemg = new FormData();
        formRemg.append('gvbk_mng_no', returnMngNos.remg);
        capturedImages.forEach(file => formRemg.append('files', file));
        await axios.post(`${PROXY_API_URL}/deposit/image/remg.json`, formRemg, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (imgError) {
        console.warn("⚠️ 보증금어구 사진 전송 실패 (무시하고 문자 전송 진행):", imgError.message);
      }

      try {
        await axios.post(`${PROXY_API_URL}/deposit/return/remg/sms.json`, { gvbk_mng_no: returnMngNos.remg });
        console.log("✅ 보증금어구 문자 발송 성공!");
      } catch (smsError) {
        console.error("❌ 보증금어구 문자 발송 실패:", smsError.response?.data || smsError.message);
      }
    }

    if (returnMngNos.romg) {
      try {
        const formRomg = new FormData();
        formRomg.append('bfr_fsgr_gvbk_no', returnMngNos.romg);
        capturedImages.forEach(file => formRomg.append('files', file));
        await axios.post(`${PROXY_API_URL}/deposit/image/romg.json`, formRomg, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (imgError) {
        console.warn("⚠️ 기존어구 사진 전송 실패 (무시하고 문자 전송 진행):", imgError.message);
      }

      try {
        await axios.post(`${PROXY_API_URL}/deposit/return/romg/sms.json`, { bfr_fsgr_gvbk_no: returnMngNos.romg });
        console.log("✅ 기존어구 문자 발송 성공!");
      } catch (smsError) {
        console.error("❌ 기존어구 문자 발송 실패:", smsError.response?.data || smsError.message);
      }
    }
  };

  // ✅ 개선된 handleFinalConfirm 함수 (물리적 대기는 유지, 네트워크 전송은 await 제거)
  const handleFinalConfirm = async () => {
    setIsLoading(true);
    setLoadingText("기기를 마무리하고 완료 화면으로 이동합니다...");

    try {
      // 1. 무거운 사진/문자 전송은 백그라운드(비동기)로 던져둡니다! (await를 쓰지 않아 사용자 UI를 멈추지 않음)
      uploadImagesAndSendSMSBackground();

      // 2. 기기 내부를 정리 (★ 물리적 시간 절대 건드리지 않음)
      await axios.post(`${LOCAL_API_URL}/api/deposit/action/cleaning`);
      await new Promise(res => setTimeout(res, 2500));

    } catch (error) {
      console.error("기기 정리 중 에러:", error);
    } finally {
      setIsLoading(false);
      // 백그라운드 업로드와 상관없이, 하드웨어 정리가 끝나면 바로 완료 화면으로 이동합니다!
      navigate('/completion', {
        state: { totalDeposit, totalPoint, totalCount: scannedList.length }
      });
    }
  };

  const translateGearType = (type) => {
    const typeStr = String(type);
    if (typeStr.includes('보증금')) return t('gear_badge_deposit') || "보증금어구";
    if (typeStr.includes('기존')) return t('gear_badge_existing') || "기존어구";
    return typeStr;
  };

  return (
    <div className="deposit-wrapper">
      <Header />
      <div className="deposit-body">
        <div className="camera-box">
          <button className="deposit-back-btn" onClick={handleBack} disabled={isLoading}>
            <BackIcon />
            <span className="deposit-back-text">
              {viewState === 'CONFIRMING' ? (t('deposit_btn_prev_step') || '이전 단계') : (t('deposit_btn_prev') || '뒤로가기')}
            </span>
          </button>

          {viewState === 'DEPOSITING' ? (
            <div className="video-container">
              <video src={DepositGuideVideo} autoPlay loop muted playsInline className="fill-video" />
            </div>
          ) : (
            <video src={ReturnCompleteVideo} autoPlay loop muted playsInline className="fill-video" />
          )}
        </div>

        <div className="deposit-card-container" style={{ backgroundImage: `url(${BgImage})` }}>
          <div className="deposit-info-card">
            <div className="step-tabs">
              <div className="step-tab inactive"><div className="step-num-circle">1</div><span className="step-label">{t('auth_step_1') || '사용자 인증'}</span></div>
              <div className="step-tab inactive"><div className="step-num-circle">2</div><span className="step-label">{t('auth_step_2') || '어구보증금표식 인증'}</span></div>
              <div className="step-tab active"><div className="step-num-circle">3</div><span className="step-label">{t('auth_step_3') || '투입'}</span></div>
            </div>

            <h2 className="step-main-title">{viewState === 'CONFIRMING' ? (t('deposit_step_confirm') || '투입 내역 확인') : (t('deposit_step_3_title') || '3단계: 투입')}</h2>

            {viewState === 'DEPOSITING' && (
              <div className="deposit-content-box">
                <div className="instruction-box">
                  <div style={{ textAlign: 'center', marginBottom: '15px', fontWeight: 'bold', fontSize: '1.2rem', color: '#333' }}>
                    {t('deposit_progress') || '진행 상황'}: {currentItemIndex + 1} / {scannedGears.length}
                  </div>

                  {statusMessage ? (
                    <div className={`status-message-box ${isError ? 'error' : 'success'}`}>
                      <p className="status-text">{statusMessage}</p>
                    </div>
                  ) : (
                    <p className="instruction-text">
                      {depositSubState === 'READY_CAPTURE' ?
                        (t('deposit_inst_ready') || "폐어구를 투입구에 넣고 [투입 확인] 버튼을 눌러주세요.") :
                        (t('deposit_inst_done') || "어구 확인이 완료되었습니다. [투입구 닫기] 버튼을 눌러주세요.")
                      }
                    </p>
                  )}

                  <div className="deposit-action-buttons-row" style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                    {depositSubState === 'READY_CAPTURE' ? (
                      <div style={{ display: 'flex', gap: '15px', width: '100%', maxWidth: '300px' }}>
                        <button className="deposit-action-btn primary" onClick={handleCapture} disabled={isLoading} style={{ width: '100%', backgroundColor: '#007BFF' }}>
                          {t('deposit_btn_check') || '투입 확인'}
                        </button>
                      </div>
                    ) : (
                      <button className="deposit-action-btn primary" onClick={handleCloseAndRunConveyor} disabled={isLoading} style={{ width: '100%', maxWidth: '300px', backgroundColor: '#28a745' }}>
                        {t('deposit_btn_door_closed') || '투입구 닫힘'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {viewState === 'CONFIRMING' && (
              <div className="deposit-content-box" style={{ display: 'block', width: '100%' }}>
                <div className="deposit-table-scroll-wrapper">
                  <table className="deposit-table">
                    <thead>
                      <tr>
                        <th>{t('deposit_tbl_code') || '코드'}</th>
                        <th>{t('deposit_tbl_type') || '유형'}</th>
                        <th>{t('deposit_tbl_amt') || '금액/포인트'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedList.map((item, index) => (
                        <tr key={index}>
                          <td>{item.code}</td>
                          <td>{translateGearType(item.type)}</td>
                          <td>{item.point > 0 ? `${item.point.toLocaleString()} P` : `${item.reward.toLocaleString()} ${t('currency_unit') || '원'}`}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2">{t('deposit_tbl_total') || '총계'}</td>
                        <td>
                          {totalDeposit > 0 && <span>{totalDeposit.toLocaleString()} {t('currency_unit') || '원'}</span>}
                          {totalDeposit > 0 && totalPoint > 0 && <span style={{ margin: '0 5px' }}>/</span>}
                          {totalPoint > 0 && <span>{totalPoint.toLocaleString()} P</span>}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {!isDoorClosed && (
                  <p style={{ textAlign: 'center', color: '#d9534f', fontWeight: 'bold', fontSize: '1.1rem', margin: '15px 0 5px 0' }}>
                    {t('deposit_notice_scanner') || '※ 바코드 스캐너를 잘 정리해주시고 투입구를 닫아주세요.'}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px', justifyContent: 'center' }}>
                  <button
                    className="deposit-confirm-btn"
                    style={{ backgroundColor: isDoorClosed ? '#6c757d' : '#ffc107', color: isDoorClosed ? '#fff' : '#000', flex: 1 }}
                    onClick={handleCloseDoors} disabled={isLoading || isDoorClosed}
                  >
                    {isDoorClosed ? (t('deposit_btn_door_closed') || "투입구 닫힘") : (t('deposit_btn_close_door') || "투입구 닫기")}
                  </button>
                  <button
                    className="deposit-confirm-btn"
                    style={{ backgroundColor: isDoorClosed ? '#28a745' : '#ccc', cursor: isDoorClosed ? 'pointer' : 'not-allowed', flex: 1 }}
                    onClick={handleFinalConfirm} disabled={isLoading || !isDoorClosed}
                  >
                    {t('deposit_btn_final_confirm') || '확인 완료'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {isLoading && <LoadingOverlay text={loadingText} />}

      {showSafetyWarning && (
        <div className="safety-warning-overlay">
          <div className="safety-warning-box">
            <SafetyWarningIcon />
            <h1 className="safety-warning-title">{t('deposit_warn_title') || '위험! 투입구 작동 중'}</h1>
            <p className="safety-warning-text">
              {t('deposit_warn_desc_1') || '안전을 위해 한 걸음'}<br />
              {t('deposit_warn_desc_2') || '뒤로 '}<strong>{t('deposit_warn_desc_3') || '물러서 주세요!'}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositScreen;